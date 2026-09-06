// Schemas Zod partilhados por toda a API v1.
// Regra: nenhum body entra num handler sem passar por um schema .strict()
// (mass-assignment impossível — campos desconhecidos são rejeitados).
import { z } from "zod"
import { NextResponse } from "next/server"

// ── Primitivos reutilizáveis ──────────────────────────────────

export const ESTADOS_PAGAMENTO = ["pendente", "pago", "parcial", "isento"] as const
// "mbway" mantido só por compatibilidade com registos antigos — os forms
// novos usam sempre mbway_essence/mbway_beatriz (ver Sessao.repasseNecessario)
export const METODOS_PAGAMENTO = ["dinheiro", "mbway", "mbway_essence", "mbway_beatriz", "transferencia", "stripe", "voucher"] as const
export const ESTADOS_CAMPANHA = ["ativa", "cancelada", "concluida"] as const
export const TIPOS_MENSAGEM = [
  "reengagement", "avaliacao", "aniversario", "campanha", "boas_vindas",
  "nutricao", "continuidade", "nps_baixo", "perdida_reconquista", "vip_cuidado",
  "lead_nurture", "ativa_reconhecimento",
] as const

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
  // Estado inicial — só "lead" (formulário de captação, sem marcação) ou
  // "novo" (já vem com sessão marcada, ex.: Calendly via WF01). Os
  // restantes estados só fazem sentido depois do motor de estados analisar
  // histórico real, nunca na criação.
  estado: z.enum(["lead", "novo"]).optional(),
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
  fichaClinica: textoOpcional,
  canalPreferido: z.enum(CANAIS).optional(),
  temWhatsapp: z.boolean().optional(),
  aceitaMarketing: z.boolean().optional(),
  melhorDiaContacto: z.string().trim().max(60).optional().nullable(),
  ultimaSessao: dataISO.optional().nullable(),
  totalSessoes: z.coerce.number().int().min(0).max(100_000).optional(),
  totalGasto: precoSchema.optional(),
  consentimentoMarketingEm: dataISO.optional().nullable(),
  consentimentoSaudeEm: dataISO.optional().nullable(),
  // Não é campo do Cliente — metadado só lido quando "fichaClinica" vem
  // junto (o N8N manda a sessão que gerou a atualização via onboarding).
  // Serve para assinalar a ficha se essa sessão vier a ser cancelada antes
  // de acontecer (ver lib/ficha-clinica.ts). Retirado do payload antes do
  // update ao Cliente — nunca chega ao Prisma.
  //
  // preprocess: "" → undefined. Bug real 2026-09-03 — o node do N8N manda
  // sempre este campo, mesmo vazio (`$json.sessaoId || ''`), quando o
  // onboarding não está ligado a nenhuma sessão (ex: lead sem marcação).
  // Com min(1) sozinho, uma string vazia chumbava a validação e o PATCH
  // FALHAVA POR INTEIRO — a fichaClinica nem chegava a gravar, não só o
  // rasto do snapshot. Confirmado em produção: execução 15243 do workflow
  // 02 (400 "Dados inválidos" com origemSessaoId:"").
  origemSessaoId: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().min(1).max(60).optional()
  ),
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
  // Janela "between" — falta no inactivos_desde_dias (só tem "lt"). Criada
  // para o check-in de continuidade (D+5 a D+14 pós-sessão), mas serve
  // qualquer segmentação por intervalo de dias desde a última sessão.
  ultimaSessaoDesdeDiasMin: z.coerce.number().int().min(0).max(3650).optional(),
  ultimaSessaoDesdeDiasMax: z.coerce.number().int().min(0).max(3650).optional(),
  semPackAtivo: z.enum(["true"]).optional(),
  // Mesmo padrão "between" que ultimaSessaoDesdeDias*, mas sobre criadoEm —
  // necessário para leads (nunca têm ultimaSessao, é null) no nurture de
  // quem preencheu o onboarding mas nunca chegou a marcar.
  criadoDesdeDiasMin: z.coerce.number().int().min(0).max(3650).optional(),
  criadoDesdeDiasMax: z.coerce.number().int().min(0).max(3650).optional(),
  // "Pausa mestre" (achado da pesquisa NotebookLM, 2026-09-05): nunca gerar
  // reconquista/reconhecimento para quem já tem uma sessão marcada — soa a
  // sistema que não sabe o que já aconteceu, destrói a confiança na hora.
  semSessaoFutura: z.enum(["true"]).optional(),
  blacklist: z.enum(["true"]).optional(),
  ativo: z.enum(["true"]).optional(),
  etiquetas: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
  etiquetas_modo: z.enum(["and", "or"]).default("or"),
  sem_automacoes: z.enum(["true"]).optional(),
  terapeuta: z.string().trim().max(64).optional(),
  // Opt-in: gerar LinkToken por cliente é só necessário para quem vai montar
  // links públicos (N8N) — o dashboard lista clientes sem precisar disto, e
  // gerar em cada scroll/pesquisa poluía a tabela LinkToken sem uso real.
  includeLinkToken: z.enum(["true"]).optional(),
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
  terapeutaId: z.string().trim().max(64).optional().nullable(),
  terapeuta2Id: z.string().trim().max(64).optional().nullable(),
  estado: z.enum(ESTADOS_SESSAO).optional(),
  aromaSessao: z.string().trim().max(120).optional().nullable(),
  resumoSessao: textoOpcional,
  linkDocumento: z.string().trim().url().max(500).optional().nullable(),
  calendlyEventId: z.string().trim().max(128).optional().nullable(),
  calendlyRescheduleUrl: z.string().trim().url().max(500).startsWith("https://").optional().nullable(),
  calendlyCancelUrl:     z.string().trim().url().max(500).startsWith("https://").optional().nullable(),
}).strict()

