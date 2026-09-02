// Descrições que aparecem no voucher que a cliente recebe.
//
// Reescritas pelo Nuno em 2026-09-02 (ver 04_CRM/02_DOCUMENTACAO/descricoes-voucher.md,
// a versão de referência que ele editou à mão) — padrão fixo "Recebeste
// um/uma X (N min). É uma hora/experiência de... Começamos por... para
// saíres/saírem com...". Este ficheiro tem de ficar sempre igual a esse .md;
// se um mudar, o outro tem de ser actualizado a par.
//
// Tom: segunda pessoa ("tu"), a condizer com o resto da página do voucher,
// que é fixa e já diz "Para ti" e "Descobrir o teu presente". Difere da regra
// de tratamento do WhatsApp ("você") de propósito — aqui o texto vive dentro
// de um presente, não de uma conversa. Ver NOTA no fim do ficheiro.
//
// Correr:  npx tsx prisma/seed-descricoes-voucher.ts
import { prisma } from "../lib/prisma"

const DESCRICOES: Record<string, string> = {
  // ── Base ───────────────────────────────────────────────────────────
  "Essência Plena":
    "Recebeste uma Massagem de Relaxamento Essência Plena (60 min). É uma hora de pausa pensada para desligar do ruído exterior e devolver o equilíbrio ao teu corpo. Começamos por escolher o óleo essencial certo para o teu momento e deixamos que o toque fluido e envolvente liberte o cansaço acumulado. Um cuidado acolhedor e restaurador, para saíres com o corpo solto e uma sensação imediata de descanso.",

  "Essência Plena 90 min":
    "Recebeste uma Massagem de Relaxamento Essência Plena (90 min). É uma experiência de cuidado prolongado, pensada para quando uma hora sabe a pouco e o corpo pede tempo para desacelerar profundamente. Começamos por escolher o óleo essencial certo para o teu momento e deixamos que o toque fluido envolva todo o corpo, sem pressas nem interrupções. Um ritual completo e restaurador, para saíres com uma sensação de leveza e descanso que dura dias.",

  "Essência Plena a dois":
    "Recebeste uma Massagem de Relaxamento Essência Plena a dois (60 min). É uma hora de pausa partilhada, pensada para desacelerar o ritmo e desfrutar de um momento de calma lado a lado. Começamos por escolher o óleo essencial certo para o momento de cada um e deixamos que o toque envolvente e fluido cuide de cada corpo à sua maneira. Uma experiência em simultâneo, para saírem os dois levemente renovados e em perfeita sintonia.",

  "Puro Aroma":
    "Recebeste uma Massagem de Aromaterapia Puro Aroma (60 min). É uma hora de cuidado pensada para desligar do ruído exterior e acalmar a mente. Começamos por escolher a sinergia de aromas ideal para o teu momento e deixamos que as essências conduzam um toque fluido e envolvente sobre o corpo. Uma experiência puramente sensorial, para saíres com o corpo solto e a cabeça em plena tranquilidade.",

  "Puro Aroma 90 min":
    "Recebeste uma Massagem de Aromaterapia Puro Aroma (90 min). É uma experiência de cuidado prolongado, pensada para desligar do ruído exterior e acalmar a mente sem olhar para o relógio. Começamos por escolher a sinergia de aromas ideal para o teu momento e deixamos que as essências conduzam um toque fluido e profundo sobre todo o corpo. Uma experiência puramente sensorial e restauradora, para saíres com o corpo profundamente solto e a cabeça em plena tranquilidade.",

  "Puro Aroma a dois":
    "Recebeste uma Massagem de Aromaterapia Puro Aroma a dois (60 min). É uma hora de cuidado partilhado, pensada para desligar do ruído exterior e acalmar a mente lado a lado. Começamos por escolher a sinergia de aromas ideal para o momento de cada um e deixamos que as essências conduzam um toque fluido e envolvente em simultâneo. Uma experiência puramente sensorial, para saírem os dois com o corpo solto e a cabeça em plena tranquilidade.",

  "Cera Quente":
    "Recebeste um Ritual com Cera Quente Nutritiva (60 min). É uma hora de conforto profundo, pensada para envolver o corpo no calor e libertar as tensões acumuladas. Começamos por aquecer a cera morna e deixamos que as suas propriedades nutritivas conduzam um toque fluido que hidrata e relaxa em simultâneo. O nosso ritual mais completo, para saíres com o corpo leve e a pele profundamente hidratada.",

  "Cera Quente 90 min":
    "Recebeste um Ritual com Cera Quente Nutritiva (90 min). É uma experiência de conforto prolongado, pensada para envolver todo o corpo no calor e libertar as tensões acumuladas sem olhar para o relógio. Começamos por aquecer a cera morna e deixamos que as suas propriedades nutritivas conduzam um toque fluido com tempo para cuidar de cada zona em simultâneo. O nosso ritual mais completo e restaurador, para saíres com o corpo profundamente leve e a pele profundamente hidratada.",

  "Cera Quente a dois":
    "Recebeste um Ritual com Cera Quente Nutritiva a dois (60 min). É uma hora de conforto partilhado, pensada para envolver o corpo no calor e libertar as tensões acumuladas lado a lado. Começamos por aquecer a cera morna e deixamos que as suas propriedades nutritivas conduzam um toque fluido que hidrata e relaxa em simultâneo. O nosso ritual mais completo para desfrutar a dois, para saírem os dois com o corpo leve e a pele profundamente hidratada.",

  // ── Drenagem linfática ─────────────────────────────────────────────
  "Drenagem Linfática 60 min":
    "Recebeste uma Drenagem Linfática Manual (60 min). É uma hora de cuidado especializada, pensada para libertar o excesso de líquidos, aliviar a sensação de inchaço e devolver a leveza ao teu corpo. Começamos por preparar o organismo e deixamos que manobras lentas, suaves e indolores do método Vodder estimulem a circulação natural. Um tratamento para saíres com o corpo leve e uma sensação imediata de alívio.",

  "Drenagem Linfática 90 min":
    "Recebeste uma Drenagem Linfática Manual (90 min). É uma experiência de cuidado prolongada e especializada, pensada para libertar o excesso de líquidos, aliviar a sensação de inchaço e devolver a leveza ao teu corpo sem olhar para o relógio. Começamos por preparar o organismo e deixamos que manobras lentas, suaves e indolores do método Vodder estimulem a circulação natural por todo o corpo. Um tratamento restaurador, para saíres com o corpo profundamente leve e uma sensação imediata de alívio",

  // ── Dia da Mãe ─────────────────────────────────────────────────────
  "Massagem Mãe Serena (Dia da Mãe)":
    "Recebeste uma Massagem Mãe Serena (60 min). É uma hora de pausa pensada para desacelerar o ritmo, libertar o peso do dia a dia e devolver o equilíbrio ao teu corpo. Começamos por escolher o óleo essencial certo para o teu momento e deixamos que o toque envolvente traga o descanso que mereces. Um cuidado especial e acolhedor, para saíres com o corpo leve e a mente serena.",

  "Mãe Serena a Duas (Dia da Mãe)":
    "Recebeste uma Massagem Mãe Serena a Duas (60 min). É uma hora de pausa partilhada, pensada para desacelerar o ritmo e desfrutar de um momento de calma lado a lado. Começamos por escolher o óleo essencial certo para o momento de cada uma e deixamos que o toque envolvente e fluido cuide de cada corpo à sua maneira. Uma experiência especial em simultâneo, para saírem as duas levemente renovadas e em perfeita sintonia.",

  "Ritual Mãe Divina (Dia da Mãe)":
    "Recebeste um Ritual Mãe Divina (60 min). É uma hora de conforto profundo, pensada para envolver o corpo no calor e libertar as tensões acumuladas. Começamos por aquecer a cera morna e deixamos que as suas propriedades nutritivas conduzam um toque fluido que hidrata e relaxa em simultâneo. O nosso ritual mais completo para o Dia da Mãe, para saíres com o corpo leve, a pele profundamente hidratada e uma Vela Cristal para levar contigo.",

  "Mãe Divina a Duas (Dia da Mãe)":
    "Recebeste um Ritual Mãe Divina a Duas (60 min). É uma hora de conforto partilhado, pensada para envolver o corpo no calor e libertar as tensões acumuladas lado a lado. Começamos por aquecer a cera morna e deixamos que as suas propriedades nutritivas conduzam um toque fluido que hidrata e relaxa em simultâneo. O nosso ritual mais completo para desfrutar a duas, para saírem as duas com o corpo leve, a pele profundamente hidratada e cada uma com a sua Vela Cristal para levar para casa.",

  "Ritual Essência de Mãe (Dia da Mãe)":
    "Recebeste um Ritual Essência de Mãe (60 min). É uma experiência de cuidado completo, pensada para desligar do ruído exterior e proporcionar um alívio profundo. Começamos com um relaxante banho de hidromassagem nos pés, seguido da escolha da sinergia de aromas ideal para o teu momento. Deixamos depois que as essências conduzam uma massagem fluida sobre o corpo, para saíres com a mente leve e profundamente renovada.",

  // ── Dia da Mulher ──────────────────────────────────────────────────
  "Massagem Essência (Dia da Mulher)":
    "Recebeste uma Massagem Essência (60 min). É uma hora de pausa pensada para desligares das exigências do dia a dia e dedicares um momento inteiramente a ti. Começamos por entender o que o teu corpo mais precisa e deixamos que o toque fluido se adapte ao teu momento. Uma experiência acolhedora para o Dia da Mulher, para saíres com o corpo solto e a mente leve, sem pressa de voltar ao ritmo habitual.",

  "Massagem Essência a Duas (Dia da Mulher)":
    "Recebeste uma Massagem Essência a Duas (60 min). É uma hora de pausa partilhada, pensada para desligarem do ritmo diário e desfrutarem de um momento de calma lado a lado. Começamos por acolher cada uma ao seu ritmo e deixamos que o toque fluido cuide de cada corpo segundo as suas necessidades. Uma experiência acolhedora para o Dia da Mulher, para saírem as duas com o corpo solto, a mente leve e sem pressa de voltar à rotina.",

  "Ritual Luz & Alma (Dia da Mulher)":
    "Recebeste um Ritual Luz & Alma (60 min). É uma hora de conforto profundo, pensada para envolver o corpo no calor e libertar as tensões mais acumuladas. Começamos por escolher a sinergia de essências ideal para o teu momento e deixamos que a cera quente nutritiva conduza um toque fluido que hidrata e relaxa em simultâneo. Uma experiência envolvente para o Dia da Mulher, para saíres com o corpo leve, a pele profundamente hidratada e uma Vela de Cristal para levar contigo.",

  "Ritual Luz & Alma a Duas (Dia da Mulher)":
    "Recebeste um Ritual Luz & Alma a Duas (60 min). É uma hora de conforto partilhado, pensada para envolver o corpo no calor e libertar as tensões acumuladas lado a lado. Começamos por escolher a sinergia de essências ideal para o momento de cada uma e deixamos que a cera quente nutritiva conduza um toque fluido que hidrata e relaxa em simultâneo. Uma experiência envolvente para o Dia da Mulher, para saírem as duas com o corpo leve, a pele profundamente hidratada e cada uma com a sua Vela de Cristal para levar para casa.",

  // ── Dia dos Namorados ──────────────────────────────────────────────
  "Massagem Conexão (Dia dos Namorados)":
    "Recebeste uma Massagem Conexão (60 min). É uma hora de pausa a dois, pensada para desacelerar o ritmo e desfrutar de um momento de verdadeira proximidade lado a lado. Começamos por acolher o casal num ambiente intimista à luz das velas e deixamos que o toque fluido e relaxante cuide de cada corpo à sua maneira. Uma experiência acolhedora para o Dia dos Namorados, para saírem os dois levemente renovados, sem pressa e em perfeita sintonia.",

  "Ritual Fogo & Alma (Dia dos Namorados)":
    "Recebeste um Ritual Fogo & Alma (60 min). É uma hora de conforto e cumplicidade a dois, pensada para envolver o corpo no calor e criar um momento inesquecível lado a lado. Começamos por escolher a vela quente aromática ideal para a vossa sessão e deixamos que o óleo morno e nutritivo conduza um toque fluido que hidrata e relaxa a musculatura em simultâneo. Uma experiência sensorial para o Dia dos Namorados, para saírem os dois levemente renovados e desfrutarem de espumante e chocolates artesanais no fim, sem qualquer pressa.",
}

async function main() {
  // Só os ativos — um serviço desativado (ex: "Drenagem Linfática" sem
  // sufixo, um duplicado de catálogo desativado em 2026-09-02) nunca é
  // oferecido num voucher novo, não precisa de descrição.
  const servicos = await prisma.servico.findMany({ where: { ativo: true }, select: { id: true, nome: true } })
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
