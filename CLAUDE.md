# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```powershell
npm run dev                          # servidor local → http://localhost:3000
npm run build                        # prisma generate + next build
npm run lint                         # eslint
npx tsc --noEmit --skipLibCheck      # verificar tipos sem compilar

npm run db:generate                  # regenerar cliente Prisma após schema changes
npm run db:push                      # sincronizar schema com a BD (dev) — projeto usa db push, não migrations
npm run db:reset                     # apagar tudo + recriar schema + seed (dev)
npm run db:seed                      # 9 clientes detalhados
npm run db:studio                    # UI visual da BD → porta 5555

npx tsx prisma/seed-bulk.ts          # +50 clientes de teste
npx tsx prisma/reset-msgs.ts         # repor mensagens para estado de teste
npx tsx prisma/check-msgs.ts         # inspecionar estado das mensagens
npx tsx prisma/check-users.ts        # verificar utilizadores na BD
```

**BD em dev:** SQLite local via `.env` (`DATABASE_URL` aponta para ficheiro local).  
**BD em prod:** Neon PostgreSQL (Frankfurt). Nunca correr `prisma migrate` apontado para produção — usar `prisma db push` com a URL do pooler.

## Arquitetura

### Duas superfícies com auth separado

O `app/(dashboard)/` é para a Bea (terapeuta) — protegido por NextAuth v5 (JWT + bcryptjs). O `app/api/v1/` é para N8N e integrações — protegido por `X-API-Key` (header) validado em tempo constante (`timingSafeEqual`) em `lib/api-auth.ts`. Sem `middleware.ts` global: o dashboard é protegido pelo `auth()` no `layout.tsx`; a API usa `validarApiKey()` em cada handler.

Os endpoints `app/api/v1/public/` (lead e onboarding) não têm auth — são chamados por clientes externos e formulários públicos.

### Motor de estados (9 estados CRM)

`lib/crm-estados.ts` define `calcularEstado()` (função pura, testável) e `executarMotorEstados()` (percorre todos os clientes e aplica transições). Corre via cron Vercel todos os dias às 07h (`vercel.json`). O estado `blacklist` é intocável pelo motor. O recálculo **não acontece inline** quando uma sessão é criada — só no cron diário.

Ordem de prioridade no `calcularEstado`: perdida → reativacao → VIP → ativa_frequente → novo → ativa_recente.

### Fila de envio WhatsApp

`lib/fila-envio.ts` gere o espaçamento anti-ban: ao aprovar mensagens em bulk, cada uma recebe um `enviarApos` espaçado 30–90s da anterior. O N8N consulta `GET /api/v1/mensagens/fila` e só recebe mensagens com `enviarApos <= agora` (estado `em_fila`). Há **dois caminhos concorrentes** para o envio: push via webhook `mensagem.aprovada` (frágil, fire-and-forget) e pull via fila (resiliente). Preferir o modelo pull.

### Webhooks de saída (CRM → N8N)

`lib/webhooks.ts` — fire-and-forget, retry 3x, timeout 5s. Cada pedido vai assinado com HMAC-SHA256 no header `X-Assinatura`. O URL de cada evento vem de variáveis de ambiente `WEBHOOK_N8N_<EVENTO>` — se a variável não estiver definida, o webhook é silenciosamente ignorado (não é erro). Falhas após 3 tentativas vão para `console.error` apenas — não há dead-letter.

### Validação e respostas API

Todos os endpoints REST usam Zod (schemas em `lib/validations.ts`) via `validarBody()`. Response format: `{ data, meta: { timestamp } }` para sucesso; `{ error, code }` para erro. **Não incluir `status` no body** — é redundante com o HTTP status code.

Queries Prisma usam cursor-based pagination (não offset). SQLite em dev **não suporta `mode: "insensitive"`** — os schemas PostgreSQL funcionam em prod mas falham em dev se usadas.

### Formulários HTML públicos

Não existe um único `onboarding.html` — cada serviço tem o seu próprio ficheiro em `public/forms/` (`massagem.html`, `massagem-a-dois.html`, `drenagem.html`, `voucher.html`), todos a partilhar a lógica de submissão em `public/forms/essence-forms.js`, que faz `POST /api/v1/public/onboarding`. Suportam `?clienteId=`, `?sessaoId=`, `?n=` (nome pré-preenchido), `?sv=gc` (ativa campo de voucher). XSS via `?n=` corrigido: usa `textContent + createElement` em vez de `innerHTML`.

`public/forms/pos-sessao.html` — uso interno da Bea. Sem API key no browser: usa `validarApiKeyOuSessao()` nos endpoints que consulta (`servicos` GET, `clientes/[id]` GET, `sessoes` POST) — o cookie de sessão NextAuth do dashboard é enviado automaticamente por ser same-origin.

### Catálogo de Serviços

Modelos `Servico`, `PrecoPersonalizado` e `Pack` adicionados ao schema. Endpoints em `app/api/v1/servicos/`, `/clientes/[id]/precos/` e `/clientes/[id]/packs/`. Dashboard em `app/(dashboard)/servicos/page.tsx`. Tab "Packs & Preços" no perfil do cliente. Calendly webhook tem idempotência via `calendlyEventId @unique`. Blacklist guard em Calendly, WhatsApp e onboarding (retorna 200 silenciosamente).

## Regras de código

- Comentários em português, código (variáveis/funções) em inglês camelCase
- Respostas API: `{ data, meta }` para sucesso; `{ error, code }` para erros — sem campo `status` no body
- Upsert sempre (nunca duplicar) clientes por telefone ou email
- `totalSessoes` e `totalGasto` são campos calculados — não expor como editáveis via PATCH cliente
- Transições de estado de mensagem só pela máquina de estados: `pendente → aprovada → em_fila → enviada | falhada`

## Segurança e RGPD (spec-009, implementado 2026-07-21)

- **Link tokens** (`lib/link-token.ts`): links públicos de sessão levam `?t=<exp>.<hmac>`
  (7 dias). Fornecidos ao N8N em `linkToken` (resposta do webhook Calendly + GET sessões).
  Modo transição: `LINK_TOKEN_OBRIGATORIO !== "true"` → pedidos sem token passam mas ficam
  auditados (`link_token.ausente_transicao`). Ativar o enforcement DEPOIS de os workflows
  N8N anexarem `&t={{linkToken}}` aos links.
- **Chave admin** (`API_KEY_ADMIN`): obrigatória para `DELETE /clientes/[id]/rgpd` e
  `POST /clientes/bulk-eliminar` via API. A `API_KEY_N8N` já não autoriza operações
  destrutivas. Sessão de dashboard continua a autorizar.
- **RGPD**: anonimização limpa TUDO (fichaClinica, ficha*, briefingJson, feedbacks,
  tarefas, gift cards, portal token); exportação inclui feedbacks/tarefas/giftcards/audit.
- **Opt-out automático**: resposta WhatsApp com pedido de paragem → `aceitaMarketing=false`.
- **CSP**: `proxy.ts` (nonce, dashboard + /login) e `next.config.ts` (estática, /forms).
- **Consentimento**: texto explícito no envio (essence-forms.js), versão registada no
  audit log (`CONSENT_VERSAO` em public/onboarding). Decisão do Nuno: sem checkboxes.
- **Cron retenção** (`/api/cron/retencao`, mensal): purga AuditLog >12 meses + portal
  tokens expirados. NÃO toca em dados de clientes.
- **Anti-enumeração**: `/public/lead` e `/public/onboarding` devolvem `{ ok: true }`
  uniforme — os IDs reais seguem nos webhooks para o N8N.
- Registo de tratamento (Art. 30): `02_DOCUMENTACAO/rgpd/REGISTO-TRATAMENTO.md`.

Variáveis de ambiente novas: `API_KEY_ADMIN` (obrigatória p/ destrutivos via API),
`LINK_TOKEN_SECRET` (opcional, cai para `WEBHOOK_SECRET`), `LINK_TOKEN_OBRIGATORIO`
("true" para exigir tokens nos links públicos).

## Problemas conhecidos ativos (por resolver)

| Prioridade | Problema | Localização |
|---|---|---|
| ~~🔴 CRÍTICO~~ | ~~`AUTH_URL` no Vercel por confirmar~~ | ✅ Resolvido — `https://crm.essencewellnesspt.com` |
| ~~🟠 ALTO~~ | ~~`X-Webhook-Secret` envia segredo em plaintext~~ | ✅ Resolvido spec-007 |
| ~~🟠 ALTO~~ | ~~Password da Neon exposta anteriormente~~ | ✅ Resolvido 2026-08-05 — password rotada na Neon, `DATABASE_URL` atualizada no Vercel |
| ~~🟠 ALTO~~ | ~~Estado CRM só recalcula no cron — desfasado até 24h após sessão~~ | ✅ Resolvido 2026-08-05 — `recalcularEstadoCliente()` chamado inline quando uma sessão passa a "realizada" (`lib/crm-estados.ts`); cron das 7h mantido como rede de segurança |
| ~~🟡 MÉDIO~~ | ~~Workflows N8N sem backup exportado no repositório~~ | ✅ Resolvido 2026-08-05 — os 12 workflows reais exportados para `03_WORKFLOWS_N8N/01-...12-.../` (API keys substituídas por placeholders, ver README do diretório). Enforcement de link tokens continua desligado por decisão separada, não por falta de visibilidade. |
| ~~🟡 MÉDIO~~ | ~~`confirmacao-envio` não bloqueia double-delivery~~ | ✅ Resolvido 2026-08-01 — `updateMany` com `estado: "em_fila"` no WHERE torna a transição atómica (antes: read-then-write com janela de corrida entre pedidos concorrentes do N8N) |
| ~~🟡 MÉDIO~~ | ~~Sem paginação na lista de clientes do dashboard~~ | ✅ Nota desatualizada — já implementada (cursor-based, 50/página + scroll infinito via `ClientesInfiniteList.tsx`), confirmado 2026-08-05 |
| ~~🟡 MÉDIO~~ | ~~`criadoPor: admin?.id ?? "sistema"` em `crm-estados.ts` — "sistema" não é um User.id válido (FK obrigatória), falhava silenciosamente sem admin ativo~~ | ✅ Resolvido 2026-08-05 — sem terapeuta/admin disponível, a tarefa de reativação não é criada (em vez de tentar gravar um valor inválido) e fica um aviso explícito nos logs |

## Resolvido nesta fase (spec-002)

| ✅ | Problema resolvido | Como |
|---|---|---|
| ✅ | API key hardcoded em `pos-sessao.html` | Removida a chave por completo — endpoints de apoio usam `validarApiKeyOuSessao()` + cookie de sessão same-origin |
| ✅ | XSS via `?n=` em `onboarding.html` | `textContent + createElement` |
| ✅ | Calendly webhook sem idempotência | `calendlyEventId @unique` no schema |
| ✅ | Sem blacklist guard nos webhooks | Guard em Calendly, WhatsApp, onboarding |
