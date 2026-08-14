// ─────────────────────────────────────────────────────────────────────────────
// SEED DEMO — dados de teste coerentes para a Essence Wellness CRM
//
// Princípio: as SESSÕES são a fonte única de verdade. Para cada cliente geramos
// sessões reais (com pagamento + avaliação) e depois derivamos totalGasto /
// totalSessoes / ultimaSessao com `recalcularMetricasCliente`. Assim o
// Financeiro, dashboard, top-clientes e satisfação refletem todos os MESMOS
// números — nunca há um totalGasto "à mão" que não bate com as sessões.
//
// Preserva os logins (User/Account/Session) — só limpa as tabelas CRM.
// Ancorado em `new Date()` para que o mês corrente tenha receita e o dashboard
// mostre sessões de hoje e dos próximos dias.
//
// Correr:  DATABASE_URL="<url>" npx tsx prisma/seed-demo.ts
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { recalcularMetricasCliente } from "../lib/metricas";
import { assertNaoProducao } from "./assert-nao-producao";


// ── Aleatoriedade utilitária ────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function chance(p: number): boolean {
  return Math.random() < p;
}
/** Escolha ponderada: pares [valor, peso]. */
function weighted<T>(pares: [T, number][]): T {
  const total = pares.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pares) {
    if ((r -= w) <= 0) return v;
  }
  return pares[0]![0];
}

const now = new Date();
function emDias(offset: number, hora = 10, minuto = 0): Date {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + offset);
  dt.setHours(hora, minuto, 0, 0);
  return dt;
}
function horaAleatoria(): [number, number] {
  return [pick([9, 10, 11, 12, 14, 15, 16, 17, 18]), pick([0, 30])];
}

// ── Catálogo (preços reais) ─────────────────────────────────────────────────
const SERVICOS = [
  { nome: "Essência Plena", preco: 40, duracao: 60 },
  { nome: "Puro Aroma", preco: 45, duracao: 60 },
  { nome: "Cera Quente", preco: 50, duracao: 60 },
  { nome: "Drenagem Linfática", preco: 40, duracao: 60 },
  { nome: "Drenagem Linfática 90 min", preco: 85, duracao: 90 },
];
const AROMAS = ["Lavanda", "Eucalipto", "Ylang-ylang", "Camomila", "Sândalo", "Bergamota", "Neroli", "Rosa", "Hortelã", "Cedro"];
const RESUMOS = [
  "Sessão profunda, tensão cervical a aliviar.",
  "Cliente muito relaxada, ótima resposta ao calor.",
  "Foco na lombar — saiu bastante mais leve.",
  "Drenagem nos membros inferiores, pernas menos pesadas.",
  "Massagem de manutenção, corpo equilibrado.",
  "Trabalho nos ombros e trapézios, melhoria visível.",
];
type Metodo = "mbway" | "dinheiro" | "transferencia" | "voucher";
const METODOS: [Metodo, number][] = [
  ["mbway", 45], ["dinheiro", 30], ["transferencia", 20], ["voucher", 5],
];
// Notas de avaliação: maioria 4-5, algumas 3, raras 1-2 (acendem alertas)
const NOTAS: [number, number][] = [[5, 45], [4, 30], [3, 12], [2, 6], [1, 4]];

type EstadoStr =
  | "lead" | "novo" | "ativa_recente" | "ativa_frequente" | "vip_embaixadora"
  | "vip_em_risco" | "reativacao" | "perdida" | "blacklist";

interface Perfil {
  realizadas: number;   // nº de sessões realizadas (= totalSessoes após recalc)
  ultimaDias: number;   // há quantos dias foi a última realizada (0 = hoje)
  intervalo: number;    // dias médios entre sessões (para espalhar o histórico)
  futuras?: number;     // sessões agendadas/confirmadas futuras
  servicosBaratos?: boolean; // usar só 40-45€ (mantém gasto<300 p/ ativa_frequente)
}

interface ClienteDef {
  nome: string; telefone: string; email: string;
  estado: EstadoStr;
  dataNascimento?: string;
  comoNosConheceu?: string; fonte?: string;
  canalPreferido?: "whatsapp" | "email" | "sms";
  temWhatsapp?: boolean; aceitaMarketing?: boolean;
  aromas?: string; alergias?: string; emocional?: string; zonas?: string; pausa?: string; notas?: string;
  etiquetas?: string[];
  perfil: Perfil;
}

