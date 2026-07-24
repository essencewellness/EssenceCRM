// Health check para monitorização externa (Vercel, UptimeRobot, etc.)
// Sem autenticação (proxy.ts trata /api/health como rota pública) — não
// expõe nada sensível na resposta, só confirma que a app + BD estão vivas.
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const TIMEOUT_MS = 3000

export async function GET() {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout a consultar a base de dados")), TIMEOUT_MS)
      ),
    ])

    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    console.error("GET /api/health:", (error as Error).message)
    return NextResponse.json(
      {
        status: "erro",
        detalhe: "Base de dados indisponível",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
