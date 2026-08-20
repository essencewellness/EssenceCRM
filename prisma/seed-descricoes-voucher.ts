// Descrições que aparecem no voucher que a cliente recebe.
//
// Escritas pela razão emocional, não pela ficha técnica: a primeira frase é o
// motivo pelo qual alguém quer isto — o estado em que chega, o que vai sentir
// — e só depois vem o que a sessão é. A primeira versão destas descrições
// abria toda com "Recebeste X — 60 min" e passava logo ao mecanismo (o que a
// cera faz à pele, o que o aroma faz ao sistema nervoso). Lia-se a catálogo,
// não a presente.
//
// Tom: segunda pessoa ("tu"), a condizer com o resto da página do voucher,
// que é fixa e já diz "Para ti" e "Descobrir o teu presente". Difere da regra
// de tratamento do WhatsApp ("você") de propósito — aqui o texto vive dentro
// de um presente, não de uma conversa. Ver NOTA no fim do ficheiro.
//
// Composição dos rituais de campanha confirmada nas páginas arquivadas do
// site (02_WEBSITE/_arquivo/dia-da-mulher.html e dia-dos-namorados.html),
// não inventada.
//
// Correr:  npx tsx prisma/seed-descricoes-voucher.ts
import { prisma } from "../lib/prisma"

