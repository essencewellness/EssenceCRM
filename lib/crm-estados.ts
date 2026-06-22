// Motor de transição automática dos 9 estados CRM.
// Corre diariamente (Vercel Cron → /api/cron/estados) — o CRM deixa de
// depender do N8N para manter os estados corretos.
//
// Regras (alinhadas com a segmentação do Notion):
//   lead              → sem nenhuma sessão realizada
//   novo              → 1 sessão realizada, há menos de 30 dias
//   ativa_recente     → sessão nos últimos 30 dias
//   ativa_frequente   → 4+ sessões e última há menos de diasReativacao dias
//   vip_embaixadora   → VIP (8+ sessões ou €300+ gastos) ativa (≤30 dias)
//   vip_em_risco      → VIP sem sessão há 30–diasReativacao dias
//   reativacao        → sem sessão há mais de diasReativacao dias
//   perdida           → sem sessão há mais de 180 dias
//   blacklist         → manual; o motor NUNCA toca
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { auditar } from "@/lib/audit"
import { getConfigNegocio } from "@/lib/config-negocio"
import type { EstadoCliente } from "@prisma/client"

const VIP_MIN_SESSOES = 8
const VIP_MIN_GASTO = 300

export interface DadosClienteEstado {
  estado: EstadoCliente
  ultimaSessao: Date | null
  totalSessoes: number
  totalGasto: number
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
  const ehVip = c.totalSessoes >= VIP_MIN_SESSOES || c.totalGasto >= VIP_MIN_GASTO

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
  transicoes: Array<{ clienteId: string; nome: string; de: string; para: string }>
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

  const resultado: ResultadoMotor = { analisados: clientes.length, alterados: 0, transicoes: [] }
  const hoje = new Date()

  for (const c of clientes) {
    const novoEstado = calcularEstado(
      { ...c, totalGasto: Number(c.totalGasto) },
      hoje,
      diasReativacao
    )
    if (novoEstado === c.estado) continue

    await prisma.cliente.update({
      where: { id: c.id },
      data: { estado: novoEstado },
    })

    resultado.alterados++
    resultado.transicoes.push({ clienteId: c.id, nome: c.nome, de: c.estado, para: novoEstado })

    auditar({
      quem: "sistema",
      acao: "cliente.estado_alterado",
      entidade: "Cliente",
      entidadeId: c.id,
      detalhe: { de: c.estado, para: novoEstado, motor: true },
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
        const dataLimite = new Date(hoje)
        dataLimite.setDate(dataLimite.getDate() + 7)

        // criadoPor: usar terapeutaId da última sessão; fallback para admin do sistema
        let criadoPor = ultimaSessao?.terapeutaId
        if (!criadoPor) {
          const admin = await prisma.user.findFirst({ where: { role: "admin", ativo: true }, select: { id: true } })
          criadoPor = admin?.id ?? "sistema"
        }

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
      } catch (e) {
        // Não bloquear o motor se a criação de tarefa falhar
        console.error(`[motor] falha ao criar tarefa automática para ${c.id}:`, e)
      }
    }
  }

  return resultado
}
