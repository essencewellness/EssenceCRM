import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaErro } from "@/lib/api-auth"
import { gerarPdfSessao } from "@/lib/pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const sessao = await prisma.sessao.findFirst({
      where: { id, apagadoEm: null },
      select: {
        id: true,
        data: true,
        hora: true,
        duracao: true,
        servico: true,
        terapeuta: true,
        aromaSessao: true,
        resumoSessao: true,
        notasPosSessao: true,
        estadoEmocional: true,
        dataRecomendadaRegresso: true,
        estado: true,
        cliente: {
          select: { nome: true, dataNascimento: true },
        },
      },
    })

    if (!sessao) {
      return respostaErro("Sessão não encontrada", "SESSAO_NAO_ENCONTRADA", 404)
    }

    if (sessao.estado !== "realizada") {
      return respostaErro(
        "PDF disponível apenas para sessões realizadas",
        "SESSAO_NAO_REALIZADA",
        422
      )
    }

    const pdfBytes = await gerarPdfSessao(sessao, sessao.cliente)

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sessao-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/v1/sessoes/[id]/pdf:", (error as Error).message)
    return respostaErro("Erro ao gerar PDF", "ERRO_PDF", 500)
  }
}
