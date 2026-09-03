// Assinalar na ficha clínica quando a sessão que a gerou é cancelada — ou
// tem falta (não-comparência), mesma implicação clínica — antes de
// acontecer de verdade.
//
// Contexto: `Cliente.fichaClinica` é reescrita de fio a pavio pelo N8N
// (workflow 02 | Onboarding — Ficha Recebida) sempre que a cliente preenche
// o formulário de onboarding — normalmente ANTES da sessão acontecer. Se
// essa sessão não chegar a acontecer, a ficha fica com dados "desta sessão"
// que na verdade nunca se confirmaram, e a PRÓXIMA sessão real vai buscar
// contexto a essa ficha sem saber disso — risco real de engano para a
// terapeuta.
//
// Solução (2026-09-02, decisão do Nuno): em vez de apagar o que a cliente
// reportou (esses dados continuam reais e podem ainda ser úteis — ex: uma
// alergia não deixa de existir só porque a sessão foi cancelada), a ficha
// mantém-se tal como estava, mas ganha um aviso claro no topo a dizer que a
// sessão associada foi cancelada. Sem IA nenhuma envolvida — não consome
// quota partilhada do Groq a cada cancelamento, e não há risco de a IA
// reescrever/apagar algo por engano.
import { prisma } from "@/lib/prisma"
import { auditar } from "@/lib/audit"

function formatarDataPT(data: Date): string {
  return data.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function assinalarSessaoCanceladaNaFichaClinica(
  sessaoId: string,
  clienteId: string,
  // "falta" (não-comparência) tem a mesma implicação clínica que
  // "cancelada" — a sessão também não aconteceu, os dados reportados no
  // onboarding continuam por confirmar. Só muda a palavra no aviso.
  motivo: "cancelada" | "falta" = "cancelada"
): Promise<void> {
  // A atualização mais recente da ficha clínica deste cliente — se não
  // existir nenhuma, ou se não tiver sido esta sessão a gerá-la, não há
  // nada a fazer: ou a cliente nunca preencheu onboarding para esta sessão,
  // ou uma sessão mais recente (legítima) já escreveu por cima entretanto,
  // e mexer agora tocava em texto que já não tem a ver com esta sessão.
  const [ultimaAtualizacao, cliente, sessao] = await Promise.all([
    prisma.auditLog.findFirst({
      where: { entidade: "Cliente", entidadeId: clienteId, acao: "cliente.ficha_clinica_atualizada" },
      orderBy: { criadoEm: "desc" },
      select: { detalhe: true },
    }),
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { fichaClinica: true } }),
    prisma.sessao.findUnique({ where: { id: sessaoId }, select: { data: true } }),
  ])
  if (!ultimaAtualizacao || !cliente?.fichaClinica) return

  const detalhe = ultimaAtualizacao.detalhe as { sessaoId?: string | null; fichaClinicaAnterior?: string | null } | null
  if (!detalhe || detalhe.sessaoId !== sessaoId) return

  // Idempotente: se já tem o aviso (ex: PATCH de cancelamento reprocessado
  // pelo N8N), não duplica.
  if (cliente.fichaClinica.startsWith("⚠️")) return

  const dataFmt = sessao ? formatarDataPT(sessao.data) : "referência"
  const motivoTxt = motivo === "falta" ? "teve falta (não compareceu)" : "foi cancelada"
  // Cliente já tinha ficha antes desta escrita (não é a 1ª sessão) — o
  // Groq reescreve o texto todo combinando "FICHA ANTERIOR" + o que foi
  // reportado agora, por isso já não dá para separar visualmente o que é
  // histórico confirmado (sessões reais anteriores) do que só veio desta
  // sessão cancelada/falta. O aviso tem de refletir isso — dizer que "tudo"
  // está por confirmar seria enganador quando a maior parte já é histórico
  // real.
  const aviso = detalhe.fichaClinicaAnterior
    ? `⚠️ A sessão de ${dataFmt} ${motivoTxt}. Esta ficha foi reescrita nessa altura e pode incluir informação nova reportada então (ex: uma lesão) que ainda não foi confirmada numa sessão real — o histórico de sessões anteriores a essa data mantém-se válido.`
    : `⚠️ A sessão de ${dataFmt} associada a esta informação ${motivoTxt} — os dados abaixo continuam reais, mas não houve sessão para os confirmar.`

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { fichaClinica: `${aviso}\n\n${cliente.fichaClinica}` },
  })

  auditar({
    quem: "sistema",
    acao: "cliente.ficha_clinica_assinalada_cancelada",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { sessaoCanceladaId: sessaoId },
  })
}
