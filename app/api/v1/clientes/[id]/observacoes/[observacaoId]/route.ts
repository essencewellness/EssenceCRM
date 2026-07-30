import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { auditar } from "@/lib/audit"

interface Params {
  params: Promise<{ id: string; observacaoId: string }>
}

// Só sessão de dashboard (mesma regra do GET/POST das observações) — a
// API_KEY_N8N não autoriza operações destrutivas.
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id, observacaoId } = await params

  // O clienteId entra no where de propósito: sem ele, um id de observação
  // adivinhado bastava para apagar a nota de outra cliente.
  const obs = await prisma.observacao.findFirst({
    where: { id: observacaoId, clienteId: id },
    select: { id: true, texto: true, autor: true },
  })
  if (!obs) {
    return NextResponse.json({ error: "Observação não encontrada" }, { status: 404 })
  }

  await prisma.observacao.delete({ where: { id: obs.id } })

  // A eliminação é definitiva (Observacao não tem soft delete), por isso o
  // texto fica no audit log — sem isto não haveria rasto nenhum do que se apagou.
  auditar({
    quem: session.user?.email ?? "dashboard",
    acao: "observacao.apagada",
    entidade: "Cliente",
    entidadeId: id,
    detalhe: { observacaoId: obs.id, autor: obs.autor, texto: obs.texto.slice(0, 500) },
    ip: req.headers.get("x-forwarded-for"),
  })

  return NextResponse.json({ ok: true })
}