const DESCRICOES: Record<string, string> = {
  // ── Base ───────────────────────────────────────────────────────────
  "Essência Plena":
    "Há dias em que o corpo só pede uma hora sem ninguém a precisar de nada. É isso que tens aqui: 60 minutos de Massagem de Relaxamento Essência Plena. Dizes onde dói, escolhemos o óleo para o teu dia, e o resto é deixares acontecer. Sais mais leve do que entraste.",

  "Essência Plena 90 min":
    "Quando a tensão já não é do dia mas das últimas semanas, uma hora sabe a pouco. Tens 90 minutos de Massagem de Relaxamento Essência Plena. Dá tempo para as costas inteiras e para voltar onde ficou por soltar, sem ninguém a olhar para o relógio.",

  "Essência Plena a dois":
    "Descansar sozinho é bom. Ao lado de quem gostas é outra coisa. São 60 minutos de Massagem de Relaxamento Essência Plena a dois, as duas sessões ao mesmo tempo, cada corpo tratado à sua maneira. Saem os dois calmos, e é disso que se lembram depois.",

  "Puro Aroma":
    "Para quando o corpo já parou mas a cabeça continua a trabalhar. São 60 minutos de Massagem Aromática Puro Aroma. Escolhes o aroma à chegada e é ele que conduz a sessão, a chegar onde o pensamento não chega sozinho. O ruído baixa devagar. Depois passa.",

  "Puro Aroma 90 min":
    "Desligar a sério leva tempo. Tens 90 minutos de Massagem Aromática Puro Aroma, e a diferença sente-se na última meia hora, quando o corpo finalmente deixa de resistir. Escolhes o aroma, nós tratamos do resto.",

  "Puro Aroma a dois":
    "Estar bem ao lado de alguém sem ter de dizer nada. São 60 minutos de Massagem Aromática Puro Aroma a dois, cada um com o seu aroma, as sessões lado a lado ao mesmo tempo. Saem os dois com a cabeça mais arrumada do que a trouxeram.",

  "Cera Quente":
    "Há cansaço que só o calor tira. São 60 minutos de Ritual com Cera Quente Nutritiva: a cera morna assenta na pele, solta o que estava preso e hidrata ao mesmo tempo. Sais com o corpo tratado e a pele diferente ao toque. É o nosso ritual mais completo.",

  "Cera Quente 90 min":
    "Não ter de escolher entre as costas e as pernas já é meio caminho para descansar. São 90 minutos de Ritual com Cera Quente Nutritiva, com tempo para o corpo todo. O calor faz o trabalho lento que a pressa nunca deixa fazer. Sais com o corpo tratado por inteiro e a pele nutrida.",

  "Cera Quente a dois":
    "O nosso ritual mais completo, agora para partilhar. São 60 minutos de Ritual com Cera Quente Nutritiva a dois, as duas sessões ao mesmo tempo. O calor solta a musculatura e nutre a pele. Saem os dois sem pressa nenhuma de voltar ao dia.",

  // ── Drenagem linfática ─────────────────────────────────────────────
  "Drenagem Linfática 60 min":
    "Se andas com as pernas pesadas e a sentir o corpo inchado, isto foi feito para ti. São 60 minutos de Drenagem Linfática Manual, método Vodder. Não esperes uma massagem forte: o toque é lento e muito leve, porque é logo abaixo da pele que o sistema linfático trabalha. A diferença nas pernas nota-se logo à saída.",

  "Drenagem Linfática 90 min":
    "Retenção que já vem de longe não se resolve à pressa. São 90 minutos de Drenagem Linfática Manual, método Vodder, com tempo para o corpo todo e não só para as pernas. Toque lento, muito leve, e o alívio a aparecer ainda durante a sessão.",

  // ── Dia da Mãe ─────────────────────────────────────────────────────
  "Massagem Mãe Serena (Dia da Mãe)":
    "Alguém achou que merecias uma hora só tua. É a Massagem Mãe Serena: 60 minutos de Relaxamento Essência Plena, com o toque a ir onde carregas mais peso e o óleo escolhido para o teu dia. Durante uma hora não há nada para resolver.",

  "Mãe Serena a Duas (Dia da Mãe)":
    "Descansar juntas também é uma forma de estar. É a Massagem Mãe Serena a Duas: 60 minutos de Relaxamento Essência Plena para partilhar, as duas sessões ao mesmo tempo, cada corpo tratado à sua maneira.",

  "Ritual Mãe Divina (Dia da Mãe)":
    "Alguém quis que ficasses bem tratada, e nota-se na escolha. É o Ritual Mãe Divina: 60 minutos de Massagem com Cera Quente Nutritiva, mais uma Vela Cristal para levares contigo. O calor solta a tensão enquanto a pele bebe hidratação. A sensação não acaba à porta.",

  "Mãe Divina a Duas (Dia da Mãe)":
    "Há coisas que sabem melhor na companhia certa. É o Ritual Mãe Divina a Duas: 60 minutos de Massagem com Cera Quente Nutritiva, as sessões ao mesmo tempo e sem pressas. Saem as duas com o corpo tratado e a pele nutrida, e cada uma leva a sua Vela Cristal para casa.",

  "Ritual Essência de Mãe (Dia da Mãe)":
    "Para quando precisas mesmo de desligar, e não só de descansar um bocado. É o Ritual Essência de Mãe. Começa pelos pés, com um banho de hidromassagem, porque é aí que o cansaço se instala sem darmos por ele. Depois vêm 60 minutos de Massagem Aromática Puro Aroma, com o aroma que escolheres.",

  // ── Dia da Mulher ──────────────────────────────────────────────────
  "Massagem Essência (Dia da Mulher)":
    "60 minutos em que a única prioridade és tu. É a Massagem Essência: chegas e há tempo para respirar antes de começar, a massagem adapta-se ao que o corpo pedir nesse dia, e no fim fica o chá, para não saíres a correr.",

  "Massagem Essência a Duas (Dia da Mulher)":
    "Do género de tarde que fica na memória. É a Massagem Essência a Duas: 60 minutos só vossos, as duas sessões ao mesmo tempo, cada corpo tratado à sua maneira, com acolhimento à chegada e chá no fim.",

  "Ritual Luz & Alma (Dia da Mulher)":
    "Quando o cansaço já é de fundo, precisa de calor e de tempo. É o Ritual Luz & Alma: massagem com Cera Quente Nutritiva e essências premium que escolhes antes da sessão. A pele fica diferente ao toque. Levas ainda uma Vela de Cristal, para a sensação não acabar à porta.",

  "Ritual Luz & Alma a Duas (Dia da Mulher)":
    "Quando as duas precisam e nenhuma quer ir sozinha. É o Ritual Luz & Alma a Duas: massagem com Cera Quente Nutritiva, cada uma com as suas essências, as sessões ao mesmo tempo. Saem as duas com o corpo solto e a pele nutrida, e cada uma leva a sua Vela de Cristal.",

  // ── Dia dos Namorados ──────────────────────────────────────────────
  "Massagem Conexão (Dia dos Namorados)":
    "Para o casal que anda a precisar de parar ao mesmo tempo. É a Massagem Conexão: 60 minutos de massagem em simultâneo, a sala à luz de velas e um chá no fim, sem ninguém a olhar para o relógio.",

  "Ritual Fogo & Alma (Dia dos Namorados)":
    "Uma noite que não acaba quando a massagem acaba. É o Ritual Fogo & Alma, para os dois: 60 minutos em simultâneo com vela quente aromática, escolhida por vocês. O óleo da vela derretida aquece, nutre a pele e solta a musculatura devagar. No fim ficam o espumante e os chocolates artesanais, sem pressa de sair.",
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

// NOTA sobre o tratamento por "tu"
// ---------------------------------
// O CLAUDE.md do projeto e a skill de humanização dizem "você". Estas
// descrições usam "tu" porque a página do voucher tem texto fixo em "tu"
// ("Para ti", "Tens algo muito especial à tua espera", "Descobrir o teu
// presente") e misturar os dois na mesma página lê-se pior do que qualquer
// uma das opções sozinha. Para passar tudo a "você" é preciso mudar também
// esse texto fixo em 02_WEBSITE/site/vouchers/voucher.html — decisão do Nuno,
// por ser conteúdo público.
