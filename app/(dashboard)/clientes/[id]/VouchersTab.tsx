import Link from "next/link"
import { Gift, CreditCard } from "lucide-react"

// Um voucher toca duas pessoas: quem o comprou e quem o vai usar. São
// papéis diferentes e aparecem separados — juntá-los numa lista só daria a
// entender que a cliente comprou vouchers que na verdade recebeu.
export interface VoucherDoCliente {
  id: string
  codigo: string
  tipo: string
  estado: string
  servicoNome: string
  valorPago: number
  compradorNome: string
  beneficiarioNome: string | null
  dataCompra: string
  validade: string | null
  dataUso: string | null
}

const ESTADOS: Record<string, { label: string; cor: string; bg: string }> = {
  ativo:     { label: "Por marcar", cor: "var(--nuit-champagne)", bg: "rgba(212,184,134,0.12)" },
  agendado:  { label: "Agendado",   cor: "#8ea9c9", bg: "rgba(142,169,201,0.14)" },
  usado:     { label: "Utilizado",  cor: "#8bb08f", bg: "rgba(139,176,143,0.14)" },
  expirado:  { label: "Expirado",   cor: "#9d9d9a", bg: "rgba(157,157,154,0.12)" },
  cancelado: { label: "Cancelado",  cor: "#c9756a", bg: "rgba(201,117,106,0.12)" },
}

function formatarData(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT")
}

function Chip({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? ESTADOS.ativo!
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 10px", borderRadius: "100px",
      backgroundColor: e.bg, border: `1px solid ${e.cor}44`,
      fontFamily: "var(--font-sans, sans-serif)",
      fontSize: "11px", fontWeight: 600, color: e.cor, whiteSpace: "nowrap",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: e.cor }} />
      {e.label}
    </span>
  )
}

function Linha({ v, papel }: { v: VoucherDoCliente; papel: "comprou" | "recebeu" }) {
  // Na lista de compras interessa para quem foi; na de recebidos, de quem veio.
  const contraparte = papel === "comprou"
    ? (v.beneficiarioNome ? `para ${v.beneficiarioNome}` : "para si")
    : `de ${v.compradorNome}`

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "12px", padding: "13px 16px",
      borderBottom: "1px solid rgba(212,184,134,0.10)",
    }}>
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "12px" }}>
        {v.tipo === "digital"
          ? <Gift size={15} color="rgba(212,184,134,0.55)" aria-hidden="true" />
          : <CreditCard size={15} color="rgba(212,184,134,0.55)" aria-hidden="true" />}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px",
            color: "var(--nuit-bone)", fontWeight: 600,
          }}>
            {v.codigo}
            <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}> · {v.servicoNome}</span>
          </div>
          <div style={{
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "11.5px",
            color: "var(--muted-foreground)", marginTop: "3px",
          }}>
            {formatarData(v.dataCompra)} · {contraparte}
            {v.dataUso ? ` · usado em ${formatarData(v.dataUso)}` : v.validade ? ` · válido até ${formatarData(v.validade)}` : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <Chip estado={v.estado} />
        <span style={{
          fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px",
          color: "var(--nuit-bone)", minWidth: "62px", textAlign: "right",
        }}>
          €{v.valorPago.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

function Bloco({ titulo, sub, vouchers, papel }: {
  titulo: string
  sub: string
  vouchers: VoucherDoCliente[]
  papel: "comprou" | "recebeu"
}) {
  if (vouchers.length === 0) return null
  const total = vouchers.reduce((s, v) => s + v.valorPago, 0)

  return (
    <div style={{
      backgroundColor: "var(--nuit-overlay)", borderRadius: "12px",
      border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: "12px", padding: "16px 16px 13px",
        borderBottom: "1px solid rgba(212,184,134,0.10)",
      }}>
        <div>
          <h3 style={{
            fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px",
            color: "var(--nuit-bone)", fontWeight: 400,
          }}>
            {titulo} <span style={{ color: "rgba(212,184,134,0.5)" }}>({vouchers.length})</span>
          </h3>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "11.5px",
            color: "var(--muted-foreground)", marginTop: "3px",
          }}>
            {sub}
          </p>
        </div>
        {papel === "comprou" && (
          <span style={{
            fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "17px",
            color: "var(--nuit-champagne)", whiteSpace: "nowrap",
          }}>
            €{total.toFixed(2)}
          </span>
        )}
      </div>
      <div>
        {vouchers.map(v => <Linha key={v.id} v={v} papel={papel} />)}
      </div>
    </div>
  )
}

export function VouchersTab({ comprados, recebidos }: {
  comprados: VoucherDoCliente[]
  recebidos: VoucherDoCliente[]
}) {
  if (comprados.length === 0 && recebidos.length === 0) {
    return (
      <div style={{
        backgroundColor: "var(--nuit-overlay)", borderRadius: "12px",
        border: "1px solid rgba(212,184,134,0.16)", padding: "32px", textAlign: "center",
      }}>
        <Gift size={22} color="rgba(212,184,134,0.3)" aria-hidden="true" style={{ margin: "0 auto 10px" }} />
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px",
          color: "var(--muted-foreground)", lineHeight: 1.6,
        }}>
          Sem vouchers associados.
          <br />
          <Link href="/vouchers" style={{ color: "rgba(212,184,134,0.7)", textDecoration: "underline" }}>
            Criar um voucher
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Bloco
        titulo="Comprou"
        sub="Vouchers que esta pessoa pagou"
        vouchers={comprados}
        papel="comprou"
      />
      <Bloco
        titulo="Recebeu"
        sub="Vouchers oferecidos a esta pessoa por outra"
        vouchers={recebidos}
        papel="recebeu"
      />
    </div>
  )
}