export const sessaoUpdateSchema = z.object({
  estado: z.enum(ESTADOS_SESSAO).optional(),
  data: dataISO.optional(),
  hora: z.string().trim().max(10).optional().nullable(),
  duracao: z.coerce.number().int().min(5).max(480).optional().nullable(),
  resumoSessao: textoOpcional,
  notasPosSessao: textoOpcional,
  aromaSessao: z.string().trim().max(120).optional().nullable(),
  estadoEmocional: z.string().trim().max(200).optional().nullable(),
  linkDocumento: z.string().trim().url().max(500).optional().nullable(),
  dataRecomendadaRegresso: dataISO.optional().nullable(),
  preco: precoSchema.optional().nullable(),
  servico: z.string().trim().max(120).optional().nullable(),
  terapeutaId: z.string().trim().max(64).optional().nullable(),
  terapeuta2Id: z.string().trim().max(64).optional().nullable(),
  // Rastreio de comunicações automáticas N8N
  briefingEnviado:     z.boolean().optional(),
  lembreteEnviado:     z.boolean().optional(),
  confirmacaoPresenca: z.boolean().nullable().optional(),
  nutricaoBoasVindasEnviado: z.boolean().optional(),
  nutricao14dEnviado:  z.boolean().optional(),
  nutricao7dEnviado:   z.boolean().optional(),
  lembretePosSessaoEnviado: z.boolean().optional(),
  googleDocLink:       z.string().trim().max(500).nullable().optional(),
  briefingJson:        z.record(z.string(), z.unknown()).nullable().optional(),
  // Pagamento
  estadoPagamento:  z.enum(ESTADOS_PAGAMENTO).optional(),
  valorPago:        z.coerce.number().min(0).max(10_000).optional().nullable(),
  metodoPagamento:  z.enum(METODOS_PAGAMENTO).optional().nullable(),
  pagamentoEm:      dataISO.optional().nullable(),
  repasseNecessario: z.boolean().optional(),
  repasseFeito:      z.boolean().optional(),
  valorRepasse:      z.coerce.number().min(0).max(10_000).optional().nullable(),
  etiquetasSugeridasEm: dataISO.optional().nullable(),
  // Integrações
  calendarEventId:  z.string().trim().max(256).optional().nullable(),
  pdfUrl:           z.string().trim().url().max(500).optional().nullable(),
  calendlyEventId:  z.string().trim().max(128).optional().nullable(),
  calendlyEventUri: z.string().trim().max(500).optional().nullable(),
  calendlyRescheduleUrl: z.string().trim().url().max(500).startsWith("https://").optional().nullable(),
  calendlyCancelUrl:     z.string().trim().url().max(500).startsWith("https://").optional().nullable(),
  // Avaliação
  avaliacaoNota:         z.coerce.number().int().min(1).max(5).optional().nullable(),
  avaliacaoComentario:   z.string().trim().max(1000).optional().nullable(),
  avaliacaoEnviadaEm:    dataISO.optional().nullable(),
  avaliacaoRespondidaEm: dataISO.optional().nullable(),
}).strict()

