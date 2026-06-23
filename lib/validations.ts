// Schemas Zod partilhados por toda a API v1.
// Regra: nenhum body entra num handler sem passar por um schema .strict()
// (mass-assignment impossível — campos desconhecidos são rejeitados).
import { z } from "zod"
import { NextResponse } from "next/server"

// ── Primitivos reutilizáveis ──────────────────────────────────

export const ESTADOS_PAGAMENTO = ["pendente", "pago", "parcial", "isento"] as const
export const METODOS_PAGAMENTO = ["dinheiro", "mbway", "transferencia", "voucher"] as const
export const ESTADOS_CAMPANHA = ["ativa", "cancelada", "concluida"] as const
export const TIPOS_MENSAGEM = ["reengagement", "avaliacao", "aniversario", "campanha", "boas_vindas"] as const

export const ESTADOS_TAREFA = ["pendente", "em_progresso", "concluida", "cancelada"] as const
export const PRIORIDADES_TAREFA = ["baixa", "normal", "alta", "urgente"] as const
export const TIPOS_TAREFA = ["follow_up", "ligacao", "mensagem", "nota", "outro"] as const

export const ESTADOS_CLIENTE = [
  "lead", "novo", "ativa_recente", "ativa_frequente", "vip_embaixadora",
  "vip_em_risco", "reativacao", "perdida", "blacklist",
] as const

export const ESTADOS_SESSAO = ["agendada", "confirmada", "aguarda_terapeuta", "realizada", "cancelada", "falta"] as const
export const ESTADOS_MENSAGEM = ["pendente", "aprovada", "em_fila", "enviada", "rejeitada", "falhada"] as const
export const CANAIS = ["whatsapp", "email", "sms"] as const

const texto = z.string().trim().min(1).max(2000)
const textoOpcional = texto.max(5000).optional().nullable()
const emailSchema = z.string().trim().toLowerCase().email().max(254)
const telefoneSchema = z.string().trim().min(6).max(20).regex(/^[+\d\s().-]+$/, "Telefone com caracteres inválidos")
const dataISO = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida")
const precoSchema = z.coerce.number().min(0).max(10_000)

// ── Clientes ──────────────────────────────────────────────────

export const clienteCreateSchema = z.object({
  nome: texto.max(120),
  telefone: telefoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
  fonte: z.string().trim().max(60).optional(),
  comoNosConheceu: z.string().trim().max(120).optional().nullable(),
  dataNascimento: dataISO.optional().nullable(),
  aceitaMarketing: z.boolean().optional(),
}).strict()

// Whitelist explícita — corrige o mass-assignment do PATCH antigo
export const clienteUpdateSchema = z.object({
  nome: texto.max(120).optional(),
  telefone: telefoneSchema.optional().nullable(),
  email: emailSchema.optional().nullable(),
  dataNascimento: dataISO.optional().nullable(),
  comoNosConheceu: z.string().trim().max(120).optional().nullable(),
  fonte: z.string().trim().max(60).optional(),
  estado: z.enum(ESTADOS_CLIENTE).optional(),
  historicoAromasPreferidos: textoOpcional,
  historicoCondicoesAlergias: textoOpcional,
  historicoEstadoEmocional: textoOpcional,
  historicoZonasTensao: textoOpcional,
  historicoUltimaPausa: textoOpcional,
  notasPessoais: textoOpcional,
  canalPreferido: z.enum(CANAIS).optional(),
  temWhatsapp: z.boolean().optional(),
  aceitaMarketing: z.boolean().optional(),
  melhorDiaContacto: z.string().trim().max(60).optional().nullable(),
  ultimaSessao: dataISO.optional().nullable(),
  totalSessoes: z.coerce.number().int().min(0).max(100_000).optional(),
  totalGasto: precoSchema.optional(),
  consentimentoMarketingEm: dataISO.optional().nullable(),
  consentimentoSaudeEm: dataISO.optional().nullable(),
}).strict()

export const clientesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(), // pesquisa livre: nome, email, telefone
  estado: z.enum(ESTADOS_CLIENTE).optional(),
  canal: z.enum(CANAIS).optional(),
  aceitaMarketing: z.enum(["true", "false"]).optional(),
  email: emailSchema.optional(),
  telefone: z.string().trim().max(20).optional(),
  inactivos_desde_dias: z.coerce.number().int().min(1).max(3650).optional(),
  semMensagemDias: z.coerce.number().int().min(1).max(365).optional(),
  blacklist: z.enum(["true"]).optional(),
  ativo: z.enum(["true"]).optional(),
  etiquetas: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  etiquetas_modo: z.enum(["and", "or"]).default("or"),
  sem_automacoes: z.enum(["true"]).optional(),
  terapeuta: z.string().trim().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().trim().max(64).optional(),
})

