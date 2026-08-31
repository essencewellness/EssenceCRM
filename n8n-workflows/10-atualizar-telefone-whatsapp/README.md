# Atualizar Nr Telefone/WhatsApp Após Marcação

**Estado no N8N:** ✅ ativo. Legado — liga diretamente ao HubSpot, fora do
fluxo do CRM próprio.

**Trigger:** Calendly (`invitee.created`).

## O que faz

Cria/atualiza o contacto no HubSpot com o nome e telefone reportados no
formulário Calendly, preenchendo `firstName`, `phoneNumber`,
`mobilePhoneNumber` e `whatsappPhoneNumber`.

## Notas importantes

- Workflow simples e independente do CRM Next.js — mantido por ainda haver
  processos ligados ao HubSpot (ex: workflow 12, fichas semanais). Não
  interage com a API v1 do CRM.
- **Bug corrigido em 2026-08-22**: o nó HubSpot nunca preenchia `firstName`,
  só email e telefone — contactos novos vindos do Calendly ficavam sem nome
  no HubSpot, e a interface mostrava o email como nome (ex:
  `anacarmo2025@gmail.com`). Corrigido diretamente em produção via API do
  N8N. Contactos criados *antes* desta correção continuam sem nome — ainda
  por corrigir em lote separadamente.