// As regras de recência abaixo seguem lib/crm-estados.ts (VIP = 8+ sessões ou
// 300€+; >60d → reativacao; >180d → perdida) para que o cron diário seja no-op.
const CLIENTES: ClienteDef[] = [
  // ── VIP EMBAIXADORA (last ≤30d, 8+ sessões) ───────────────────────────────
  { nome: "Helena Vasconcelos", telefone: "912001001", email: "helena.vasconcelos@gmail.com", estado: "vip_embaixadora",
    dataNascimento: "1975-03-12", comoNosConheceu: "referencia", fonte: "referencia", aceitaMarketing: true,
    aromas: "Sândalo, rosa e incenso — aromas profundos e aterradores.",
    alergias: "Artrose no joelho direito. Evitar pressão directa na articulação.",
    zonas: "Joelho direito (artrose), ombros por tensão de pianista.",
    notas: "Pianista profissional. Recomendou 6 clientes. Aniversário em março.",
    etiquetas: ["VIP"], perfil: { realizadas: 14, ultimaDias: 5, intervalo: 20 } },
  { nome: "Francisca Cunha Barros", telefone: "916002002", email: "francisca.cb@sapo.pt", estado: "vip_embaixadora",
    dataNascimento: "1968-09-05", comoNosConheceu: "referencia", fonte: "referencia",
    aromas: "Neroli e pétalas de rosa.", alergias: "Menopausa — aromas refrescantes prioritários.",
    zonas: "Cervical e cabeça. Pernas pesadas.", notas: "Diretora de escola. Gosta de silêncio absoluto.",
    etiquetas: ["VIP"], perfil: { realizadas: 11, ultimaDias: 9, intervalo: 22 } },
  { nome: "Cristina Matos Pereira", telefone: "963003003", email: "cristina.mp@hotmail.com", estado: "vip_embaixadora",
    dataNascimento: "1971-11-28", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Bergamota e menta — prefere manhãs.", alergias: "Fibromialgia. Pressão muito suave generalizada.",
    zonas: "Generalizado (fibromialgia).", notas: "Contabilista. Muito informada sobre a sua condição.",
    etiquetas: ["VIP"], perfil: { realizadas: 9, ultimaDias: 12, intervalo: 24 } },
  { nome: "Ana Filipa Rodrigues", telefone: "912345678", email: "anafilipa@gmail.com", estado: "vip_embaixadora",
    dataNascimento: "1988-05-15", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Lavanda e eucalipto. Sensível a cítricos fortes.", alergias: "Tensão cervical crónica.",
    zonas: "Pescoço e ombros (trapézio). Lombar.", notas: "Faz maratona. Prefere silêncio durante a massagem.",
    etiquetas: ["VIP", "Aniversário este mês"], perfil: { realizadas: 12, ultimaDias: 3, intervalo: 21, futuras: 1 } },

  // ── ATIVA FREQUENTE (4-5 sessões, ≤45d, gasto<300) ────────────────────────
  { nome: "Patrícia Nunes", telefone: "912005005", email: "patricia.nunes@gmail.com", estado: "ativa_frequente",
    dataNascimento: "1986-07-14", comoNosConheceu: "google", fonte: "google",
    aromas: "Lavanda e camomila.", alergias: "Enxaqueca crónica. Aromas suaves apenas.",
    zonas: "Cabeça e nuca. Ombros e trapézio.", notas: "Gestora de marketing. Agenda ao final do dia.",
    perfil: { realizadas: 5, ultimaDias: 14, intervalo: 26, servicosBaratos: true, futuras: 1 } },
  { nome: "Joana Esteves Leal", telefone: "926006006", email: "joana.el@outlook.pt", estado: "ativa_frequente",
    dataNascimento: "1990-02-08", comoNosConheceu: "referencia", fonte: "referencia",
    aromas: "Ylang-ylang e jasmim.", alergias: "Escoliose leve. Almofada de apoio lombar.",
    zonas: "Lombar (escoliose).", notas: "Enfermeira. Turno rotativo.",
    perfil: { realizadas: 4, ultimaDias: 20, intervalo: 28, servicosBaratos: true } },
  { nome: "Rute Carvalho Santos", telefone: "917007007", email: "rute.cs@gmail.com", estado: "ativa_frequente",
    dataNascimento: "1988-12-03", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Hortelã e eucalipto.", alergias: "SII — evitar pressão abdominal profunda.",
    zonas: "Abdominal (SII). Costas inferiores.", notas: "Personal trainer. Muito consciente do corpo.",
    perfil: { realizadas: 5, ultimaDias: 9, intervalo: 25, servicosBaratos: true } },
  { nome: "Filipa Andrade", telefone: "965008008", email: "filipa.andrade@live.pt", estado: "ativa_frequente",
    dataNascimento: "1993-08-19", comoNosConheceu: "referencia", fonte: "referencia",
    aromas: "Rosa e sândalo.", alergias: "Tensão muscular crónica por postura.",
    zonas: "Pescoço e ombros. Punhos.", notas: "Designer gráfica. Prefere manhãs de 2ª e 4ª.",
    perfil: { realizadas: 4, ultimaDias: 22, intervalo: 27, servicosBaratos: true } },

  // ── ATIVA RECENTE (2-3 sessões, ≤30d) ─────────────────────────────────────
  { nome: "Carla Moreira Dias", telefone: "912013013", email: "carla.md@gmail.com", estado: "ativa_recente",
    dataNascimento: "1991-09-02", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Lavanda e baunilha.", emocional: "Ansiedade diagnosticada. Sessões terapêuticas.",
    zonas: "Ombros e pescoço. Mandíbula.", notas: "Arquiteta. Stress de prazos.",
    perfil: { realizadas: 3, ultimaDias: 10, intervalo: 24, futuras: 1 } },
  { nome: "Alexandra Moura", telefone: "963015015", email: "alex.moura@gmail.com", estado: "ativa_recente",
    dataNascimento: "1984-07-07", comoNosConheceu: "google", fonte: "google",
    aromas: "Cedro e patchouli.", alergias: "Cirurgia ao disco (L5-S1). Protocolo pós-cirúrgico.",
    zonas: "Lombar cirúrgica. Pernas.", notas: "Nutricionista hospitalar. Veio por indicação do fisiatra.",
    perfil: { realizadas: 3, ultimaDias: 14, intervalo: 22 } },
  { nome: "Vera Lourenço", telefone: "963050050", email: "vera.l@gmail.com", estado: "ativa_recente",
    dataNascimento: "1987-06-25", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Rosa e pétalas — celebratórios.", emocional: "Muito alegre e extrovertida.",
    zonas: "Ombros e costas (escritório).", notas: "Aniversário este mês — enviar oferta.",
    etiquetas: ["Aniversário este mês"], perfil: { realizadas: 3, ultimaDias: 7, intervalo: 20 } },
  { nome: "Diana Albuquerque", telefone: "916016016", email: "diana.alb@gmail.com", estado: "ativa_recente",
    dataNascimento: "1997-03-25", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Frutados — jovem e refrescante.", emocional: "Estudante de medicina, stress de exames.",
    zonas: "Pescoço e ombros. Olhos cansados.", notas: "Orçamento limitado — sessões como investimento.",
    etiquetas: ["Nova cliente"], perfil: { realizadas: 2, ultimaDias: 18, intervalo: 25 } },
  { nome: "Sofia Mendes", telefone: "926789012", email: "sofiamendes@gmail.com", estado: "ativa_recente",
    dataNascimento: "1994-03-18", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Camomila e lavanda.", alergias: "Gravidez 32 semanas. Protocolo pré-natal completo.",
    zonas: "Pernas inchadas. Pés cansados.", notas: "Professora de yoga. Música instrumental suave.",
    etiquetas: ["Gravidez"], perfil: { realizadas: 3, ultimaDias: 16, intervalo: 28, futuras: 1 } },

  // ── NOVO (1 sessão, ≤30d) ─────────────────────────────────────────────────
  { nome: "Beatriz Drummond", telefone: "916019019", email: "bea.drummond@gmail.com", estado: "novo",
    dataNascimento: "2000-05-08", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Maçã e baunilha.", emocional: "Bailarina — pressão de corpo e imagem.",
    zonas: "Pés e tornozelos. Costas.", notas: "Primeira sessão — adorou. Alto potencial.",
    etiquetas: ["Nova cliente"], perfil: { realizadas: 1, ultimaDias: 12, intervalo: 0 } },
  { nome: "Mónica Rodrigues Freitas", telefone: "935018018", email: "monica.rf@gmail.com", estado: "novo",
    dataNascimento: "1992-11-30", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Pétalas de rosa.", emocional: "Cansada (bebé de 6 meses).",
    zonas: "Pescoço e ombros (amamentação).", notas: "Mãe recente. Precisa do seu momento.",
    perfil: { realizadas: 1, ultimaDias: 22, intervalo: 0 } },

  // ── LEAD (0 sessões) ──────────────────────────────────────────────────────
  { nome: "Luísa Pimentel", telefone: "912020020", email: "luisa.pimentel@gmail.com", estado: "lead",
    comoNosConheceu: "instagram", fonte: "instagram", notas: "Perguntou sobre aromaterapia para ansiedade.",
    etiquetas: ["Nova cliente"], perfil: { realizadas: 0, ultimaDias: 0, intervalo: 0 } },
  { nome: "Inês Bettencourt", telefone: "912026026", email: "ines.bettencourt@gmail.com", estado: "lead",
    comoNosConheceu: "instagram", fonte: "instagram", notas: "Comentou 'quero muito ir' no Instagram.",
    perfil: { realizadas: 0, ultimaDias: 0, intervalo: 0 } },
  { nome: "Neuza Ferreira Lima", telefone: "917027027", email: "neuza.fl@gmail.com", estado: "lead",
    comoNosConheceu: "google", fonte: "google", canalPreferido: "email", temWhatsapp: false,
    notas: "Preencheu formulário. Quer preços e localização.", perfil: { realizadas: 0, ultimaDias: 0, intervalo: 0 } },
  { nome: "Daniela Vieira", telefone: "938877665", email: "daniela.vieira@gmail.com", estado: "lead",
    comoNosConheceu: "referencia", fonte: "referencia", alergias: "Escoliose — verificar protocolo.",
    notas: "Recomendada pela Margarida. A aguardar resposta.", etiquetas: ["Nova cliente"],
    perfil: { realizadas: 0, ultimaDias: 0, intervalo: 0 } },

  // ── VIP EM RISCO (8+ sessões, 31-60d) ─────────────────────────────────────
  { nome: "Graça Pinheiro Costa", telefone: "912031031", email: "graca.pc@hotmail.com", estado: "vip_em_risco",
    dataNascimento: "1966-10-23", comoNosConheceu: "referencia", fonte: "referencia",
    aromas: "Lavanda francesa e neroli.", alergias: "Artrite reumatoide. Flares imprevisíveis.",
    zonas: "Mãos e punhos (artrite). Joelhos.", notas: "Fidelizada há 3 anos. Parou sem explicação.",
    etiquetas: ["Reengagement"], perfil: { realizadas: 9, ultimaDias: 38, intervalo: 24 } },
  { nome: "Olga Tavares Mendes", telefone: "917032032", email: "olga.tm@gmail.com", estado: "vip_em_risco",
    dataNascimento: "1978-05-11", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Bergamota e limão.", alergias: "Psoríase. Óleos hipoalergénicos.",
    zonas: "Couro cabeludo, cotovelos. Costas.", notas: "Pode estar em surto — empatia, não pressão.",
    etiquetas: ["Reengagement"], perfil: { realizadas: 8, ultimaDias: 42, intervalo: 26 } },
  { nome: "Inês Carvalho", telefone: "917890123", email: "ines.carvalho@sapo.pt", estado: "vip_em_risco",
    dataNascimento: "1985-09-27", comoNosConheceu: "google", fonte: "google", canalPreferido: "email",
    aromas: "Bergamota e neroli.", alergias: "Enxaquecas frequentes. Pressão na nuca com cuidado.",
    zonas: "Pescoço e base do crânio.", notas: "Trabalha em IT. Sinais de burnout na última visita.",
    etiquetas: ["Reengagement"], perfil: { realizadas: 8, ultimaDias: 45, intervalo: 22 } },

  // ── REATIVAÇÃO (61-180d) ──────────────────────────────────────────────────
  { nome: "Vanessa Correia", telefone: "912037037", email: "vanessa.c@gmail.com", estado: "reativacao",
    dataNascimento: "1985-04-12", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Baunilha e canela.", emocional: "Divórcio recente — sessões eram a sua âncora.",
    zonas: "Pescoço e ombros. Peito tenso.", notas: "Abordagem amorosa, sem julgamento.",
    etiquetas: ["Reengagement"], perfil: { realizadas: 5, ultimaDias: 80, intervalo: 26 } },
  { nome: "Teresa Magalhães", telefone: "912040040", email: "teresa.mag@hotmail.com", estado: "reativacao",
    dataNascimento: "1972-07-16", comoNosConheceu: "google", fonte: "google", canalPreferido: "email",
    aromas: "Cedro e sândalo.", alergias: "Cancro da mama em remissão. Sem pressão na axila direita.",
    zonas: "Zona peitoral (cicatriz). Braço direito.", notas: "Sobrevivente. Protocolo específico. Muito corajosa.",
    etiquetas: ["Reengagement"], perfil: { realizadas: 3, ultimaDias: 65, intervalo: 30 } },
  { nome: "Joana Vaz Pires", telefone: "962039039", email: "joana.vp@gmail.com", estado: "reativacao",
    dataNascimento: "1998-11-05", comoNosConheceu: "instagram", fonte: "instagram",
    aromas: "Maracujá e ylang-ylang.", emocional: "Ansiedade social. O espaço calmo ajuda muito.",
    zonas: "Ombros e peito. Maxilar.", notas: "Acabou estágio, sem rendimento. Oferecer plano flexível.",
    etiquetas: ["Reengagement"], perfil: { realizadas: 3, ultimaDias: 70, intervalo: 28 } },
  { nome: "Catarina Lopes", telefone: "912233445", email: "catarina.lopes@hotmail.com", estado: "reativacao",
    dataNascimento: "1997-06-14", comoNosConheceu: "instagram", fonte: "calendly",
    aromas: "Lavanda.", emocional: "Primeira massagem da vida — saiu transformada.",
    zonas: "Ombros e costas superiores.", notas: "Alto potencial de fidelização se contactada.",
    etiquetas: ["Nova cliente", "Reengagement"], perfil: { realizadas: 1, ultimaDias: 90, intervalo: 0 } },

  // ── PERDIDA (>180d) ───────────────────────────────────────────────────────
  { nome: "Ana Catarina Brás", telefone: "912044044", email: "acbras@gmail.com", estado: "perdida",
    dataNascimento: "1976-12-08", comoNosConheceu: "referencia", fonte: "referencia", aceitaMarketing: false,
    aromas: "Sândalo e vetiver.", zonas: "Costas e ombros.", notas: "Não responde há 6 meses.",
    perfil: { realizadas: 8, ultimaDias: 200, intervalo: 26 } },
  { nome: "Flávia Duarte", telefone: "935045045", email: "flavia.d@gmail.com", estado: "perdida",
    dataNascimento: "1989-08-20", comoNosConheceu: "instagram", fonte: "instagram", aceitaMarketing: false,
    aromas: "Lavanda.", zonas: "Costas.", notas: "Mudou para o Algarve — caso encerrado.",
    perfil: { realizadas: 5, ultimaDias: 185, intervalo: 28 } },
  { nome: "Liliana Godinho", telefone: "916047047", email: "lili.g@sapo.pt", estado: "perdida",
    dataNascimento: "1981-01-17", comoNosConheceu: "referencia", fonte: "referencia", aceitaMarketing: false,
    notas: "Não quis continuar após 2 sessões.", perfil: { realizadas: 2, ultimaDias: 240, intervalo: 30 } },

  // ── BLACKLIST (manual) ────────────────────────────────────────────────────
  { nome: "Sandro Ferreira", telefone: "912048048", email: "sandro.f@gmail.com", estado: "blacklist",
    comoNosConheceu: "instagram", fonte: "instagram", aceitaMarketing: false,
    notas: "Comportamento inapropriado. Não remarcar. Não contactar.",
    perfil: { realizadas: 1, ultimaDias: 150, intervalo: 0 } },
  { nome: "Ricardo Alves", telefone: "917049049", email: "r.alves@hotmail.com", estado: "blacklist",
    comoNosConheceu: "google", fonte: "google", aceitaMarketing: false,
    notas: "Marcou e cancelou 4 vezes. Bloquear.", perfil: { realizadas: 0, ultimaDias: 0, intervalo: 0 } },
];

