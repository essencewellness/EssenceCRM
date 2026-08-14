import "dotenv/config";
import { Prisma } from "@/lib/prisma-client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { assertNaoProducao } from "./assert-nao-producao";

/**
 * Seed completo — 100 clientes fictícios totalmente ligados pelo clienteId.
 *
 * Cria/liga: clientes → sessões → etiquetas → preços personalizados → packs →
 * tarefas → observações → mensagens IA. Tudo coerente: as métricas
 * (totalSessoes, totalGasto, ultimaSessao) são DERIVADAS das sessões reais.
 *
 * Idempotente: limpa apenas o domínio de clientes (nunca toca em User/Account/Session).
 * A Bea passa a admin (vê todos os clientes e todas as configurações).
 *
 * Correr em produção (Neon):
 *   $env:DATABASE_URL="postgresql://...pooler..."; npx tsx prisma/seed-100.ts
 */


// ── Datas relativas a hoje (dashboard fica sempre "vivo") ──────────────────
const HOJE = new Date();
HOJE.setHours(0, 0, 0, 0);
const d = (offset: number): Date => {
  const x = new Date(HOJE);
  x.setDate(x.getDate() + offset);
  return x;
};

// PRNG determinístico (mesmos dados a cada execução)
let _seed = 987654321;
const rnd = (): number => {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
};
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const intBetween = (min: number, max: number): number =>
  Math.floor(rnd() * (max - min + 1)) + min;
// Remove acentos (combining diacritics U+0300–U+036F) para emails limpos
const semAcentos = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// ── Pools de variedade ──────────────────────────────────────────────────────
const PRIMEIROS = [
  "Maria", "Ana", "Sofia", "Beatriz", "Inês", "Catarina", "Mariana", "Joana",
  "Rita", "Carolina", "Margarida", "Leonor", "Matilde", "Francisca", "Helena",
  "Patrícia", "Teresa", "Cláudia", "Susana", "Andreia", "Vera", "Carla",
  "Filipa", "Diana", "Sara", "Cristina", "Luísa", "Marta", "Raquel", "Daniela",
  "Verónica", "Núria", "Alexandra", "Mónica", "Graça", "Olga", "Marisa",
  "Vanessa", "Rosário", "Miriam", "Sónia", "Bruna", "Liliana", "Flávia",
  "Isabel", "Paula", "Clara", "Débora", "Neuza", "Pilar", "Rafaela", "Lena",
  "Natacha", "Érica", "Renata", "Tânia", "Bárbara", "Cátia", "Elisabete",
  "Salomé", "Adriana", "Constança", "Madalena", "Benedita", "Camila",
];
const APELIDOS = [
  "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues",
  "Martins", "Jesus", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes",
  "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho", "Teixeira",
  "Moreira", "Correia", "Mendes", "Nunes", "Soares", "Vieira", "Monteiro",
  "Cardoso", "Rocha", "Neves", "Coelho", "Cruz", "Cunha", "Pires", "Ramos",
  "Reis", "Simões", "Antunes", "Matos", "Fonseca", "Machado", "Barbosa",
];
const DOMINIOS = ["gmail.com", "hotmail.com", "sapo.pt", "outlook.pt", "live.com.pt"];

const AROMAS = [
  "Lavanda e camomila — relaxamento profundo",
  "Eucalipto e hortelã — frescura e clareza",
  "Sândalo e rosa — envolvente e quente",
  "Bergamota e neroli — cítrico leve, levanta o ânimo",
  "Ylang-ylang e jasmim — calmante imediato",
  "Cedro e patchouli — terra e estabilidade",
  "Rosmaninho e menta — estimulante",
  "Incenso e mirra — profundo e meditativo",
];
const ZONAS = [
  "Pescoço e ombros (trapézio). Lombar ao computador.",
  "Lombar e ancas. Pernas pesadas.",
  "Cervical e base do crânio. Ombro direito elevado.",
  "Costas superiores (tensão emocional). Maxilar.",
  "Pernas e glúteos (desporto). Banda iliotibial.",
  "Generalizado. Costas e coxas mais afetadas.",
];
const EMOCIONAL = [
  "Chega ansiosa, descontrai rapidamente. Sai com leveza.",
  "Muito racional — desfruta quando consegue desligar.",
  "Fase de stress no trabalho. Sessões são válvula de escape.",
  "Equilibrada e centrada. Usa as sessões como manutenção.",
  "Oscila com o ciclo. Documenta bem quando vem.",
];
const CONDICOES = [
  null, null, null,
  "Enxaqueca crónica — pressão suave na nuca.",
  "Hérnia discal L4-L5 — sem mobilizações bruscas.",
  "Hipertensão controlada — evitar pressão forte.",
  "Escoliose leve — almofada de apoio lombar.",
  "Sem condições conhecidas.",
];
const COMO = ["instagram", "referencia", "google", "calendly"];
const SERVICOS_NOME = [
  "Essência Plena", "Puro Aroma", "Cera Quente", "Drenagem Linfática",
];

