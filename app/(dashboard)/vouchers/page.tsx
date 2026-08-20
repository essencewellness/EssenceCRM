import { prisma } from "@/lib/prisma"
import { VouchersClient } from "./VouchersClient"

export const revalidate = 0

export default async function VouchersPage() {
  const [vouchers, servicos, terapeutas] = await Promise.all([
    prisma.giftCard.findMany({ orderBy: { dataCompra: "desc" } }),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { nome: true, precoBase: true },
    }),
    prisma.user.findMany({
      where: { ativo: true, role: "terapeuta" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
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
    nomesNoVoucher: v.nomesNoVoucher,
    mensagemVoucher: v.mensagemVoucher,
    terapeutaId: v.terapeutaId,
  }))

  return (
    <VouchersClient
      vouchers={vouchersSerializados}
      servicos={servicos.map(s => ({ nome: s.nome, precoBase: Number(s.precoBase) }))}
      terapeutas={terapeutas.map(t => ({ id: t.id, nome: t.name || t.email }))}
    />
  )
}
