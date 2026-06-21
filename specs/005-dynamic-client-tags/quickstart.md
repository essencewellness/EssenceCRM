# Quickstart — Validação da Spec 005 (Tags Dinâmicas)

## Pré-requisitos

```powershell
cd "c:\Projetos\Essence Wellness\04_CRM\CRM Essence - Código Fonte"
npm run dev  # → http://localhost:3000
```

Base de dados com dados de teste (`npm run db:seed` ou `seed-demo`).

---

## Cenário 1: Ver tags no perfil de cliente

1. Ir a `/clientes`
2. Clicar numa cliente
3. **Esperado:** secção "Etiquetas" visível no perfil com grupos Saúde / Campanha / Preferência / Automáticas
4. **Esperado:** badge de actividade presente (ex.: "Inativa 45 dias") mesmo que sem etiquetas atribuídas

---

## Cenário 2: Adicionar etiqueta existente no perfil

1. No perfil de cliente, clicar "Adicionar etiqueta"
2. Pesquisar "Grávida" no dropdown
3. Seleccionar
4. **Esperado:** chip "Grávida" aparece imediatamente no grupo Saúde (sem reload de página)
5. **Esperado:** ao recarregar, o chip persiste

---

## Cenário 3: Criar nova etiqueta on-the-fly

1. No dropdown de adição de etiqueta, escrever "Massagem de Gravidez"
2. Clicar "+ Criar nova etiqueta"
3. Escolher tipo "Campanha", cor dourada
4. Confirmar criação
5. **Esperado:** etiqueta criada e imediatamente atribuída ao cliente
6. Ir a `/etiquetas`
7. **Esperado:** "Massagem de Gravidez" aparece na lista de tags, tipo Campanha, 1 cliente

---

## Cenário 4: Editar estado CRM inline

1. No perfil de cliente, clicar no chip de estado (ex.: "Ativa Recente")
2. Selector com os 9 estados abre
3. Seleccionar "VIP ✦"
4. **Esperado:** chip muda para "VIP ✦" com cor dourada imediatamente
5. **Esperado:** ao recarregar o perfil, o estado é "vip_embaixadora"

---

## Cenário 5: Filtrar lista de clientes por tag

1. Ir a `/clientes`
2. No filtro de tags, seleccionar "Grávida"
3. **Esperado:** apenas clientes com a tag "Grávida" aparecem
4. Adicionar filtro de estado "Em Risco"
5. **Esperado:** interseção — só clientes Grávida E em risco
6. Ver contador "X clientes encontrados"

---

## Cenário 6: Criar campanha WhatsApp a partir de filtro

1. Filtrar lista de clientes: tag "Massagem de Casal", estado "ativa_recente"
2. Clicar "Criar campanha"
3. Seleccionar template "Campanha especial"
4. Confirmar
5. **Esperado:** toast "Campanha criada — 8 mensagens pendentes de aprovação"
6. Ir a `/mensagens`
7. **Esperado:** 8 mensagens no estado "Pendente" com `tipo: campanha`, associadas à campanha criada
8. Aprovar uma mensagem
9. **Esperado:** mensagem passa para "Aprovada" → fila de envio

---

## Cenário 7: Confirmar bloqueio de clientes com tag de saúde

1. Atribuir tag "Grávida" (bloqueiaAutomacoes: true) a uma cliente
2. Criar campanha que inclui essa cliente no filtro
3. **Esperado:** toast informa "1 cliente excluída (restrição de saúde)"
4. Confirmar que a cliente excluída não tem `MensagemIA` criada

---

## Cenário 8: Gerir catálogo de tags

1. Ir a `/etiquetas`
2. Ver lista agrupada por tipo com contagem de clientes
3. Editar cor de "Puro Aroma" para azul
4. **Esperado:** cor actualiza na lista e no perfil da cliente que tem essa tag
5. Apagar "Pack 3 Sessões" (com 0 clientes)
6. **Esperado:** confirmação não pedida (0 clientes) — tag eliminada
7. Tentar apagar "Grávida" (com 1 cliente)
8. **Esperado:** modal de confirmação "Esta tag será removida de 1 cliente" → confirmar → apagada

---

## Cenário 9: Auto-tag de voucher

1. Em `/financeiro`, criar um voucher com "Beneficiário Telefone" = telefone de uma cliente existente
2. Ir ao perfil dessa cliente
3. **Esperado:** badge "Voucher ativo" no grupo Automáticas
4. Voltar ao financeiro, marcar o voucher como "Usado"
5. Ir ao perfil
6. **Esperado:** "Voucher ativo" removido, "Voucher usado" presente

---

## Verificação TypeScript

```powershell
npx tsc --noEmit --skipLibCheck
# Esperado: 0 erros
```
