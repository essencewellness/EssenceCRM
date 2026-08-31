# 📁 Fichas de Clientes HubSpot → Google Drive (Semanal)

**Estado no N8N:** ✅ ativo. Legado — CLAUDE.md nota "crashes ocasionais,
baixa prioridade".

**Trigger:** Agendado semanal (2ª feira 8h).

## O que faz

1. Vai buscar todos os contactos do HubSpot.
2. Para cada contacto novo (não processado ainda, controlado via Google
   Sheets), busca perfil completo + mensagens WhatsApp + histórico de
   interações + deals.
3. Gera um resumo inteligente via Groq (LangChain chain).
4. Constrói uma ficha `.md` por cliente e grava no Google Drive.
5. Regista o cliente como processado na Google Sheet, para não repetir.

## Notas importantes

- Legado do sistema anterior baseado em HubSpot — o CRM próprio já cobre
  isto de outra forma. Mantido por ainda ter valor como backup navegável
  (Obsidian) do histórico HubSpot, mas não é crítico para a operação diária.
- O gerador de markdown completo (tabelas de info/deals/histórico/WhatsApp)
  foi abreviado neste backup — a lógica de negócio e a topologia do workflow
  estão completas, só o template de formatação do `.md` está resumido.
