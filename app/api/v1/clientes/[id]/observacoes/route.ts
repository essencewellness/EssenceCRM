import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const observacoes = await prisma.observacao.findMany({
    where: { clienteId: id },
    orderBy: { criadoEm: "desc" },
  })
  return NextResponse.json(observacoes)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { texto, autor } = await req.json()

  if (!texto?.trim()) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 })
  }
  if (typeof texto !== "string" || texto.length > 5000) {
    return NextResponse.json({ error: "Texto demasiado longo (máx. 5000)" }, { status: 400 })
  }

  const obs = await prisma.observacao.create({
    data: {
      clienteId: id,
      texto: texto.trim(),
      autor: typeof autor === "string" ? autor.slice(0, 60) : session.user?.name ?? "bea",
    },
  })
  return NextResponse.json(obs, { status: 201 })
}