// ── Sessões ───────────────────────────────────────────────────

export const sessaoCreateSchema = z.object({
  clienteId: z.string().trim().max(64).optional(),
  telefone: telefoneSchema.optional(),
  email: emailSchema.optional(),
  data: dataISO,
  hora: z.string().trim().max(10).optional().nullable(),
  duracao: z.coerce.number().int().min(5).max(480).optional().nullable(),
  servico: z.string().trim().max(120).optional().nullable(),
  preco: precoSchema.optional().nullable(),
  terapeuta: z.string().trim().max(60).optional(),
  estado: z.enum(ESTADOS_SESSAO).optional(),
  aromaSessao: z.string().trim().max(120).optional().nullable(),
  resumoSessao: textoOpcional,
  linkDocumento: z.string().trim().url().max(500).optional().nullable(),
}).strict()

export const sessaoUpdateSchema = z.object({
  estado: z.enum(ESTADOS_SESSAO).optional(),
  resumoSessao: textoOpcional,
  notasPosSessao: textoOpcional,
  aromaSessao: z.string().trim().max(120).optional().nullable(),
  estadoEmocional: z.string().trim().max(200).optional().nullable(),
  linkDocumento: z.string().trim().url().max(500).optional().nullable(),
  dataRecomendadaRegresso: dataISO.optional().nullable(),
  preco: precoSchema.optional().nullable(),
  servico: z.string().trim().max(120).optional().nullable(),
  // Rastreio de comunicações automáticas N8N
  briefingEnviado:     z.boolean().optional(),
  lembreteEnviado:     z.boolean().optional(),
  confirmacaoPresenca: z.boolean().nullable().optional(),
  nutricao14dEnviado:  z.boolean().optional(),
  nutricao7dEnviado:   z.boolean().optional(),
  googleDocLink:       z.string().trim().max(500).nullable().optional(),
  // Pagamento
  estadoPagamento:  z.enum(ESTADOS_PAGAMENTO).optional(),
  valorPago:        z.coerce.number().min(0).max(10_000).optional().nullable(),
  metodoPagamento:  z.enum(METODOS_PAGAMENTO).optional().nullable(),
  pagamentoEm:      dataISO.optional().nullable(),
  // Integrações
  calendarEventId:  z.string().trim().max(256).optional().nullable(),
  pdfUrl:           z.string().trim().url().max(500).optional().nullable(),
  calendlyEventUri: z.string().trim().max(500).optional().nullable(),
  // Avaliação
  avaliacaoNota:         z.coerce.number().int().min(1).max(5).optional().nullable(),
  avaliacaoComentario:   z.string().trim().max(1000).optional().nullable(),
  avaliacaoEnviadaEm:    dataISO.optional().nullable(),
  avaliacaoRespondidaEm: dataISO.optional().nullable(),
}).strict()

export const sessoesQuerySchema = z.object({
  clienteId:          z.string().trim().max(64).optional(),
  estado:             z.enum(ESTADOS_SESSAO).optional(),
  status:             z.enum(ESTADOS_SESSAO).optional(),
  data:               z.enum(["hoje", "amanha"]).optional(),
  briefingEnviado:    z.enum(["true", "false"]).optional(),
  lembreteEnviado:    z.enum(["true", "false"]).optional(),
  nutricao14dEnviado: z.enum(["true", "false"]).optional(),
  nutricao7dEnviado:  z.enum(["true", "false"]).optional(),
  proxima:            z.enum(["true"]).optional(),
  terapeuta:          z.string().trim().max(60).optional(),
  de:                 z.string().optional(),
  ate:                z.string().optional(),
  limit:              z.coerce.number().int().min(1).max(200).default(50),
  cursor:             z.string().trim().max(64).optional(),
})

// ── Mensagens IA ──────────────────────────────────────────────

export const mensagemCreateSchema = z.object({
  clienteId: z.string().trim().max(64).optional(),
  telefone: telefoneSchema.optional(),
  email: emailSchema.optional(),
  mensagemGerada: texto.max(4000),
  canal: z.enum(CANAIS).optional(),
  motivoGeracao: z.string().trim().max(300).optional().nullable(),
}).strict()

export const mensagemPatchSchema = z.object({
  mensagemId: z.string().trim().max(64),
  estado: z.enum(ESTADOS_MENSAGEM),
  mensagemFinal: texto.max(4000).optional(),
  converteu: z.boolean().optional(),
}).strict()

// Aprovação em massa — coração do "20 mensagens em 10 minutos"
export const aprovarBulkSchema = z.object({
  mensagens: z.array(z.object({
    id: z.string().trim().max(64),
    mensagemFinal: texto.max(4000).optional(),
  })).min(1).max(100),
  // espaçamento entre envios em segundos (anti-ban WhatsApp)
  espacamentoMinSeg: z.coerce.number().int().min(10).max(600).default(30),
  espacamentoMaxSeg: z.coerce.number().int().min(10).max(900).default(90),
}).strict()

