// Descrições que aparecem no voucher que a cliente recebe.
//
// Tom: segunda pessoa ("tu"), a condizer com o resto da página do voucher,
// que é fixa e já diz "Para ti" e "Descobrir o teu presente". É diferente da
// regra do WhatsApp (que usa "você") de propósito — aqui o texto vive dentro
// de um presente, não de uma conversa.
//
// Estrutura de cada uma, herdada das que já existiam no gerador antigo:
//   1. "Recebeste [serviço] — [duração]"
//   2. a situação de quem vai receber (o "trabalho" que a sessão faz)
//   3. o que acontece mesmo na sessão, concreto
//   4. fecho curto com o resultado
//
// Composição dos rituais de campanha confirmada nas páginas arquivadas do
// site (02_WEBSITE/_arquivo/dia-da-mulher.html e dia-dos-namorados.html).
//
// Correr:  npx tsx prisma/seed-descricoes-voucher.ts
import { prisma } from "../lib/prisma"

const DESCRICOES: Record<string, string> = {
  // ── Base ───────────────────────────────────────────────────────────
  "Essência Plena":
    "Recebeste uma Massagem de Relaxamento Essência Plena — 60 min. Começa com uma pergunta simples: o que precisa o teu corpo hoje? A partir daí o toque vai exatamente onde carregas mais tensão, com o óleo essencial escolhido para esta sessão. Para saíres leve.",

  "Essência Plena 90 min":
    "Recebeste uma Massagem de Relaxamento Essência Plena — 90 min. Meia hora a mais muda a sessão: dá tempo de trabalhar as costas inteiras sem pressa e voltar às zonas que pedem uma segunda passagem. Para quem chega com tensão de semanas, não de dias.",

  "Essência Plena a dois":
    "Recebeste uma Massagem de Relaxamento Essência Plena a dois — 60 min. As duas sessões acontecem ao mesmo tempo, cada uma com a sua terapeuta e adaptada ao que cada corpo precisa nesse dia. Um momento partilhado, sem pressas.",

  "Puro Aroma":
    "Recebeste uma Massagem de Relaxamento Aromática Puro Aroma — 60 min. Para quando a cabeça não desliga mesmo com o corpo já cansado. O aroma que escolhes guia a sessão inteira e trabalha diretamente no sistema nervoso, enquanto o toque faz o resto.",

  "Puro Aroma 90 min":
    "Recebeste uma Massagem de Relaxamento Aromática Puro Aroma — 90 min. O aroma que escolhes guia a sessão, e os 90 minutos dão espaço ao corpo para assentar de verdade — a diferença nota-se na última meia hora, quando já nada resiste. Para desligar a sério.",

  "Puro Aroma a dois":
    "Recebeste uma Massagem de Relaxamento Aromática Puro Aroma a dois — 60 min. Cada um escolhe o seu aroma e as sessões decorrem em simultâneo, lado a lado. Saem os dois com o corpo solto e a cabeça mais calma.",

  "Cera Quente":
    "Recebeste um Ritual de Massagem com Cera Quente Nutritiva — 60 min. O calor da cera terapêutica dissolve a tensão muscular ao mesmo tempo que a pele absorve hidratação em profundidade. O nosso ritual mais completo: corpo e pele na mesma sessão.",

  "Cera Quente 90 min":
    "Recebeste um Ritual de Massagem com Cera Quente Nutritiva — 90 min. O calor da cera derretida solta a musculatura enquanto a pele bebe a hidratação, e os 90 minutos chegam para tratar o corpo todo em vez de escolher zonas. Sais com o corpo tratado e a pele nutrida.",

  "Cera Quente a dois":
    "Recebeste um Ritual de Massagem com Cera Quente Nutritiva a dois — 60 min. O calor da cera solta a musculatura e nutre a pele, nas duas sessões ao mesmo tempo. O nosso ritual mais completo, para partilhar.",

  // ── Drenagem linfática ─────────────────────────────────────────────
  "Drenagem Linfática 60 min":
    "Recebeste uma sessão de Drenagem Linfática Manual — 60 min, método Vodder. Não é uma massagem de relaxamento: o toque é lento e muito leve, porque o sistema linfático corre a poucos milímetros da pele. Serve para reduzir inchaço e retenção — as pernas ficam mais leves logo à saída.",

  "Drenagem Linfática 90 min":
    "Recebeste uma sessão de Drenagem Linfática Manual — 90 min, método Vodder. O toque é lento e muito leve, que é como o sistema linfático responde. Com 90 minutos dá para trabalhar o corpo todo em vez de só as pernas. Para inchaço e retenção que já vêm de longe.",

  // ── Dia da Mãe ─────────────────────────────────────────────────────
  "Massagem Mãe Serena (Dia da Mãe)":
    "Recebeste a Massagem Mãe Serena — 60 min de Relaxamento Essência Plena, a solo. Uma sessão para soltar o corpo e calar o ruído do dia. O toque adapta-se onde carregas mais tensão, com o óleo essencial escolhido para o que precisas hoje. Para saíres leve.",

  "Mãe Serena a Duas (Dia da Mãe)":
    "Recebeste a Massagem Mãe Serena a Duas — 60 min de Relaxamento Essência Plena. Para partilhar um momento de calma genuína com alguém especial. As duas sessões decorrem em simultâneo, cada uma adaptada ao que cada corpo precisa nesse dia.",

  "Ritual Mãe Divina (Dia da Mãe)":
    "Recebeste o Ritual Mãe Divina — 60 min de Massagem com Cera Quente Nutritiva, com Vela Cristal de oferta. O calor da cera dissolve a tensão muscular enquanto a pele absorve hidratação em profundidade. Sais com o corpo tratado, a pele nutrida — e uma vela para prolongar a sensação em casa.",

  "Mãe Divina a Duas (Dia da Mãe)":
    "Recebeste o Ritual Mãe Divina a Duas — 60 min de Massagem com Cera Quente Nutritiva, com Vela Cristal de oferta para cada uma. Um momento partilhado, sem pressas: as duas sessões decorrem em simultâneo. Cada uma sai com o corpo tratado, a pele nutrida e a sua vela para levar.",

  "Ritual Essência de Mãe (Dia da Mãe)":
    "Recebeste o Ritual Essência de Mãe — 60 min de Massagem Aromática Puro Aroma, precedidos de um Banho de Hidromassagem de Pés. Começa pelos pés, onde o cansaço se instala sem se dar por isso, e só depois a massagem aromática trabalha o sistema nervoso com o aroma que escolheres. Para quando precisas mesmo de desligar.",

  // ── Dia da Mulher ──────────────────────────────────────────────────
  "Massagem Essência (Dia da Mulher)":
    "Recebeste a Massagem Essência — 60 minutos em que a única prioridade és tu. Sem exigências e sem relógio: acolhimento à chegada, a massagem adaptada ao que o teu corpo pede nesse dia, e um ritual de chá no fim para não saíres a correr.",

  "Massagem Essência a Duas (Dia da Mulher)":
    "Recebeste a Massagem Essência a Duas — 60 minutos só vossos. As duas sessões decorrem ao mesmo tempo, cada uma adaptada ao seu corpo, com acolhimento à chegada e ritual de chá no fim. Para partilhar o descanso com quem faz falta.",

  "Ritual Luz & Alma (Dia da Mulher)":
    "Recebeste o Ritual Luz & Alma — massagem com Cera Quente Nutritiva e essências premium à tua escolha. O calor derrete a exaustão acumulada enquanto a pele absorve hidratação profunda. Levas ainda uma Vela de Cristal exclusiva, para prolongar a sensação em casa.",

  "Ritual Luz & Alma a Duas (Dia da Mulher)":
    "Recebeste o Ritual Luz & Alma a Duas — massagem com Cera Quente Nutritiva e essências premium, cada uma com a sua escolha. As sessões decorrem em simultâneo e cada uma leva a sua Vela de Cristal exclusiva. O nosso ritual mais completo, a dobrar.",

  // ── Dia dos Namorados ──────────────────────────────────────────────
  "Massagem Conexão (Dia dos Namorados)":
    "Recebeste a Massagem Conexão — 60 min de massagem simultânea para os dois. Para o casal que precisa mesmo de parar: a sala à luz de velas, as duas massagens ao mesmo tempo, e um ritual de chá no fim sem ninguém a olhar para o relógio.",

  "Ritual Fogo & Alma (Dia dos Namorados)":
    "Recebeste o Ritual Fogo & Alma — 60 min de massagem simultânea com vela quente aromática, à vossa escolha. O óleo da vela derretida nutre a pele e solta a musculatura em profundidade. No fim, espumante e chocolates artesanais — sem pressa de sair.",
}

async function main() {
  const servicos = await prisma.servico.findMany({ select: { id: true, nome: true } })
  const nomesNaBD = new Set(servicos.map(s => s.nome))

  // Falha alto em vez de escrever a meio: um nome que não bate certo é
  // sempre erro de digitação ou serviço renomeado, e o voucher sairia sem
  // descrição sem ninguém dar por isso.
  const semCorrespondencia = Object.keys(DESCRICOES).filter(n => !nomesNaBD.has(n))
  const semDescricao = servicos.filter(s => !DESCRICOES[s.nome]).map(s => s.nome)

  if (semCorrespondencia.length > 0) {
    console.error("Descrições sem serviço correspondente na BD:")
    semCorrespondencia.forEach(n => console.error("  -", n))
    process.exit(1)
  }
  if (semDescricao.length > 0) {
    console.error("Serviços na BD sem descrição escrita:")
    semDescricao.forEach(n => console.error("  -", n))
    process.exit(1)
  }

  let escritos = 0
  for (const s of servicos) {
    await prisma.servico.update({
      where: { id: s.id },
      data: { descricaoVoucher: DESCRICOES[s.nome] },
    })
    escritos++
  }

  console.log(`Descrições de voucher escritas: ${escritos} de ${servicos.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
