import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { validarApiKeyOuSessao } from "@/lib/api-auth"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const erro = await validarApiKeyOuSessao(req)
  if (erro) return erro

  const { id } = await params
  const observacoes = await prisma.observacao.findMany({
    where: { clienteId: id },
    orderBy: { criadoEm: "desc" },
  })
  return NextResponse.json(observacoes)
}

export async function POST(req: NextRequest, { params }: Params) {
  const erro = await validarApiKeyOuSessao(req)
  if (erro) return erro

  const { id } = await params
  const { texto, autor, criadoEm } = await req.json()

  if (!texto?.trim()) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 })
  }
  if (typeof texto !== "string" || texto.length > 5000) {
    return NextResponse.json({ error: "Texto demasiado longo (máx. 5000)" }, { status: 400 })
  }

  // criadoEm é opcional — só usado por migrações (ex: N8N) para preservar a
  // data original de uma nota importada de outro sistema. Sem isto, uma
  // observação migrada apareceria com a data de hoje em vez da data real.
  let dataOriginal: Date | undefined
  if (typeof criadoEm === "string") {
    const parsed = new Date(criadoEm)
    if (!Number.isNaN(parsed.getTime())) dataOriginal = parsed
  }

  const session = await auth()
  const obs = await prisma.observacao.create({
    data: {
      clienteId: id,
      texto: texto.trim(),
      autor: typeof autor === "string" ? autor.slice(0, 60) : session?.user?.name ?? "bea",
      ...(dataOriginal ? { criadoEm: dataOriginal } : {}),
    },
  })
  return NextResponse.json(obs, { status: 201 })
}
