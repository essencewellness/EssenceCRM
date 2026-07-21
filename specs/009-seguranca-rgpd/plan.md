# Plan — Hardening de Segurança + Conformidade RGPD

Fechar as lacunas encontradas na auditoria de 2026-07-21: anonimização RGPD incompleta, consentimentos opt-out (ilegais na UE), CSP inexistente, endpoints públicos protegidos apenas por cuid, e ausência de política de retenção. Ordem: primeiro o que viola a lei, depois o que reduz risco técnico, por fim documentação de conformidade.

## Scope

- In:
  - `app/api/v1/clientes/[id]/rgpd/route.ts` (anonimização + exportação)
  - `prisma/schema.prisma` (defaults de consentimento) + migração
  - `public/forms/essence-forms.js` + `onboarding.html` (checkboxes de consentimento)
  - `middleware.ts` novo (CSP com nonce)
  - Endpoints `app/api/v1/public/*` (tokens assinados, oráculos)
  - `lib/rate-limit.ts` em produção (Upstash) + portal
  - Novo cron de retenção de dados
  - Documento de conformidade (Art. 30 + subcontratantes)
- Out:
  - 2FA/passkeys no login (fase futura)
  - Alterações aos workflows N8N (só documentar o que lá muda)
  - Dashboard financeiro (projeto separado)
  - Migração de infraestrutura (Evolution API, Hetzner)

## Action Items

[x] **1. Completar anonimização RGPD** — em `rgpd/route.ts` DELETE, limpar também: `fichaClinica` no Cliente; `fichaEstadoEmocional`, `fichaZonasTensao`, `fichaFoco`, `fichaCondicoesAlergias`, `fichaAromasPreferidos`, `briefingJson`, `avaliacaoComentario`, `pdfUrl`, `googleDocLink`, `calendlyRescheduleUrl`, `calendlyCancelUrl` nas Sessões; apagar `Feedback` e `PortalToken` do cliente; anular PII de `GiftCard` ligado (`beneficiarioNome/Telefone`, e `comprador*` se o comprador for o próprio). Limpar `titulo/descricao` de Tarefas ligadas ao cliente.

[x] **2. Completar exportação RGPD (Art. 15/20)** — no GET do mesmo ficheiro, incluir `feedbacks`, `tarefas`, `giftCards`, `portalToken` (metadados) e entradas de `AuditLog` onde `entidadeId = clienteId`.

[x] **3. Consentimento no envio do formulário — SEM checkboxes (decisão do Nuno, 2026-07-21)** — manter o modelo "enviar = consentir", mas torná-lo defensável: reforçar o texto do `aviso-rgpd` em `essence-forms.js` para declaração explícita ("Ao enviar esta ficha dou o meu consentimento explícito ao tratamento dos meus dados de saúde pela Essence Wellness, e aceito receber comunicações…" + link à Política de Privacidade); guardar no backend a versão do texto consentido (`detalhe` do audit log em `onboarding.submetido`). **Não** alterar defaults do schema nem adicionar checkboxes. ⚠️ Risco residual documentado: para dados de saúde (Art. 9) e marketing, a CNPD considera o padrão de ouro checkboxes separadas não pré-marcadas — decisão de negócio assumida.

[x] **4. Opt-out automático a pedido da cliente** — quando o webhook WhatsApp classifica a intenção como `nao_interessada` com pedido claro de paragem ("não quero receber", "para de enviar", "remover"), colocar `aceitaMarketing = false` no cliente e registar no audit log. Garante o direito de oposição (Art. 21) sem tocar nos formulários.

[x] **5. Criar `middleware.ts` com CSP** — o comentário em `next.config.ts` refere um middleware de CSP que não existe. Criar CSP com nonce por request (script-src 'nonce-…', object-src 'none', frame-ancestors 'none', base-uri 'self'); para as páginas estáticas `/forms/*.html`, aplicar CSP estática compatível via `headers()` no next.config.

[x] **6. Substituir cuid-como-segredo por tokens assinados** — criar helper `lib/link-token.ts` (HMAC-SHA256 de `sessaoId+exp` com `WEBHOOK_SECRET` ou segredo novo, expiração 7 dias); exigir `?t=` válido em `public/ficha-sessao`, `public/pos-sessao` (GET e PATCH), `public/atribuir-sessao`, `public/confirmar-sessao`; gerar o token no ponto que cria os links (webhooks/N8N payloads — documentar a mudança para os workflows).

