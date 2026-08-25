import { prisma } from "@/lib/prisma"

// Há só UMA sala física — mesmo com duas terapeutas, nunca pode haver duas
// sessões de clientes diferentes na mesma sala ao mesmo tempo. A única
// excepção (massagem a dois) já não precisa de tratamento especial aqui:
// é modelada como UMA única linha Sessao (terapeutaId + terapeuta2Id na
// mesma marcação — ver schema.prisma), nunca como duas linhas a sobrepor-se.
// Por isso a regra reduz-se a: nenhuma sessão activa pode sobrepor-se no
// tempo a outra sessão activa, seja de quem for.

export interface ConflitoAgenda {
  sessaoId: string
  clienteNome: string
  hora: string
}

function minutosDesdeMeiaNoite(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const DURACAO_PADRAO_MIN = 60

interface ParametrosConflito {
  data: Date
  hora: string
  duracao?: number | null
  /** Ao editar uma sessão existente, excluí-la da comparação consigo mesma. */
  excluirSessaoId?: string
}

/**
 * Devolve a primeira sessão activa que ocupa a sala no mesmo intervalo de
 * tempo, ou null se o horário estiver livre. Sem "hora" definida não há
 * nada para comparar (ex.: sessão só com o dia, ainda por marcar a hora).
 */
export async function encontrarConflitoAgenda({
  data, hora, duracao, excluirSessaoId,
}: ParametrosConflito): Promise<ConflitoAgenda | null> {
  const inicioNovo = minutosDesdeMeiaNoite(hora)
  const fimNovo = inicioNovo + (duracao ?? DURACAO_PADRAO_MIN)

  const inicioDia = new Date(data)
  inicioDia.setHours(0, 0, 0, 0)
  const fimDia = new Date(inicioDia)
  fimDia.setDate(fimDia.getDate() + 1)

  const candidatas = await prisma.sessao.findMany({
    where: {
      apagadoEm: null,
      data: { gte: inicioDia, lt: fimDia },
      estado: { notIn: ["cancelada", "falta"] },
      hora: { not: null },
      ...(excluirSessaoId ? { id: { not: excluirSessaoId } } : {}),
    },
    select: { id: true, hora: true, duracao: true, cliente: { select: { nome: true } } },
  })

  for (const c of candidatas) {
    const inicioExistente = minutosDesdeMeiaNoite(c.hora!)
    const fimExistente = inicioExistente + (c.duracao ?? DURACAO_PADRAO_MIN)
    // Sobreposição de intervalos: [a,b) vs [c,d) tocam-se se a<d && c<b
    if (inicioNovo < fimExistente && inicioExistente < fimNovo) {
      return { sessaoId: c.id, clienteNome: c.cliente.nome, hora: c.hora! }
    }
  }
  return null
}

export function mensagemConflitoAgenda(c: ConflitoAgenda): string {
  return `Já há uma sessão marcada às ${c.hora} (${c.clienteNome}) — só há uma sala, não é possível sobrepor horários (excepto massagem a dois, atribuída à mesma sessão).`
}

// Classe dedicada para os server actions distinguirem "regra de negócio,
// mensagem segura para mostrar à Bea" de erros internos (Prisma/JS) que
// nunca devem chegar ao ecrã tal como vêm.
export class ConflitoAgendaError extends Error {
  constructor(public conflito: ConflitoAgenda) {
    super(mensagemConflitoAgenda(conflito))
    this.name = "ConflitoAgendaError"
  }
}
