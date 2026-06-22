import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Ver o que existe
  const etiquetasExistentes = await prisma.etiqueta.findMany({ orderBy: { tipo: "asc" } });
  console.log("\n=== ETIQUETAS EXISTENTES ===");
  etiquetasExistentes.forEach(e => console.log(`  [${e.tipo}] ${e.nome} (cor: ${e.cor})`));

  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true, estado: true },
    where: { apagadoEm: null },
    orderBy: { criadoEm: "asc" },
  });
  console.log(`\n=== CLIENTES (${clientes.length} total) ===`);
  clientes.forEach(c => console.log(`  [${c.estado}] ${c.nome}`));

  // Garantir que existem etiquetas dos 3 tipos (saúde, preferência, campanha)
  const garantirEtiqueta = async (nome: string, tipo: import("@prisma/client").TipoEtiqueta, cor: string, bloqueiaAutomacoes = false) => {
    const existe = await prisma.etiqueta.findFirst({ where: { nome } });
    if (existe) return existe;
    return prisma.etiqueta.create({ data: { nome, tipo, cor, bloqueiaAutomacoes } });
  };

  console.log("\n=== GARANTIR ETIQUETAS ===");
  const [
    vip, reengagement, novaCliente, aniversario, gravidezEtiq,
    // Saúde
    gravidaEtiq, sensivel, lombar,
    // Preferência
    prefManha, soBeatriz, aromasSuaves,
    // Campanha
    giftCard, indicacao, campJunho,
  ] = await Promise.all([
    // existentes (já têm estes nomes)
    garantirEtiqueta("VIP", "campanha", "#d4b886"),
    garantirEtiqueta("Reengagement", "campanha", "#8ac4b0"),
    garantirEtiqueta("Nova cliente", "campanha", "#a8c5da"),
    garantirEtiqueta("Aniversário este mês", "campanha", "#f0d080"),
    garantirEtiqueta("Gravidez", "campanha", "#e8b4b8"),
    // novas — saúde
    garantirEtiqueta("Grávida", "saude", "#e8b4b8", false),
    garantirEtiqueta("Pele Sensível", "saude", "#f4c2a1", false),
    garantirEtiqueta("Lesão Lombar", "saude", "#e07b6a", false),
    // novas — preferência
    garantirEtiqueta("Prefere Manhã", "preferencia", "#a8c5da", false),
    garantirEtiqueta("Só Beatriz", "preferencia", "#d4b886", false),
    garantirEtiqueta("Aromas Suaves", "preferencia", "#b5c9a8", false),
    // novas — campanha
    garantirEtiqueta("Gift Card", "campanha", "#c9b8d8", false),
    garantirEtiqueta("Indicação", "campanha", "#8ac4b0", false),
    garantirEtiqueta("Campanha Jun 2026", "campanha", "#7ab8d0", false),
  ]);

  const etiquetasAtualizadas = await prisma.etiqueta.findMany({ orderBy: { tipo: "asc" } });
  console.log(`  ✓ Total de etiquetas: ${etiquetasAtualizadas.length}`);

  // Limpar associações existentes
  const deleted = await prisma.clienteEtiqueta.deleteMany({});
  console.log(`  → Removidas ${deleted.count} associações anteriores`);

  // Associações variadas por cliente/estado
  const associacoes: { nomeCliente: string; etiquetas: typeof vip[] }[] = [];

  for (const c of clientes) {
    switch (c.estado) {
      case "vip_embaixadora":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [vip, soBeatriz, aromasSuaves] });
        break;
      case "vip_em_risco":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [vip, reengagement, soBeatriz] });
        break;
      case "ativa_frequente":
        // Alternar para variedade
        if (associacoes.filter(a => a.etiquetas.includes(prefManha)).length === 0) {
          associacoes.push({ nomeCliente: c.nome, etiquetas: [prefManha, aromasSuaves] });
        } else {
          associacoes.push({ nomeCliente: c.nome, etiquetas: [reengagement, giftCard] });
        }
        break;
      case "ativa_recente":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [novaCliente, indicacao] });
        break;
      case "novo":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [novaCliente, campJunho] });
        break;
      case "reativacao":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [reengagement, campJunho] });
        break;
      case "perdida":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [reengagement] });
        break;
      case "lead":
        associacoes.push({ nomeCliente: c.nome, etiquetas: [novaCliente, giftCard] });
        break;
    }
  }

  // Adicionar etiquetas de saúde a alguns clientes (variado)
  const saudeMap: Record<string, typeof vip> = {};
  const clientesOrdem = [...clientes];
  if (clientesOrdem[0]) saudeMap[clientesOrdem[0].nome] = gravidaEtiq;
  if (clientesOrdem[2]) saudeMap[clientesOrdem[2].nome] = gravidezEtiq;
  if (clientesOrdem[4]) saudeMap[clientesOrdem[4].nome] = sensivel;
  if (clientesOrdem[6]) saudeMap[clientesOrdem[6].nome] = lombar;

  // Adicionar aniversário a alguns
  if (clientesOrdem[1]) {
    const idx = associacoes.findIndex(a => a.nomeCliente === clientesOrdem[1].nome);
    if (idx >= 0) associacoes[idx].etiquetas.push(aniversario);
  }
  if (clientesOrdem[5]) {
    const idx = associacoes.findIndex(a => a.nomeCliente === clientesOrdem[5].nome);
    if (idx >= 0) associacoes[idx].etiquetas.push(aniversario);
  }

  console.log("\n=== A ASSOCIAR ETIQUETAS ===");
  let totalAssoc = 0;

  for (const { nomeCliente, etiquetas } of associacoes) {
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente) continue;

    // Adicionar etiqueta de saúde se existir
    const saude = saudeMap[nomeCliente];
    const todasEtiquetas = saude ? [...etiquetas, saude] : etiquetas;

    for (const etq of todasEtiquetas) {
      try {
        await prisma.clienteEtiqueta.create({
          data: { clienteId: cliente.id, etiquetaId: etq.id },
        });
        totalAssoc++;
      } catch {
        // já existe
      }
    }
    console.log(`  ✓ [${cliente.estado}] ${nomeCliente} → ${todasEtiquetas.map(e => e.nome).join(", ")}`);
  }

  // Verificação final
  const comEtiquetas = await prisma.cliente.count({
    where: {
      etiquetas: { some: {} },
      apagadoEm: null,
    },
  });

  console.log(`\n✅ Total: ${totalAssoc} associações criadas em ${comEtiquetas} clientes`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