export const sessoesQuerySchema = z.object({
  clienteId:          z.string().trim().max(64).optional(),
  calendlyEventId:    z.string().trim().max(128).optional(),
  estado:             z.enum(ESTADOS_SESSAO).optional(),
  status:             z.enum(ESTADOS_SESSAO).optional(),
  data:               z.enum(["hoje", "amanha"]).optional(),
  briefingEnviado:    z.enum(["true", "false"]).optional(),
  lembreteEnviado:    z.enum(["true", "false"]).optional(),
  nutricaoBoasVindasEnviado: z.enum(["true", "false"]).optional(),
  nutricao14dEnviado: z.enum(["true", "false"]).optional(),
  nutricao7dEnviado:  z.enum(["true", "false"]).optional(),
  lembretePosSessaoEnviado: z.enum(["true", "false"]).optional(),
  // "false" → sessões ainda por passar pela sugestão de etiquetas IA (Groq)
  etiquetasSugeridas: z.enum(["true", "false"]).optional(),
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
  // Sem isto, toda mensagem criada por N8N caía sempre no default do schema
  // Prisma ("reengagement") — impossível agrupar por tipo real no separador
  // de desempenho. Opcional para não partir chamadas antigas.
  tipo: z.enum(TIPOS_MENSAGEM).optional(),
}).strict()

export const mensagensQuerySchema = z.object({
  estado:    z.enum(ESTADOS_MENSAGEM).default("pendente"),
  canal:     z.enum(CANAIS).optional(),
  clienteId: z.string().trim().max(64).optional(),
  limit:     z.coerce.number().int().min(1).max(200).default(50),
  cursor:    z.string().trim().max(64).optional(),
})

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
    // Hora desejada para ESTA mensagem em particular (2026-09-04 — antes só
    // existia uma hora única para o lote inteiro). Sem isto, cai para
    // `agendarPara` do lote, ou "agora".
    agendarPara: dataISO.optional(),
  })).min(1).max(100),
  // Espaçamento entre envios em segundos (anti-ban WhatsApp). Sem isto, é
  // calculado automaticamente a partir do nº de mensagens do lote (ver
  // janelaEspacamentoPorVolume em lib/fila-envio.ts) — passar os dois
  // explícitos substitui o cálculo automático.
  espacamentoMinSeg: z.coerce.number().int().min(10).max(600).optional(),
  espacamentoMaxSeg: z.coerce.number().int().min(10).max(900).optional(),
  // Data/hora única para o lote inteiro (compat) — só usada pelos itens sem
  // `agendarPara` própria.
  agendarPara: dataISO.optional(),
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
  // Honeypot anti-bot: campo invisível no form — se vier preenchido, é bot.
  // Sem limite de tamanho aqui: a decisão de tratar como bot é feita na rota
  // (if (website) ...), não no schema — um .max(0) rejeitava com 400 antes
  // de essa lógica correr, incluindo para utilizadoras reais cujo browser/
  // gestor de passwords preenche campos escondidos por nome ("website").
  website: z.string().max(500).optional(),
}).strict()

// Pré-checagem de uso único — ver GET /api/v1/public/onboarding. Só faz
// sentido quando a ficha é para uma sessão concreta (link personalizado);
// sem sessaoId (lead nova a preencher às cegas) não há nada para trancar.
export const onboardingQuerySchema = z.object({
  sessaoId: z.string().trim().max(64),
  t: z.string().trim().max(128).optional().nullable(),
})

