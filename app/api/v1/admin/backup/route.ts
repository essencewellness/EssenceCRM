// Exporta a base de dados completa em JSON — usado pelo N8N (workflow 17,
// diário) para guardar uma cópia no Google Drive, independente do plano da
// Neon (a Neon só garante 6h de histórico no plano gratuito). Não é um
// pg_dump binário — é um export lógico tabela a tabela, mas cobre a mesma
// informação e é fácil de inspecionar/restaurar campo a campo se preciso.
//
// Protegido por API_KEY_ADMIN (nunca a API_KEY_N8N partilhada) — é a base
// de dados inteira, incluindo dados clínicos sensíveis.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKeyAdminOuSessao } from "@/lib/api-auth"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const erro = await validarApiKeyAdminOuSessao(request)
  if (erro) return erro

  try {
    const [
      user, account, session, verificationToken,
      cliente, sessao, linkToken, etiqueta, clienteEtiqueta, observacao,
      mensagemIA, servico, precoPersonalizado, pack, packPagamento,
      templateMensagem, campanha, portalToken, giftCard,
      configuracaoNegocio, auditLog, feedback, tarefa,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.account.findMany(),
      prisma.session.findMany(),
      prisma.verificationToken.findMany(),
      prisma.cliente.findMany(),
      prisma.sessao.findMany(),
      prisma.linkToken.findMany(),
      prisma.etiqueta.findMany(),
      prisma.clienteEtiqueta.findMany(),
      prisma.observacao.findMany(),
      prisma.mensagemIA.findMany(),
      prisma.servico.findMany(),
      prisma.precoPersonalizado.findMany(),
      prisma.pack.findMany(),
      prisma.packPagamento.findMany(),
      prisma.templateMensagem.findMany(),
      prisma.campanha.findMany(),
      prisma.portalToken.findMany(),
      prisma.giftCard.findMany(),
      prisma.configuracaoNegocio.findMany(),
      prisma.auditLog.findMany(),
      prisma.feedback.findMany(),
      prisma.tarefa.findMany(),
    ])

    const dump = {
      exportadoEm: new Date().toISOString(),
      versao: 1,
      tabelas: {
        user, account, session, verificationToken,
        cliente, sessao, linkToken, etiqueta, clienteEtiqueta, observacao,
        mensagemIA, servico, precoPersonalizado, pack, packPagamento,
        templateMensagem, campanha, portalToken, giftCard,
        configuracaoNegocio, auditLog, feedback, tarefa,
      },
      contagens: {
        user: user.length, account: account.length, session: session.length,
        verificationToken: verificationToken.length, cliente: cliente.length,
        sessao: sessao.length, linkToken: linkToken.length, etiqueta: etiqueta.length,
        clienteEtiqueta: clienteEtiqueta.length, observacao: observacao.length,
        mensagemIA: mensagemIA.length, servico: servico.length,
        precoPersonalizado: precoPersonalizado.length, pack: pack.length,
        packPagamento: packPagamento.length, templateMensagem: templateMensagem.length,
        campanha: campanha.length, portalToken: portalToken.length,
        giftCard: giftCard.length, configuracaoNegocio: configuracaoNegocio.length,
        auditLog: auditLog.length, feedback: feedback.length, tarefa: tarefa.length,
      },
    }

    return NextResponse.json(dump, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("GET /api/v1/admin/backup:", (error as Error).message)
    return NextResponse.json(
      { error: "Erro ao gerar backup", code: "ERRO_BACKUP" },
      { status: 500 }
    )
  }
}