// ── Templates (iguais ao seed principal — para a página /templates) ──────────
const TEMPLATES = [
  { nome: "reengagement_45dias", tipo: "reengagement", variaveis: ["nome"],
    texto: "Olá {{nome}} 🌿\n\nTem sido algum tempo! Aqui é a Bea da Essence Wellness.\n\nSinto a tua falta e seria um prazer receber-te novamente. Como estás?\n\nFlora ✦ | Essence Wellness" },
  { nome: "reengagement_90dias", tipo: "reengagement", variaveis: ["nome"],
    texto: "Olá {{nome}} 💚\n\nJá passou algum tempo desde a tua última visita à Essence Wellness.\n\nQueria saber como estás e se posso fazer algo por ti.\n\nFlora ✦ | Essence Wellness" },
  { nome: "avaliacao_pos_sessao", tipo: "avaliacao", variaveis: ["nome"],
    texto: "Olá {{nome}}! Obrigada pela tua visita hoje 🌿\n\nGostaria de saber como te sentiste. De 1 a 5, como avalias a sessão?\n\nFlora ✦ | Essence Wellness" },
  { nome: "aniversario", tipo: "aniversario", variaveis: ["nome"],
    texto: "Olá {{nome}} 🎂\n\nFeliz aniversário! Como prenda, tens 10% de desconto na próxima sessão este mês 💚\n\nFlora ✦ | Essence Wellness" },
  { nome: "boas_vindas_novo_cliente", tipo: "boas_vindas", variaveis: ["nome"],
    texto: "Olá {{nome}} 🌿\n\nBem-vinda à Essence Wellness! É um prazer ter-te connosco.\n\nFlora ✦ | Essence Wellness" },
  { nome: "campanha_drenagem_linfatica", tipo: "campanha", variaveis: ["nome"],
    texto: "Olá {{nome}} 🌊\n\nNovidade: a Drenagem Linfática chegou à Essence Wellness! Reduz retenção e alivia pernas pesadas. A partir de 40€.\n\nFlora ✦ | Essence Wellness" },
  { nome: "lembrete_agendamento", tipo: "lembrete", variaveis: ["nome", "data", "hora"],
    texto: "Olá {{nome}} 🌿\n\nLembrete da tua sessão marcada para {{data}} às {{hora}}.\n\nAté já! 💚\n\nFlora ✦ | Essence Wellness" },
];

