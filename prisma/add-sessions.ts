import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Buscar clientes para criar sessões futuras
  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true, estado: true },
    orderBy: { nome: "asc" },
  });

  clientes.forEach((c) => console.log(c.id, "|", c.estado.padEnd(16), "|", c.nome));

  const hoje = new Date("2026-05-21");
  const d = (offset: number) => {
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() + offset);
    return dt;
  };

  // Mapear clientes por nome
  const por = (nome: string) => clientes.find((c) => c.nome.startsWith(nome))!;

  const novasSessoes = [
    // Amanhã (d+1)
    {
      clienteId: por("Beatriz C").id,
      data: d(1), hora: "10:00", duracao: 60,
      servico: "Essência Plena", preco: 40, terapeuta: "bea",
      estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null,
    },
    {
      clienteId: por("Daniela").id,
      data: d(1), hora: "11:30", duracao: 60,
      servico: "Puro Aroma", preco: 45, terapeuta: "cris",
      estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null,
    },
    // Depois de amanhã (d+2)
    {
      clienteId: por("Catarina").id,
      data: d(2), hora: "09:30", duracao: 60,
      servico: "Puro Aroma", preco: 45, terapeuta: "bea",
      estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null,
    },
    {
      clienteId: por("Teresa").id,
      data: d(2), hora: "14:00", duracao: 60,
      servico: "Cera Quente", preco: 50, terapeuta: "bea",
      estado: "confirmada", aromaSessao: null, resumoSessao: null, notasPosSessao: null,
    },
    // d+3
    {
      clienteId: por("Inês").id,
      data: d(3), hora: "10:00", duracao: 60,
      servico: "Massagem Dubai Essence", preco: 55, terapeuta: "bea",
      estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null,
    },
    // d+4
    {
      clienteId: por("Sofia").id,
      data: d(4), hora: "11:00", duracao: 60,
      servico: "Puro Aroma", preco: 45, terapeuta: "cris",
      estado: "agendada", aromaSessao: null, resumoSessao: null, notasPosSessao: null,
    },
  ];

  await prisma.sessao.createMany({ data: novasSessoes as NonNullable<Parameters<typeof prisma.sessao.createMany>[0]>["data"] });
  console.log(`\n✅ ${novasSessoes.length} sessões futuras criadas`);

  // Atualizar totalSessoes dos clientes que foram afetados
  for (const s of novasSessoes) {
    const count = await prisma.sessao.count({ where: { clienteId: s.clienteId } });
    await prisma.cliente.update({
      where: { id: s.clienteId },
      data: { totalSessoes: count },
    });
  }
  console.log("✅ totalSessoes atualizado");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
