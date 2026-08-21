import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { serializarDecimais } from "@/lib/serialize"
import { TabelaSessoesPagamento, type SessaoRow } from "./TabelaSessoesPagamento"
import { RepassesCristina, valorDevido, type RepasseRow } from "./RepassesCristina"
import { VouchersSection, type VoucherRow, type ServicoOpcao } from "./VouchersSection"
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot"
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
  voucher: "Voucher",
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

  const [sessoesRaw, receitaAllTime, vendasVoucherAllTime, topReceitaRaw, vouchersRaw, vendasVoucherRaw, servicosRaw, repassesRaw] = await Promise.all([
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
        repasseNecessario: true, repasseFeito: true,
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { data: "desc" },
    }),
    prisma.sessao.aggregate({
      where: { estadoPagamento: "pago", apagadoEm: null, ...filtroSessao },
      _sum: { valorPago: true },
    }),
    // Mesmo bug que existia na "Receita do mês" (ver dashboard principal,
    // corrigido 2026-08-21): "Receita total" só somava sessões pagas
    // diretamente, nunca vendas de voucher — ficava sempre menor do que a
    // "Receita do mês", que já inclui vouchers. Todo o histórico, sem
    // filtro de mês (é "sempre", não "este mês").
    prisma.giftCard.findMany({
      where: alvo
        ? { OR: [{ terapeutaId: alvo }, { terapeuta2Id: alvo }, ...(alvo === idBea ? [{ terapeutaId: null }] : [])] }
        : {},
      select: { valorPago: true, terapeuta2Id: true },
    }),
    prisma.sessao.groupBy({
      by: ["clienteId"],
      where: { estadoPagamento: "pago", apagadoEm: null, ...filtroSessao },
      _sum: { valorPago: true },
      orderBy: { _sum: { valorPago: "desc" } },
      take: 8,
    }),
    prisma.giftCard.findMany({
      orderBy: { dataCompra: "desc" },
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
        dataCompra: true, compradorNome: true, terapeuta2Id: true,
      },
      orderBy: { dataCompra: "desc" },
    }),
    prisma.servico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, precoBase: true },
      orderBy: { nome: "asc" },
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

  // Voucher a dois, visto na vista de UMA terapeuta específica: o valor
  // atribuído a ela é metade — a outra metade é da colega. Na vista "todos"
  // (alvo null) mostra-se o valor cheio, porque aí representa a venda toda,
  // não a fatia de ninguém.
  const valorAtribuidoVoucher = (v: { valorPago: Prisma.Decimal; terapeuta2Id: string | null }) =>
    alvo && v.terapeuta2Id ? Number(v.valorPago) / 2 : Number(v.valorPago)

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
      metodoPagamento: "voucher",
      repasseNecessario: false,
      repasseFeito: false,
      cliente: { id: `voucher-${v.id}`, nome: v.compradorNome },
      voucherCodigo: v.codigo,
    }
  })

  const linhasMes: SessaoRow[] = [...sessoes, ...linhasVoucher]
    .sort((a, b) => b.data.localeCompare(a.data))

  const repasses: RepasseRow[] = repassesRaw.map(r => ({
    id: r.id,
    data: r.data.toISOString(),
    servico: r.servico,
    valorPago: r.valorPago !== null ? String(r.valorPago) : null,
    valorRepasse: r.valorRepasse !== null ? String(r.valorRepasse) : null,
    metodoPagamento: r.metodoPagamento,
    cliente: r.cliente,
  }))
  const totalRepasses = repasses.reduce((soma, r) => soma + valorDevido(r), 0)

  const vouchers: VoucherRow[] = (serializarDecimais(vouchersRaw) as typeof vouchersRaw).map(v => ({
    id: v.id,
    codigo: v.codigo,
    tipo: v.tipo as "digital" | "fisico",
    estado: v.estado as "ativo" | "usado" | "expirado" | "cancelado",
    compradorNome: v.compradorNome,
    compradorTelefone: v.compradorTelefone,
    compradorEmail: v.compradorEmail,
    servicoNome: v.servicoNome,
    valorPago: String(v.valorPago),
    beneficiarioNome: v.beneficiarioNome,
    beneficiarioTelefone: v.beneficiarioTelefone,
    dataCompra: v.dataCompra instanceof Date ? v.dataCompra.toISOString() : String(v.dataCompra),
    validade: v.validade ? (v.validade instanceof Date ? v.validade.toISOString() : String(v.validade)) : null,
    dataUso: v.dataUso ? (v.dataUso instanceof Date ? v.dataUso.toISOString() : String(v.dataUso)) : null,
    notas: v.notas,
  }))

  const servicos: ServicoOpcao[] = (serializarDecimais(servicosRaw) as typeof servicosRaw).map(s => ({
    id: s.id,
    nome: s.nome,
    precoBase: String(s.precoBase),
  }))

  // Nomes dos clientes do top
  const topIds = topReceitaRaw.map(t => t.clienteId)
  const nomesTop = topIds.length
    ? await prisma.cliente.findMany({ where: { id: { in: topIds } }, select: { id: true, nome: true } })
    : []
  const nomePorId = new Map(nomesTop.map(c => [c.id, c.nome]))
  const topReceita = topReceitaRaw.map(t => ({
    clienteId: t.clienteId,
    nome: nomePorId.get(t.clienteId) ?? "—",
    receita: Number(t._sum.valorPago ?? 0),
  }))

  // KPIs do mês
  let receitaTotal = 0
  const porMetodo: Record<string, number> = {
    dinheiro: 0, mbway_essence: 0, mbway_beatriz: 0, transferencia: 0, stripe: 0, voucher: 0,
  }
  const porEstado: Record<string, number> = { pendente: 0, pago: 0, parcial: 0, isento: 0 }

  for (const s of sessoes) {
    const ep = s.estadoPagamento as string
    porEstado[ep] = (porEstado[ep] ?? 0) + 1
    if (s.estadoPagamento === "pago" && s.valorPago) {
      const v = Number(s.valorPago)
      receitaTotal += v
      // "mbway" (legado, antes de separar por conta) conta para a Beatriz
      const m = s.metodoPagamento === "mbway" ? "mbway_beatriz" : (s.metodoPagamento as string | null)
      if (m && m in porMetodo) porMetodo[m]! += v
    }
  }

  // Vendas de voucher: dinheiro que entrou este mês e que, até agora, não
  // aparecia em receita nenhuma — a sessão que o voucher paga fica "isento"
  // (para não duplicar), e a venda não era contada em lado nenhum.
  for (const v of vendasVoucherRaw) {
    const valor = valorAtribuidoVoucher(v)
    receitaTotal += valor
    porMetodo.voucher! += valor
  }

  const receitaVouchersSempre = vendasVoucherAllTime.reduce((soma, v) => soma + valorAtribuidoVoucher(v), 0)
  const receitaSempre = Number(receitaAllTime._sum.valorPago ?? 0) + receitaVouchersSempre
  const pendentes = sessoes.filter(s => s.estadoPagamento === "pendente" && s.estado === "realizada")

  return (
    <div style={{ padding: "32px", maxWidth: "1060px", margin: "0 auto" }} className="space-y-8">

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Receita do mês" valor={`€${receitaTotal.toFixed(2)}`} tipo="destaque" />
        <KpiCard label="Sessões pagas" valor={String(porEstado["pago"] ?? 0)} tipo="normal" />
        <KpiCard label="Por cobrar" valor={String(pendentes.length)} tipo={pendentes.length ? "aviso" : "normal"} />
        <KpiCard label="Receita total" valor={`€${receitaSempre.toFixed(2)}`} tipo="ouro" />
      </div>

      <RepassesCristina repasses={repasses} total={totalRepasses} />

      {/* Por método + Top clientes */}
      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <SectionTitle>Por método de pagamento</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(porMetodo).map(([metodo, valor]) => (
              <div key={metodo} style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(237,231,227,0.45)", fontSize: "11px", marginBottom: "6px" }}>
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
              <p style={{ padding: "20px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(237,231,227,0.3)", fontSize: "13px" }}>
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
                  <span style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "11px", color: i < 3 ? GOLD : "rgba(237,231,227,0.35)", width: "16px", fontWeight: 700 }}>
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

      {/* Vouchers / Gift Cards */}
      <section>
        <VouchersSection vouchers={vouchers} servicos={servicos} />
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

function KpiCard({ label, valor, tipo }: { label: string; valor: string; tipo: "destaque" | "aviso" | "normal" | "ouro" }) {
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
      <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(237,231,227,0.45)", fontSize: "11px", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: valorColor, fontSize: "24px", fontWeight: 400 }}>
        {valor}
      </div>
    </div>
  )
}