const ETIQUETAS = [
  { nome: "VIP", cor: "#c9a66b" },
  { nome: "Nova cliente", cor: "#a0a996" },
  { nome: "Reengagement", cor: "#b06050" },
  { nome: "Gravidez", cor: "#9b7db5" },
  { nome: "Aniversário este mês", cor: "#c9a66b" },
];

// ── Geração de sessões para um cliente ───────────────────────────────────────
function gerarSessoes(clienteId: string, p: Perfil) {
  const sessoes: Record<string, unknown>[] = [];
  const cat = p.servicosBaratos ? SERVICOS.filter((s) => s.preco <= 45) : SERVICOS;

  for (let i = 0; i < p.realizadas; i++) {
    const dias = p.ultimaDias + i * p.intervalo;
    const [h, m] = horaAleatoria();
    const data = emDias(-dias, h, m);
    const serv = pick(cat);
    const pago = chance(0.85);
    const temAvaliacao = chance(0.7);
    const nota = temAvaliacao ? weighted(NOTAS) : null;

    sessoes.push({
      clienteId, data, hora: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      duracao: serv.duracao, servico: serv.nome, preco: serv.preco, terapeuta: pick(["bea", "cris"]),
      estado: "realizada", aromaSessao: pick(AROMAS), resumoSessao: pick(RESUMOS),
      estadoPagamento: pago ? "pago" : "pendente",
      valorPago: pago ? serv.preco : null,
      metodoPagamento: pago ? weighted(METODOS) : null,
      pagamentoEm: pago ? data : null,
      avaliacaoNota: nota,
      avaliacaoEnviadaEm: temAvaliacao ? data : null,
      avaliacaoRespondidaEm: temAvaliacao ? emDias(-dias + 1, 12) : null,
    });
  }

  // Sessões futuras (agendada/confirmada) — não contam para as métricas
  for (let i = 0; i < (p.futuras ?? 0); i++) {
    const [h, m] = horaAleatoria();
    const serv = pick(cat);
    sessoes.push({
      clienteId, data: emDias(1 + i * 2, h, m), hora: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      duracao: serv.duracao, servico: serv.nome, preco: serv.preco, terapeuta: pick(["bea", "cris"]),
      estado: i === 0 ? "confirmada" : "agendada", estadoPagamento: "pendente",
    });
  }

  return sessoes;
}

