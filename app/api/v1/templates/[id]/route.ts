import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarBody, templateUpdateSchema } from "@/lib/validations"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    // aceitar lookup por id ou por nome (slug)
    const template = await prisma.templateMensagem.findFirst({
      where: { OR: [{ id }, { nome: id }] },
    })

    if (!template) {
      return respostaErro("Template não encontrado", "TEMPLATE_NAO_ENCONTRADO", 404)
    }

    return respostaSucesso(template)
  } catch (error) {
    console.error("GET /api/v1/templates/[id]:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  const v = await validarBody(request, templateUpdateSchema)
  if (!v.ok) return v.resposta
  const { texto } = v.data

  try {
    const template = await prisma.templateMensagem.findFirst({
      where: { OR: [{ id }, { nome: id }] },
    })

    if (!template) {
      return respostaErro("Template não encontrado", "TEMPLATE_NAO_ENCONTRADO", 404)
    }

    // Validar que as variáveis do template continuam presentes no novo texto
    const variaveisFaltando = template.variaveis.filter(
      (v) => !texto.includes(`{{${v}}}`)
    )
    if (variaveisFaltando.length > 0) {
      return respostaErro(
        `Variáveis em falta no texto: ${variaveisFaltando.map((v) => `{{${v}}}`).join(", ")}`,
        "VARIAVEIS_EM_FALTA",
        422
      )
    }

    const atualizado = await prisma.templateMensagem.update({
      where: { id: template.id },
      data: { texto },
    })

    return respostaSucesso(atualizado)
  } catch (error) {
    console.error("PATCH /api/v1/templates/[id]:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