// ── Webhooks de entrada ───────────────────────────────────────

export const whatsappInboundSchema = z.object({
  telefone: telefoneSchema,
  mensagem: z.string().trim().min(1).max(10_000),
  timestamp: dataISO.optional(),
  tipo: z.string().trim().max(40).optional(),
}).strict()

export const confirmacaoEnvioSchema = z.object({
  mensagemId: z.string().trim().max(64),
  sucesso: z.boolean(),
  erroDescricao: z.string().trim().max(1000).optional(),
}).strict()

// ── Endpoints públicos ────────────────────────────────────────

export const leadPublicSchema = z.object({
  nome: texto.max(120),
  email: emailSchema,
  telefone: telefoneSchema.optional().nullable(),
  servico_interesse: z.string().trim().max(120).optional().nullable(),
  como_nos_conheceu: z.string().trim().max(120).optional().nullable(),
  consentimento_marketing: z.boolean().optional(),
  // Honeypot anti-bot: campo invisível no form — se vier preenchido, é bot
  website: z.string().max(0).optional(),
}).strict()

export const onboardingPublicSchema = z.object({
  clienteId: z.string().trim().max(64).optional().nullable(),
  sessaoId: z.string().trim().max(64).optional().nullable(),
  nome: texto.max(120).optional().nullable(),
  email: emailSchema.optional().nullable(),
  telefone: telefoneSchema.optional().nullable(),
  dataNascimento: dataISO.optional().nullable(),
  comoNosConheceu: z.string().trim().max(120).optional().nullable(),
  historicoCondicoesAlergias: textoOpcional,
  historicoZonasTensao: textoOpcional,
  historicoEstadoEmocional: textoOpcional,
  historicoAromasPreferidos: textoOpcional,
  notasPessoais: textoOpcional,
  voucherCodigo: z.string().trim().max(40).optional().nullable(),
  consentimentoSaude: z.boolean().optional(),
  website: z.string().max(0).optional(), // honeypot
}).strict()

// ── Serviços ──────────────────────────────────────────────────

export const servicoCreateSchema = z.object({
  nome: texto.max(120),
  descricao: textoOpcional,
  duracaoMinutos: z.coerce.number().int().min(5).max(480).optional().default(60),
  precoBase: precoSchema,
  ativo: z.boolean().optional(),
}).strict()

export const servicoUpdateSchema = z.object({
  nome: texto.max(120).optional(),
  descricao: textoOpcional,
  duracaoMinutos: z.coerce.number().int().min(5).max(480).optional(),
  precoBase: precoSchema.optional(),
  ativo: z.boolean().optional(),
}).strict()

export const servicoQuerySchema = z.object({
  ativo: z.enum(["true", "false"]).optional(),
  nome: z.string().trim().max(120).optional(),
})

// ── Preços Personalizados ─────────────────────────────────────

export const precoPersonalizadoCreateSchema = z.object({
  servicoId: z.string().trim().max(64),
  valor: precoSchema,
  motivo: z.string().trim().max(200).optional().nullable(),
  validade: dataISO.optional().nullable(),
}).strict()

// ── Packs de Sessões ──────────────────────────────────────────

export const packCreateSchema = z.object({
  servicoId: z.string().trim().max(64),
  totalSessoes: z.coerce.number().int().min(1).max(100),
  valorTotal: precoSchema,
  descricao: z.string().trim().max(200).optional().nullable(),
}).strict()

export const packUpdateSchema = z.object({
  sessoesUsadas: z.coerce.number().int().min(0).max(100).optional(),
  ativo: z.boolean().optional(),
  descricao: z.string().trim().max(200).optional().nullable(),
}).strict()

// ── Templates ────────────────────────────────────────────────

export const templateUpdateSchema = z.object({
  texto: z.string().trim().min(1).max(2000),
}).strict()

export const templateQuerySchema = z.object({
  nome: z.string().trim().max(120).optional(),
  tipo: z.string().trim().max(60).optional(),
})

// ── Campanhas ─────────────────────────────────────────────────

export const campanhaCreateSchema = z.object({
  nome:       z.string().trim().min(1).max(120),
  templateId: z.string().trim().max(64),
  segmento:   z.object({
    tipo:  z.enum(["servico", "estado", "inatividade", "todos"]),
    valor: z.string().trim().max(100).optional(),
  }),
  espacamentoMinSeg: z.coerce.number().int().min(10).max(600).default(30),
  espacamentoMaxSeg: z.coerce.number().int().min(10).max(900).default(90),
}).strict()

