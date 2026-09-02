// Reverter a ficha clínica quando a sessão que a gerou é cancelada antes
// de acontecer.
//
// Contexto: `Cliente.fichaClinica` é reescrita de fio a pavio pelo N8N
// (workflow 02 | Onboarding — Ficha Recebida) sempre que a cliente preenche
// o formulário de onboarding — normalmente ANTES da sessão acontecer. Se
// essa sessão for cancelada depois, a ficha fica com dados "desta sessão"
// que na verdade nunca chegou a acontecer, e a PRÓXIMA sessão real vai
// buscar contexto a essa ficha contaminada — risco real de engano para a
// terapeuta.
//
// Solução escolhida (2026-09-02, decisão do Nuno): snapshot + revert
// determinístico, sem IA nenhuma envolvida. Cada escrita de fichaClinica
// via PATCH /api/v1/clientes/[id] grava a versão ANTERIOR num AuditLog,
// ligada ao id da sessão que despoletou o onboarding (origemSessaoId). Ao
// cancelar essa sessão, se ela ainda for a última coisa a ter mexido na
// ficha, volta-se à versão de antes — sem chamar o Groq outra vez (evita
// o risco de a IA apagar histórico legítimo mais antigo, e não consome
// quota partilhada do Groq a cada cancelamento).
import { prisma } from "@/lib/prisma"
import { auditar } from "@/lib/audit"

export async function reverterFichaClinicaSeSessaoCancelada(
  sessaoId: string,
  clienteId: string
): Promise<void> {
  // A atualização mais recente da ficha clínica deste cliente — se não
  // existir nenhuma, ou se não tiver sido esta sessão a gerá-la, não há
  // nada a fazer: ou a cliente nunca preencheu onboarding para esta sessão,
  // ou uma sessão mais recente (legítima) já escreveu por cima entretanto,
  // e reverter agora apagaria esse histórico válido.
  const ultimaAtualizacao = await prisma.auditLog.findFirst({
    where: { entidade: "Cliente", entidadeId: clienteId, acao: "cliente.ficha_clinica_atualizada" },
    orderBy: { criadoEm: "desc" },
    select: { detalhe: true },
  })
  if (!ultimaAtualizacao) return

  const detalhe = ultimaAtualizacao.detalhe as { fichaClinicaAnterior?: string | null; sessaoId?: string | null } | null
  if (!detalhe || detalhe.sessaoId !== sessaoId) return

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { fichaClinica: detalhe.fichaClinicaAnterior ?? null },
  })

  auditar({
    quem: "sistema",
    acao: "cliente.ficha_clinica_revertida",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { sessaoCanceladaId: sessaoId, fichaClinicaRestaurada: detalhe.fichaClinicaAnterior ?? null },
  })
}
