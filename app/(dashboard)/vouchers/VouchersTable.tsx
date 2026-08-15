"use client"

import { useState, useTransition } from "react"
import { InlineEditField } from "@/components/clientes/InlineEditField"
import { atualizarCampoVoucher, criarVoucher } from "./actions"
import { useToast } from "@/components/ui/toast-nuit"

interface Voucher {
  id: string
  codigo: string
  tipo: string
  estado: string
  compradorNome: string
  compradorTelefone: string | null
  compradorEmail: string | null
  servicoNome: string
  valorPago: number
  beneficiarioNome: string | null
  beneficiarioTelefone: string | null
  validade: string | null
  dataUso: string | null
  notas: string | null
}

const ESTADO_OPCOES = [
  { value: "ativo", label: "Ativo" },
  { value: "usado", label: "Usado" },
  { value: "expirado", label: "Expirado" },
  { value: "cancelado", label: "Cancelado" },
]
const TIPO_OPCOES = [
  { value: "digital", label: "Digital" },
  { value: "fisico", label: "Físico" },
]

const ESTADO_COR: Record<string, { cor: string; bg: string }> = {
  ativo: { cor: "#b9a07a", bg: "rgba(185,160,122,0.10)" },
  usado: { cor: "#7a9e7e", bg: "rgba(122,158,126,0.12)" },
  expirado: { cor: "var(--nuit-bone-soft)", bg: "rgba(157,157,154,0.10)" },
  cancelado: { cor: "#b06050", bg: "rgba(176,96,80,0.08)" },
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 10px", fontSize: "10px",
  color: "var(--nuit-bone-soft)", textTransform: "uppercase",
  letterSpacing: "0.08em", backgroundColor: "rgba(212,184,134,0.06)",
  whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1,
}
const td: React.CSSProperties = { padding: "4px 6px", verticalAlign: "middle" }
const cellStyle: React.CSSProperties = { fontSize: "12.5px" }

function Campo({ voucher, campo, ...props }: {
  voucher: Voucher
  campo: keyof Voucher
} & Partial<React.ComponentProps<typeof InlineEditField>>) {
  return (
    <InlineEditField
      label={String(campo)}
      hideLabel
      value={voucher[campo] as string | number | null}
      valueStyle={cellStyle}
      onSave={(v) => atualizarCampoVoucher(voucher.id, campo as never, v)}
      {...props}
    />
  )
}