export const onboardingPublicSchema = z.object({
  clienteId: z.string().trim().max(64).optional().nullable(),
  sessaoId: z.string().trim().max(64).optional().nullable(),
  t: z.string().trim().max(128).optional().nullable(), // link token assinado (ver lib/link-token.ts)
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
  aceitaMarketing: z.boolean().optional(),
  // honeypot: sem limite de tamanho — ver comentário equivalente em leadPublicSchema
  website: z.string().max(500).optional(),
}).strict()

// Formulário interno da Bea — atribuir terapeuta/preço/nota a uma sessão recém-criada
// pelo Calendly. Público (sem login) para funcionar a partir de um link WhatsApp no
// telemóvel; protegido só pelo sessaoId ser um cuid impossível de adivinhar.
export const atribuirSessaoQuerySchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado (ver lib/link-token.ts)
})

// Ficha de sessão para a terapeuta (relatório clínico Groq, gerado 24h antes).
// Mesmo modelo de confiança que atribuir-sessao: sem login, protegido só pelo
// sessaoId ser um cuid — pensado para abrir a partir de um link WhatsApp.
export const fichaSessaoQuerySchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado
})

// Confirmação de presença pela cliente — mesmo modelo de confiança que
// atribuir-sessao/ficha-sessao: sem login, protegido só pelo sessaoId ser um
// cuid, pensado para abrir a partir do link enviado por WhatsApp.
export const confirmarSessaoQuerySchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado
})

export const confirmarSessaoBodySchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado
}).strict()

export const atribuirSessaoSchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado
  terapeutaId: z.string().trim().max(64),
  // Massagem a dois: preenchido automaticamente pelo formulário (sem
  // perguntar) quando o serviço é "a dois"/"casal" — as duas terapeutas
  // fazem sempre a sessão em conjunto, não há ninguém para escolher.
  terapeuta2Id: z.string().trim().max(64).optional().nullable(),
  preco: precoSchema,
  nota: z.string().trim().max(2000).optional().nullable(),
  website: z.string().max(500).optional(), // honeypot
}).strict()

// Registo de sessão pela terapeuta — mesmo modelo de confiança que
// atribuir-sessao/ficha-sessao/confirmar-sessao: sem login, protegido só pelo
// sessaoId ser um cuid, pensado para abrir a partir do link WhatsApp enviado
// logo após o fim do tratamento (Workflow 05).
export const posSessaoQuerySchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado
})

