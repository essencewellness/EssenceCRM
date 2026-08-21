// Link curto do voucher: crm.essencewellnesspt.com/v/<código>.
// Sem autenticação — a cliente clica isto a partir do WhatsApp (ver proxy.ts,
// que marca /v/ como rota pública). Faz o lookup do voucher em tempo real e
// redireciona para a página completa no site — nunca fica desatualizado: se
// o voucher for editado depois de o link já ter sido enviado, quem voltar a
// clicar vê sempre os dados mais recentes.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verificarRateLimit } from "@/lib/rate-limit"
import { linkDoVoucher, BASE_LINK_VOUCHER } from "@/lib/utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "voucher-link-curto",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const { codigo } = await params
  // Tolerante a maiúsculas/minúsculas e espaços: o link é sempre gerado
  // certo pelo CRM, mas alguém pode copiar/colar ou escrever à mão.
  // Next.js já entrega o segmento decodificado — voltar a fazer
  // decodeURIComponent() num "%" solto (link colado partido a meio) lança
  // URIError sem apanhar, e a pessoa via um 500 em vez do redirecionamento
  // gracioso que este bloco todo existe para dar.
  let codigoNormalizado: string
  try {
    codigoNormalizado = decodeURIComponent(codigo).trim().toUpperCase()
  } catch {
    return NextResponse.redirect("https://essencewellnesspt.com/", { status: 302 })
  }

  // SQLite (dev local) não suporta mode: "insensitive" — só a Neon em
  // produção. Mesmo critério já usado em app/api/v1/clientes/route.ts.
  const isProd = process.env.DATABASE_URL?.startsWith("postgresql")

  const voucher = await prisma.giftCard.findFirst({
    where: isProd
      ? { codigo: { equals: codigoNormalizado, mode: "insensitive" } }
      : { codigo: codigoNormalizado },
    select: {
      codigo: true, servicoNome: true, compradorNome: true, nomesNoVoucher: true,
      beneficiarioNome: true, mensagemVoucher: true, validade: true,
    },
  })

  // Código inexistente/errado: manda para a página geral do site em vez de
  // um 404 seco — quem recebeu o link mal copiado ainda encontra a Essence.
  if (!voucher) {
    return NextResponse.redirect("https://essencewellnesspt.com/", { status: 302 })
  }

  const servico = await prisma.servico.findFirst({
    where: isProd
      ? { nome: { equals: voucher.servicoNome, mode: "insensitive" } }
      : { nome: voucher.servicoNome },
    select: { descricaoVoucher: true },
  })

  const linkCompleto = linkDoVoucher({
    codigo: voucher.codigo,
    servicoNome: voucher.servicoNome,
    nomesNoVoucher: voucher.nomesNoVoucher,
    compradorNome: voucher.compradorNome,
    beneficiarioNome: voucher.beneficiarioNome,
    mensagemVoucher: voucher.mensagemVoucher,
    validade: voucher.validade,
    descricaoServico: servico?.descricaoVoucher ?? null,
  })

  // Confiança: nunca redirecionar para fora do domínio do site, mesmo que
  // BASE_LINK_VOUCHER seja alterado por engano no futuro para algo que já
  // não seja https://essencewellnesspt.com/...
  if (!linkCompleto.startsWith(BASE_LINK_VOUCHER)) {
    return NextResponse.redirect("https://essencewellnesspt.com/", { status: 302 })
  }

  return NextResponse.redirect(linkCompleto, { status: 302 })
}
