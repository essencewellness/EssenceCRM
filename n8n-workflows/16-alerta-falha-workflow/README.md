# 16 | Alerta de Falha de Workflow (central)

**Estado no N8N:** ✅ ativo.

**Trigger:** `n8n-nodes-base.errorTrigger` — o N8N dispara este workflow
**automaticamente** sempre que outro workflow (configurado com
`settings.errorWorkflow` apontado para este) falhar. Nunca é chamado
directamente.

## O que faz

1. Recebe os dados do erro (nome do workflow, nó onde falhou, mensagem,
   link para a execução).
2. Manda um WhatsApp para `351911150025` (número pessoal do Nuno).
3. Se falhar (Evolution API em baixo — situação actual), cai no fallback
   por email para `nuno.almeida.221991@gmail.com` (email pessoal, não
   `geral@` — pedido explícito, 2026-08-31).

## Workflows ligados a este (settings.errorWorkflow = id deste workflow)

01, 02, 03, 04, 05, 05b, 06, 07, 08, 09, 10 (motor-envio), 11, 15, mais os
4 "Financeiro Bea — *", "Atualizar Nr Telefone/Whatsapp", "Drenagem — Lead
Capture" e "Fichas HubSpot → Drive" — todos os workflows realmente ligados
ao negócio da Essence Wellness (20 no total). Não ligado a workflows não
relacionados (Minecraft, testes antigos, obsoletos).

## Testado

Testado ao vivo em 2026-08-31 com um workflow descartável construído só
para provocar um erro de propósito — confirmado que o disparo é automático
(nunca chamado directamente), captura o nome/erro certos, e cai no fallback
de email correctamente.
