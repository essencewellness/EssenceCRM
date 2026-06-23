import Link from "next/link"
import { Search, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import type { Prisma, EstadoCliente } from "@prisma/client"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import { FiltrosClientes } from "./FiltrosClientes"
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador"
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot"
import { ClientesInfiniteList } from "@/components/clientes/ClientesInfiniteList"

const PAGE_SIZE = 50

export const revalidate = 30

interface ClientesPageProps {
  searchParams: Promise<{ q?: string; estado?: string; estados?: string | string[]; etiquetas?: string | string[]; inativo?: string; terapeuta?: string }>
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const { q, estado, estados: estadosParam, etiquetas: etiquetasParam, inativo, terapeuta } = await searchParams
  const { filtroCliente: filtroTerapeuta } = await getFiltrosTerapeuta(terapeuta)

  const etiquetasFiltro = etiquetasParam
    ? (Array.isArray(etiquetasParam) ? etiquetasParam : [etiquetasParam])
    : []

  // estadosFiltro vem de duas fontes:
  // 1. `estado` (quick filter: ativas/em_risco/novas → mapeado para estados reais)
  // 2. `estados[]` (filtros avançados do FiltrosClientes — estados individuais)
  const estadoMap: Record<string, EstadoCliente[]> = {
    ativas:   ["ativa_recente", "ativa_frequente", "vip_embaixadora"],
    em_risco: ["vip_em_risco", "reativacao"],
    novas:    ["lead", "novo"],
  }
  const estadosAvancados: EstadoCliente[] = estadosParam
    ? (Array.isArray(estadosParam) ? estadosParam : [estadosParam]) as EstadoCliente[]
    : []
  const estadosFiltro: EstadoCliente[] = estadosAvancados.length > 0
    ? estadosAvancados
    : (estado && estadoMap[estado] ? estadoMap[estado] : [])

  // Filtro de inactividade (dias sem sessão)
  const inativoDias = inativo ? parseInt(inativo, 10) : null
  const inativoWhere: Prisma.ClienteWhereInput = inativoDias
    ? { ultimaSessao: { lt: new Date(Date.now() - inativoDias * 86_400_000) } }
    : {}

  const where: Prisma.ClienteWhereInput = {
    apagadoEm: null,
    ...(filtroTerapeuta as Prisma.ClienteWhereInput),
    ...(q ? {
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { telefone: { contains: q } },
      ],
    } : {}),
    ...(estadosFiltro.length > 0 ? { estado: { in: estadosFiltro } } : {}),
    ...(etiquetasFiltro.length > 0 ? {
      etiquetas: { some: { etiquetaId: { in: etiquetasFiltro } } },
    } : {}),
    ...inativoWhere,
  }

  const [clientes, totalClientes, todasEtiquetas, templates] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: [{ ultimaSessao: "desc" }, { id: "asc" }],
      take: PAGE_SIZE + 1,
      include: {
        etiquetas: { include: { etiqueta: true } },
      },
    }),
    prisma.cliente.count({ where }),
    prisma.etiqueta.findMany({
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    }),
    prisma.templateMensagem.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, texto: true },
      orderBy: { nome: "asc" },
    }),
  ])

  // Cursor-based pagination
  const temMaisPagina = clientes.length > PAGE_SIZE
  const clientesPagina = temMaisPagina ? clientes.slice(0, PAGE_SIZE) : clientes
  const initialCursor = temMaisPagina ? clientesPagina[clientesPagina.length - 1].id : null

  // Serializar para os client components
  const clientesRows = clientesPagina.map(c => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    ultimaSessao: c.ultimaSessao?.toISOString() ?? null,
    totalSessoes: c.totalSessoes,
    totalGasto: Number(c.totalGasto),
    estado: c.estado,
    etiquetas: c.etiquetas.map(e => ({
      etiqueta: {
        id:                 e.etiqueta.id,
        nome:               e.etiqueta.nome,
        cor:                e.etiqueta.cor,
        tipo:               e.etiqueta.tipo,
        bloqueiaAutomacoes: e.etiqueta.bloqueiaAutomacoes,
      },
    })),
  }))

  const etiquetasSerializadas = todasEtiquetas.map(e => ({
    id: e.id, nome: e.nome, cor: e.cor, tipo: e.tipo, bloqueiaAutomacoes: e.bloqueiaAutomacoes,
  }))

  // Query string para o scroll infinito respeitar os filtros activos.
  // (isolamento por terapeuta também é imposto no servidor pela API)
  const apiParams = new URLSearchParams()
  if (terapeuta) apiParams.set("terapeuta", terapeuta)
  if (estadosFiltro.length === 1) apiParams.set("estado", estadosFiltro[0])
  for (const eid of etiquetasFiltro) apiParams.append("etiquetas", eid)
  if (inativoDias) apiParams.set("inactivos_desde_dias", String(inativoDias))
  const queryString = apiParams.toString()

  const temFiltrosAvancados = etiquetasFiltro.length > 0 || !!inativo

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

      <PageHeader
        titulo="Clientes"
        subtitulo={`${totalClientes} cliente${totalClientes !== 1 ? "s" : ""} encontrado${totalClientes !== 1 ? "s" : ""}`}
      />

      <FiltroTerapeutaSlot />

      {/* Pesquisa + filtros rápidos */}
      <div
        className="anim-fade-down"
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          marginBottom: "16px", flexWrap: "wrap",
          animationDelay: "0.25s",
        }}
      >
        <form method="GET" style={{ display: "flex", flex: 1, gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Preservar filtros avançados no form GET */}
          {etiquetasFiltro.map(id => (
            <input key={id} type="hidden" name="etiquetas" value={id} />
          ))}
          {inativo && <input type="hidden" name="inativo" value={inativo} />}

          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <Search size={14} color="#9d9d9a" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Pesquisar por nome, email ou telefone…"
              style={{
                paddingLeft: "36px", backgroundColor: "#ffffff",
                border: "1px solid #ddd6c4", color: "#161a26",
                fontSize: "13px", fontFamily: "var(--font-body, sans-serif)",
                borderRadius: "0px", height: "38px", boxShadow: "none",
              }}
              className="placeholder:text-[#b5b5b2] focus-visible:ring-[#b9a07a]/30 focus-visible:border-[#b9a07a]/60"
            />
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { label: "Todas", value: "" },
              { label: "Ativas", value: "ativas" },
              { label: "Em Risco", value: "em_risco" },
              { label: "Novas", value: "novas" },
            ].map(({ label, value }) => {
              const isActive = (estado ?? "") === value
              return (
                <Link
                  key={value}
                  href={`/clientes?${q ? `q=${encodeURIComponent(q)}&` : ""}${value ? `estado=${value}` : ""}`}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    height: "38px", padding: "0 14px", borderRadius: "0px",
                    fontSize: "9.5px", letterSpacing: "0.24em", textTransform: "uppercase",
                    fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                    transition: "all 150ms",
                    color: isActive ? "#b9a07a" : "#7a7e8a",
                    backgroundColor: isActive ? "rgba(185,160,122,0.08)" : "transparent",
                    border: isActive ? "1px solid rgba(185,160,122,0.35)" : "1px solid rgba(122,126,138,0.25)",
                    textDecoration: "none",
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </form>
      </div>

      {/* Filtros avançados por tag — sempre visíveis */}
      <div className="anim-fade-down" style={{ animationDelay: "0.30s" }}>
        <FiltrosClientes
          todasEtiquetas={todasEtiquetas.map(e => ({ id: e.id, nome: e.nome, cor: e.cor, tipo: e.tipo }))}
          templates={templates}
          totalResultados={clientes.length}
          etiquetasFiltro={etiquetasFiltro}
          estadosFiltro={estadosFiltro}
          inativoFiltro={inativo ?? ""}
        />
      </div>

      {/* Tabela */}
      <div className="anim-fade-up" style={{ animationDelay: "0.38s" }}>
        {clientes.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px" }}>
            <div style={{ marginBottom: "16px", color: "rgba(185,160,122,0.45)", display: "flex" }}>
              <Users size={22} />
            </div>
            <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "#6d6d6d" }}>
              Nenhum cliente encontrado
            </p>
            {(q || estado || temFiltrosAvancados) && (
              <Link href="/clientes" style={{ marginTop: "12px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#b9a07a", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Limpar filtros
              </Link>
            )}
          </div>
        ) : (
          <ClientesInfiniteList
            initialClientes={clientesRows}
            initialCursor={initialCursor}
            todasEtiquetas={etiquetasSerializadas}
            queryString={queryString}
          />
        )}
      </div>
    </div>
  )
}
