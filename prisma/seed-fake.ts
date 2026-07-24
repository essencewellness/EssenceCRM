// Seed 100% FICTÍCIO — para desenvolvimento e demonstração local.
// Nenhum dado real de cliente. Cobre os 9 estados CRM, fila de envio,
// mensagens pendentes (para testar aprovação em massa) e consentimentos RGPD.
import { type EstadoCliente, type EstadoMensagem } from "@/lib/prisma-client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


function d(diasOffset: number, hora = 10): Date {
  const x = new Date();
  x.setDate(x.getDate() + diasOffset);
  x.setHours(hora, 0, 0, 0);
  return x;
}

async function main() {
  console.log("A limpar tabelas…");
  await prisma.auditLog.deleteMany();
  await prisma.mensagemIA.deleteMany();
  await prisma.observacao.deleteMany();
  await prisma.clienteEtiqueta.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.user.deleteMany();

  // ── Utilizadora de demonstração ─────────────────────────────
  const passwordHash = await bcrypt.hash("Demo-Essence-2026!", 10);
  await prisma.user.create({
    data: {
      name: "Beatriz Demo",
      email: "demo@essence.local",
      password: passwordHash,
      role: "admin",
    },
  });
  console.log("✓ Utilizadora demo: demo@essence.local / Demo-Essence-2026!");

  // ── Etiquetas ───────────────────────────────────────────────
  const [etVip, etGravida, etSensivel] = await Promise.all([
    prisma.etiqueta.create({ data: { nome: "VIP", cor: "#b9a07a" } }),
    prisma.etiqueta.create({ data: { nome: "Pré-natal", cor: "#a0a996" } }),
    prisma.etiqueta.create({ data: { nome: "Pele sensível", cor: "#b06050" } }),
  ]);

  // ── Clientes fictícias — todos os 9 estados ─────────────────
  type ClienteSeed = {
    nome: string; telefone: string; email: string;
    estado: EstadoCliente; totalSessoes: number; totalGasto: number;
    ultimaSessao: Date | null; dataNascimento?: Date;
    aromas?: string; alergias?: string; emocional?: string; zonas?: string;
    etiquetas?: string[];
    aceitaMarketing?: boolean;
  };

  const clientesSeed: ClienteSeed[] = [
    { nome: "Aurora Figueiredo", telefone: "+351 910 000 001", email: "aurora@exemplo.pt", estado: "vip_embaixadora", totalSessoes: 14, totalGasto: 630, ultimaSessao: d(-9), dataNascimento: new Date("1986-06-18"), aromas: "Ylang-ylang, lavanda", emocional: "Stress laboral elevado", zonas: "Cervical, trapézios", etiquetas: [etVip.id] },
    { nome: "Constança Brito", telefone: "+351 910 000 002", email: "constanca@exemplo.pt", estado: "vip_em_risco", totalSessoes: 9, totalGasto: 405, ultimaSessao: d(-44), dataNascimento: new Date("1979-06-25"), aromas: "Alecrim", zonas: "Lombar", etiquetas: [etVip.id] },
    { nome: "Madalena Quintela", telefone: "+351 910 000 003", email: "madalena@exemplo.pt", estado: "ativa_frequente", totalSessoes: 6, totalGasto: 270, ultimaSessao: d(-12), aromas: "Eucalipto", emocional: "Ansiedade ligeira" },
    { nome: "Leonor Vasques", telefone: "+351 910 000 004", email: "leonor@exemplo.pt", estado: "ativa_recente", totalSessoes: 2, totalGasto: 85, ultimaSessao: d(-18), etiquetas: [etSensivel.id], alergias: "Alergia a frutos secos (óleos)" },
    { nome: "Beatriz Camacho", telefone: "+351 910 000 005", email: "bcamacho@exemplo.pt", estado: "novo", totalSessoes: 1, totalGasto: 40, ultimaSessao: d(-6), dataNascimento: new Date("1995-06-12") },
    { nome: "Filipa Sarmento", telefone: "+351 910 000 006", email: "filipa@exemplo.pt", estado: "reativacao", totalSessoes: 4, totalGasto: 180, ultimaSessao: d(-75), emocional: "Cansaço crónico" },
    { nome: "Joana Espírito Santo", telefone: "+351 910 000 007", email: "joana@exemplo.pt", estado: "reativacao", totalSessoes: 1, totalGasto: 45, ultimaSessao: d(-95) },
    { nome: "Carolina Almada", telefone: "+351 910 000 008", email: "carolina@exemplo.pt", estado: "perdida", totalSessoes: 2, totalGasto: 90, ultimaSessao: d(-220) },
    { nome: "Rita Montenegro", telefone: "+351 910 000 009", email: "rita@exemplo.pt", estado: "lead", totalSessoes: 0, totalGasto: 0, ultimaSessao: null },
    { nome: "Inês Saldanha", telefone: "+351 910 000 010", email: "ines@exemplo.pt", estado: "lead", totalSessoes: 0, totalGasto: 0, ultimaSessao: null },
    { nome: "Marta Bivar", telefone: "+351 910 000 011", email: "marta@exemplo.pt", estado: "blacklist", totalSessoes: 1, totalGasto: 40, ultimaSessao: d(-130), aceitaMarketing: false },
    { nome: "Sofia Travassos", telefone: "+351 910 000 012", email: "sofia@exemplo.pt", estado: "ativa_recente", totalSessoes: 3, totalGasto: 135, ultimaSessao: d(-25), etiquetas: [etGravida.id], emocional: "Gravidez — 2.º trimestre" },
    { nome: "Helena Mascarenhas", telefone: "+351 910 000 013", email: "helena@exemplo.pt", estado: "vip_embaixadora", totalSessoes: 11, totalGasto: 520, ultimaSessao: d(-15), dataNascimento: new Date("1972-06-30"), etiquetas: [etVip.id], aromas: "Camomila" },
    { nome: "Teresa Albuquerque", telefone: "+351 910 000 014", email: "teresa@exemplo.pt", estado: "ativa_frequente", totalSessoes: 5, totalGasto: 225, ultimaSessao: d(-30) },
  ];

  const clientes: Record<string, string> = {};
  for (const c of clientesSeed) {
    const criada = await prisma.cliente.create({
      data: {
        nome: c.nome,
        telefone: c.telefone,
        email: c.email,
        estado: c.estado,
        totalSessoes: c.totalSessoes,
        totalGasto: c.totalGasto,
        ultimaSessao: c.ultimaSessao,
        dataNascimento: c.dataNascimento ?? null,
        fonte: "seed-fake",
        comoNosConheceu: "instagram",
        historicoAromasPreferidos: c.aromas ?? null,
        historicoCondicoesAlergias: c.alergias ?? null,
        historicoEstadoEmocional: c.emocional ?? null,
        historicoZonasTensao: c.zonas ?? null,
        aceitaMarketing: c.aceitaMarketing ?? true,
        consentimentoMarketingEm: c.aceitaMarketing === false ? null : d(-100),
        consentimentoSaudeEm: c.totalSessoes > 0 ? d(-100) : null,
      },
    });
    clientes[c.nome] = criada.id;
    if (c.etiquetas?.length) {
      await prisma.clienteEtiqueta.createMany({
        data: c.etiquetas.map((etiquetaId) => ({ clienteId: criada.id, etiquetaId })),
      });
    }
  }
  console.log(`✓ ${clientesSeed.length} clientes fictícias (9 estados cobertos)`);

  // ── Sessões ─────────────────────────────────────────────────
  await prisma.sessao.createMany({
    data: [
      { clienteId: clientes["Aurora Figueiredo"], data: d(-9, 14), hora: "14:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Ylang-ylang", resumoSessao: "Sessão profunda, tensão cervical a melhorar.", notasPosSessao: "Sugerir drenagem linfática na próxima." },
      { clienteId: clientes["Aurora Figueiredo"], data: d(5, 14), hora: "14:00", duracao: 60, servico: "Drenagem Linfática", preco: 55, terapeuta: "bea", estado: "agendada" },
      { clienteId: clientes["Constança Brito"], data: d(-44, 11), hora: "11:00", duracao: 60, servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "realizada", resumoSessao: "Lombar muito carregada." },
      { clienteId: clientes["Madalena Quintela"], data: d(-12, 16), hora: "16:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "cris", estado: "realizada" },
      { clienteId: clientes["Beatriz Camacho"], data: d(-6, 10), hora: "10:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada", resumoSessao: "Primeira sessão — adorou." },
      { clienteId: clientes["Sofia Travassos"], data: d(2, 9), hora: "09:00", duracao: 60, servico: "Massagem Pré-Natal", preco: 45, terapeuta: "bea", estado: "confirmada" },
      { clienteId: clientes["Teresa Albuquerque"], data: d(0, 18), hora: "18:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "agendada" },
      { clienteId: clientes["Filipa Sarmento"], data: d(-75, 15), hora: "15:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada" },
    ],
  });
  console.log("✓ 8 sessões (passadas + futuras)");

  // ── Mensagens IA — pipeline completo ────────────────────────
  type MsgSeed = {
    cliente: string; estado: EstadoMensagem; texto: string; motivo: string;
    enviarApos?: Date; enviadaEm?: Date; converteu?: boolean; erro?: string;
  };
  const msgs: MsgSeed[] = [
    { cliente: "Constança Brito", estado: "pendente", motivo: "VIP sem sessão há 44 dias", texto: "Olá Constança! Senti a tua falta por cá. A tua lombar tem-se portado bem? Tenho um horário especial esta semana se quiseres retomar. 🌿" },
    { cliente: "Filipa Sarmento", estado: "pendente", motivo: "Reativação — 75 dias", texto: "Olá Filipa! Já passou algum tempo desde a tua última massagem. O cansaço pede uma pausa — quero oferecer-te 10% na próxima sessão." },
    { cliente: "Joana Espírito Santo", estado: "pendente", motivo: "Reativação — 95 dias", texto: "Olá Joana! Lembrei-me de ti — a tua primeira massagem foi tão especial. Que tal repetirmos? Tenho vagas esta semana." },
    { cliente: "Leonor Vasques", estado: "pendente", motivo: "Follow-up 2.ª sessão", texto: "Olá Leonor! Como te sentiste depois da última sessão? Para manter os resultados, o ideal é regressar dentro de 2 semanas." },
    { cliente: "Madalena Quintela", estado: "pendente", motivo: "Cadência regular", texto: "Olá Madalena! Está na altura da tua sessão quinzenal de eucalipto. Quinta às 16h, como de costume?" },
    { cliente: "Helena Mascarenhas", estado: "pendente", motivo: "Aniversário este mês", texto: "Olá Helena! Este mês fazes anos — e nós fazemos questão de te mimar. Tens uma surpresa à tua espera na próxima visita. 🎁" },
    { cliente: "Teresa Albuquerque", estado: "em_fila", motivo: "Lembrete sessão hoje", texto: "Olá Teresa! Lembrete da tua sessão hoje às 18h. Até já!", enviarApos: d(0, 9) },
    { cliente: "Aurora Figueiredo", estado: "enviada", motivo: "Pós-sessão", texto: "Olá Aurora! Espero que estejas a sentir-te renovada. Bebe bastante água hoje. 💧", enviadaEm: d(-8), converteu: true },
    { cliente: "Beatriz Camacho", estado: "enviada", motivo: "Boas-vindas", texto: "Olá Beatriz! Foi um gosto receber-te. Qualquer dúvida sobre os cuidados pós-massagem, estou aqui.", enviadaEm: d(-5), converteu: false },
    { cliente: "Carolina Almada", estado: "falhada", motivo: "Reativação — 220 dias", texto: "Olá Carolina! Há quanto tempo… Temos novidades no estúdio que vais adorar.", erro: "Número sem WhatsApp ativo" },
  ];

  for (const m of msgs) {
    await prisma.mensagemIA.create({
      data: {
        clienteId: clientes[m.cliente],
        mensagemGerada: m.texto,
        mensagemFinal: m.estado === "enviada" || m.estado === "em_fila" ? m.texto : null,
        canal: "whatsapp",
        estado: m.estado,
        motivoGeracao: m.motivo,
        geradaEm: d(0, 8),
        aprovadaEm: ["em_fila", "enviada"].includes(m.estado) ? d(0, 8) : null,
        enviadaEm: m.enviadaEm ?? null,
        enviarApos: m.enviarApos ?? null,
        converteu: m.converteu ?? null,
        erroEnvio: m.erro ?? null,
      },
    });
  }
  console.log(`✓ ${msgs.length} mensagens IA (6 pendentes para testar aprovação em massa)`);

  // ── Observações ─────────────────────────────────────────────
  await prisma.observacao.createMany({
    data: [
      { clienteId: clientes["Aurora Figueiredo"], texto: "Prefere música ambiente baixa e manta extra.", autor: "bea" },
      { clienteId: clientes["Sofia Travassos"], texto: "Grávida de 5 meses — só posição lateral.", autor: "bea" },
      { clienteId: clientes["Marta Bivar"], texto: "Pediu para não ser contactada — respeitar sempre.", autor: "bea" },
    ],
  });
  console.log("✓ 3 observações");

  console.log("\n✅ Base de dados FICTÍCIA pronta.");
  console.log("   Login: demo@essence.local / Demo-Essence-2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
