// Motor de transição automática dos 9 estados CRM.
// Corre diariamente (Vercel Cron → /api/cron/estados) — o CRM deixa de
// depender do N8N para manter os estados corretos.
//
// Regras (alinhadas com a segmentação do Notion):
//   lead              → sem nenhuma sessão realizada
//   novo              → 1 sessão realizada, há menos de 30 dias
//   ativa_recente     → sessão nos últimos 30 dias
//   ativa_frequente   → 4+ sessões e última há menos de diasReativacao dias
//   vip_embaixadora   → VIP (8+ sessões, €300+ gastos, ou €200+ nos últimos
//                       30 dias) ativa (≤30 dias)
//   vip_em_risco      → VIP sem sessão há 30–diasReativacao dias
//   reativacao        → sem sessão há mais de diasReativacao dias
//   perdida           → sem sessão há mais de 180 dias
//   blacklist         → manual; o motor NUNCA toca
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { auditar } from "@/lib/audit"
import { getConfigNegocio } from "@/lib/config-negocio"
import type { EstadoCliente } from "@/lib/prisma-client"

const VIP_MIN_SESSOES = 8
const VIP_MIN_GASTO = 300
// "Gasto rápido" — decisão do Nuno 2026-09-02: uma cliente pode nunca
// chegar aos €300 vitalícios mas gastar muito concentrado num curto
// período (várias sessões/vouchers numa semana) — isso também é sinal de
// VIP, não só o total acumulado desde sempre.
const VIP_GASTO_RAPIDO = 200
const VIP_GASTO_RAPIDO_DIAS = 30

export interface DadosClienteEstado {
  estado: EstadoCliente
  ultimaSessao: Date | null
  totalSessoes: number
  totalGasto: number
  // Sessões (preço) + vouchers comprados nos últimos VIP_GASTO_RAPIDO_DIAS
  // dias — ver calcularGastoRecentePorCliente(). Não tem a guarda contra
  // duplicação de voucher-comprado-e-usado-por-si-própria que totalGasto
  // tem (lib/metricas.ts): aqui é só um sinal de intensidade de gasto, não
  // uma cifra financeira exacta, uma pequena sobrecontagem nesse caso raro
  // não é grave.
  gastoUltimos30Dias: number
}

export function calcularEstado(
  c: DadosClienteEstado,
  hoje = new Date(),
  diasReativacao = 45
): EstadoCliente {
  // Estados intocáveis pelo motor
  if (c.estado === "blacklist") return "blacklist"

  // Sem sessões realizadas → continua lead
  if (c.totalSessoes === 0 || !c.ultimaSessao) return "lead"

  const dias = Math.floor((hoje.getTime() - c.ultimaSessao.getTime()) / 86_400_000)
  const ehVip = c.totalSessoes >= VIP_MIN_SESSOES
    || c.totalGasto >= VIP_MIN_GASTO
    || c.gastoUltimos30Dias >= VIP_GASTO_RAPIDO

  if (dias > 180) return "perdida"
  if (dias > diasReativacao) return "reativacao"

  if (ehVip) {
    return dias <= 30 ? "vip_embaixadora" : "vip_em_risco"
  }

  if (c.totalSessoes >= 4 && dias <= diasReativacao) return "ativa_frequente"
  if (c.totalSessoes === 1 && dias <= 30) return "novo"
  return "ativa_recente"
}

export interface ResultadoMotor {
  analisados: number
  alterados: number
  falhas: number
  transicoes: Array<{ clienteId: string; nome: string; de: string; para: string }>
}

interface ClienteParaTransicao {
  id: string
  nome: string
  estado: EstadoCliente
  ultimaSessao: Date | null
  totalSessoes: number
  totalGasto: number
  gastoUltimos30Dias: number
}

/**
 * Soma, por cliente, quanto gastou (sessões realizadas + vouchers comprados)
 * nos últimos VIP_GASTO_RAPIDO_DIAS dias — usada só como sinal de "gasto
 * rápido" para VIP (ver calcularEstado). Uma query em lote para todos os
 * clientes de uma vez (não uma por cliente) — corre no cron diário sobre a
 * base inteira de clientes.
 */
