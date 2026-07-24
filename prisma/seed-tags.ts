// Seed idempotente do catálogo inicial de etiquetas (Spec 005)
// Corre em dev e prod: DATABASE_URL="..." npx tsx prisma/seed-tags.ts

import { } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma";


const TAGS = [
  // Saúde — bloqueiam automações
  { nome: "Grávida",          cor: "#9b72cf", tipo: "saude"       as const, bloqueiaAutomacoes: true  },
  { nome: "Pós-parto",        cor: "#9b72cf", tipo: "saude"       as const, bloqueiaAutomacoes: true  },
  { nome: "Pós-operatório",   cor: "#6d7fcc", tipo: "saude"       as const, bloqueiaAutomacoes: true  },
  // Saúde — não bloqueiam
  { nome: "Lesão ativa",      cor: "#d4956b", tipo: "saude"       as const, bloqueiaAutomacoes: false },
  { nome: "Fibromialgia",     cor: "#d4956b", tipo: "saude"       as const, bloqueiaAutomacoes: false },
  { nome: "Tensão crónica",   cor: "#b9a07a", tipo: "saude"       as const, bloqueiaAutomacoes: false },
  // Campanha
  { nome: "Massagem de Casal",    cor: "#b9a07a", tipo: "campanha"    as const, bloqueiaAutomacoes: false },
  { nome: "Puro Aroma",           cor: "#7a9e7e", tipo: "campanha"    as const, bloqueiaAutomacoes: false },
  { nome: "Pack 3 Sessões",       cor: "#a0a996", tipo: "campanha"    as const, bloqueiaAutomacoes: false },
  { nome: "Drenagem Linfática",   cor: "#4d9ab0", tipo: "campanha"    as const, bloqueiaAutomacoes: false },
  { nome: "Primeira vez",         cor: "#a0a996", tipo: "campanha"    as const, bloqueiaAutomacoes: false },
  // Preferência
  { nome: "Só aromaterapia",              cor: "#7a9e7e", tipo: "preferencia" as const, bloqueiaAutomacoes: false },
  { nome: "Prefere manhãs",               cor: "#a0a996", tipo: "preferencia" as const, bloqueiaAutomacoes: false },
  { nome: "Prefere tardes",               cor: "#a0a996", tipo: "preferencia" as const, bloqueiaAutomacoes: false },
  { nome: "Não quer contacto automático", cor: "#b06050", tipo: "preferencia" as const, bloqueiaAutomacoes: false },
  // Automáticas (criadas pelo sistema para vouchers)
  { nome: "Voucher ativo",  cor: "#4d9ab0", tipo: "automatica" as const, bloqueiaAutomacoes: false },
  { nome: "Voucher usado",  cor: "#a0a996", tipo: "automatica" as const, bloqueiaAutomacoes: false },
]

async function main() {
  console.log("A criar/actualizar catálogo de etiquetas…")
  let criadas = 0

  for (const tag of TAGS) {
    const resultado = await prisma.etiqueta.upsert({
      where:  { nome: tag.nome },
      create: tag,
      update: { cor: tag.cor, tipo: tag.tipo, bloqueiaAutomacoes: tag.bloqueiaAutomacoes },
    })
    // upsert não distingue criação vs atualização via campos de data no schema atual
    criadas++
    void resultado
  }

  console.log(`✓ ${criadas} processadas — total: ${TAGS.length} etiquetas`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
