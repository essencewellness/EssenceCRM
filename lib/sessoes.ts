// Efeitos colaterais de marcar uma sessão como "realizada" — partilhados entre
// o PATCH interno (/api/v1/sessoes/[id]) e o PATCH público (/api/v1/public/pos-sessao),
// para as duas vias nunca divergirem: disparar o webhook sessao.realizada,
// fechar o voucher associado (agendado -> usado) e agendar a mensagem de
// avaliação de satisfação.
//
// O recálculo de métricas (recalcularMetricasCliente) NÃO vive aqui — cada
// chamador faz o update da sessão + o recálculo dentro do mesmo
// prisma.$transaction (evita a janela de corrida entre as duas escritas).
// Esta função só corre DEPOIS da transação committar; os seus efeitos
// (webhook, criação de MensagemIA) mantêm-se fire-and-forget.
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { paraNumero } from "@/lib/serialize"
import { auditar } from "@/lib/audit"
import type { Prisma } from "@/lib/prisma-client"

interface SessaoAntes {
  id: string
  clienteId: string
  servico: string | null
  terapeuta: string | null
  // Quem realmente vai fazer a sessão (FK), não o rótulo de texto acima.
  // Usados só para reatribuir o voucher associado — ver mais abaixo. Cada
  // chamador tem de passar o valor JÁ ATUALIZADO por esta escrita (o
  // resultado do update, não uma leitura anterior a ele), porque um PATCH
  // pode mudar a terapeuta na mesma chamada em que marca "realizada".
  terapeutaId: string | null
  terapeuta2Id: string | null
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

  // Se esta sessão foi paga com um voucher (ligado no momento da marcação,
  // ver WF01), fechar o ciclo: agendado -> usado. Sem isto o voucher ficava
  // "agendado" para sempre, mesmo depois da massagem acontecer de verdade.
  //
  // Este bloco inteiro só corre quando existe mesmo um voucher ligado a
  // esta sessão (o `if` logo abaixo) — a reatribuição de receita entre
  // terapeutas que acontece aqui dentro NUNCA se aplica a uma sessão sem
  // voucher.
  //
  // Awaited de propósito (ao contrário do webhook acima): é uma escrita na
  // nossa própria BD, e em serverless uma promessa não esperada pode ser
  // cortada quando a resposta é devolvida — deixando o voucher preso em
  // "agendado" sem erro nenhum visível.
  const voucherDestaSessao = await prisma.giftCard.findFirst({
    where: { sessaoId: sessaoAntes.id, estado: "agendado" },
    select: { id: true, codigo: true, terapeutaId: true, terapeuta2Id: true },
  })

  if (voucherDestaSessao) {
    const mudouTerapeuta =
      voucherDestaSessao.terapeutaId !== sessaoAntes.terapeutaId ||
      voucherDestaSessao.terapeuta2Id !== sessaoAntes.terapeuta2Id
    await prisma.$transaction([
      prisma.giftCard.update({
        where: { id: voucherDestaSessao.id },
        data: {
          estado: "usado",
          dataUso: new Date(),
          // Reatribuição automática: o voucher nasce sempre da Bea
          // (terapeutaId null), mas quem realmente fica com a receita é
          // quem faz a sessão. Copia-se o que já foi respondido em "quem
          // vai realizar a sessão?" (atribuir-sessao.html / pos-sessao.html)
          // — se for a Cristina, o valor passa inteiro para ela; numa
          // massagem a dois entra nas contas das duas ao mesmo tempo,
          // exatamente como já acontece com uma sessão paga na hora.
          terapeutaId: sessaoAntes.terapeutaId,
          terapeuta2Id: sessaoAntes.terapeuta2Id,
        },
      }),
      // A receita desta sessão entrou quando o voucher foi comprado, não
      // agora — por isso "isento" e não "pago" (contá-la aqui duplicava-a).
      // O que isto resolve é a sessão ficar eternamente na lista de
      // "pagamentos pendentes" do /financeiro, como se houvesse dinheiro
      // por cobrar.
      //
      // Só toca em sessões ainda "pendente": se a terapeuta registou um
      // pagamento à mão (ex.: cliente pagou um upgrade por cima do voucher),
      // essa decisão manda sobre esta.
      prisma.sessao.updateMany({
        where: { id: sessaoAntes.id, estadoPagamento: "pendente" },
        data: { estadoPagamento: "isento", metodoPagamento: "voucher" },
      }),
    ])

    // Registo de auditoria só quando a receita realmente muda de mãos — não
    // em todo fecho de voucher, senão fica ruído. entidadeId é o CÓDIGO do
    // voucher (o número que a Bea reconhece, ex. "EWD2026-30"), nunca o id
    // interno da base de dados — é o que se procura para investigar depois.
    if (mudouTerapeuta) {
      auditar({
        quem: "sistema",
        acao: "voucher.receita_reatribuida",
        entidade: "GiftCard",
        entidadeId: voucherDestaSessao.codigo,
        detalhe: {
          sessaoId: sessaoAntes.id,
          de: voucherDestaSessao.terapeutaId,
          de2: voucherDestaSessao.terapeuta2Id,
          para: sessaoAntes.terapeutaId,
          para2: sessaoAntes.terapeuta2Id,
        },
      })
    }
  }

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
