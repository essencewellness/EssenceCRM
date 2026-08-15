import { prisma } from "@/lib/prisma"
import { VouchersClient } from "./VouchersClient"

export const revalidate = 0

export default async function VouchersPage() {
  const [vouchers, servicos] = await Promise.all([
    prisma.giftCard.findMany({ orderBy: { dataCompra: "desc" } }),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { nome: true, precoBase: true },
    }),
  ])

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

  return (
    <VouchersClient
      vouchers={vouchersSerializados}
      servicos={servicos.map(s => ({ nome: s.nome, precoBase: Number(s.precoBase) }))}
    />
  )
}
