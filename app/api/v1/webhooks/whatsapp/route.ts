// Recebe respostas de WhatsApp (N8N valida no Evolution API e repassa aqui)
// Classifica a intenção e deteta avaliações de satisfação (respostas "1"-"5")
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { whatsappInboundSchema, validarBody, normalizarTelefone } from "@/lib/validations"

type Intencao = "marcar" | "nao_interessada" | "pergunta" | "avaliacao" | "outro"

function classificarIntencao(texto: string): Intencao {
  const t = texto.trim()
  // Deteção de avaliação: resposta numérica 1-5 (com possível emoji/espaço)
  if (/^[1-5][\s🌿💚✨🙏]*$/.test(t) || /^[1-5]\s*(estrela|star)s?$/i.test(t)) return "avaliacao"
  const lower = t.toLowerCase()
  if (/\b(marcar|agendar|reservar|quero|sim|ok|disponib|quando|hora|dia)\b/.test(lower)) return "marcar"
  if (/\b(não|nao|obrigad|cancel|desist|agora não|mais tarde|próxima)\b/.test(lower)) return "nao_interessada"
  if (/\?|quanto|preço|preco|serviço|servico|como|onde|o que/.test(lower)) return "pergunta"
  return "outro"
}

const acaoSugerida: Record<Intencao, string> = {
  marcar: "enviar_link_calendly",
  nao_interessada: "registar_e_aguardar",
  pergunta: "gerar_resposta_ia",
  avaliacao: "registar_avaliacao",
  outro: "rever_manualmente",
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, whatsappInboundSchema)
  if (!v.ok) return v.resposta
  const { telefone, mensagem, timestamp, tipo } = v.data

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { telefone: { contains: normalizarTelefone(telefone) }, apagadoEm: null },
      select: { id: true, nome: true, telefone: true, estado: true },
    })

    // Blacklist: ignorar silenciosamente (não registar, não classificar)
    if (cliente?.estado === "blacklist") {
      return respostaSucesso({ ignorado: true, motivo: "blacklist" })
    }

    const intencao = classificarIntencao(mensagem)
    let avaliacaoRegistada = false

    // Avaliação de satisfação: guardar na sessão mais recente sem nota
    if (intencao === "avaliacao" && cliente) {
      const nota = parseInt(mensagem.trim().charAt(0), 10)
      if (nota >= 1 && nota <= 5) {
        const sessaoParaAvaliar = await prisma.sessao.findFirst({
          where: {
            clienteId: cliente.id,
            estado: "realizada",
            avaliacaoNota: null,
            apagadoEm: null,
          },
          orderBy: { data: "desc" },
          select: { id: true },
        })

        if (sessaoParaAvaliar) {
          await prisma.sessao.update({
            where: { id: sessaoParaAvaliar.id },
            data: {
              avaliacaoNota: nota,
              avaliacaoRespondidaEm: new Date(),
            },
          })
          avaliacaoRegistada = true
        }
      }
    }

    // Resposta de cliente conta como interação — registar na timeline
    if (cliente) {
      await prisma.observacao.create({
        data: {
          clienteId: cliente.id,
          texto: `WhatsApp recebido: "${mensagem.slice(0, 500)}" (intenção: ${intencao})`,
          autor: "whatsapp",
        },
      })
    }

    return respostaSucesso({
      clienteId: cliente?.id ?? null,
      clienteNome: cliente?.nome ?? null,
      clienteEncontrado: !!cliente,
      intencao,
      acaoSugerida: acaoSugerida[intencao],
      avaliacaoRegistada,
      mensagemOriginal: mensagem,
      tipo: tipo ?? "texto",
      timestamp: timestamp ?? new Date().toISOString(),
    })
  } catch (error) {
    console.error("POST /api/v1/webhooks/whatsapp:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
