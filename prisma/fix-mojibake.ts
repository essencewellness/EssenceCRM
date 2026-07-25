// Corrige mojibake (UTF-8 lido como latin-1) nas sessoes e clientes.
// Usa Buffer.from para evitar caracteres nao-ASCII no source code.
// npx tsx prisma/fix-mojibake.ts
import { prisma } from "@/lib/prisma";

// Constroi string mojibake a partir dos bytes UTF-8 originais, lidos como latin-1
function moji(bytes: number[]): string {
  return Buffer.from(bytes).toString("latin1")
}
// Caracter correto a partir do codepoint Unicode
function uni(cp: number): string {
  return String.fromCodePoint(cp)
}

// [mojibake, correto]
const SUBS: [string, string][] = [
  [moji([0xc3, 0xa1]), uni(0x00e1)], // a com acento agudo: a
  [moji([0xc3, 0xa3]), uni(0x00e3)], // a com til: a
  [moji([0xc3, 0xa9]), uni(0x00e9)], // e com acento agudo: e
  [moji([0xc3, 0xaa]), uni(0x00ea)], // e com acento circunflexo: e
  [moji([0xc3, 0xb3]), uni(0x00f3)], // o com acento agudo: o
  [moji([0xc3, 0xba]), uni(0x00fa)], // u com acento agudo: u
  [moji([0xc3, 0xa2]), uni(0x00e2)], // a com acento circunflexo: a
  [moji([0xc3, 0xa7]), uni(0x00e7)], // c cedilha: c
  [moji([0xc3, 0xad]), uni(0x00ed)], // i com acento agudo: i
  [moji([0xc3, 0xa0]), uni(0x00e0)], // a grave: a
  [moji([0xc3, 0x83]), uni(0x00c3)], // A com til: A
  [moji([0xe2, 0x80, 0x94]), uni(0x2014)], // em dash: -
  [moji([0xe2, 0x80, 0x99]), uni(0x2019)], // aspas simples direitas
  [moji([0xe2, 0x80, 0x9c]), uni(0x201c)], // aspas duplas esquerdas
  [moji([0xe2, 0x80, 0x9d]), uni(0x201d)], // aspas duplas direitas
]

async function fix(table: string, field: string, from: string, to: string) {
  const pattern = `%${from}%`
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "${field}" = replace("${field}", $1::text, $2::text) WHERE "${field}" LIKE $3`,
    from, to, pattern
  )
}

async function main() {
  const camposSessao  = ["servico", "terapeuta", "resumoSessao", "notasPosSessao", "aromaSessao"]
  const camposCliente = ["nome", "notasPessoais", "historicoCondicoesAlergias", "historicoEstadoEmocional"]

  for (const [from, to] of SUBS) {
    for (const campo of camposSessao)  await fix("Sessao",  campo, from, to)
    for (const campo of camposCliente) await fix("Cliente", campo, from, to)
  }

  const restantes = await prisma.sessao.count({
    where: { servico: { contains: moji([0xc3]) } },
  })
  console.log(`Mojibake restante em sessoes.servico: ${restantes}`)
  console.log("Concluido.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
