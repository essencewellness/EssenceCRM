import { prisma } from "@/lib/prisma"
import { VouchersTable } from "./VouchersTable"

export const revalidate = 0

export default async function VouchersPage() {
  const vouchers = await prisma.giftCard.findMany({
    orderBy: { dataCompra: "desc" },
  })

  const vouchersSerializados = vouchers.map(v => ({
    id: v.id,
    codigo: v.codigo,
    tipo: v.tipo,
    estado: v.estado,
    compradorNome: v.compradorNome,
    compradorTelefone: v.compradorTelefone,
    compradorEmail: v.compradorEmail,
    servicoNome: v.servicoNome,
    valorPago: Number(v.valorPago),
    beneficiarioNome: v.beneficiarioNome,
    beneficiarioTelefone: v.beneficiarioTelefone,
    validade: v.validade ? v.validade.toISOString() : null,
    dataUso: v.dataUso ? v.dataUso.toISOString() : null,
    notas: v.notas,
  }))

  const totalAtivos = vouchers.filter(v => v.estado === "ativo").length
  const totalUsados = vouchers.filter(v => v.estado === "usado").length
  const valorPorMarcar = vouchers
    .filter(v => v.estado === "ativo")
    .reduce((soma, v) => soma + Number(v.valorPago), 0)

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "22px", color: "var(--nuit-bone)", marginBottom: "8px" }}>
        Vouchers
      </h1>
      <p style={{ color: "var(--nuit-bone-soft)", fontSize: "13px", marginBottom: "20px" }}>
        Clica em qualquer campo para editar — tal como numa folha de cálculo.
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { label: "Total", value: vouchers.length },
          { label: "Por marcar", value: totalAtivos },
          { label: "Utilizados", value: totalUsados },
          { label: "Valor por marcar", value: `${valorPorMarcar.toFixed(2)} €` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
            border: "1px solid rgba(212,184,134,0.16)", padding: "14px 20px", minWidth: "140px",
          }}>
            <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "var(--nuit-bone-soft)", textTransform: "uppercase", marginBottom: "4px" }}>
              {label}
            </p>
            <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "20px", color: "var(--nuit-bone)" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <VouchersTable vouchers={vouchersSerializados} />
    </div>
  )
}
