import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  // Apagar mensagem de teste do n8n
  await p.mensagemIA.deleteMany({ where: { motivoGeracao: "Teste" } });

  // Repor as 3 mensagens pendentes e a aprovada como estavam no seed
  const clientes = await p.cliente.findMany({ select: { id: true, nome: true } });
  const por = (nome: string) => clientes.find(c => c.nome.startsWith(nome))!;

  const hoje = new Date("2026-05-21");
  const d = (offset: number) => { const dt = new Date(hoje); dt.setDate(dt.getDate() + offset); return dt; };

  // Apagar todas e recriar limpas
  await p.mensagemIA.deleteMany({});

  await p.mensagemIA.createMany({ data: [
    {
      clienteId: por("Inês").id,
      canal: "whatsapp", estado: "pendente",
      motivoGeracao: "VIP em risco — sem sessão há 45 dias, sinais de burnout na última visita",
      mensagemGerada: "Olá Inês! 🌿 Aqui é a Bea da Essence Wellness.\n\nEstava a pensar em ti hoje. Sei que andas numa fase muito intensa — a mudança de casa, o trabalho... é muito para gerir ao mesmo tempo.\n\nAs nossas sessões têm feito tanto bem às tuas enxaquecas e à tensão do pescoço, e não queria que todo esse progresso se perdesse.\n\nSe precisares de um momento só teu para respirar, estou aqui. Esta semana tenho ainda disponibilidade na quinta e na sexta de manhã.\n\nUm abraço grande 💚",
      geradaEm: d(-1),
    },
    {
      clienteId: por("Teresa").id,
      canal: "whatsapp", estado: "pendente",
      motivoGeracao: "Reativação — sem sessão há 75 dias, só disponível fins de semana",
      mensagemGerada: "Olá Teresa! 🌺 É a Bea da Essence Wellness.\n\nJá há uns meses que não nos vemos e tinha saudades tuas! Lembro-me da tua cara depois da sessão de cera quente — saíste literalmente a flutuar.\n\nSei que os teus horários são mais difíceis durante a semana. Tenho disponibilidade este sábado de manhã, às 10h ou às 11h30. Seria tão bom receber-te!\n\nQueres que reserve um desses horários? 🌿",
      geradaEm: d(-2),
    },
    {
      clienteId: por("Catarina").id,
      canal: "whatsapp", estado: "pendente",
      motivoGeracao: "Reativação urgente — primeira massagem da vida, não voltou após 90 dias",
      mensagemGerada: "Olá Catarina! 💫 É a Bea da Essence Wellness.\n\nAinda me lembro muito bem da tua primeira sessão — disseste que tinha sido uma das melhores experiências da tua vida e eu fiquei tão contente por teres chegado aqui!\n\nJá passaram alguns meses e gostava de te convidar a continuar essa jornada. Uma sessão por mês faz uma diferença enorme no bem-estar, na energia e até no sono.\n\nGostarias de marcar? Tenho horários esta semana e na próxima 🌿",
      geradaEm: d(-3),
    },
    {
      clienteId: por("Ana Filipa").id,
      canal: "whatsapp", estado: "aprovada",
      motivoGeracao: "Lembrete de sessão agendada em 7 dias",
      mensagemGerada: "Olá Ana Filipa! 🌿 Aqui é a Bea da Essence Wellness.\n\nSó queria confirmar a tua sessão de massagem marcada para daqui a uma semana, dia 28 de maio às 10h00.\n\nComo correu a corrida de 10km? Estou curiosa e já a preparar o protocolo de recuperação para ti!\n\nAté já 💚",
      mensagemFinal: "Olá Ana Filipa! 🌿 Aqui é a Bea. Só queria confirmar a tua sessão de amanhã, dia 28 de maio às 10h00. Estou ansiosa para saber como correu a corrida de 10km! Até amanhã 💚",
      geradaEm: d(0), aprovadaEm: d(0),
    },
  ]});

  const m = await p.mensagemIA.findMany({ select: { estado: true, motivoGeracao: true } });
  console.log("Mensagens no DB:");
  m.forEach(x => console.log(" ", x.estado.padEnd(10), "|", (x.motivoGeracao ?? "").slice(0, 50)));
}

main().catch(console.error).finally(() => p.$disconnect());