async function calcularGastoRecentePorCliente(
  clienteIds: string[],
  hoje: Date
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>()
  if (clienteIds.length === 0) return mapa

  const desde = new Date(hoje)
  desde.setDate(desde.getDate() - VIP_GASTO_RAPIDO_DIAS)

  const [sessoes, vouchers] = await Promise.all([
    prisma.sessao.groupBy({
      by: ["clienteId"],
      where: { clienteId: { in: clienteIds }, estado: "realizada", apagadoEm: null, data: { gte: desde } },
      _sum: { preco: true },
    }),
    prisma.giftCard.groupBy({
      by: ["compradorClienteId"],
      where: { compradorClienteId: { in: clienteIds }, dataCompra: { gte: desde } },
      _sum: { valorPago: true },
    }),
  ])

  for (const s of sessoes) {
    mapa.set(s.clienteId, (mapa.get(s.clienteId) ?? 0) + Number(s._sum.preco ?? 0))
  }
  for (const v of vouchers) {
    if (!v.compradorClienteId) continue
    mapa.set(v.compradorClienteId, (mapa.get(v.compradorClienteId) ?? 0) + Number(v._sum.valorPago ?? 0))
  }
  return mapa
}

/**
 * Aplica a transição de estado a UM cliente (update + audit + webhook + tarefa
 * automática de follow-up). Partilhada entre o motor em lote (cron diário,
 * rede de segurança) e o recálculo inline logo a seguir a uma sessão passar
 * a "realizada" — para as duas vias nunca divergirem.
 */
async function aplicarTransicaoEstado(
  c: ClienteParaTransicao,
  hoje: Date,
  diasReativacao: number
): Promise<{ alterado: boolean; de?: string; para?: string }> {
  const novoEstado = calcularEstado(c, hoje, diasReativacao)
  if (novoEstado === c.estado) return { alterado: false }

  await prisma.cliente.update({
    where: { id: c.id },
    data: { estado: novoEstado },
  })

  auditar({
    quem: "sistema",
    acao: "cliente.estado_alterado",
    entidade: "Cliente",
    entidadeId: c.id,
    detalhe: { de: c.estado, para: novoEstado },
  })

  void webhooks.clienteEstadoAlterado({
    clienteId: c.id,
    nomeCliente: c.nome,
    estadoAnterior: c.estado,
    estadoNovo: novoEstado,
  })

  // Criar tarefa automática de follow-up quando cliente entra em reativacao
  if (novoEstado === "reativacao" && c.estado !== "reativacao") {
    try {
      const ultimaSessao = await prisma.sessao.findFirst({
        where: { clienteId: c.id, estado: "realizada" },
        orderBy: { data: "desc" },
        select: { terapeutaId: true },
      })
      // criadoPor é FK obrigatória para User.id — nunca escrever um valor que
      // não seja um utilizador real. Sem terapeuta da última sessão nem admin
      // ativo, não há a quem atribuir a tarefa: não a criamos (em vez de
      // tentar gravar um "sistema" inválido que violava a FK e falhava
      // silenciosamente, sem tarefa nenhuma e sem aviso visível).
      let criadoPor = ultimaSessao?.terapeutaId
      if (!criadoPor) {
        const admin = await prisma.user.findFirst({ where: { role: "admin", ativo: true }, select: { id: true } })
        criadoPor = admin?.id
      }

      if (!criadoPor) {
        console.error(`[estados] sem admin/terapeuta disponível para atribuir tarefa de reativação do cliente ${c.id} — tarefa não criada`)
      } else {
        const dataLimite = new Date(hoje)
        dataLimite.setDate(dataLimite.getDate() + 7)

        // Só criar se não existir já uma tarefa pendente de follow_up para este cliente
        const jaExiste = await prisma.tarefa.findFirst({
          where: { clienteId: c.id, tipo: "follow_up", estado: { in: ["pendente", "em_progresso"] } },
        })
        if (!jaExiste) {
          await prisma.tarefa.create({
            data: {
              clienteId:  c.id,
              titulo:     `Contactar ${c.nome}`,
              tipo:       "follow_up",
              prioridade: "alta",
              estado:     "pendente",
              dataLimite,
              criadoPor,
              ...(ultimaSessao?.terapeutaId ? { atribuidaA: ultimaSessao.terapeutaId } : {}),
            },
          })
        }
      }
    } catch (e) {
      // Não bloquear a transição se a criação de tarefa falhar
      console.error(`[estados] falha ao criar tarefa automática para ${c.id}:`, (e as Error).message)
    }
  }

  return { alterado: true, de: c.estado, para: novoEstado }
}

