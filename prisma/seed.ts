import "dotenv/config";
import { Prisma } from "@/lib/prisma-client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { assertNaoProducao } from "./assert-nao-producao";


async function main() {
  assertNaoProducao("seed.ts");
  console.log("🌿 A iniciar seed da Essence Wellness...");

  // ── Catálogo de serviços (upsert — seguro em produção) ───────────────────
  const servicosData = [
    { nome: "Essência Plena",     duracaoMinutos: 60, precoBase: 40 },
    { nome: "Puro Aroma",         duracaoMinutos: 60, precoBase: 45 },
    { nome: "Cera Quente",        duracaoMinutos: 60, precoBase: 50 },
    { nome: "Drenagem Linfática", duracaoMinutos: 60, precoBase: 40 },
    { nome: "Drenagem Linfática 90 min", duracaoMinutos: 90, precoBase: 85 },
  ]
  for (const s of servicosData) {
    await prisma.servico.upsert({
      where: { nome: s.nome },
      update: {},
      create: { ...s, precoBase: new Prisma.Decimal(s.precoBase) },
    })
  }
  console.log("✅ Serviços criados/verificados:", servicosData.map(s => s.nome).join(", "))

  // ── Limpar dados existentes (ordem inversa de dependências) ────────────────
  await prisma.mensagemIA.deleteMany();
  await prisma.clienteEtiqueta.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.precoPersonalizado.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Utilizadores ──────────────────────────────────────────────────────────
  // Password de desenvolvimento — usar SETUP_PASSWORD em produção (create-users.ts)
  const seedPassword = process.env.SEED_PASSWORD ?? "change-me-before-use";
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const [bea, cris] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Beatriz Oliveira",
        email: "bea@essencewellnesspt.com",
        password: passwordHash,
        role: "terapeuta",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: "Cristina Santos",
        email: "cris@essencewellnesspt.com",
        password: passwordHash,
        role: "terapeuta",
        emailVerified: new Date(),
      },
    }),
  ]);

  console.log(`  ✓ Utilizadores criados: ${bea.email}, ${cris.email}`);

  // ── Etiquetas ─────────────────────────────────────────────────────────────
  const [etVip, etNova, etReeng, etGrav, etAniversario] = await Promise.all([
    prisma.etiqueta.create({ data: { nome: "VIP", cor: "#c9a66b" } }),
    prisma.etiqueta.create({ data: { nome: "Nova cliente", cor: "#a0a996" } }),
    prisma.etiqueta.create({ data: { nome: "Reengagement", cor: "#b06050" } }),
    prisma.etiqueta.create({ data: { nome: "Gravidez", cor: "#9b7db5" } }),
    prisma.etiqueta.create({ data: { nome: "Aniversário este mês", cor: "#c9a66b" } }),
  ]);

  console.log("  ✓ Etiquetas criadas");

  // ── Datas auxiliares ──────────────────────────────────────────────────────
  const hoje = new Date("2026-05-21");
  const d = (offsetDias: number): Date => {
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() + offsetDias);
    return dt;
  };

  // ── Clientes ──────────────────────────────────────────────────────────────
  // Serviços reais da Essence Wellness:
  //   Essência Plena: 40€ | Puro Aroma: 45€ | Cera Quente: 50€
  //   Drenagem Linfática: 40€ (60 min) | 60€ (90 min)

  const clientesData = [
    // ── VIP Embaixadora — cliente mais fiel, 18+ sessões ──────────────────
    {
      nome: "Ana Filipa Rodrigues",
      telefone: "912345678",
      email: "anafilipa@gmail.com",
      estado: "vip_embaixadora",
      totalSessoes: 18,
      totalGasto: 855.0,
      ultimaSessao: d(-7),
      canalPreferido: "whatsapp",
      comoNosConheceu: "instagram",
      fonte: "instagram",
      dataNascimento: new Date("1988-05-15"),
      historicoAromasPreferidos: "Lavanda e eucalipto — relaxamento profundo. Sensível a aromas cítricos fortes, prefere sempre base floral ou amadeirada.",
      historicoCondicoesAlergias: "Tensão cervical crónica. Sem alergias conhecidas. Menstruação irregular — avisar antes de usar pressão abdominal.",
      historicoEstadoEmocional: "Geralmente ansiosa no início, descontrai rapidamente. Período de muito stress no trabalho (março-abril 2026). Saiu das sessões com relatos de leveza e bem-estar duradouro.",
      historicoZonasTensao: "Pescoço e ombros (zona trapézio). Lombar quando está muitas horas ao computador. Pantorrilhas tensas nas semanas de muito treino.",
      historicoUltimaPausa: "Pausa de 3 semanas em fevereiro 2026 por viagem. Regressou com tensão acumulada.",
      notasPessoais: "Traz sempre chá para oferecer à Bea. Faz maratona — sessões pré e pós corrida têm objetivos diferentes. Prefere silêncio durante a massagem.",
      etiquetas: [etVip.id, etAniversario.id],
    },

    // ── Ativa Frequente — segunda melhor cliente ───────────────────────────
    {
      nome: "Leonor Pinheiro",
      telefone: "934455667",
      email: "leonor.pinheiro@gmail.com",
      estado: "ativa_frequente",
      totalSessoes: 11,
      totalGasto: 515.0,
      ultimaSessao: d(-10),
      canalPreferido: "whatsapp",
      comoNosConheceu: "referencia",
      fonte: "referencia",
      dataNascimento: new Date("1992-08-22"),
      historicoAromasPreferidos: "Ylang-ylang e jasmim — efeito calmante imediato. Experimentou sândalo na última sessão e adorou.",
      historicoCondicoesAlergias: "Gravidez de 28 semanas. Posições adaptadas — decúbito lateral sempre. Pressão muito suave em toda a zona abdominal e lombar inferior.",
      historicoEstadoEmocional: "Ansiosa com a gravidez mas muito positiva. Relata que as sessões são o momento em que se sente mais ela própria.",
      historicoZonasTensao: "Lombar e ancas (peso da gravidez). Pernas pesadas. Pescoço tenso por má postura ao dormir.",
      historicoUltimaPausa: "Sem pausas — frequência mensal consistente desde outubro 2025.",
      notasPessoais: "Parceiro chama-se Rui. Espera bebé para julho 2026. Quer retomar sessões 6 semanas após o parto.",
      etiquetas: [etVip.id, etGrav.id],
    },

    // ── Ativa Frequente — regularidade estabelecida ────────────────────────
    {
      nome: "Margarida Ferreira",
      telefone: "934567890",
      email: "margarida.ferreira@outlook.pt",
      estado: "ativa_frequente",
      totalSessoes: 14,
      totalGasto: 660.0,
      ultimaSessao: d(-14),
      canalPreferido: "whatsapp",
      comoNosConheceu: "referencia",
      fonte: "referencia",
      dataNascimento: new Date("1979-11-03"),
      historicoAromasPreferidos: "Rosmaninho e hortelã-pimenta — prefere aromas frescos e estimulantes. Não gosta de aromas doces.",
      historicoCondicoesAlergias: "Hérnia discal L4-L5. Evitar mobilizações bruscas da lombar. Aprovada pelo médico para massagem suave.",
      historicoEstadoEmocional: "Muito racional e controlada. Desfruta mais quando consegue 'desligar'. Reporta melhoria da qualidade do sono após sessões.",
      historicoZonasTensao: "Lombar (hérnia). Zona glútea. Pescoço lado direito (uso de rato no computador).",
      historicoUltimaPausa: "Pausa de 6 semanas em janeiro-fevereiro por trabalho intenso. Regressou com lombar bloqueada.",
      notasPessoais: "Advogada — trabalha muitas horas. Só disponível ao fim do dia, 15h em diante. Pontualíssima.",
      etiquetas: [etVip.id],
    },

    // ── Ativa Recente — boa frequência, gravidez ──────────────────────────
    {
      nome: "Sofia Mendes",
      telefone: "926789012",
      email: "sofiamendes@gmail.com",
      estado: "ativa_recente",
      totalSessoes: 9,
      totalGasto: 405.0,
      ultimaSessao: d(-21),
      canalPreferido: "whatsapp",
      comoNosConheceu: "instagram",
      fonte: "instagram",
      dataNascimento: new Date("1994-03-18"),
      historicoAromasPreferidos: "Camomila e lavanda — calma e suavidade. Preferência por aromas suaves dado o estado de gravidez.",
      historicoCondicoesAlergias: "Gravidez de 32 semanas. Protocolo pré-natal completo. Cuidado extra com a zona sacral.",
      historicoEstadoEmocional: "Calma e meditativa. Usa as sessões como momento de ligação com o bebé. Muito consciente do corpo.",
      historicoZonasTensao: "Pernas inchadas (retenção de líquidos). Pés cansados. Zona costal (espaço reduzido pelo útero).",
      historicoUltimaPausa: "Sessões iniciadas na 18ª semana de gravidez. Frequência quinzenal.",
      notasPessoais: "Professora de yoga — muito consciente do corpo. Gosta de silêncio e de música instrumental suave.",
      etiquetas: [etGrav.id],
    },

    // ── VIP em Risco — estava ativa, parou sem aviso ──────────────────────
    {
      nome: "Inês Carvalho",
      telefone: "917890123",
      email: "ines.carvalho@sapo.pt",
      estado: "vip_em_risco",
      totalSessoes: 6,
      totalGasto: 285.0,
      ultimaSessao: d(-45),
      canalPreferido: "email",
      comoNosConheceu: "google",
      fonte: "google",
      dataNascimento: new Date("1985-09-27"),
      historicoAromasPreferidos: "Bergamota e neroli — aromas cítricos leves. Disse que a ajudam a 'acordar a cabeça'.",
      historicoCondicoesAlergias: "Enxaquecas frequentes. Pressão na nuca com cuidado. Não usar aromas intensos em dias de crise.",
      historicoEstadoEmocional: "Fase de muito stress (trabalho + mudança de casa). Última sessão veio com sinais de burnout. Mostrou interesse em sessões mais frequentes mas depois parou.",
      historicoZonasTensao: "Pescoço e base do crânio (zona occipital). Ombro direito elevado cronicamente.",
      historicoUltimaPausa: "Parou de vir após março 2026. Não respondeu ao WhatsApp enviado em abril.",
      notasPessoais: "Trabalha em IT. Enxaquecas relacionadas com o écran. Pode ser boa candidata a sessão focada em drenagem cefálica.",
      etiquetas: [etReeng.id],
    },

    // ── Reativação — parou depois de poucas sessões ───────────────────────
    {
      nome: "Teresa Almeida",
      telefone: "963456789",
      email: "talmeida@gmail.com",
      estado: "reativacao",
      totalSessoes: 2,
      totalGasto: 95.0,
      ultimaSessao: d(-75),
      canalPreferido: "whatsapp",
      comoNosConheceu: "instagram",
      fonte: "instagram",
      dataNascimento: new Date("1990-12-08"),
      historicoAromasPreferidos: "Ameixa e baunilha — aromas quentes e envolventes. Adorou o calor das pedras.",
      historicoCondicoesAlergias: "Sem condições conhecidas. Pele sensível — preferir óleos base suaves.",
      historicoEstadoEmocional: "Chegou esgotada nas duas sessões. Referiu que ia marcar mais mas ficou sem tempo.",
      historicoZonasTensao: "Costas todas, tensão generalizada. Pernas pesadas.",
      historicoUltimaPausa: "Não voltou após março 2026. Última mensagem foi positiva mas sem marcação.",
      notasPessoais: "Professora. Só disponível fins de semana e feriados. Aniversário em dezembro.",
      etiquetas: [etReeng.id],
    },

    // ── Reativação — cliente nova que não voltou ───────────────────────────
    {
      nome: "Catarina Lopes",
      telefone: "912233445",
      email: "catarina.lopes@hotmail.com",
      estado: "reativacao",
      totalSessoes: 1,
      totalGasto: 45.0,
      ultimaSessao: d(-90),
      canalPreferido: "whatsapp",
      comoNosConheceu: "instagram",
      fonte: "calendly",
      dataNascimento: new Date("1997-06-14"),
      historicoAromasPreferidos: "Primeira sessão — sem histórico. Escolheu lavanda por sugestão.",
      historicoCondicoesAlergias: "Nenhuma condição conhecida. Primeira experiência com massagem.",
      historicoEstadoEmocional: "Muito nervosa antes da primeira sessão. Saiu completamente transformada — disse que nunca tinha sentido nada assim.",
      historicoZonasTensao: "Ombros e costas superiores (tensão de estudante/trabalho sedentário).",
      historicoUltimaPausa: "Só teve uma sessão em fevereiro 2026. Disse que voltava mas não marcou.",
      notasPessoais: "Jovem, primeira vez numa massagem. Reagiu muito bem. Alto potencial de fidelização se for contactada.",
      etiquetas: [etNova.id, etReeng.id],
    },

    // ── Nova cliente — ainda sem sessão ───────────────────────────────────
    {
      nome: "Beatriz Costa",
      telefone: "965566778",
      email: "beatrizcosta@gmail.com",
      estado: "novo",
      totalSessoes: 0,
      totalGasto: 0.0,
      ultimaSessao: null,
      canalPreferido: "whatsapp",
      comoNosConheceu: "instagram",
      fonte: "instagram",
      dataNascimento: new Date("1995-02-28"),
      historicoAromasPreferidos: null,
      historicoCondicoesAlergias: null,
      historicoEstadoEmocional: null,
      historicoZonasTensao: null,
      historicoUltimaPausa: null,
      notasPessoais: "Entrou em contacto pelo Instagram. Pediu informação sobre preços e serviços. Não marcou ainda.",
      etiquetas: [etNova.id],
    },

    // ── Lead — contacto a converter ────────────────────────────────────────
    {
      nome: "Daniela Vieira",
      telefone: "938877665",
      email: "daniela.vieira@gmail.com",
      estado: "lead",
      totalSessoes: 0,
      totalGasto: 0.0,
      ultimaSessao: null,
      canalPreferido: "whatsapp",
      comoNosConheceu: "referencia",
      fonte: "referencia",
      dataNascimento: null,
      historicoAromasPreferidos: null,
      historicoCondicoesAlergias: "Referiu que tem escoliose — verificar protocolo adequado.",
      historicoEstadoEmocional: null,
      historicoZonasTensao: null,
      historicoUltimaPausa: null,
      notasPessoais: "Recomendada pela Margarida Ferreira. Enviou mensagem dia 18/05. A aguardar resposta para marcar primeira sessão.",
      etiquetas: [etNova.id],
    },
  ];

  const clientes = await Promise.all(
    clientesData.map(async ({ etiquetas, ...data }) => {
      const cliente = await prisma.cliente.create({ data: data as Parameters<typeof prisma.cliente.create>[0]["data"] });
      if (etiquetas.length > 0) {
        await prisma.clienteEtiqueta.createMany({
          data: etiquetas.map((etiquetaId) => ({
            clienteId: cliente.id,
            etiquetaId,
          })),
        });
      }
      return cliente;
    })
  );

  console.log(`  ✓ ${clientes.length} clientes criados`);

  // ── Sessões ───────────────────────────────────────────────────────────────
  const [ana, leonor, margarida, sofia, ines, teresa, catarina, , ] = clientes;

  const sessoesData = [
    // ── Ana Filipa — VIP Embaixadora, 18 sessões ──────────────────────────
    { clienteId: ana.id, data: d(-200), hora: "10:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada", aromaSessao: "Lavanda", resumoSessao: "Primeira sessão. Muita tensão acumulada. Cliente muito nervosa no início, descontraiu progressivamente. Foco no pescoço e ombros.", notasPosSessao: "Voltar com eucalipto na próxima — mostrou curiosidade. Tensão no trapézio esquerdo mais acentuada." },
    { clienteId: ana.id, data: d(-180), hora: "10:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Eucalipto e lavanda", resumoSessao: "Segunda sessão. Muito mais relaxada desde o início. Tensão cervical melhorou mas não resolveu. Trabalhámos mais a lombar desta vez.", notasPosSessao: "Prestar atenção à postura — trabalha muito ao computador. Sugerir exercícios de pescoço." },
    { clienteId: ana.id, data: d(-150), hora: "10:30", duracao: 75, servico: "Massagem Dubai Essence", preco: 55, terapeuta: "bea", estado: "realizada", aromaSessao: "Sândalo e lavanda", resumoSessao: "Sessão longa. Cliente preparou-se para uma meia maratona. Trabalho focado em pernas e lombar. Protocolo desportivo.", notasPosSessao: "Pré-corrida: foco em mobilidade e ativação. Pós-corrida: recuperação muscular profunda." },
    { clienteId: ana.id, data: d(-120), hora: "10:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada", aromaSessao: "Lavanda", resumoSessao: "Pós meia maratona. Pernas e glúteos muito tensionados. Excelente recuperação durante a sessão.", notasPosSessao: "Perguntar sobre próxima corrida para ajustar protocolo." },
    { clienteId: ana.id, data: d(-90), hora: "10:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Eucalipto e hortelã", resumoSessao: "Sessão de manutenção. Cliente com stress de trabalho elevado. Trabalhámos mais a região cefálica e ombros.", notasPosSessao: "Considerar drenagem linfática facial na próxima visita." },
    { clienteId: ana.id, data: d(-60), hora: "10:00", duracao: 60, servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "realizada", aromaSessao: "Lavanda", resumoSessao: "Primeira experiência com cera quente. Adorou o calor na lombar. Tensão cervical resolvida pela primeira vez.", notasPosSessao: "Cliente muito entusiasta com a cera. Repetir com certeza." },
    { clienteId: ana.id, data: d(-30), hora: "10:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Ylang-ylang e lavanda", resumoSessao: "Sessão relaxante profunda. Cliente veio com enxaqueca leve — adaptámos protocolo. Saiu sem dor.", notasPosSessao: "Explorar protocolo de massagem cefálica para as enxaquecas ocasionais." },
    { clienteId: ana.id, data: d(-7), hora: "10:30", duracao: 75, servico: "Massagem Dubai Essence", preco: 55, terapeuta: "bea", estado: "realizada", aromaSessao: "Sândalo e eucalipto", resumoSessao: "Preparação para corrida de 10km este fim de semana. Protocolo completo de ativação. Energia excelente.", notasPosSessao: "Perguntar como correu a prova. Agendar recuperação para a semana seguinte." },
    { clienteId: ana.id, data: d(7), hora: "10:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null },

    // ── Leonor — Ativa Frequente, gravidez ────────────────────────────────
    { clienteId: leonor.id, data: d(-140), hora: "12:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Camomila e lavanda", resumoSessao: "Sessão pré-natal adaptada, 16 semanas. Decúbito lateral. Foco nas pernas e zona lombar.", notasPosSessao: "Gravidez a desenvolver bem. Protocolo pré-natal confirmado pelo médico." },
    { clienteId: leonor.id, data: d(-110), hora: "12:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Ylang-ylang suave", resumoSessao: "20 semanas. Pernas mais pesadas. Drenagem linfática adaptada. Muita retenção nos tornozelos.", notasPosSessao: "Drenagem linfática a fazer em todas as sessões a partir de agora." },
    { clienteId: leonor.id, data: d(-80), hora: "12:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Camomila e sândalo", resumoSessao: "24 semanas. Muito confortável. Aprendeu a respirar conscientemente durante a massagem.", notasPosSessao: "Explorar musicoterapia combinada na próxima sessão." },
    { clienteId: leonor.id, data: d(-50), hora: "12:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Lavanda e jasmim suave", resumoSessao: "26 semanas. Sessão muito serena. Cliente completamente entregue. Bebé a mexer durante a sessão.", notasPosSessao: "Momento muito especial. Partilhar experiência futuramente." },
    { clienteId: leonor.id, data: d(-10), hora: "12:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Camomila e lavanda", resumoSessao: "28 semanas. Pernas e ancas com muito peso. Drenagem intensa nos membros inferiores. Saiu a flutuar.", notasPosSessao: "Próxima sessão em 2 semanas. Acompanhar evolução até ao parto." },
    { clienteId: leonor.id, data: d(10), hora: "12:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null },

    // ── Margarida — Ativa Frequente ────────────────────────────────────────
    { clienteId: margarida.id, data: d(-160), hora: "15:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada", aromaSessao: "Hortelã e eucalipto", resumoSessao: "Primeira sessão. Hérnia discal L4-L5. Protocolo adaptado, sem mobilizações. Foco superficial na lombar.", notasPosSessao: "Médico aprovou. Manter protocolo suave sempre." },
    { clienteId: margarida.id, data: d(-130), hora: "15:30", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Rosmaninho e menta", resumoSessao: "Segunda sessão. Lombar muito melhor. Trabalhámos mais ombros e pescoço desta vez.", notasPosSessao: "Pescoço lado direito muito tenso — rato no computador. Sugerir setup ergonómico." },
    { clienteId: margarida.id, data: d(-100), hora: "15:00", duracao: 60, servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "realizada", aromaSessao: "Eucalipto", resumoSessao: "Primeira experiência com cera. Benefício imenso na lombar. Calor penetrante, muito acima da expectativa da cliente.", notasPosSessao: "Cera quente ideal para a hérnia. Incorporar em todas as sessões." },
    { clienteId: margarida.id, data: d(-70), hora: "15:00", duracao: 60, servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "realizada", aromaSessao: "Rosmaninho", resumoSessao: "Pausa longa por trabalho intenso. Lombar bloqueada à chegada. Cera quente resolveu em 20 minutos.", notasPosSessao: "Confirmar que não passa de 6 semanas sem vir — hérnia agrava com sedentarismo." },
    { clienteId: margarida.id, data: d(-40), hora: "16:00", duracao: 60, servico: "Massagem Dubai Essence", preco: 55, terapeuta: "bea", estado: "realizada", aromaSessao: "Sândalo e hortelã", resumoSessao: "Sessão completa. Corpo todo muito melhor. Começou a fazer pilates — coluna estável.", notasPosSessao: "Pilates está a ajudar muito. Coordenar sessões com o calendário de pilates." },
    { clienteId: margarida.id, data: d(-14), hora: "15:00", duracao: 60, servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "realizada", aromaSessao: "Eucalipto e rosmaninho", resumoSessao: "Sessão de manutenção. Coluna estável. Foco nos ombros que estão a acumular tensão.", notasPosSessao: "Próxima sessão em 3 semanas." },
    { clienteId: margarida.id, data: d(14), hora: "15:00", duracao: 60, servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null },

    // ── Sofia — Ativa Recente, gravidez ───────────────────────────────────
    { clienteId: sofia.id, data: d(-90), hora: "11:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Camomila", resumoSessao: "18 semanas. Primeira sessão pré-natal. Muito ansiosa. Saiu completamente serena.", notasPosSessao: "Grande potencial de fidelização. Quinzenal até ao parto." },
    { clienteId: sofia.id, data: d(-60), hora: "11:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Lavanda e camomila", resumoSessao: "24 semanas. Muito mais confortável. Pernas inchadas. Drenagem linfática integrada.", notasPosSessao: "Retenção a aumentar com a gravidez. Monitorizar." },
    { clienteId: sofia.id, data: d(-21), hora: "11:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Camomila e lavanda", resumoSessao: "32 semanas. Pernas muito pesadas, zona costal apertada. Focámos na respiração e relaxamento pélvico.", notasPosSessao: "Agendar para 2 semanas. Bebé em posição cefálica." },

    // ── Inês — VIP em Risco ───────────────────────────────────────────────
    { clienteId: ines.id, data: d(-140), hora: "10:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada", aromaSessao: "Bergamota", resumoSessao: "Primeira sessão. Enxaquecas frequentes. Protocolo cuidadoso na nuca. Boa resposta.", notasPosSessao: "Bergamota ajudou. Manter aromas leves." },
    { clienteId: ines.id, data: d(-100), hora: "10:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Neroli e bergamota", resumoSessao: "Veio com enxaqueca inicial. Adaptámos — massagem craniana focada. Enxaqueca resolvida durante a sessão.", notasPosSessao: "Protocolo de massagem craniana para enxaqueca funciona muito bem com ela." },
    { clienteId: ines.id, data: d(-55), hora: "10:00", duracao: 60, servico: "Massagem Dubai Essence", preco: 55, terapeuta: "bea", estado: "realizada", aromaSessao: "Bergamota e eucalipto", resumoSessao: "Sinais claros de burnout. Muito tensa, pouco presente. Sessão longa de relaxamento profundo.", notasPosSessao: "Recomendei sessões mais frequentes. Disse que ia marcar mas não marcou. Fazer follow-up." },
    { clienteId: ines.id, data: d(-45), hora: "10:00", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "bea", estado: "realizada", aromaSessao: "Neroli", resumoSessao: "Ligeiramente melhor que na última. Referiu mudança de casa — stress adicional. Sessão de aconchego.", notasPosSessao: "Não voltou depois disto. Enviar mensagem de reengagement com toque pessoal." },

    // ── Teresa — Reativação ───────────────────────────────────────────────
    { clienteId: teresa.id, data: d(-160), hora: "14:00", duracao: 60, servico: "Essência Plena", preco: 40, terapeuta: "bea", estado: "realizada", aromaSessao: "Baunilha e ameixa", resumoSessao: "Primeira sessão. Adorou o calor. Completamente apaixonada pelo ambiente.", notasPosSessao: "Alto potencial. Prometeu voltar — acompanhar." },
    { clienteId: teresa.id, data: d(-75), hora: "14:00", duracao: 60, servico: "Cera Quente", preco: 55, terapeuta: "bea", estado: "realizada", aromaSessao: "Baunilha", resumoSessao: "Segunda sessão com cera quente. Experiência muito positiva. Referiu que só não vem mais por causa do horário.", notasPosSessao: "Disponível apenas fins de semana. Oferecer horário específico de sábado." },

    // ── Catarina — Reativação (1 sessão apenas) ───────────────────────────
    { clienteId: catarina.id, data: d(-90), hora: "09:30", duracao: 60, servico: "Puro Aroma", preco: 45, terapeuta: "cris", estado: "realizada", aromaSessao: "Lavanda", resumoSessao: "Primeira massagem da vida. Extremamente nervosa no início, saiu completamente diferente. Disse que foi uma das melhores experiências da vida.", notasPosSessao: "Transformação visível. Alto potencial. Reengagement urgente — estas clientes se não forem contactadas não voltam sozinhas." },
  ];

  await prisma.sessao.createMany({ data: sessoesData as NonNullable<Parameters<typeof prisma.sessao.createMany>[0]>["data"] });
  console.log(`  ✓ ${sessoesData.length} sessões criadas`);

  // ── Mensagens IA pendentes ────────────────────────────────────────────────
  const mensagensData = [
    {
      clienteId: ines.id,
      canal: "whatsapp",
      estado: "pendente",
      motivoGeracao: "VIP em risco — sem sessão há 45 dias, sinais de burnout na última visita",
      mensagemGerada:
        "Olá Inês! 🌿 Aqui é a Bea da Essence Wellness.\n\nEstava a pensar em ti hoje. Sei que andas numa fase muito intensa — a mudança de casa, o trabalho... é muito para gerir ao mesmo tempo.\n\nAs nossas sessões têm feito tanto bem às tuas enxaquecas e à tensão do pescoço, e não queria que todo esse progresso se perdesse.\n\nSe precisares de um momento só teu para respirar, estou aqui. Esta semana tenho ainda disponibilidade na quinta e na sexta de manhã.\n\nUm abraço grande 💚",
      geradaEm: d(-1),
    },
    {
      clienteId: teresa.id,
      canal: "whatsapp",
      estado: "pendente",
      motivoGeracao: "Reativação — sem sessão há 75 dias, só disponível fins de semana",
      mensagemGerada:
        "Olá Teresa! 🌺 É a Bea da Essence Wellness.\n\nJá há uns meses que não nos vemos e tinha saudades tuas! Lembro-me da tua cara depois da sessão de cera quente — saíste literalmente a flutuar.\n\nSei que os teus horários são mais difíceis durante a semana. Tenho disponibilidade este sábado de manhã, às 10h ou às 11h30. Seria tão bom receber-te!\n\nQueres que reserve um desses horários? 🌿",
      geradaEm: d(-2),
    },
    {
      clienteId: catarina.id,
      canal: "whatsapp",
      estado: "pendente",
      motivoGeracao: "Reativação urgente — primeira massagem da vida, não voltou após 90 dias",
      mensagemGerada:
        "Olá Catarina! 💫 É a Bea da Essence Wellness.\n\nAinda me lembro muito bem da tua primeira sessão — disseste que tinha sido uma das melhores experiências da tua vida e eu fiquei tão contente por teres chegado aqui!\n\nJá passaram alguns meses e gostava de te convidar a continuar essa jornada. Uma sessão por mês faz uma diferença enorme no bem-estar, na energia e até no sono.\n\nGostarias de marcar? Tenho horários esta semana e na próxima 🌿",
      geradaEm: d(-3),
    },
    {
      clienteId: ana.id,
      canal: "whatsapp",
      estado: "aprovada",
      mensagemFinal: "Olá Ana Filipa! 🌿 Aqui é a Bea. Só queria confirmar a tua sessão de amanhã, dia 28 de maio às 10h00. Estou ansiosa para saber como correu a corrida de 10km! Até amanhã 💚",
      motivoGeracao: "Lembrete de sessão agendada em 7 dias",
      mensagemGerada:
        "Olá Ana Filipa! 🌿 Aqui é a Bea da Essence Wellness.\n\nSó queria confirmar a tua sessão de massagem marcada para daqui a uma semana, dia 28 de maio às 10h00.\n\nComo correu a corrida de 10km? Estou curiosa e já a preparar o protocolo de recuperação para ti!\n\nAté já 💚",
      geradaEm: d(0),
      aprovadaEm: d(0),
    },
  ];

  await prisma.mensagemIA.createMany({ data: mensagensData as NonNullable<Parameters<typeof prisma.mensagemIA.createMany>[0]>["data"] });
  console.log(`  ✓ ${mensagensData.length} mensagens IA criadas`);

  // ── Templates de mensagem ─────────────────────────────────────────────────
  // Corrigido 2026-09-03: a versão anterior usava "tu" (a regra do projeto
  // é sempre "você" na comunicação com clientes, ver CLAUDE.md da raiz) e
  // "campanha_miminho" inventava um desconto de 10% que não é o programa
  // real — "O Miminho" (08_REATIVACAO_CLIENTES/12-programa-referral-e-
  // -indicacoes.md) recompensa quem indica com um mini ritual de pés
  // grátis na próxima visita, não com desconto monetário. Descoberto ao
  // investigar por que a mensagem de avaliação pós-sessão nunca aparecia
  // em Mensagens: os 9 templates nunca tinham sido gravados em produção
  // (só existiam aqui, no seed de dev) — gravados manualmente a par desta
  // correção.
  const templatesData = [
    {
      nome: "avaliacao_pos_sessao",
      tipo: "avaliacao",
      texto: "Olá {{nome}} 🌿 Obrigada pela sua visita hoje. Como se sentiu depois da sessão — de 1 a 5, que nota daria?\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "reengagement_45dias",
      tipo: "reengagement",
      texto: "Olá {{nome}} 🌿 Já lá vai algum tempo desde a sua última sessão. Está tudo bem?\n\nQuando lhe apetecer voltar, temos todo o gosto em recebê-la.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "reengagement_90dias",
      tipo: "reengagement",
      texto: "Olá {{nome}} 🤍 Há uns meses que não a vemos por cá e temos sentido a sua falta.\n\nSe lhe apetecer uma pausa, estamos aqui para si.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "aniversario",
      tipo: "aniversario",
      texto: "Olá {{nome}} 🎂 Feliz aniversário! Esperamos que seja um dia muito especial.\n\nSe lhe apetecer celebrar com uma sessão, temos todo o gosto em recebê-la.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "boas_vindas_novo_cliente",
      tipo: "boas_vindas",
      texto: "Olá {{nome}} 🌿 Seja bem-vinda à Essence Wellness — foi um prazer tê-la connosco.\n\nQualquer dúvida, estamos aqui.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "campanha_drenagem_linfatica",
      tipo: "campanha",
      texto: "Olá {{nome}} 🌊 Já conhece a nossa Drenagem Linfática? Ajuda a aliviar pernas pesadas e a melhorar a circulação.\n\nSe quiser experimentar, é só marcar.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "campanha_miminho",
      tipo: "campanha",
      texto: "Olá {{nome}} 💚 Sabe que pode indicar uma amiga à Essence Wellness?\n\nSe ela vier marcar, na sua próxima visita tem um mimo especial à sua espera.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome"],
    },
    {
      nome: "lembrete_agendamento",
      tipo: "lembrete",
      texto: "Olá {{nome}} 🌿 Só a lembrar da sua sessão marcada para {{data}} às {{hora}}.\n\nAté já!\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome", "data", "hora"],
    },
    {
      nome: "confirmacao_reagendamento",
      tipo: "lembrete",
      texto: "Olá {{nome}} 🗓️ A sua sessão foi reagendada para {{data}} às {{hora}}.\n\nSe precisar de ajustar, é só dizer.\n\nFlora ✦ | Essence Wellness",
      variaveis: ["nome", "data", "hora"],
    },
  ]

  for (const t of templatesData) {
    await prisma.templateMensagem.upsert({
      where: { nome: t.nome },
      update: { texto: t.texto, variaveis: t.variaveis },
      create: t,
    })
  }
  console.log(`  ✓ ${templatesData.length} templates de mensagem criados/verificados`)

  console.log("\n✅ Seed concluído com sucesso!");
  console.log("\n📋 Resumo:");
  console.log("   Utilizadores: bea@essencewellnesspt.com | cris@essencewellnesspt.com");
  console.log("   Password: (definida via SEED_PASSWORD ou 'change-me-before-use')");
  console.log(`   Clientes: ${clientes.length} (com 9 estados CRM)`);
  console.log(`   Sessões: ${sessoesData.length} (com dados clínicos reais)`);
  console.log(`   Mensagens IA: ${mensagensData.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { main as seed };