export const campanhasQuerySchema = z.object({
  estado: z.enum(ESTADOS_CAMPANHA).optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().max(64).optional(),
})

// ── Portal do Cliente ──────────────────────────────────────────

export const portalRemarcarSchema = z.object({
  mensagem:    z.string().trim().min(1).max(1000),
  preferencia: z.string().trim().max(200).optional(),
  website:     z.string().max(0).optional(), // honeypot
}).strict()

// ── Dashboard ─────────────────────────────────────────────────

export const kpisQuerySchema = z.object({
  mes:    z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM").optional(),
  semana: z.string().regex(/^\d{4}-W\d{2}$/, "Formato YYYY-Www").optional(),
})

export const financeiroQuerySchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM").optional(),
})

// ── Tarefas ───────────────────────────────────────────────────

export const tarefaCreateSchema = z.object({
  clienteId:  z.string().trim().max(64).optional().nullable(),
  titulo:     z.string().trim().min(1).max(200),
  descricao:  z.string().trim().max(2000).optional().nullable(),
  dataLimite: dataISO.optional().nullable(),
  prioridade: z.enum(PRIORIDADES_TAREFA).optional(),
  tipo:       z.enum(TIPOS_TAREFA).optional(),
  atribuidaA: z.string().trim().max(64).optional().nullable(),
}).strict()

export const tarefaUpdateSchema = z.object({
  titulo:     z.string().trim().min(1).max(200).optional(),
  descricao:  z.string().trim().max(2000).optional().nullable(),
  dataLimite: dataISO.optional().nullable(),
  estado:     z.enum(ESTADOS_TAREFA).optional(),
  prioridade: z.enum(PRIORIDADES_TAREFA).optional(),
  tipo:       z.enum(TIPOS_TAREFA).optional(),
  atribuidaA: z.string().trim().max(64).optional().nullable(),
}).strict()

export const tarefaQuerySchema = z.object({
  clienteId:  z.string().trim().max(64).optional(),
  estado:     z.enum(ESTADOS_TAREFA).optional(),
  atribuidaA: z.string().trim().max(64).optional(),
  tipo:       z.enum(TIPOS_TAREFA).optional(),
  prioridade: z.enum(PRIORIDADES_TAREFA).optional(),
  de:         z.string().optional(),
  ate:        z.string().optional(),
  terapeuta:  z.string().trim().max(64).optional(),
  limit:      z.coerce.number().int().min(1).max(500).default(50),
  cursor:     z.string().trim().max(64).optional(),
})

export const bulkEtiquetasSchema = z.object({
  clienteIds: z.array(z.string().trim().max(64)).min(1).max(500),
  etiquetaId: z.string().trim().max(64),
  acao:       z.enum(["aplicar", "remover"]),
}).strict()

// ── Feedback público (24h pós-sessão) ────────────────────────

export const feedbackPublicSchema = z.object({
  clienteId:      z.string().trim().max(64),
  sessaoId:       z.string().trim().max(64).optional().nullable(),
  rating:         z.coerce.number().int().min(1).max(5),
  pontosPositivos: z.string().trim().max(1000).optional().nullable(),
  pontosMelhorar: z.string().trim().max(2000).optional().nullable(),
  comentario:     z.string().trim().max(2000).optional().nullable(),
  website:        z.string().max(0).optional(), // honeypot
}).strict()

// ── Helper de validação ───────────────────────────────────────

type ParseResultado<T> =
  | { ok: true; data: T }
  | { ok: false; resposta: NextResponse }

export async function validarBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParseResultado<z.infer<S>>> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json(
        { error: "Body JSON inválido", code: "JSON_INVALIDO" },
        { status: 400 }
      ),
    }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return {
      ok: false,
      resposta: NextResponse.json(
        {
          error: "Dados inválidos",
          code: "VALIDACAO_FALHOU",
          detalhes: parsed.error.issues.map((i) => ({
            campo: i.path.join("."),
            problema: i.message,
          })),
        },
        { status: 400 }
      ),
    }
  }

  return { ok: true, data: parsed.data }
}

export function validarQuery<S extends z.ZodTypeAny>(
  url: string,
  schema: S
): ParseResultado<z.infer<S>> {
  const params = Object.fromEntries(new URL(url).searchParams.entries())
  const parsed = schema.safeParse(params)
  if (!parsed.success) {
    return {
      ok: false,
      resposta: NextResponse.json(
        {
          error: "Parâmetros de pesquisa inválidos",
          code: "QUERY_INVALIDA",
          detalhes: parsed.error.issues.map((i) => ({
            campo: i.path.join("."),
            problema: i.message,
          })),
        },
        { status: 400 }
      ),
    }
  }
  return { ok: true, data: parsed.data }
}

// Normalização de telefone consistente em toda a API
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, "").replace(/^351/, "")
}
