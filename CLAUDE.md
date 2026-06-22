# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```powershell
npm run dev                          # servidor local → http://localhost:3000
npm run build                        # prisma generate + next build
npm run lint                         # eslint
npx tsc --noEmit --skipLibCheck      # verificar tipos sem compilar

npm run db:generate                  # regenerar cliente Prisma após schema changes
npm run db:migrate                   # criar migration e aplicar (dev)
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

`public/forms/onboarding.html` — enviado às clientes via link personalizado WhatsApp. Suporta `?clienteId=`, `?sessaoId=`, `?n=` (nome pré-preenchido), `?sv=gc` (ativa campo de voucher). XSS via `?n=` corrigido: usa `textContent + createElement` em vez de `innerHTML`.

`public/forms/pos-sessao.html` — uso interno da Bea. API key hardcoded removida: usa `window.CRM_API_KEY ?? ''` (definida pelo servidor ao servir o ficheiro).

### Catálogo de Serviços

Modelos `Servico`, `PrecoPersonalizado` e `Pack` adicionados ao schema. Endpoints em `app/api/v1/servicos/`, `/clientes/[id]/precos/` e `/clientes/[id]/packs/`. Dashboard em `app/(dashboard)/servicos/page.tsx`. Tab "Packs & Preços" no perfil do cliente. Calendly webhook tem idempotência via `calendlyEventId @unique`. Blacklist guard em Calendly, WhatsApp e onboarding (retorna 200 silenciosamente).

## Regras de código

- Comentários em português, código (variáveis/funções) em inglês camelCase
- Respostas API: `{ data, meta }` para sucesso; `{ error, code }` para erros — sem campo `status` no body
- Upsert sempre (nunca duplicar) clientes por telefone ou email
- `totalSessoes` e `totalGasto` são campos calculados — não expor como editáveis via PATCH cliente
- Transições de estado de mensagem só pela máquina de estados: `pendente → aprovada → em_fila → enviada | falhada`

## Problemas conhecidos ativos (por resolver)

| Prioridade | Problema | Localização |
|---|---|---|
| 🔴 CRÍTICO | `AUTH_URL` no Vercel por confirmar | Vercel dashboard |
| ~~🟠 ALTO~~ | ~~`X-Webhook-Secret` envia segredo em plaintext~~ | ✅ Resolvido spec-007 |
| 🟠 ALTO | Rate limit em memória ineficaz em serverless | `lib/rate-limit.ts` — adicionar UPSTASH_REDIS_REST_URL/TOKEN no Vercel |
| 🟠 ALTO | Estado CRM só recalcula no cron — desfasado até 24h após sessão | `lib/crm-estados.ts` |
| 🟡 MÉDIO | `confirmacao-envio` não bloqueia double-delivery | `app/api/v1/webhooks/confirmacao-envio/route.ts` |
| 🟡 MÉDIO | Sem paginação na lista de clientes do dashboard | `app/(dashboard)/clientes/page.tsx` |
| 🟡 MÉDIO | `clientes_backup.txt` não está em `.gitignore` | raiz do repositório |

## Resolvido nesta fase (spec-002)

| ✅ | Problema resolvido | Como |
|---|---|---|
| ✅ | API key hardcoded em `pos-sessao.html` | Substituída por `window.CRM_API_KEY ?? ''` |
| ✅ | XSS via `?n=` em `onboarding.html` | `textContent + createElement` |
| ✅ | Calendly webhook sem idempotência | `calendlyEventId @unique` no schema |
| ✅ | Sem blacklist guard nos webhooks | Guard em Calendly, WhatsApp, onboarding |