type Canal = "whatsapp" | "email" | "sms";

// ── Coortes: distribuição realista pelos 9 estados (total = 100) ───────────────
interface Coorte {
  estado: string;
  count: number;
  sessoesMin: number;
  sessoesMax: number;
  ultimaMin: number; // dias atrás (mais recente)
  ultimaMax: number; // dias atrás (mais antigo)
}
const COORTES: Coorte[] = [
  { estado: "vip_embaixadora", count: 8,  sessoesMin: 18, sessoesMax: 34, ultimaMin: 3,   ultimaMax: 14 },
  { estado: "ativa_frequente", count: 20, sessoesMin: 6,  sessoesMax: 15, ultimaMin: 8,   ultimaMax: 28 },
  { estado: "ativa_recente",   count: 18, sessoesMin: 1,  sessoesMax: 5,  ultimaMin: 5,   ultimaMax: 28 },
  { estado: "novo",            count: 10, sessoesMin: 0,  sessoesMax: 0,  ultimaMin: 0,   ultimaMax: 0  },
  { estado: "lead",            count: 10, sessoesMin: 0,  sessoesMax: 0,  ultimaMin: 0,   ultimaMax: 0  },
  { estado: "vip_em_risco",    count: 12, sessoesMin: 6,  sessoesMax: 16, ultimaMin: 35,  ultimaMax: 55 },
  { estado: "reativacao",      count: 12, sessoesMin: 1,  sessoesMax: 5,  ultimaMin: 60,  ultimaMax: 110 },
  { estado: "perdida",         count: 8,  sessoesMin: 2,  sessoesMax: 8,  ultimaMin: 170, ultimaMax: 260 },
  { estado: "blacklist",       count: 2,  sessoesMin: 0,  sessoesMax: 1,  ultimaMin: 120, ultimaMax: 180 },
];

