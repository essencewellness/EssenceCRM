import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { TabelaSessoesPagamento, type SessaoRow } from "./TabelaSessoesPagamento"
import { RepassesCristina, type RepasseRow } from "./RepassesCristina"
import { valorDevido } from "@/lib/repasses"
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot"
import { StaggerList, StaggerItem } from "@/components/stagger"
import type { Prisma } from "@/lib/prisma-client"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const CARD_BG = "var(--nuit-overlay)"
const BORDER = "var(--rule-soft)"

const METODO_LABEL_PT: Record<string, string> = {
  dinheiro: "Dinheiro",
  mbway_essence: "MBWay Essence",
  mbway_beatriz: "MBWay Beatriz",
  transferencia: "Transferência",
  stripe: "Stripe",
}

function fmtMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function parseMes(mes?: string) {
  const now = new Date()
  const ref = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : fmtMes(now)
  const [ano, m] = ref.split("-").map(Number)
  const inicio = new Date(ano!, m! - 1, 1)
  const fim = new Date(ano!, m!, 1)
  const label = inicio.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  return {
    ref, inicio, fim, label,
    prevMes: fmtMes(new Date(ano!, m! - 2, 1)),
    nextMes: fmtMes(new Date(ano!, m!, 1)),
    ehMesAtual: ref === fmtMes(now),
  }
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; terapeuta?: string }>
}) {
  const { mes, terapeuta } = await searchParams
  // Não usamos o filtroSessao genérico de getFiltrosTerapeuta aqui —
  // esse filtra por cliente.terapeutaPrincipalId (a terapeuta "habitual"
  // da cliente), que é só uma etiqueta e pode ser diferente de quem fez
  // uma sessão em concreto. O financeiro tem de atribuir a receita a quem
  // REALMENTE fez cada sessão — Sessao.terapeutaId.
  const { alvo } = await getFiltrosTerapeuta(terapeuta)
  // Numa massagem a dois trabalham as duas na mesma sessão — filtrar só por
  // terapeutaId escondia essa sessão de uma delas. Conta para ambas.
  const filtroSessao: Prisma.SessaoWhereInput = alvo
    ? { OR: [{ terapeutaId: alvo }, { terapeuta2Id: alvo }] }
    : {}

  const { inicio, fim, label, prevMes, nextMes, ehMesAtual } = parseMes(mes)

  // Quem é a "Bea" para efeitos de atribuição: os vouchers sem terapeuta
  // pertencem a ela por omissão.
  const idBea = await getTerapeutaPrincipalPadraoId()

  // Packs são individuais (nunca "a dois") — filtro simples por
  // pack.terapeutaId, sem o OR terapeutaId/terapeuta2Id das sessões/vouchers.
  const filtroPack: Prisma.PackPagamentoWhereInput = alvo
    ? { pack: { OR: [{ terapeutaId: alvo }, ...(alvo === idBea ? [{ terapeutaId: null }] : [])] } }
    : {}

  const [sessoesRaw, receitaAllTime, vendasVoucherAllTime, pagamentosPackAllTime, vendasVoucherRaw, pagamentosPackMesRaw, repassesRaw, repassesVoucherRaw] = await Promise.all([
    prisma.sessao.findMany({
      // Só o que tem relevância financeira: a sessão aconteceu, OU já tem
      // dinheiro registado (pagamento adiantado, ou paga e cancelada depois).
      // Sem isto entravam aqui as canceladas e as futuras ainda por acontecer,
      // cada uma com um botão "Marcar Pago" que criava receita do nada.
      // AND explícito e não spread: o filtro por terapeuta também usa OR
      // (principal ou segunda), e espalhá-lo aqui substituía este OR em vez
      // de o acompanhar — passavam a entrar outra vez as canceladas.
      where: {
        data: { gte: inicio, lt: fim },
        apagadoEm: null,
        AND: [
          { OR: [{ estado: "realizada" }, { estadoPagamento: { not: "pendente" } }] },
          ...(Object.keys(filtroSessao).length ? [filtroSessao] : []),
        ],
      },
      select: {
        id: true, estadoPagamento: true, valorPago: true, metodoPagamento: true,
        preco: true, data: true, servico: true, estado: true,
        repasseNecessario: true, repasseFeito: true, terapeuta2Id: true,
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { data: "desc" },
    }),
    // Era um .aggregate() com _sum — não dava para dividir ao meio as
    // sessões "a dois" na vista de uma terapeuta (SQL não sabe fazer isso
    // por linha), o que inflacionava "Receita total" ao dobro do real
    // sempre que havia sessões a dois pagas directamente (bug real
    // encontrado 2026-08-26 — vouchers já dividiam certo, sessões não).
    // Troca para buscar as linhas e somar em JS, como já se fazia com
    // vendasVoucherAllTime logo a seguir.
    prisma.sessao.findMany({
      // clienteId incluído: esta mesma lista também alimenta "Top clientes
      // por receita" (era uma query duplicada antes, só diferente no select).
      where: { estadoPagamento: "pago", apagadoEm: null, ...filtroSessao },
      select: { clienteId: true, valorPago: true, terapeuta2Id: true },
    }),
    // Mesmo bug que existia na "Receita do mês" (ver dashboard principal,
    // corrigido 2026-08-21): "Receita total" só somava sessões pagas
    // diretamente, nunca vendas de voucher — ficava sempre menor do que a
    // "Receita do mês", que já inclui vouchers. Todo o histórico, sem
    // filtro de mês (é "sempre", não "este mês").
    // compradorClienteId incluído: alimenta também "Top clientes por
    // receita" — sem isto o top só contava sessões pagas directamente e
    // ignorava por completo quem só comprou vouchers (bug real 2026-09-02).
    prisma.giftCard.findMany({
      where: alvo
        ? { OR: [{ terapeutaId: alvo }, { terapeuta2Id: alvo }, ...(alvo === idBea ? [{ terapeutaId: null }] : [])] }
        : {},
      select: { valorPago: true, terapeuta2Id: true, compradorClienteId: true },
    }),
    // Mesma lógica para pagamentos de pack — "Receita total" tinha o mesmo
    // problema que os vouchers tinham antes de 2026-08-21. clienteId do
    // pack incluído pela mesma razão que os dois de cima.
    prisma.packPagamento.findMany({
      where: filtroPack,
      select: { valor: true, pack: { select: { clienteId: true } } },
    }),
    // Vendas de voucher do mês — o dinheiro entrou na compra, por isso a
    // receita pertence a este mês, não ao mês em que a massagem acontecer.
    // `terapeutaId` a null significa "da Bea" (ver schema): por isso o
    // filtro por ela tem de apanhar também as linhas sem atribuição.
    // `terapeuta2Id` entra numa massagem a dois — o mesmo voucher aparece
    // nas duas vistas filtradas, sem duplicar o valor na vista sem filtro.
    prisma.giftCard.findMany({
      where: {
        dataCompra: { gte: inicio, lt: fim },
        ...(alvo
          ? {
              OR: [
                { terapeutaId: alvo },
                { terapeuta2Id: alvo },
                ...(alvo === idBea ? [{ terapeutaId: null }] : []),
              ],
            }
          : {}),
      },
      select: {
        id: true, codigo: true, servicoNome: true, valorPago: true,
        dataCompra: true, compradorNome: true, terapeuta2Id: true, metodoPagamento: true,
      },
      orderBy: { dataCompra: "desc" },
    }),
    // Pagamentos de pack registados este mês — "quando forem lá criados
    // adiciona ao financeiro" (pedido do Nuno, 2026-08-22). Pelo mês do
    // PAGAMENTO (como voucher), não do pack em si — um pack criado em julho
    // com a 2ª parcela paga em agosto conta essa parcela em agosto.
    prisma.packPagamento.findMany({
      where: { ...filtroPack, criadoEm: { gte: inicio, lt: fim } },
      select: {
        id: true, valor: true, metodoPagamento: true, notas: true, criadoEm: true,
        pack: { select: { id: true, servico: { select: { nome: true } }, cliente: { select: { id: true, nome: true } }, clienteNomeArquivado: true } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    // Repasses à Cristina — não filtrados por mês nem por terapeuta: é
    // dinheiro em aberto independentemente de quando a sessão foi
    prisma.sessao.findMany({
      where: { repasseNecessario: true, repasseFeito: false, apagadoEm: null },
      select: {
        id: true, data: true, servico: true, valorPago: true, valorRepasse: true, metodoPagamento: true,
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { data: "asc" },
    }),
    // O mesmo, mas para vendas de voucher (ver lib/repasses.ts — mesma regra
    // do MBWay único, agora também aplicada a vouchers).
    prisma.giftCard.findMany({
      where: { repasseNecessario: true, repasseFeito: false },
      select: {
        id: true, dataCompra: true, servicoNome: true, valorPago: true, valorRepasse: true, metodoPagamento: true,
        compradorNome: true,
      },
      orderBy: { dataCompra: "asc" },
    }),
  ])

  // Serializar Decimals e Dates para os client components
  const sessoes: SessaoRow[] = sessoesRaw.map(s => ({
    id: s.id,
    data: s.data.toISOString(),
    servico: s.servico,
    preco: s.preco !== null ? String(s.preco) : null,
    estado: s.estado,
    estadoPagamento: s.estadoPagamento,
    valorPago: s.valorPago !== null ? String(s.valorPago) : null,
    metodoPagamento: s.metodoPagamento,
    repasseNecessario: s.repasseNecessario,
    repasseFeito: s.repasseFeito,
    cliente: s.cliente,
  }))

  // Voucher ou sessão paga a dois, visto na vista de UMA terapeuta
  // específica: o valor atribuído a ela é metade — a outra metade é da
  // colega. Na vista "todos" (alvo null) mostra-se o valor cheio, porque
  // aí representa a venda/sessão toda, não a fatia de ninguém. Mesma regra
  // para os dois — só o nome muda por clareza nos pontos de uso.
  const valorAtribuidoADois = (v: { valorPago: Prisma.Decimal | null; terapeuta2Id: string | null }) =>
    v.valorPago === null ? 0 : (alvo && v.terapeuta2Id ? Number(v.valorPago) / 2 : Number(v.valorPago))
  const valorAtribuidoVoucher = valorAtribuidoADois
  const valorAtribuidoSessao = valorAtribuidoADois

  // Cada venda de voucher vira uma linha da tabela do mês. O "cliente" é o
  // comprador — é quem pagou —, e o id leva prefixo para nunca colidir com
  // um id de sessão nas keys do React.
  const linhasVoucher: SessaoRow[] = vendasVoucherRaw.map(v => {
    const valor = valorAtribuidoVoucher(v)
    return {
      id: `voucher-${v.id}`,
      data: v.dataCompra.toISOString(),
      servico: `Voucher — ${v.servicoNome}`,
      preco: String(valor),
      estado: "realizada",
      estadoPagamento: "pago",
      valorPago: String(valor),
      // Método real usado para pagar o voucher (mbway_essence, dinheiro…) —
      // "Voucher" não é um método de pagamento, é o tipo de movimento (já
      // sinalizado à parte pelo badge "Voucher vendido", ver voucherCodigo).
      metodoPagamento: v.metodoPagamento,
      repasseNecessario: false,
      repasseFeito: false,
      cliente: { id: `voucher-${v.id}`, nome: v.compradorNome },
      voucherCodigo: v.codigo,
    }
  })

  // Cada pagamento de pack vira uma linha — se um pack de 10 é pago em 2x,
  // são duas linhas em dois meses possivelmente diferentes, uma por parcela.
  const linhasPack: SessaoRow[] = pagamentosPackMesRaw.map(pg => ({
    id: `pack-${pg.id}`,
    data: pg.criadoEm.toISOString(),
    servico: `Pack — ${pg.pack.servico?.nome ?? "Massagens"}${pg.notas ? ` (${pg.notas})` : ""}`,
    preco: String(pg.valor),
    estado: "realizada",
    estadoPagamento: "pago",
    valorPago: String(pg.valor),
    metodoPagamento: pg.metodoPagamento,
    repasseNecessario: false,
    repasseFeito: false,
    cliente: pg.pack.cliente,
    clienteNomeArquivado: pg.pack.clienteNomeArquivado,
  }))

  const linhasMes: SessaoRow[] = [...sessoes, ...linhasVoucher, ...linhasPack]
    .sort((a, b) => b.data.localeCompare(a.data))

  const repassesSessoes: RepasseRow[] = repassesRaw.map(r => ({
    id: r.id,
    data: r.data.toISOString(),
    servico: r.servico,
    valorPago: r.valorPago !== null ? String(r.valorPago) : null,
    valorRepasse: r.valorRepasse !== null ? String(r.valorRepasse) : null,
    metodoPagamento: r.metodoPagamento,
    cliente: r.cliente,
  }))
  // Prefixo "voucher-" para nunca colidir com um id de Sessao — o mesmo
  // padrão já usado nas linhas de movimentos do mês (linhasVoucher acima).
  // marcarRepasseFeito (actions.ts) sabe distinguir pelo prefixo.
  const repassesVoucher: RepasseRow[] = repassesVoucherRaw.map(r => ({
    id: `voucher-${r.id}`,
    data: r.dataCompra.toISOString(),
    servico: `Voucher — ${r.servicoNome}`,
    valorPago: String(r.valorPago),
    valorRepasse: r.valorRepasse !== null ? String(r.valorRepasse) : null,
    metodoPagamento: r.metodoPagamento,
    cliente: { id: `voucher-${r.id}`, nome: r.compradorNome },
  }))
  const repasses: RepasseRow[] = [...repassesSessoes, ...repassesVoucher]
    .sort((a, b) => a.data.localeCompare(b.data))
  const totalRepasses = repasses.reduce((soma, r) => soma + valorDevido(r), 0)

  // Top clientes por receita — soma por cliente já com a divisão "a dois"
  // aplicada linha a linha (groupBy do SQL não sabe fazer isto), depois
  // ordenado e cortado ao top 8 aqui em JS. Junta as 3 origens de receita
  // (sessões pagas directamente, vendas de voucher, pagamentos de pack) —
  // antes só contava sessões, o que deixava de fora quem só comprou
  // vouchers (bug real 2026-09-02: cliente com €140 em vouchers aparecia
  // só com os €45 da sessão paga à parte).
  const totalPorCliente = new Map<string, number>()
  for (const t of receitaAllTime) {
    // Sessão "fantasma" (cliente apagado) continua a contar para a receita
    // total (ver .reduce mais abaixo) mas não faz sentido num ranking "top
    // clientes" — não há ninguém para atribuir.
    if (!t.clienteId) continue
    totalPorCliente.set(t.clienteId, (totalPorCliente.get(t.clienteId) ?? 0) + valorAtribuidoSessao(t))
  }
  for (const v of vendasVoucherAllTime) {
    if (!v.compradorClienteId) continue // voucher sem comprador ligado a um cliente — nada a atribuir
    totalPorCliente.set(v.compradorClienteId, (totalPorCliente.get(v.compradorClienteId) ?? 0) + valorAtribuidoVoucher(v))
  }
  for (const pg of pagamentosPackAllTime) {
    if (!pg.pack.clienteId) continue
    totalPorCliente.set(pg.pack.clienteId, (totalPorCliente.get(pg.pack.clienteId) ?? 0) + Number(pg.valor))
  }
  const topOrdenado = [...totalPorCliente.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const topIds = topOrdenado.map(([clienteId]) => clienteId)
  const nomesTop = topIds.length
    ? await prisma.cliente.findMany({ where: { id: { in: topIds } }, select: { id: true, nome: true } })
    : []
  const nomePorId = new Map(nomesTop.map(c => [c.id, c.nome]))
  const topReceita = topOrdenado.map(([clienteId, receita]) => ({
    clienteId,
    nome: nomePorId.get(clienteId) ?? "—",
    receita,
  }))

  // KPIs do mês
  let receitaTotal = 0
  const porMetodo: Record<string, number> = {
    dinheiro: 0, mbway_essence: 0, mbway_beatriz: 0, transferencia: 0, stripe: 0,
  }
  const porEstado: Record<string, number> = { pendente: 0, pago: 0, parcial: 0, isento: 0 }

  // Itera sessoesRaw (não a versão serializada "sessoes") porque precisa de
  // terapeuta2Id para dividir a dois — bug real encontrado 2026-08-26: uma
  // sessão "a dois" paga directamente entrava com o valor CHEIO na vista de
  // cada terapeuta filtrada (Bea via 90€, Cristina via os mesmos 90€, sendo
  // a venda real de 90€ no total) — só os vouchers já dividiam certo.
  for (const s of sessoesRaw) {
    const ep = s.estadoPagamento as string
    porEstado[ep] = (porEstado[ep] ?? 0) + 1
    if (s.estadoPagamento === "pago" && s.valorPago) {
      const v = valorAtribuidoSessao(s)
      receitaTotal += v
      // "mbway" (legado, antes de separar por conta) conta para a Beatriz
      const m = s.metodoPagamento === "mbway" ? "mbway_beatriz" : (s.metodoPagamento as string | null)
      if (m && m in porMetodo) porMetodo[m]! += v
    }
  }

  // Vendas de voucher: dinheiro que entrou este mês e que, até agora, não
  // aparecia em receita nenhuma — a sessão que o voucher paga fica "isento"
  // (para não duplicar), e a venda não era contada em lado nenhum. Conta
  // para o método REAL com que a compradora pagou o voucher (mbway_essence,
  // dinheiro…) — "voucher" não é um método de pagamento, é só como a venda
  // aparece identificada nos Movimentos (bug real 2026-09-02: toda a
  // receita de vouchers caía num balde "Voucher" que não corresponde a
  // nenhuma forma real de a Bea ter recebido o dinheiro).
  for (const v of vendasVoucherRaw) {
    const valor = valorAtribuidoVoucher(v)
    receitaTotal += valor
    const m = v.metodoPagamento === "mbway" ? "mbway_beatriz" : v.metodoPagamento
    if (m && m in porMetodo) porMetodo[m]! += valor
  }

  // Pagamentos de pack: valor inteiro (packs nunca são "a dois", ao
  // contrário de sessão/voucher — não há metade a atribuir a outra
  // terapeuta). Método real do pagamento, não uma categoria "pack" à parte.
  for (const pg of pagamentosPackMesRaw) {
    const valor = Number(pg.valor)
    receitaTotal += valor
    const m = pg.metodoPagamento === "mbway" ? "mbway_beatriz" : pg.metodoPagamento
    if (m && m in porMetodo) porMetodo[m]! += valor
  }

  const receitaVouchersSempre = vendasVoucherAllTime.reduce((soma, v) => soma + valorAtribuidoVoucher(v), 0)
  const receitaPacksSempre = pagamentosPackAllTime.reduce((soma, pg) => soma + Number(pg.valor), 0)
  const receitaSessoesSempre = receitaAllTime.reduce((soma, s) => soma + valorAtribuidoSessao(s), 0)
  const receitaSempre = receitaSessoesSempre + receitaVouchersSempre + receitaPacksSempre
  const pendentes = sessoes.filter(s => s.estadoPagamento === "pendente" && s.estado === "realizada")

  return (
    <div style={{ maxWidth: "1060px", margin: "0 auto" }} className="space-y-8">

      {/* Cabeçalho + navegador de mês */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
            color: CREAM, fontSize: "26px", fontWeight: 400, letterSpacing: "0.02em",
          }}>
            Financeiro
          </h1>
          <p style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: "rgba(212,184,134,0.55)", fontSize: "13px", marginTop: "4px", textTransform: "capitalize",
          }}>
            {label}{ehMesAtual ? " · mês atual" : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MesLink href={`/financeiro?mes=${prevMes}`} aria-label="Mês anterior"><ChevronLeft size={16} /></MesLink>
          {!ehMesAtual && (
            <Link href="/financeiro" style={{
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "12px",
              color: GOLD, textDecoration: "none", padding: "0 8px",
            }}>
              Hoje
            </Link>
          )}
          <MesLink href={`/financeiro?mes=${nextMes}`} aria-label="Mês seguinte"><ChevronRight size={16} /></MesLink>
        </div>
      </div>

      <FiltroTerapeutaSlot />

      {/* KPI cards do mês */}
      <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem><KpiCard label="Receita do mês" valor={`€${receitaTotal.toFixed(2)}`} tipo="destaque" /></StaggerItem>
        <StaggerItem><KpiCard label="Sessões pagas" valor={String(porEstado["pago"] ?? 0)} tipo="normal" /></StaggerItem>
        <StaggerItem><KpiCard label="Por cobrar" valor={String(pendentes.length)} tipo={pendentes.length ? "aviso" : "normal"} urgente={pendentes.length > 0} /></StaggerItem>
        <StaggerItem><KpiCard label="Receita total" valor={`€${receitaSempre.toFixed(2)}`} tipo="ouro" /></StaggerItem>
      </StaggerList>

      <RepassesCristina repasses={repasses} total={totalRepasses} />

      {/* Por método + Top clientes */}
      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <SectionTitle>Por método de pagamento</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(porMetodo).map(([metodo, valor]) => (
              <div key={metodo} style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "6px" }}>
                  {METODO_LABEL_PT[metodo] ?? metodo}
                </div>
                <div style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: CREAM, fontSize: "20px", fontWeight: 400 }}>
                  €{valor.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Top clientes por receita</SectionTitle>
          <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
            {topReceita.length === 0 && (
              <p style={{ padding: "20px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "var(--muted-foreground)", fontSize: "13px" }}>
                Ainda sem receita registada.
              </p>
            )}
            {topReceita.map((c, i) => (
              <Link key={c.clienteId} href={`/clientes/${c.clienteId}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 16px", textDecoration: "none",
                borderBottom: i < topReceita.length - 1 ? `1px solid ${BORDER}` : "none",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "11px", color: i < 3 ? GOLD : "var(--muted-foreground)", width: "16px", fontWeight: 700 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "13px", color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.nome}
                  </span>
                </span>
                <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "14px", color: GOLD, flexShrink: 0 }}>
                  €{c.receita.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Sessões do mês — tabela interativa com edição de pagamento */}
      <section>
        <SectionTitle>Movimentos de {label} ({linhasMes.length})</SectionTitle>
        <TabelaSessoesPagamento sessoes={linhasMes} mesLabel={label} />
      </section>

    </div>
  )
}

function MesLink({ href, children, ...rest }: { href: string; children: React.ReactNode; "aria-label"?: string }) {
  return (
    <Link href={href} {...rest} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "32px", height: "32px", borderRadius: "8px",
      border: `1px solid ${BORDER}`, color: GOLD, backgroundColor: CARD_BG,
      textDecoration: "none",
    }}>
      {children}
    </Link>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(212,184,134,0.55)",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em",
      textTransform: "uppercase", marginBottom: "12px",
    }}>
      {children}
    </h2>
  )
}

function KpiCard({ label, valor, tipo, urgente }: { label: string; valor: string; tipo: "destaque" | "aviso" | "normal" | "ouro"; urgente?: boolean }) {
  const borderColor =
    tipo === "destaque" ? "rgba(212,184,134,0.35)" :
    tipo === "ouro"     ? "rgba(212,184,134,0.28)" :
    tipo === "aviso"    ? "rgba(212,140,50,0.30)"  :
    BORDER
  const valorColor =
    tipo === "destaque" || tipo === "ouro" ? GOLD :
    tipo === "aviso" ? "#d48c45" :
    CREAM

  return (
    <div style={{ backgroundColor: CARD_BG, border: `1px solid ${borderColor}`, borderRadius: "10px", padding: "18px 16px" }}>
      <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "8px" }}>
        {label}
      </div>
      {/* value-pulse só quando urgente=true (ex: há mesmo por cobrar) — nunca
          pulsa em permanência, senão perde o significado (skill 21st-ui-explore,
          direção "Camada Ambiente": movimento liga-se ao negócio, não decora). */}
      <div className={urgente ? "value-pulse" : undefined} style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: valorColor, fontSize: "24px", fontWeight: 400 }}>
        {valor}
      </div>
    </div>
  )
}