/**
 * Recalcula o estado de UM cliente imediatamente — chamado logo a seguir a
 * uma sessão passar a "realizada" (pos-sessao.html, PATCH /sessoes/[id]),
 * para o dashboard não ficar até 24h desfasado à espera do cron das 7h.
 * O cron continua a correr como rede de segurança (apanha "perdida"/
 * "reativacao" por mera passagem do tempo, sem sessão nova).
 */
export async function recalcularEstadoCliente(clienteId: string): Promise<void> {
  try {
    const config = await getConfigNegocio()
    const c = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true, nome: true, estado: true, apagadoEm: true, anonimizadoEm: true,
        ultimaSessao: true, totalSessoes: true, totalGasto: true,
      },
    })
    if (!c || c.apagadoEm || c.anonimizadoEm || c.estado === "blacklist") return

    const hoje = new Date()
    const gastoRecente = await calcularGastoRecentePorCliente([c.id], hoje)

    await aplicarTransicaoEstado(
      { ...c, totalGasto: Number(c.totalGasto), gastoUltimos30Dias: gastoRecente.get(c.id) ?? 0 },
      hoje,
      config.diasReativacao
    )
  } catch (e) {
    // Nunca bloquear o fluxo da sessão por causa disto — o cron diário
    // continua a apanhar este cliente como rede de segurança.
    console.error(`[estados] falha ao recalcular estado inline do cliente ${clienteId}:`, (e as Error).message)
  }
}

/** Percorre todas as clientes ativas e aplica as transições devidas. */
export async function executarMotorEstados(): Promise<ResultadoMotor> {
  const config = await getConfigNegocio()
  const diasReativacao = config.diasReativacao

  const clientes = await prisma.cliente.findMany({
    where: {
      apagadoEm: null,
      anonimizadoEm: null,
      estado: { not: "blacklist" },
    },
    select: {
      id: true, nome: true, estado: true,
      ultimaSessao: true, totalSessoes: true, totalGasto: true,
    },
  })

  const resultado: ResultadoMotor = { analisados: clientes.length, alterados: 0, falhas: 0, transicoes: [] }
  const hoje = new Date()
  const gastoRecentePorCliente = await calcularGastoRecentePorCliente(clientes.map(c => c.id), hoje)

  for (const c of clientes) {
    // Isolamento por cliente: uma falha (constraint, blip de ligação) não pode
    // abortar o lote inteiro e deixar os clientes seguintes sem recálculo.
    try {
      const dados = { ...c, totalGasto: Number(c.totalGasto), gastoUltimos30Dias: gastoRecentePorCliente.get(c.id) ?? 0 }
      const r = await aplicarTransicaoEstado(dados, hoje, diasReativacao)
      if (r.alterado) {
        resultado.alterados++
        resultado.transicoes.push({ clienteId: c.id, nome: c.nome, de: r.de!, para: r.para! })
      }
    } catch (e) {
      // Isola a falha a este cliente; o motor continua para os restantes e
      // reporta a contagem de falhas para ficar visível nos logs do Vercel.
      resultado.falhas++
      console.error(`[motor] falha ao recalcular estado do cliente ${c.id}:`, e)
    }
  }

  return resultado
}