async function main() {
  assertNaoProducao("seed-demo.ts");
  console.log("🌿 Seed DEMO — fonte única (sessões → métricas)\n");

  // ── 1. Limpar só as tabelas CRM (preserva logins User/Account/Session) ─────
  await prisma.auditLog.deleteMany();
  await prisma.mensagemIA.deleteMany();
  await prisma.observacao.deleteMany();
  await prisma.portalToken.deleteMany();
  await prisma.campanha.deleteMany();
  await prisma.clienteEtiqueta.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.precoPersonalizado.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.etiqueta.deleteMany();
  console.log("✓ Tabelas CRM limpas (logins preservados)");

  // ── 2. Catálogo de serviços (upsert — seguro) ──────────────────────────────
  for (const s of SERVICOS) {
    await prisma.servico.upsert({
      where: { nome: s.nome },
      update: {},
      create: { nome: s.nome, duracaoMinutos: s.duracao, precoBase: s.preco },
    });
  }
  console.log(`✓ ${SERVICOS.length} serviços`);

  // ── 3. Templates ───────────────────────────────────────────────────────────
  for (const t of TEMPLATES) {
    await prisma.templateMensagem.upsert({ where: { nome: t.nome }, update: { texto: t.texto, variaveis: t.variaveis }, create: t });
  }
  console.log(`✓ ${TEMPLATES.length} templates`);

  // ── 4. Etiquetas ───────────────────────────────────────────────────────────
  const etiquetaId: Record<string, string> = {};
  for (const e of ETIQUETAS) {
    const et = await prisma.etiqueta.create({ data: e });
    etiquetaId[e.nome] = et.id;
  }
  console.log(`✓ ${ETIQUETAS.length} etiquetas`);

  // ── 5. Clientes + sessões + métricas derivadas ─────────────────────────────
  const idsPorNome: Record<string, string> = {};
  let totalSessoesCriadas = 0;

  for (const c of CLIENTES) {
    const cliente = await prisma.cliente.create({
      data: {
        nome: c.nome, telefone: c.telefone, email: c.email,
        estado: c.estado,
        dataNascimento: c.dataNascimento ? new Date(c.dataNascimento) : null,
        comoNosConheceu: c.comoNosConheceu ?? null, fonte: c.fonte ?? "seed-demo",
        canalPreferido: c.canalPreferido ?? "whatsapp",
        temWhatsapp: c.temWhatsapp ?? true,
        aceitaMarketing: c.aceitaMarketing ?? true,
        consentimentoMarketingEm: (c.aceitaMarketing ?? true) ? emDias(-120) : null,
        consentimentoSaudeEm: c.perfil.realizadas > 0 ? emDias(-120) : null,
        historicoAromasPreferidos: c.aromas ?? null,
        historicoCondicoesAlergias: c.alergias ?? null,
        historicoEstadoEmocional: c.emocional ?? null,
        historicoZonasTensao: c.zonas ?? null,
        historicoUltimaPausa: c.pausa ?? null,
        notasPessoais: c.notas ?? null,
      },
    });
    idsPorNome[c.nome] = cliente.id;

    // Etiquetas
    if (c.etiquetas?.length) {
      await prisma.clienteEtiqueta.createMany({
        data: c.etiquetas.map((nome) => ({ clienteId: cliente.id, etiquetaId: etiquetaId[nome]! })),
        skipDuplicates: true,
      });
    }

    // Sessões (fonte única)
    const sessoes = gerarSessoes(cliente.id, c.perfil);
    if (sessoes.length) {
      await prisma.sessao.createMany({ data: sessoes as NonNullable<Parameters<typeof prisma.sessao.createMany>[0]>["data"] });
      totalSessoesCriadas += sessoes.length;
    }

    // Derivar métricas das sessões realizadas (NÃO escrever à mão)
    await recalcularMetricasCliente(prisma, cliente.id);

    // Portal token (todos menos blacklist)
    if (c.estado !== "blacklist") {
      await prisma.portalToken.create({
        data: { clienteId: cliente.id, token: crypto.randomBytes(32).toString("hex"), expiraEm: emDias(90) },
      });
    }
  }
  console.log(`✓ ${CLIENTES.length} clientes · ${totalSessoesCriadas} sessões · métricas derivadas das sessões`);

  // ── 6. Garantir receita do mês corrente + "por cobrar" + sessões de hoje ───
  // Algumas sessões realizadas HOJE (dashboard "sessões de hoje") já pagas.
  const hojeClientes = ["Helena Vasconcelos", "Rute Carvalho Santos", "Vera Lourenço"];
  for (const nome of hojeClientes) {
    const id = idsPorNome[nome];
    if (!id) continue;
    const serv = pick(SERVICOS);
    await prisma.sessao.create({
      data: {
        clienteId: id, data: emDias(0, pick([9, 11, 15, 17])), hora: "11:00", duracao: 60,
        servico: serv.nome, preco: serv.preco, terapeuta: "bea", estado: "realizada",
        aromaSessao: pick(AROMAS), resumoSessao: pick(RESUMOS),
        estadoPagamento: "pago", valorPago: serv.preco, metodoPagamento: weighted(METODOS), pagamentoEm: emDias(0),
        avaliacaoNota: 5, avaliacaoEnviadaEm: emDias(0),
      },
    });
    await recalcularMetricasCliente(prisma, id);
  }
  // Uma sessão "por cobrar" recente (pendente, realizada) para o painel respetivo.
  {
    const id = idsPorNome["Patrícia Nunes"];
    if (id) {
      await prisma.sessao.create({
        data: {
          clienteId: id, data: emDias(-2, 18), hora: "18:30", duracao: 60,
          servico: "Cera Quente", preco: 50, terapeuta: "bea", estado: "realizada",
          aromaSessao: "Lavanda", resumoSessao: "Sessão de manutenção.",
          estadoPagamento: "pendente", valorPago: null,
        },
      });
      await recalcularMetricasCliente(prisma, id);
    }
  }
  console.log("✓ Sessões de hoje (pagas) + 1 por cobrar");

  // ── 7. Mensagens IA — pipeline completo (pendente/em_fila/enviada/falhada) ──
  const tmplCampanha = await prisma.templateMensagem.findUnique({ where: { nome: "campanha_drenagem_linfatica" } });
  const campanha = tmplCampanha
    ? await prisma.campanha.create({
        data: {
          nome: "Lançamento Drenagem Linfática", templateId: tmplCampanha.id,
          segmento: { tipo: "estado", valor: "vip_em_risco" }, estado: "ativa",
          totalEnviado: 2, totalFalhado: 0,
        },
      })
    : null;

  type MsgDef = { cliente: string; estado: string; tipo: string; motivo: string; texto: string; enviarApos?: Date; enviadaEm?: Date; converteu?: boolean; erro?: string; campanha?: boolean };
  const MENSAGENS: MsgDef[] = [
    { cliente: "Inês Carvalho", estado: "pendente", tipo: "reengagement", motivo: "VIP em risco — 45 dias sem sessão",
      texto: "Olá Inês! 🌿 Aqui é a Bea. Sei que andas numa fase intensa. As sessões fizeram tão bem às tuas enxaquecas — esta semana tenho quinta e sexta de manhã. Um abraço 💚" },
    { cliente: "Graça Pinheiro Costa", estado: "pendente", tipo: "reengagement", motivo: "VIP em risco — 38 dias",
      texto: "Olá Graça! 🌿 Tinha saudades tuas. Como têm estado as mãos? Tenho um horário tranquilo esta semana se quiseres voltar com calma." },
    { cliente: "Vanessa Correia", estado: "pendente", tipo: "reengagement", motivo: "Reativação — 80 dias",
      texto: "Olá Vanessa! 💚 Lembrei-me de ti. O teu momento de pausa faz falta — quero oferecer-te 10% na próxima sessão. Quando quiseres, estou aqui." },
    { cliente: "Catarina Lopes", estado: "pendente", tipo: "reengagement", motivo: "Reativação urgente — 90 dias",
      texto: "Olá Catarina! 💫 Ainda me lembro da tua primeira sessão. Uma massagem por mês faz uma diferença enorme — gostarias de marcar? 🌿" },
    { cliente: "Olga Tavares Mendes", estado: "em_fila", tipo: "campanha", motivo: "Campanha Drenagem", campanha: true,
      texto: "Olá Olga! 🌊 A Drenagem Linfática chegou à Essence. Ideal para retenção e pernas pesadas. A partir de 40€. Queres experimentar?", enviarApos: emDias(0, 9) },
    { cliente: "Inês Carvalho", estado: "enviada", tipo: "campanha", motivo: "Campanha Drenagem", campanha: true,
      texto: "Olá Inês! 🌊 Novidade: Drenagem Linfática na Essence. Que tal experimentar?", enviadaEm: emDias(-1), converteu: false },
    { cliente: "Vera Lourenço", estado: "enviada", tipo: "aniversario", motivo: "Aniversário este mês",
      texto: "Olá Vera! 🎂 Feliz mês de aniversário! Tens 10% de desconto na próxima sessão 💚", enviadaEm: emDias(-3), converteu: true },
    { cliente: "Flávia Duarte", estado: "falhada", tipo: "reengagement", motivo: "Perdida — 185 dias",
      texto: "Olá Flávia! Há quanto tempo… temos novidades que vais adorar.", erro: "Número sem WhatsApp ativo" },
  ];

  for (const m of MENSAGENS) {
    const clienteId = idsPorNome[m.cliente];
    if (!clienteId) continue;
    await prisma.mensagemIA.create({
      data: {
        clienteId, canal: "whatsapp", tipo: m.tipo, estado: m.estado as never,
        motivoGeracao: m.motivo, mensagemGerada: m.texto,
        mensagemFinal: ["aprovada", "em_fila", "enviada"].includes(m.estado) ? m.texto : null,
        geradaEm: emDias(-1, 8),
        aprovadaEm: ["em_fila", "enviada"].includes(m.estado) ? emDias(-1, 8) : null,
        enviadaEm: m.enviadaEm ?? null,
        enviarApos: m.enviarApos ?? null,
        converteu: m.converteu ?? null,
        erroEnvio: m.erro ?? null,
        campanhaId: m.campanha && campanha ? campanha.id : null,
      },
    });
  }
  console.log(`✓ ${MENSAGENS.length} mensagens IA${campanha ? " + 1 campanha" : ""}`);

  // ── 8. Observações ─────────────────────────────────────────────────────────
  const obs = [
    { cliente: "Helena Vasconcelos", texto: "Leva sempre flores. Prefere manta extra e luz baixa.", autor: "bea" },
    { cliente: "Sofia Mendes", texto: "Grávida — só posição lateral. Cuidado com a zona sacral.", autor: "cris" },
    { cliente: "Sandro Ferreira", texto: "Não remarcar. Não contactar.", autor: "bea" },
  ];
  for (const o of obs) {
    const id = idsPorNome[o.cliente];
    if (id) await prisma.observacao.create({ data: { clienteId: id, texto: o.texto, autor: o.autor } });
  }
  console.log(`✓ ${obs.length} observações`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  const totalClientes = await prisma.cliente.count();
  const totalSessoes = await prisma.sessao.count();
  const receitaAgg = await prisma.sessao.aggregate({ where: { estadoPagamento: "pago" }, _sum: { valorPago: true } });
  const gastoAgg = await prisma.cliente.aggregate({ _sum: { totalGasto: true } });

  console.log("\n✅ Seed DEMO concluído");
  console.log(`   Clientes: ${totalClientes}`);
  console.log(`   Sessões:  ${totalSessoes}`);
  console.log(`   Receita cobrada (Σ valorPago pagas): €${Number(receitaAgg._sum.valorPago ?? 0).toFixed(2)}`);
  console.log(`   Σ totalGasto clientes (faturado):    €${Number(gastoAgg._sum.totalGasto ?? 0).toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed-demo:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
