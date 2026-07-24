// Script temporário: apaga sessões órfãs (clientes apagados mas sessões ficaram ativas)
import { } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma";


async function main() {
  // Encontrar sessões cujo cliente está apagado (apagadoEm != null) ou não existe
  const sessoesOrfas = await prisma.sessao.findMany({
    where: {
      apagadoEm: null,
      cliente: { apagadoEm: { not: null } },
    },
    select: { id: true, clienteId: true, servico: true },
  })

  console.log(`Sessões órfãs encontradas: ${sessoesOrfas.length}`)
  sessoesOrfas.forEach(s => console.log(` - ${s.id} (cliente: ${s.clienteId}, serviço: ${s.servico})`))

  if (sessoesOrfas.length === 0) {
    console.log("Nada a limpar.")
    return
  }

  const ids = sessoesOrfas.map(s => s.id)
  const resultado = await prisma.sessao.deleteMany({ where: { id: { in: ids } } })
  console.log(`✅ Apagadas ${resultado.count} sessões órfãs.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