export function VouchersTable({ vouchers }: { vouchers: Voucher[] }) {
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [busca, setBusca] = useState("")
  const [aAdicionar, setAAdicionar] = useState(false)
  const [novo, setNovo] = useState({ codigo: "", tipo: "digital", compradorNome: "", servicoNome: "", valorPago: "" })
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const filtrados = vouchers.filter(v => {
    if (filtroEstado !== "todos" && v.estado !== filtroEstado) return false
    if (busca.trim()) {
      const alvo = `${v.codigo} ${v.compradorNome} ${v.beneficiarioNome ?? ""} ${v.servicoNome}`.toLowerCase()
      if (!alvo.includes(busca.trim().toLowerCase())) return false
    }
    return true
  })

  function guardarNovo() {
    if (!novo.codigo.trim() || !novo.compradorNome.trim() || !novo.servicoNome.trim() || !novo.valorPago) {
      toast("Preenche pelo menos código, comprador, serviço e valor.", "error")
      return
    }
    startTransition(async () => {
      const res = await criarVoucher({
        codigo: novo.codigo.trim(),
        tipo: novo.tipo,
        compradorNome: novo.compradorNome.trim(),
        servicoNome: novo.servicoNome.trim(),
        valorPago: Number(novo.valorPago),
      })
      if (res.ok) {
        setNovo({ codigo: "", tipo: "digital", compradorNome: "", servicoNome: "", valorPago: "" })
        setAAdicionar(false)
      } else {
        toast(res.erro, "error")
      }
    })
  }

  return (
    <div>
      {/* Barra de filtros — igual à sensação de uma folha de cálculo: pesquisa + filtro rápido */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar código, comprador, beneficiário ou serviço…"
          style={{
            flex: "1 1 260px", padding: "8px 12px", borderRadius: "7px",
            border: "1px solid rgba(212,184,134,0.2)", backgroundColor: "var(--nuit-midnight)",
            color: "var(--nuit-bone)", fontSize: "13px", outline: "none",
          }}
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{
            padding: "8px 10px", borderRadius: "7px",
            border: "1px solid rgba(212,184,134,0.2)", backgroundColor: "var(--nuit-midnight)",
            color: "var(--nuit-bone)", fontSize: "13px", cursor: "pointer",
          }}
        >
          <option value="todos">Todos os estados</option>
          {ESTADO_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setAAdicionar(v => !v)}
          style={{
            padding: "8px 16px", borderRadius: "7px",
            backgroundColor: aAdicionar ? "transparent" : "#b9a07a",
            color: aAdicionar ? "var(--nuit-bone-soft)" : "#fff",
            border: "1px solid rgba(185,160,122,0.5)",
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}
        >
          {aAdicionar ? "Cancelar" : "+ Novo Voucher"}
        </button>
        <span style={{ fontSize: "11px", color: "var(--nuit-bone-soft)" }}>
          {filtrados.length} de {vouchers.length}
        </span>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid rgba(212,184,134,0.14)", borderRadius: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
          <thead>
            <tr>
              <th style={th}>Código</th>
              <th style={th}>Tipo</th>
              <th style={th}>Estado</th>
              <th style={th}>Comprador/a</th>
              <th style={th}>Beneficiário/a</th>
              <th style={th}>Serviço</th>
              <th style={th}>Valor</th>
              <th style={th}>Validade</th>
              <th style={th}>Data de Uso</th>
              <th style={th}>Notas</th>
            </tr>
          </thead>
          <tbody>
            {aAdicionar && (
              <tr style={{ backgroundColor: "rgba(185,160,122,0.06)", borderBottom: "1px solid rgba(212,184,134,0.14)" }}>
                <td style={td}>
                  <input autoFocus value={novo.codigo} onChange={e => setNovo({ ...novo, codigo: e.target.value })}
                    placeholder="EWD2026-28" style={inputNovo} />
                </td>
                <td style={td}>
                  <select value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value })} style={inputNovo}>
                    {TIPO_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td style={td}><span style={{ fontSize: "11px", color: "var(--nuit-bone-soft)" }}>ativo</span></td>
                <td style={td}>
                  <input value={novo.compradorNome} onChange={e => setNovo({ ...novo, compradorNome: e.target.value })}
                    placeholder="Nome" style={inputNovo} />
                </td>
                <td style={td} colSpan={1}></td>
                <td style={td}>
                  <input value={novo.servicoNome} onChange={e => setNovo({ ...novo, servicoNome: e.target.value })}
                    placeholder="Serviço" style={inputNovo} />
                </td>
                <td style={td}>
                  <input type="number" step="0.01" value={novo.valorPago} onChange={e => setNovo({ ...novo, valorPago: e.target.value })}
                    placeholder="40" style={{ ...inputNovo, width: "70px" }} />
                </td>
                <td style={td} colSpan={3}>
                  <button type="button" onClick={guardarNovo} disabled={isPending} style={{
                    padding: "5px 14px", borderRadius: "6px", backgroundColor: "#b9a07a", color: "#fff",
                    border: "none", fontSize: "11px", fontWeight: 600, cursor: "pointer", opacity: isPending ? 0.6 : 1,
                  }}>
                    {isPending ? "A criar…" : "Criar"}
                  </button>
                </td>
              </tr>
            )}
            {filtrados.map(v => {
              const cor = ESTADO_COR[v.estado] ?? ESTADO_COR.ativo
              return (
                <tr key={v.id} style={{ borderBottom: "1px solid rgba(212,184,134,0.08)" }}>
                  <td style={td}><Campo voucher={v} campo="codigo" valueStyle={{ ...cellStyle, fontWeight: 600, color: "#b9a07a" }} /></td>
                  <td style={td}><Campo voucher={v} campo="tipo" type="select" options={TIPO_OPCOES} /></td>
                  <td style={td}>
                    <InlineEditField
                      label="estado" hideLabel type="select" options={ESTADO_OPCOES}
                      value={v.estado}
                      valueStyle={{ ...cellStyle, color: cor.cor, fontWeight: 600 }}
                      onSave={(val) => atualizarCampoVoucher(v.id, "estado", val)}
                    />
                  </td>
                  <td style={td}><Campo voucher={v} campo="compradorNome" /></td>
                  <td style={td}><Campo voucher={v} campo="beneficiarioNome" placeholder="—" /></td>
                  <td style={td}><Campo voucher={v} campo="servicoNome" /></td>
                  <td style={td}><Campo voucher={v} campo="valorPago" type="currency" valueStyle={{ ...cellStyle, fontWeight: 600 }} /></td>
                  <td style={td}><Campo voucher={v} campo="validade" type="date" /></td>
                  <td style={td}><Campo voucher={v} campo="dataUso" type="date" placeholder="—" /></td>
                  <td style={td}><Campo voucher={v} campo="notas" placeholder="—" valueStyle={{ ...cellStyle, maxWidth: "220px" }} /></td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "28px", textAlign: "center", color: "var(--nuit-bone-soft)", fontSize: "13px" }}>
                  Nenhum voucher encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inputNovo: React.CSSProperties = {
  width: "100%", padding: "5px 8px", borderRadius: "5px",
  border: "1px solid rgba(212,184,134,0.25)", backgroundColor: "var(--nuit-deep, #0E1119)",
  color: "var(--nuit-bone)", fontSize: "12.5px", outline: "none",
}
