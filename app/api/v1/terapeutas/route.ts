// Lista os utilizadores com role terapeuta para popular seletores nos formulários.
// Auth: API key ou sessão (Bea usa este endpoint no formulário pós-sessão).
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const erro = await validarApiKeyOuSessao(request)
  if (erro) return erro

  try {
    const terapeutas = await prisma.user.findMany({
      where: {
        ativo: true,
        role: "terapeuta",
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    })

    return respostaSucesso(terapeutas)
  } catch (error) {
    console.error("GET /api/v1/terapeutas:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
