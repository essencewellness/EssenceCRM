// Efeitos colaterais de marcar uma sessão como "realizada" — partilhados entre
// o PATCH interno (/api/v1/sessoes/[id]) e o PATCH público (/api/v1/public/pos-sessao),
// para as duas vias nunca divergirem: disparar o webhook sessao.realizada e
// agendar a mensagem de avaliação de satisfação.
//
// O recálculo de métricas (recalcularMetricasCliente) NÃO vive aqui — cada
// chamador faz o update da sessão + o recálculo dentro do mesmo
// prisma.$transaction (evita a janela de corrida entre as duas escritas).
// Esta função só corre DEPOIS da transação committar; os seus efeitos
// (webhook, criação de MensagemIA) mantêm-se fire-and-forget.
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { paraNumero } from "@/lib/serialize"
import type { Prisma } from "@/lib/prisma-client"

interface SessaoAntes {
  id: string
  clienteId: string
  servico: string | null
  terapeuta: string | null
}

export async function dispararEfeitosSessaoRealizada(
  sessaoAntes: SessaoAntes,
  precoAtualizado: Prisma.Decimal | number | null
): Promise<void> {
  void webhooks.sessaoRealizada({
    sessaoId: sessaoAntes.id,
    clienteId: sessaoAntes.clienteId,
    preco: paraNumero(precoAtualizado),
    servico: sessaoAntes.servico,
    terapeuta: sessaoAntes.terapeuta ?? "bea",
  })

  const templateAvaliacao = await prisma.templateMensagem.findUnique({
    where: { nome: "avaliacao_pos_sessao" },
    select: { id: true, texto: true },
  })
  const clienteParaAvaliacao = await prisma.cliente.findUnique({
    where: { id: sessaoAntes.clienteId },
    select: { nome: true, estado: true },
  })

  if (
    templateAvaliacao &&
    clienteParaAvaliacao &&
    clienteParaAvaliacao.estado !== "blacklist"
  ) {
    const textoAvaliacao = templateAvaliacao.texto.replace(
      /\{\{nome\}\}/g,
      clienteParaAvaliacao.nome ?? ""
    )
    // Agendada para 4 horas após a sessão
    const enviarApos = new Date(Date.now() + 4 * 60 * 60 * 1000)
    void prisma.mensagemIA.create({
      data: {
        clienteId: sessaoAntes.clienteId,
        canal: "whatsapp",
        tipo: "avaliacao",
        estado: "em_fila",
        mensagemGerada: textoAvaliacao,
        mensagemFinal: textoAvaliacao,
        aprovadaEm: new Date(),
        enviarApos,
      },
    })
  }
}