export const posSessaoPatchSchema = z.object({
  sessaoId: z.string().trim().min(1).max(64),
  t: z.string().trim().max(128).optional(), // link token assinado
  servico: z.string().trim().max(120),
  preco: precoSchema.optional().nullable(),
  aromaSessao: z.string().trim().max(120).optional().nullable(),
  estadoEmocional: z.string().trim().max(200).optional().nullable(),
  resumoSessao: textoOpcional,
  notasPosSessao: textoOpcional,
  dataRecomendadaRegresso: dataISO.optional().nullable(),
  // Pagamento — registado na hora pela terapeuta, para o financeiro não
  // depender de alguém voltar mais tarde e marcar manualmente (spec: a Bea
  // pediu isto porque o financeiro nunca mudava)
  estadoPagamento: z.enum(ESTADOS_PAGAMENTO).optional(),
  valorPago: precoSchema.optional().nullable(),
  metodoPagamento: z.enum(METODOS_PAGAMENTO).optional().nullable(),
  // true quando é a Cristina a receber por MBWay (conta é da Bea) — calculado
  // no forms a partir da terapeuta selecionada, não no servidor
  repasseNecessario: z.boolean().optional(),
  // Massagem a dois: as duas terapeutas fazem a mesma marcação, e o repasse
  // à Cristina é só de metade (o resto é da Bea). Sem isto, a sessão só
  // podia ficar creditada a uma delas e o repasse era sempre 0% ou 100%.
  terapeuta2Id: z.string().trim().max(64).optional().nullable(),
  valorRepasse: precoSchema.optional().nullable(),
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

// ── Gift Cards / Vouchers ───────────────────────────────────────

export const voucherCreateSchema = z.object({
  codigo: z.string().trim().min(1).max(40),
  tipo: z.enum(["digital", "fisico"]).optional(),
  estado: z.enum(["ativo", "agendado", "usado", "expirado", "cancelado"]).optional(),
  compradorNome: texto.max(200),
  compradorTelefone: z.string().trim().max(30).optional().nullable(),
  compradorEmail: z.string().trim().email().max(200).optional().nullable(),
  servicoNome: texto.max(200),
  valorPago: precoSchema,
  beneficiarioNome: z.string().trim().max(200).optional().nullable(),
  beneficiarioTelefone: z.string().trim().max(30).optional().nullable(),
  dataCompra: dataISO.optional(),
  validade: dataISO.optional().nullable(),
  dataUso: dataISO.optional().nullable(),
  notas: textoOpcional,
  clienteId: z.string().trim().max(64).optional().nullable(),
  sessaoId: z.string().trim().max(64).optional().nullable(),
  // Nomes tal como aparecem no voucher — pode ser um grupo ("Ana, Rita e
  // Sofia") enquanto compradorNome guarda só quem falou connosco.
  nomesNoVoucher: z.string().trim().max(200).optional().nullable(),
  mensagemVoucher: z.string().trim().max(500).optional().nullable(),
  // Null = receita da Bea (o normal). Preenchido quando a sessão vai ser
  // feita pela Cristina e o dinheiro tem de entrar nas contas dela.
  terapeutaId: z.string().trim().max(64).optional().nullable(),
  metodoPagamento: z.enum(METODOS_PAGAMENTO).optional().nullable(),
}).strict()

export const voucherUpdateSchema = z.object({
  codigo: z.string().trim().min(1).max(40).optional(),
  tipo: z.enum(["digital", "fisico"]).optional(),
  estado: z.enum(["ativo", "agendado", "usado", "expirado", "cancelado"]).optional(),
  compradorNome: texto.max(200).optional(),
  compradorTelefone: z.string().trim().max(30).optional().nullable(),
  compradorEmail: z.string().trim().email().max(200).optional().nullable(),
  servicoNome: texto.max(200).optional(),
  valorPago: precoSchema.optional(),
  beneficiarioNome: z.string().trim().max(200).optional().nullable(),
  beneficiarioTelefone: z.string().trim().max(30).optional().nullable(),
  validade: dataISO.optional().nullable(),
  dataUso: dataISO.optional().nullable(),
  notas: textoOpcional,
  clienteId: z.string().trim().max(64).optional().nullable(),
  sessaoId: z.string().trim().max(64).optional().nullable(),
  // Nomes tal como aparecem no voucher — pode ser um grupo ("Ana, Rita e
  // Sofia") enquanto compradorNome guarda só quem falou connosco.
  nomesNoVoucher: z.string().trim().max(200).optional().nullable(),
  mensagemVoucher: z.string().trim().max(500).optional().nullable(),
  terapeutaId: z.string().trim().max(64).optional().nullable(),
  metodoPagamento: z.enum(METODOS_PAGAMENTO).optional().nullable(),
  // Liga manualmente à ficha de quem comprou (o oposto de clienteId, que é
  // sempre a beneficiária). Normalmente preenchido sozinho por telefone —
  // ver PATCH /api/v1/vouchers/[id] — mas dá para forçar/corrigir à mão.
  compradorClienteId: z.string().trim().max(64).optional().nullable(),
}).strict()

export const voucherQuerySchema = z.object({
  estado: z.enum(["ativo", "agendado", "usado", "expirado", "cancelado"]).optional(),
  tipo: z.enum(["digital", "fisico"]).optional(),
  codigo: z.string().trim().max(40).optional(),
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
  // Opcional: pack de massagens não está preso a um ritual (ver schema.prisma).
  servicoId: z.string().trim().max(64).optional().nullable(),
  totalSessoes: z.coerce.number().int().min(1).max(100),
  valorTotal: precoSchema,
  descricao: z.string().trim().max(200).optional().nullable(),
  // Packs são individuais (nunca "a dois") — null = Bea, mesma convenção de
  // Sessao.terapeutaId/GiftCard.terapeutaId.
  terapeutaId: z.string().trim().max(64).optional().nullable(),
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
  // Sem isto, é calculado automaticamente a partir do nº de clientes do
  // segmento (ver janelaEspacamentoPorVolume em lib/fila-envio.ts).
  espacamentoMinSeg: z.coerce.number().int().min(10).max(600).optional(),
  espacamentoMaxSeg: z.coerce.number().int().min(10).max(900).optional(),
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

export const bulkEliminarSchema = z.object({
  clienteIds: z.array(z.string().trim().min(1).max(64)).min(1).max(500),
  // Por omissão sessões e packs ficam preservados como "fantasma" no
  // financeiro (ver eliminarCliente em clientes/[id]/actions.ts) — só true
  // apaga tudo definitivamente, sem deixar rasto.
  apagarTudoDefinitivamente: z.boolean().optional().default(false),
}).strict()

// ── Feedback público (24h pós-sessão) ────────────────────────
// Revisão neuromarketing/NPS (spec-010, 2026-07-31): a escala deixou de ser
// 1-5 estrelas e passou a ser NPS 0-10 (npsScore) — "rating" (1-5) passa a
// ser derivado no servidor via mapearNpsParaRating, nunca enviado pelo
// cliente, para não confiar num valor que o forms podia calcular mal.

export const indicacaoAmigaSchema = z.object({
  nome:     z.string().trim().min(1).max(120),
  // Campo único — o cliente escreve WhatsApp ou email, o servidor decide qual
  // é (contém "@" → email, senão telefone). Menos fricção que dois campos.
  contacto: z.string().trim().max(120).optional().nullable(),
})

// Pré-checagem de uso único — ver GET /api/v1/public/feedback.
export const feedbackQuerySchema = z.object({
  clienteId: z.string().trim().max(64),
  sessaoId:  z.string().trim().max(64).optional().nullable(),
  t:         z.string().trim().max(128).optional().nullable(),
})

export const feedbackPublicSchema = z.object({
  clienteId:      z.string().trim().max(64),
  sessaoId:       z.string().trim().max(64).optional().nullable(),
  t:              z.string().trim().max(128).optional().nullable(), // link token assinado (ver lib/link-token.ts)
  npsScore:       z.coerce.number().int().min(0).max(10),
  pontosPositivos: z.string().trim().max(1000).optional().nullable(),
  pontosMelhorar: z.string().trim().max(2000).optional().nullable(),
  comentario:     z.string().trim().max(2000).optional().nullable(),
  quandoVoltar:     z.string().trim().max(50).optional().nullable(),
  interesseServico: z.string().trim().max(500).optional().nullable(),
  momentoPico:      z.string().trim().max(50).optional().nullable(),
  motivoRegresso:   z.string().trim().max(200).optional().nullable(),
  faltaParaDez:     z.string().trim().max(500).optional().nullable(),
  pedidoContactoMarcacao: z.boolean().optional(),
  diaPreferido:     z.string().trim().max(20).optional().nullable(),
  horaPreferida:    z.string().trim().max(10).optional().nullable(),
  indicacoes:       z.array(indicacaoAmigaSchema).max(3).optional(),
  website:        z.string().max(0).optional(), // honeypot
}).strict()

// 9-10 promotor / 7-8 passivo / 0-6 detrator — mapeamento para o campo
// legado rating (1-5), que continua a alimentar encaminhadoGoogle e
// qualquer leitura antiga desse campo. Ver plano em specs/010-*/plano.md §4.1.
export function mapearNpsParaRating(npsScore: number): number {
  if (npsScore >= 9) return 5
  if (npsScore >= 7) return 4
  if (npsScore >= 4) return 3
  if (npsScore >= 2) return 2
  return 1
}

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
