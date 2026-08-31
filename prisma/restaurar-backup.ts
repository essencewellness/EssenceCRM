// Restaura um backup gerado por GET /api/v1/admin/backup para a base de
// dados apontada por DATABASE_URL. NUNCA correr contra produção sem ter a
// certeza absoluta — usar sempre primeiro numa branch de teste da Neon.
//
// Uso:
//   DATABASE_URL="postgresql://...branch-de-teste..." npx tsx prisma/restaurar-backup.ts caminho/para/backup.json
//
// Ordem de inserção respeita as dependências de chave estrangeira do
// schema.prisma — não mudar a ordem sem verificar as relações outra vez.
import { PrismaClient } from "@/lib/prisma-client"
import { PrismaPg } from "@prisma/adapter-pg"
import { readFileSync } from "node:fs"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL não está definida — aponta-a para a base de destino do restauro.")
  process.exit(1)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

async function main() {
  const caminho = process.argv[2]
  if (!caminho) {
    console.error("Uso: npx tsx prisma/restaurar-backup.ts caminho/para/backup.json")
    process.exit(1)
  }

  const dump = JSON.parse(readFileSync(caminho, "utf8"))
  const t = dump.tabelas

  console.log(`A restaurar backup de ${dump.exportadoEm}...`)

  // Ordem: pais antes de filhos, conforme as FKs do schema.prisma.
  const passos: Array<[string, () => Promise<{ count: number }>]> = [
    ["user", () => prisma.user.createMany({ data: t.user, skipDuplicates: true })],
    ["cliente", () => prisma.cliente.createMany({ data: t.cliente, skipDuplicates: true })],
    ["etiqueta", () => prisma.etiqueta.createMany({ data: t.etiqueta, skipDuplicates: true })],
    ["servico", () => prisma.servico.createMany({ data: t.servico, skipDuplicates: true })],
    ["templateMensagem", () => prisma.templateMensagem.createMany({ data: t.templateMensagem, skipDuplicates: true })],
    ["campanha", () => prisma.campanha.createMany({ data: t.campanha, skipDuplicates: true })],
    ["configuracaoNegocio", () => prisma.configuracaoNegocio.createMany({ data: t.configuracaoNegocio, skipDuplicates: true })],
    ["account", () => prisma.account.createMany({ data: t.account, skipDuplicates: true })],
    ["session", () => prisma.session.createMany({ data: t.session, skipDuplicates: true })],
    ["verificationToken", () => prisma.verificationToken.createMany({ data: t.verificationToken, skipDuplicates: true })],
    ["pack", () => prisma.pack.createMany({ data: t.pack, skipDuplicates: true })],
    ["sessao", () => prisma.sessao.createMany({ data: t.sessao, skipDuplicates: true })],
    ["linkToken", () => prisma.linkToken.createMany({ data: t.linkToken, skipDuplicates: true })],
    ["clienteEtiqueta", () => prisma.clienteEtiqueta.createMany({ data: t.clienteEtiqueta, skipDuplicates: true })],
    ["observacao", () => prisma.observacao.createMany({ data: t.observacao, skipDuplicates: true })],
    ["mensagemIA", () => prisma.mensagemIA.createMany({ data: t.mensagemIA, skipDuplicates: true })],
    ["precoPersonalizado", () => prisma.precoPersonalizado.createMany({ data: t.precoPersonalizado, skipDuplicates: true })],
    ["packPagamento", () => prisma.packPagamento.createMany({ data: t.packPagamento, skipDuplicates: true })],
    ["portalToken", () => prisma.portalToken.createMany({ data: t.portalToken, skipDuplicates: true })],
    ["giftCard", () => prisma.giftCard.createMany({ data: t.giftCard, skipDuplicates: true })],
    ["auditLog", () => prisma.auditLog.createMany({ data: t.auditLog, skipDuplicates: true })],
    ["feedback", () => prisma.feedback.createMany({ data: t.feedback, skipDuplicates: true })],
    ["tarefa", () => prisma.tarefa.createMany({ data: t.tarefa, skipDuplicates: true })],
  ]

  for (const [nome, executar] of passos) {
    if (!t[nome] || t[nome].length === 0) {
      console.log(`  ${nome}: 0 registos (vazio no backup)`)
      continue
    }
    const resultado = await executar()
    console.log(`  ${nome}: ${resultado.count}/${t[nome].length} restaurados`)
  }

  console.log("Restauro concluído.")
}

main()
  .catch((e) => {
    console.error("ERRO no restauro:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