[~] **7. Ativar rate limit distribuído + proteger portal** — parte de código FEITA (rate limit + auditoria no `GET /public/portal/[token]`); falta só o passo manual: configurar `UPSTASH_REDIS_REST_URL/TOKEN` no Vercel (criar BD Redis gratuita em upstash.com → colar as 2 variáveis).

[x] **8. Eliminar oráculos de enumeração** — `public/onboarding`: quando o email já existe, devolver resposta uniforme sem `created` verdadeiro nem o clienteId real de outro cliente; remover a lista de terapeutas (`id+name`) das respostas públicas sem token válido (fica coberta pelo item 6).

[x] **9. Cron de retenção de dados (versão conservadora)** — novo `app/api/cron/retencao/route.ts` (Vercel Cron mensal, protegido por `CRON_SECRET`): purgar `AuditLog` > 12 meses; apagar `PortalToken` expirados; registar execução no audit log. **Não** anonimizar clientes automaticamente — o histórico de clientes fica intacto; a anonimização continua a ser só manual (endpoint RGPD), a pedido da cliente. (Anonimização automática por inatividade fica em aberto — ver Open Questions.)

[x] **10. Segregar poderes da API key** — nova env `API_KEY_ADMIN` para operações destrutivas (`rgpd` DELETE, `clientes/bulk-eliminar`); `API_KEY_N8N` deixa de as poder chamar; `validarApiKeyOuSessao` em endpoints destrutivos passa a exigir role `admin` quando a auth é por sessão.

[x] **11. Documento de conformidade** — criar `02_DOCUMENTACAO/rgpd/REGISTO-TRATAMENTO.md`: registo de atividades (Art. 30), tabela de subcontratantes e base de transferência (Neon/Frankfurt, Vercel, Hetzner+N8N, Evolution API, Anthropic, Groq, Calendly, Brevo — verificar DPA de cada), prazos de retenção, procedimento de violação de dados (notificação CNPD em 72h), e nota sobre minimização do que é enviado ao Groq/Claude.

[ ] **12. Operações manuais (checklist para o Nuno)** — rotar a password da Neon (exposta anteriormente, pendente segundo o CLAUDE.md); rotar `API_KEY_N8N` após criar a `API_KEY_ADMIN`; confirmar que o Evolution API (89.167.25.245:8080) só é contactado por HTTPS/rede interna; atualizar a política de privacidade do site com os novos consentimentos.

[x] **13. Validação** — `npx tsc --noEmit --skipLibCheck` + `npm run build`; teste manual: onboarding sem checkbox de saúde não grava ficha clínica; export RGPD contém feedbacks/tarefas; DELETE RGPD deixa zero PII (verificar em Prisma Studio); link de pos-sessao sem `?t=` devolve 401; CSP visível nos response headers em produção.

## Fase 2 (opcional — depois do pacote principal)

[ ] **14. Alertas de segurança (SIEM lite)** — workflow N8N agendado (15 em 15 min) que consulta o `AuditLog` via API e envia WhatsApp à equipa quando deteta: >10 eventos `login.falhado`/`webhook.assinatura_invalida` na última hora, ou qualquer `rgpd.anonimizacao`/`clientes.bulk_eliminar`. Sem ferramentas externas pagas — reutiliza o audit log que já existe.

[ ] **15. 2FA (TOTP) no login** — código de 6 dígitos via app autenticadora para as contas do dashboard (2–3 utilizadores). NextAuth Credentials + campo `totpSecret` no User.

## Impacto no uso diário (referência para implementação)

- **Bea/Cris/admin:** zero alterações no dashboard e formulários internos. Único efeito: links de pos-sessão/ficha-sessão passam a expirar (7 dias) — links antigos deixam de abrir.
- **Clientes:** nada muda visualmente nos formulários — apenas o texto do aviso RGPD junto ao botão de envio fica mais explícito (decisão do Nuno: sem checkboxes).
- **Retenção (item 9):** só limpa logs técnicos e tokens expirados. Nenhum dado de cliente é apagado automaticamente.

## Open Questions

- Anonimização automática de clientes muito antigos: desligada nesta fase por decisão do Nuno. Revisitar mais tarde (o princípio da limitação da conservação do RGPD pede um prazo definido — pode ser 5+ anos, mas deve existir).
- Os links assinados (item 6) obrigam a atualizar os workflows N8N que geram links — fazer em simultâneo ou faseado (aceitar cuid simples durante 30 dias)?
- 2FA para a conta da Bea: fica para uma fase 2 ou entra já neste pacote?