async function main() {
  assertNaoProducao("seed-100.ts");
  console.log("🌿 Seed-100 — a iniciar...\n");

  // ── 1. Serviços (upsert) ────────────────────────────────────────────────
  const servicosData = [
    { nome: "Essência Plena",     duracaoMinutos: 60, precoBase: 40 },
    { nome: "Puro Aroma",         duracaoMinutos: 60, precoBase: 45 },
    { nome: "Cera Quente",        duracaoMinutos: 60, precoBase: 50 },
    { nome: "Drenagem Linfática", duracaoMinutos: 60, precoBase: 50 },
    { nome: "Drenagem Linfática 90 min", duracaoMinutos: 90, precoBase: 85 },
  ];
  for (const s of servicosData) {
    await prisma.servico.upsert({
      where: { nome: s.nome },
      update: { precoBase: new Prisma.Decimal(s.precoBase), duracaoMinutos: s.duracaoMinutos, ativo: true },
      create: { ...s, precoBase: new Prisma.Decimal(s.precoBase) },
    });
  }
  const servicos = await prisma.servico.findMany();
  const servicoPorNome = (n: string) => servicos.find((s) => s.nome === n)!;
  console.log(`  ✓ ${servicos.length} serviços`);

  // ── 2. Utilizadores: exatamente 3 (admin + 2 terapeutas) ────────────────
  // Login por username (minúsculas) ou email. Password partilhada por agora.
  const senha = await bcrypt.hash("EssencePT1506", 10);
  const UTILIZADORES = [
    { username: "nunobrito",       name: "Nuno Brito",       email: "nuno@essencewellnesspt.com",     role: "admin" },
    { username: "beatrizleao",     name: "Beatriz Leão",     email: "beatriz@essencewellnesspt.com",  role: "terapeuta" },
    { username: "cristinamartins", name: "Cristina Martins", email: "cristina@essencewellnesspt.com", role: "terapeuta" },
  ];
  for (const u of UTILIZADORES) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { username: u.username, name: u.name, role: u.role, password: senha, precisaMudarPassword: false, ativo: true },
      create: { username: u.username, name: u.name, email: u.email, role: u.role, password: senha, precisaMudarPassword: false, ativo: true, emailVerified: new Date() },
    });
  }
  const nuno = await prisma.user.findUniqueOrThrow({ where: { username: "nunobrito" } });
  const bea = await prisma.user.findUniqueOrThrow({ where: { username: "beatrizleao" } });
  const cris = await prisma.user.findUniqueOrThrow({ where: { username: "cristinamartins" } });
  console.log(`  ✓ 3 utilizadores: nunobrito (admin), beatrizleao, cristinamartins`);

  // ── 3. Limpar APENAS o domínio de clientes (idempotência) ───────────────
  await prisma.mensagemIA.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.observacao.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.precoPersonalizado.deleteMany();
  await prisma.clienteEtiqueta.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.campanha.deleteMany();
  await prisma.etiqueta.deleteMany();
  await prisma.auditLog.deleteMany({ where: { entidade: "Cliente" } });
  console.log("  ✓ Domínio de clientes limpo");

  // Apagar quaisquer outros utilizadores — ficam apenas os 3 definidos
  const removidos = await prisma.user.deleteMany({
    where: { email: { notIn: UTILIZADORES.map((u) => u.email) } },
  });
  console.log(`  ✓ ${removidos.count} utilizadores antigos removidos (ficam 3)`);
  void nuno; // admin criado; usado para login, não precisa de ligação a clientes

  // ── 4. Etiquetas (4 tipos) ──────────────────────────────────────────────
  const etiquetasData = [
    { nome: "VIP",                    cor: "#d4b886", tipo: "automatica" },
    { nome: "Nova cliente",           cor: "#a0a996", tipo: "automatica" },
    { nome: "Aniversário este mês",   cor: "#c9a66b", tipo: "automatica" },
    { nome: "Gravidez",               cor: "#9b7db5", tipo: "saude", bloqueiaAutomacoes: true },
    { nome: "Pós-parto",              cor: "#b58db5", tipo: "saude" },
    { nome: "Dores crónicas",         cor: "#b06050", tipo: "saude" },
    { nome: "Lesão / Reabilitação",   cor: "#c77b5a", tipo: "saude" },
    { nome: "Prefere manhã",          cor: "#7a9e7e", tipo: "preferencia" },
    { nome: "Prefere tarde",          cor: "#6b8ea0", tipo: "preferencia" },
    { nome: "Silêncio total",         cor: "#8a8f9c", tipo: "preferencia" },
    { nome: "Fã de Cera Quente",      cor: "#c98a4b", tipo: "preferencia" },
    { nome: "Reengagement",           cor: "#b06050", tipo: "campanha" },
    { nome: "Drenagem 2026",          cor: "#5a9ec7", tipo: "campanha" },
    { nome: "Indicou amiga",          cor: "#7a9e7e", tipo: "campanha" },
    { nome: "Sorteio Instagram",      cor: "#b58db5", tipo: "campanha" },
  ];
  await prisma.etiqueta.createMany({ data: etiquetasData as Prisma.EtiquetaCreateManyInput[] });
  const etiquetas = await prisma.etiqueta.findMany();
  const etId = (nome: string) => etiquetas.find((e) => e.nome === nome)!.id;
  console.log(`  ✓ ${etiquetas.length} etiquetas`);

  // ── 5. Gerar 100 clientes + sessões + relações ──────────────────────────
  const sessoesParaCriar: Prisma.SessaoCreateManyInput[] = [];
  const ligacoesEtiqueta: { clienteId: string; etiquetaId: string }[] = [];
  const precosParaCriar: Prisma.PrecoPersonalizadoCreateManyInput[] = [];
  const packsParaCriar: Prisma.PackCreateManyInput[] = [];
  const tarefasParaCriar: Prisma.TarefaCreateManyInput[] = [];
  const observacoesParaCriar: Prisma.ObservacaoCreateManyInput[] = [];
  const mensagensParaCriar: Prisma.MensagemIACreateManyInput[] = [];
  const auditParaCriar: Prisma.AuditLogCreateManyInput[] = [];

  let idx = 0;
  let sessoesHojeColocadas = 0;

  for (const coorte of COORTES) {
    for (let n = 0; n < coorte.count; n++) {
      idx++;
      const primeiro = PRIMEIROS[(idx * 7) % PRIMEIROS.length];
      const apelido = APELIDOS[(idx * 13) % APELIDOS.length];
      const nome = `${primeiro} ${apelido}`;
      const telefone = "91" + String(2000000 + idx).padStart(7, "0");
      const email = semAcentos(`${primeiro}.${apelido}${idx}`.toLowerCase()) + "@" + pick(DOMINIOS);
      const canal: Canal = rnd() > 0.25 ? "whatsapp" : rnd() > 0.5 ? "email" : "sms";
      const anoNasc = intBetween(1962, 2002);
      const dataNascimento = new Date(anoNasc, intBetween(0, 11), intBetween(1, 28));
      const semDados = coorte.estado === "novo" || coorte.estado === "lead";

      // Terapeuta responsável: ~60% Beatriz, ~40% Cristina
      const terapeutaPrincipalId = idx % 5 < 3 ? bea.id : cris.id;
      const terapeutaNome = terapeutaPrincipalId === bea.id ? "beatriz" : "cristina";

      // Criar cliente (precisamos do ID para ligar tudo)
      const cliente = await prisma.cliente.create({
        data: {
          nome, telefone, email, dataNascimento,
          comoNosConheceu: pick(COMO), fonte: pick(COMO),
          estado: coorte.estado as Prisma.ClienteCreateInput["estado"],
          terapeutaPrincipalId,
          canalPreferido: canal,
          temWhatsapp: canal === "whatsapp",
          aceitaMarketing: coorte.estado !== "blacklist" && rnd() > 0.15,
          consentimentoMarketingEm: coorte.estado !== "blacklist" ? d(-intBetween(30, 400)) : null,
          historicoAromasPreferidos: semDados ? null : pick(AROMAS),
          historicoCondicoesAlergias: semDados ? (rnd() > 0.6 ? pick(CONDICOES) : null) : pick(CONDICOES),
          historicoEstadoEmocional: semDados ? null : pick(EMOCIONAL),
          historicoZonasTensao: semDados ? null : pick(ZONAS),
          notasPessoais:
            coorte.estado === "blacklist"
              ? "Comportamento inadequado. Não remarcar nem contactar."
              : coorte.estado === "lead"
                ? "Contacto inicial — ainda não marcou. Fazer follow-up."
                : `Cliente ${coorte.estado.replace(/_/g, " ")}. Preferência de contacto: ${canal}.`,
        },
      });

      // ── Sessões (origem da verdade das métricas) ──
      const nSessoes = intBetween(coorte.sessoesMin, coorte.sessoesMax);
      let totalGasto = 0;
      let ultimaSessao: Date | null = null;
      const gapMedio = coorte.estado === "vip_embaixadora" ? 15 : coorte.estado === "ativa_frequente" ? 25 : 32;
      const ultimaOffset = semDados ? 0 : intBetween(coorte.ultimaMin, coorte.ultimaMax);

      for (let s = 0; s < nSessoes; s++) {
        const offsetDias = -(ultimaOffset + s * gapMedio + intBetween(-4, 4));
        const servNome = SERVICOS_NOME[(idx + s) % SERVICOS_NOME.length];
        const serv = servicoPorNome(servNome);
        const preco = Number(serv.precoBase);
        const terapeutaId = terapeutaPrincipalId;
        const dataSessao = d(offsetDias);
        totalGasto += preco;
        if (!ultimaSessao || dataSessao > ultimaSessao) ultimaSessao = dataSessao;
        sessoesParaCriar.push({
          clienteId: cliente.id,
          data: dataSessao,
          hora: pick(["09:00", "10:00", "11:00", "14:30", "16:00", "18:30"]),
          duracao: serv.duracaoMinutos,
          servico: servNome,
          servicoId: serv.id,
          preco: new Prisma.Decimal(preco),
          terapeuta: terapeutaNome,
          terapeutaId,
          estado: "realizada",
          aromaSessao: pick(AROMAS),
          estadoEmocional: pick(EMOCIONAL),
          resumoSessao: `Sessão de ${servNome}. ${pick(EMOCIONAL)} Trabalho focado em ${pick(ZONAS).toLowerCase()}`,
          notasPosSessao: `Próxima: insistir em ${pick(ZONAS).toLowerCase()} Sugerir ${pick(SERVICOS_NOME)}.`,
          estadoPagamento: "pago",
          valorPago: new Prisma.Decimal(preco),
          metodoPagamento: pick(["dinheiro", "mbway", "transferencia"]) as Prisma.SessaoCreateManyInput["metodoPagamento"],
          pagamentoEm: dataSessao,
          avaliacaoNota: rnd() > 0.2 ? intBetween(4, 5) : intBetween(2, 3),
          avaliacaoComentario: pick([
            "Adorei, saí completamente renovada. Obrigada!",
            "Excelente como sempre. A pressão estava perfeita.",
            "Senti-me muito melhor das costas. Volto em breve.",
            "Momento de paz que faz toda a diferença na minha semana.",
            "Profissionalismo e carinho. Recomendo sempre.",
          ]),
          avaliacaoRespondidaEm: dataSessao,
        });
      }

      // ── Sessão FUTURA para TODOS (tab Sessões nunca vazia + dashboard vivo) ──
      const ativa = ["vip_embaixadora", "ativa_frequente", "ativa_recente"].includes(coorte.estado);
      const naoBloqueada = coorte.estado !== "blacklist";
      if (naoBloqueada) {
        let futuroOffset: number;
        if (ativa && sessoesHojeColocadas < 6 && rnd() > 0.65) {
          futuroOffset = 0;
          sessoesHojeColocadas++;
        } else {
          futuroOffset = intBetween(1, ativa ? 9 : 18);
        }
        const servNome = pick(SERVICOS_NOME);
        const serv = servicoPorNome(servNome);
        sessoesParaCriar.push({
          clienteId: cliente.id,
          data: d(futuroOffset),
          hora: pick(["09:00", "10:00", "11:00", "14:30", "16:00", "18:30"]),
          duracao: serv.duracaoMinutos,
          servico: servNome,
          servicoId: serv.id,
          preco: new Prisma.Decimal(Number(serv.precoBase)),
          terapeuta: terapeutaNome,
          terapeutaId: terapeutaPrincipalId,
          estado: futuroOffset === 0 ? "confirmada" : "agendada",
        });
      }

      // ── Métricas derivadas (das sessões realizadas) ──
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          totalSessoes: nSessoes,
          totalGasto: new Prisma.Decimal(totalGasto.toFixed(2)),
          ultimaSessao,
        },
      });

      // ── Etiquetas por perfil (todas as clientes têm pelo menos 2) ──
      const tags: string[] = [];
      if (coorte.estado === "vip_embaixadora") tags.push("VIP");
      if (coorte.estado === "novo" || coorte.estado === "lead") tags.push("Nova cliente");
      if (["vip_em_risco", "reativacao"].includes(coorte.estado)) tags.push("Reengagement");
      tags.push(rnd() > 0.5 ? "Prefere manhã" : "Prefere tarde");
      tags.push(pick(["Dores crónicas", "Lesão / Reabilitação", "Fã de Cera Quente", "Silêncio total", "Indicou amiga", "Drenagem 2026", "Sorteio Instagram"]));
      if (rnd() > 0.8 && !ativa) tags.push(pick(["Gravidez", "Pós-parto"]));
      if (dataNascimento.getMonth() === HOJE.getMonth()) tags.push("Aniversário este mês");
      const tagsFinais = coorte.estado === "blacklist" ? [] : Array.from(new Set(tags));
      for (const t of tagsFinais) ligacoesEtiqueta.push({ clienteId: cliente.id, etiquetaId: etId(t) });

      // ── Preço personalizado para TODOS (serviço rotativo, único por cliente) ──
      {
        const serv = servicoPorNome(SERVICOS_NOME[idx % SERVICOS_NOME.length]);
        const base = Number(serv.precoBase);
        precosParaCriar.push({
          clienteId: cliente.id, servicoId: serv.id,
          valor: new Prisma.Decimal(coorte.estado === "vip_embaixadora" ? base - 5 : base - intBetween(2, 8)),
          motivo: coorte.estado === "vip_embaixadora" ? "Preço de fidelização VIP" : pick(["Desconto de cliente regular", "Condição especial acordada", "Campanha de boas-vindas"]),
          validade: rnd() > 0.5 ? d(intBetween(30, 180)) : null,
        });
      }

      // ── Pack para TODOS (estado de uso variado) ──
      {
        const serv = servicoPorNome(pick(SERVICOS_NOME));
        const total = pick([3, 5, 5, 10]);
        const usadas = Math.min(nSessoes, intBetween(0, total));
        packsParaCriar.push({
          clienteId: cliente.id, servicoId: serv.id,
          totalSessoes: total, sessoesUsadas: usadas,
          valorTotal: new Prisma.Decimal(Number(serv.precoBase) * total * 0.9),
          descricao: `Pack ${total} sessões ${serv.nome} (10% desconto)`,
          ativo: usadas < total,
        });
      }

      // ── Tarefas para TODOS: 1 concluída (timeline) + 1 pendente (+extra) ──
      tarefasParaCriar.push({
        clienteId: cliente.id,
        titulo: `Enviar resumo pós-sessão a ${primeiro}`,
        descricao: "Mensagem de seguimento com cuidados pós-massagem.",
        dataLimite: d(-intBetween(5, 30)),
        estado: "concluida",
        prioridade: "normal",
        tipo: "mensagem",
        criadoPor: terapeutaPrincipalId,
        atribuidaA: terapeutaPrincipalId,
        resolvidaEm: d(-intBetween(1, 25)),
      });
      tarefasParaCriar.push({
        clienteId: cliente.id,
        titulo:
          coorte.estado === "lead"
            ? `Contactar ${primeiro} (lead por ${pick(COMO)})`
            : ["vip_em_risco", "reativacao"].includes(coorte.estado)
              ? `Reengagement — ${primeiro} sem sessão`
              : `Confirmar próxima marcação de ${primeiro}`,
        descricao: coorte.estado === "lead" ? "Primeiro contacto e marcação." : "Acompanhamento da cliente.",
        dataLimite: d(intBetween(-3, 7)),
        estado: rnd() > 0.5 ? "pendente" : "em_progresso",
        prioridade: coorte.estado === "vip_em_risco" ? "alta" : coorte.estado === "lead" ? "alta" : "normal",
        tipo: coorte.estado === "lead" ? "ligacao" : "follow_up",
        criadoPor: terapeutaPrincipalId,
        atribuidaA: terapeutaPrincipalId,
      });

      // ── Observações para TODOS (2-3, tab Notas sempre preenchida) ──
      const notasPool = [
        "Gosta de música instrumental suave durante a sessão.",
        "Prefere a sala mais quente. Confirmar temperatura antes.",
        "Traz quase sempre uma amiga para a sala de espera.",
        "Sensível a luz forte — usar candeeiro indirecto.",
        "Pediu para experimentar a Drenagem Linfática na próxima.",
        "Chega sempre 10 minutos antes. Oferecer chá.",
        "Comentou que dorme melhor nas noites a seguir à sessão.",
      ];
      const nNotas = intBetween(2, 3);
      const usadasNotas = new Set<string>();
      for (let k = 0; k < nNotas; k++) {
        let txt = pick(notasPool);
        while (usadasNotas.has(txt)) txt = pick(notasPool);
        usadasNotas.add(txt);
        observacoesParaCriar.push({
          clienteId: cliente.id,
          texto: txt,
          autor: terapeutaNome === "beatriz" ? "Beatriz" : "Cristina",
          criadoEm: d(-intBetween(2, 120)),
        });
      }

      // ── Mensagens para TODOS: histórico enviado + (pendente p/ risco/reativação) ──
      const primeiroNome = primeiro;
      mensagensParaCriar.push({
        clienteId: cliente.id,
        canal: "whatsapp",
        estado: "enviada",
        tipo: "pos_sessao",
        motivoGeracao: "Seguimento pós-sessão",
        mensagemGerada: `Olá ${primeiroNome}! 🌿 Foi um prazer receber-te. Bebe bastante água hoje e descansa. Até à próxima 💚`,
        mensagemFinal: `Olá ${primeiroNome}! 🌿 Foi um prazer receber-te. Bebe bastante água hoje e descansa. Até à próxima 💚`,
        geradaEm: d(-intBetween(20, 60)),
        aprovadaEm: d(-intBetween(18, 59)),
        enviadaEm: d(-intBetween(17, 58)),
        converteu: rnd() > 0.5,
      });
      if (["vip_em_risco", "reativacao"].includes(coorte.estado)) {
        mensagensParaCriar.push({
          clienteId: cliente.id,
          canal: "whatsapp",
          estado: "pendente",
          tipo: "reengagement",
          motivoGeracao: `${coorte.estado.replace(/_/g, " ")} — sem sessão há ${ultimaOffset} dias`,
          mensagemGerada: `Olá ${primeiroNome}! 🌿 É a Bea da Essence Wellness. Estava a pensar em ti — já há algum tempo que não nos vemos. Se precisares de um momento só teu, tenho disponibilidade esta semana. Um abraço 💚`,
          geradaEm: d(-intBetween(0, 3)),
        });
      } else if (naoBloqueada && rnd() > 0.5) {
        mensagensParaCriar.push({
          clienteId: cliente.id,
          canal: "whatsapp",
          estado: "aprovada",
          tipo: "lembrete",
          motivoGeracao: "Lembrete de marcação",
          mensagemGerada: `Olá ${primeiroNome}! Lembrete da tua sessão. Até já 🌿`,
          mensagemFinal: `Olá ${primeiroNome}! Lembrete da tua sessão. Até já 🌿`,
          geradaEm: d(-intBetween(0, 2)),
          aprovadaEm: d(-intBetween(0, 1)),
        });
      }

      // ── AuditLog para a Timeline (mudança de estado + tags adicionadas) ──
      const autorAudit = terapeutaNome === "beatriz" ? "Beatriz Leão" : "Cristina Martins";
      auditParaCriar.push({
        quem: autorAudit,
        acao: "cliente.estado_alterado",
        entidade: "Cliente",
        entidadeId: cliente.id,
        detalhe: { de: "novo", para: coorte.estado, manual: false },
        criadoEm: d(-intBetween(10, 90)),
      });
      for (const t of tagsFinais.slice(0, 2)) {
        auditParaCriar.push({
          quem: autorAudit,
          acao: "etiqueta.adicionada",
          entidade: "Cliente",
          entidadeId: cliente.id,
          detalhe: { etiqueta: t },
          criadoEm: d(-intBetween(5, 80)),
        });
      }
    }
  }

  // ── 6. Inserir tudo em lote ──────────────────────────────────────────────
  await prisma.sessao.createMany({ data: sessoesParaCriar });
  await prisma.clienteEtiqueta.createMany({ data: ligacoesEtiqueta, skipDuplicates: true });
  if (precosParaCriar.length) await prisma.precoPersonalizado.createMany({ data: precosParaCriar, skipDuplicates: true });
  if (packsParaCriar.length) await prisma.pack.createMany({ data: packsParaCriar });
  if (tarefasParaCriar.length) await prisma.tarefa.createMany({ data: tarefasParaCriar });
  if (observacoesParaCriar.length) await prisma.observacao.createMany({ data: observacoesParaCriar });
  if (mensagensParaCriar.length) await prisma.mensagemIA.createMany({ data: mensagensParaCriar });
  if (auditParaCriar.length) await prisma.auditLog.createMany({ data: auditParaCriar });

  console.log(`  ✓ ${sessoesParaCriar.length} sessões`);
  console.log(`  ✓ ${ligacoesEtiqueta.length} ligações de etiqueta`);
  console.log(`  ✓ ${precosParaCriar.length} preços personalizados`);
  console.log(`  ✓ ${packsParaCriar.length} packs`);
  console.log(`  ✓ ${tarefasParaCriar.length} tarefas`);
  console.log(`  ✓ ${observacoesParaCriar.length} observações`);
  console.log(`  ✓ ${mensagensParaCriar.length} mensagens IA`);
  console.log(`  ✓ ${auditParaCriar.length} eventos de auditoria (timeline)`);

  // ── 7. Templates de mensagem (upsert) ────────────────────────────────────
  const templatesData = [
    { nome: "reengagement_45dias", tipo: "reengagement", texto: "Olá {{nome}} 🌿\n\nTem sido algum tempo! Seria um prazer receber-te novamente.\n\nFlora ✦ | Essence Wellness", variaveis: ["nome"] },
    { nome: "aniversario", tipo: "aniversario", texto: "Olá {{nome}} 🎂\n\nFeliz aniversário! 10% de desconto na próxima sessão este mês 💚\n\nFlora ✦ | Essence Wellness", variaveis: ["nome"] },
    { nome: "boas_vindas_novo_cliente", tipo: "boas_vindas", texto: "Olá {{nome}} 🌿\n\nBem-vinda à Essence Wellness! Qualquer dúvida, é só falar 💚\n\nFlora ✦ | Essence Wellness", variaveis: ["nome"] },
    { nome: "lembrete_agendamento", tipo: "lembrete", texto: "Olá {{nome}} 🌿\n\nLembrete da tua sessão em {{data}} às {{hora}}. Até já! 💚", variaveis: ["nome", "data", "hora"] },
    { nome: "campanha_drenagem_linfatica", tipo: "campanha", texto: "Olá {{nome}} 🌊\n\nNovidade: a Drenagem Linfática chegou à Essence Wellness! A partir de 50€.\n\nFlora ✦ | Essence Wellness", variaveis: ["nome"] },
  ];
  for (const t of templatesData) {
    await prisma.templateMensagem.upsert({ where: { nome: t.nome }, update: { texto: t.texto, variaveis: t.variaveis }, create: t });
  }
  console.log(`  ✓ ${templatesData.length} templates`);

  // ── 8. Campanha exemplo (liga template + métricas) ───────────────────────
  const tplReeng = await prisma.templateMensagem.findUnique({ where: { nome: "reengagement_45dias" } });
  if (tplReeng) {
    await prisma.campanha.create({
      data: {
        nome: "Reativação Junho 2026",
        segmento: { estados: ["vip_em_risco", "reativacao"] },
        templateId: tplReeng.id,
        estado: "ativa",
        totalEnviado: 0,
      },
    });
    console.log("  ✓ 1 campanha exemplo");
  }

  // ── 9. Configuração do negócio (singleton) ───────────────────────────────
  await prisma.configuracaoNegocio.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // ── Resumo ───────────────────────────────────────────────────────────────
  const porEstado = await prisma.cliente.groupBy({ by: ["estado"], _count: { id: true } });
  console.log("\n📊 Distribuição por estado:");
  porEstado.sort((a, b) => b._count.id - a._count.id).forEach((r) => console.log(`   ${r.estado.padEnd(18)} ${r._count.id}`));
  const total = await prisma.cliente.count();
  const porTerapeuta = await prisma.cliente.groupBy({ by: ["terapeutaPrincipalId"], _count: { id: true } });
  console.log(`\n🎯 Total: ${total} clientes`);
  console.log("👥 Por terapeuta:");
  for (const r of porTerapeuta) {
    const nome = r.terapeutaPrincipalId === bea.id ? "Beatriz Leão" : r.terapeutaPrincipalId === cris.id ? "Cristina Martins" : "—";
    console.log(`   ${nome.padEnd(18)} ${r._count.id}`);
  }
  console.log("\n👤 Logins (password: EssencePT1506):");
  console.log("   nunobrito        → admin (vê tudo + filtro por terapeuta)");
  console.log("   beatrizleao      → terapeuta (só os clientes dela)");
  console.log("   cristinamartins  → terapeuta (só os clientes dela)\n");
  console.log("✅ Seed-100 concluído.");
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
