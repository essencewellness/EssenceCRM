# 008 — Formulários: NUIT dark + CRO + Feedback 24h

> **Orquestrador:** Opus (este plano) · **Executor:** Sonnet
> **Objetivo:** Redesenhar os 3 formulários no design NUIT dark, otimizá-los com a metodologia `/form-cro`, criar de raiz o formulário de feedback 24h, e religar todos ao estado atual do CRM (catálogo de serviços, multi-terapeuta, persistência clínica).

---

## Decisões já tomadas (não reabrir)

| Tema | Decisão |
|---|---|
| Estética | **Tudo NUIT escuro** nos 3 forms (deep `#0E1119`, champagne `#D4B886`, bone `#ECE6D6`) |
| Feedback 24h | Híbrido: rating → o que foi bom / menos bom → se positivo encaminha p/ review Google; se negativo capta em privado e alerta a Bea |
| CRO | Aplicar a skill `/form-cro` (Form Health & Friction Index) a cada form antes e depois |

## Inputs do utilizador — RESOLVIDOS ✅

1. **`GOOGLE_REVIEW_URL`** = `https://g.page/r/CUpYz4Jwxqw3EBM/review` — usar no CTA positivo do feedback (C3).
2. **Domínio de produção** = `https://crm.essencewellnesspt.com` (ATIVO — domínio principal do CRM). Usar como `API_BASE` de produção nos 3 forms. ⚠️ Corrigir o onboarding que aponta para `crm.essencewellnesspt.com` (errado, sem ponto). Manter deteção localhost para dev.
3. **Utilizadores** = 2 terapeutas + 1 admin: **Beatriz Leão**, **Cristina Martins**, **Admin**.
   - `GET /api/v1/terapeutas` devolve os users com perfil de terapeuta.
   - Seletor do pós-sessão (C2) mostra **apenas Beatriz e Cristina** (quem realiza sessões); o Admin não aparece como terapeuta executante.

---

## Paleta NUIT para HTML standalone (hardcode em cada `:root`)

Os forms são HTML servidos de `public/forms/` — **não** têm acesso às CSS vars do Next. Definir em cada ficheiro:

```css
:root {
  --deep:           #0E1119;   /* fundo página */
  --midnight:       #161A26;   /* cartão / inputs */
  --overlay:        #1F2433;   /* superfícies elevadas */
  --bone:           #ECE6D6;   /* texto principal */
  --bone-soft:      #c9c3b4;   /* texto secundário */
  --champagne:      #D4B886;   /* acento / dourado */
  --champagne-soft: #b9a07a;   /* acento hover/links */
  --smoke:          #7a7e8a;   /* muted / hints / labels */
  --sage:           #7a9e7e;   /* positivo */
  --terra:          #b06050;   /* erro / negativo */
  --border:         rgba(212,184,134,0.16);
  --border-input:   rgba(212,184,134,0.22);
  --field-bg:       #161A26;
}
```

**Tipografia mantém-se** (continuidade de marca, lê bem em dark): Libre Baskerville (display/serif), Montserrat (eyebrow/labels/CTA), Lato (corpo). Ajustar opacidades de grão/glow do header para o novo fundo escuro.

---

## FASE A — Fundações (backend + schema)

### A1 · Persistir dados clínicos no onboarding *(P0)*
- **Ficheiro:** `app/api/v1/public/onboarding/route.ts`
- No `prisma.cliente.update`, escrever os campos clínicos que hoje só seguem no webhook:
  `historicoCondicoesAlergias`, `historicoZonasTensao`, `historicoEstadoEmocional`, `historicoAromasPreferidos`, `notasPessoais`.
- **Regras:** só escrever quando o valor vem preenchido (não sobrepor com `null`); os campos de saúde só quando `consentimentoSaude === true`. Manter o webhook `onboarding.submetido` intacto.
- **Aceitação:** submeter o form preenche as colunas no perfil do cliente (verificável em Prisma Studio); cliente sem consentimento não grava campos de saúde.

### A2 · Modelo `Feedback` + relações
- **Ficheiro:** `prisma/schema.prisma`
```prisma
model Feedback {
  id                String   @id @default(cuid())
  clienteId         String
  sessaoId          String?
  rating            Int      // 1..5
  pontosPositivos   String?  // chips/tópicos do que gostou
  pontosMelhorar    String?  // texto privado quando negativo
  comentario        String?
  encaminhadoGoogle Boolean  @default(false)
  criadoEm          DateTime @default(now())
  cliente Cliente @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  sessao  Sessao? @relation(fields: [sessaoId], references: [id], onDelete: SetNull)
  @@index([clienteId])
  @@index([sessaoId])
}
```
- Adicionar relações inversas em `Cliente` (`feedbacks Feedback[]`) e `Sessao` (`feedbacks Feedback[]`).
- Aplicar com `prisma db push` (dev SQLite + Neon prod via pooler URL). **Não** usar `migrate`.
- **Aceitação:** `npx prisma generate` ok; tabela criada nas duas BDs.

### A3 · Endpoint público de feedback
- **Ficheiro novo:** `app/api/v1/public/feedback/route.ts` (segue o padrão de `public/onboarding`)
- `POST` sem auth · rate-limit (`recurso: "feedback"`, ~10/h) · honeypot `website` · Zod estrito.
- **Schema novo** em `lib/validations.ts` (`feedbackPublicSchema`): `clienteId`, `sessaoId?`, `rating(1..5)`, `pontosPositivos?`, `pontosMelhorar?`, `comentario?`, `website?`.
- Guard de **blacklist** (200 silencioso). Validar que o cliente existe.
- Cria `Feedback`. Lógica de ramo:
  - `rating >= 4` → resposta inclui `{ encaminharGoogle: true }`; marcar `encaminhadoGoogle` quando o cliente confirmar (ou no momento da criação).
  - `rating <= 3` → disparar webhook **`feedback.negativo`** (alerta Bea) com resumo. Sem Google.
  - Sempre: webhook **`feedback.recebido`** (opcional, para métricas N8N).
- **Ficheiro:** `lib/webhooks.ts` — adicionar `feedbackRecebido()` e `feedbackNegativo()` + vars `.env` `WEBHOOK_N8N_FEEDBACK_*`.
- **Aceitação:** POST com rating 5 → cria feedback + `encaminharGoogle:true`; rating 2 → cria + dispara `feedback.negativo`; blacklist → 200 sem criar.

### A4 · Pesquisa de clientes na API (`q`) + lista de terapeutas
- **Pesquisa:** adicionar param `q` a `clientesQuerySchema` e a `GET /api/v1/clientes` — `OR` por `nome contains`, `email contains`, `telefone contains` (sem `mode:"insensitive"` em dev SQLite; condicionar ao provider). Mantém isolamento por terapeuta e cursor.
  - **Aceitação:** `GET /api/v1/clientes?q=mar` devolve correspondências paginadas.
- **Terapeutas:** criar `GET /api/v1/terapeutas` (ou reutilizar) que devolve os users terapeutas `{ id, name }` para popular o seletor do pós-sessão. Auth `validarApiKeyOuSessao`.
  - **Aceitação:** devolve os 3 utilizadores.

---

## FASE B — Base de design partilhada

### B1 · Tokens NUIT + componentes-base nos forms
- Definir o `:root` NUIT (acima) e reestilizar primitivos partilhados: header (painel escuro + grão/glow suaves), floating labels, chips, choice-buttons, selects, textareas, botão primário (sweep champagne), toast, success, footer, erro global — **todos** mapeados para os tokens NUIT.
- Garantir contraste AA: texto bone sobre midnight/deep ≥ 4.5:1; champagne só para acentos/títulos, não para corpo pequeno.
- **Aceitação:** um screenshot de cada estado (default/focus/erro/sucesso) coerente com o CRM.

---

## FASE C — Formulários

> Para **cada** form: correr `/form-cro` (Phase 0 — Health & Friction Index) **antes**, aplicar correções, e validar score **depois**. Registar score inicial→final no fim do plano.

### C1 · Onboarding (cliente) — NUIT + CRO + ligações
- **Ficheiro:** `public/forms/onboarding.html`
- **Design:** migrar para NUIT dark (Fase B).
- **CRO / dados:**
  - Revelar **campo de texto ao escolher "Outra/Outro"** em: estado da mente (step 2), zonas de tensão (step 3), como conheceu (step 4). Sem dead-ends.
  - Adicionar pergunta **aroma preferido** (chips: Lavanda, Eucalipto, Rosa, Bergamota, Hortelã, Sândalo, Ylang Ylang, + "Outro") → mapear a `historicoAromasPreferidos`.
  - Parar de **duplicar** `foco` em dois campos: `foco` → `notasPessoais`; mente + última-hora → `historicoEstadoEmocional`.
  - Reavaliar auto-avanço do step 2 (manter mas só após seleção explícita; não roubar exploração).
- **Ligações CRM:** `API_BASE` → domínio live (input #2). Confirmar payload alinhado com A1 (campos persistem).
- **Aceitação:** form dark, "Outra" com texto, aroma recolhido, submissão preenche colunas no CRM; Friction Index ≥ 85.

### C2 · Pós-sessão (Bea, interno) — NUIT + dados dinâmicos
- **Ficheiro:** `public/forms/pos-sessao.html`
- **Design:** migrar para NUIT dark.
- **Ligações CRM (substituir hardcode):**
  - **Serviços:** `GET /api/v1/servicos?ativo=true` → popular o `<select>` dinamicamente; preço vem de `servico.precoBase` (remover lista e mapa `precos` hardcoded). Inclui Drenagem Linfática automaticamente.
  - **Terapeutas:** `GET /api/v1/terapeutas` (A4) → seletor com os users reais; enviar identificador alinhado com o CRM (decidir id vs nome com base no input #3).
  - **Pesquisa de cliente:** substituir "carregar 200 + `.find`" por chamada `GET /api/v1/clientes?q=` com debounce e **lista de correspondências** (desambiguação quando há várias). Selecionar da lista.
  - `API_BASE` → domínio live (input #2).
- **Aceitação:** serviços/preços vêm do catálogo; terapeuta mapeia user real; pesquisar "Maria" com 2+ resultados mostra lista; funciona com BD > 200 clientes; Friction Index ≥ 80 (ferramenta interna — foco em velocidade/integridade).

### C3 · Feedback 24h (cliente) — NOVO
- **Ficheiro novo:** `public/forms/feedback.html`
- **Entrada:** `?clienteId=…&sessaoId=…&n=Maria` (link enviado por WhatsApp 24h depois).
- **Fluxo CRO (1 ecrã, ultra-curto, low-commitment):**
  1. Rating grande emoji/escala: *"Como te sentes depois da tua sessão?"* (1 toque).
  2. Ramo após toque:
     - **≥4:** *"O que mais gostaste?"* chips (Ambiente, Toque/pressão, Aroma, Atenção da Bea, Resultado) + texto opcional → CTA **"Deixar uma palavra no Google ✦"** (abre `GOOGLE_REVIEW_URL`, input #1).
     - **≤3:** *"Lamento. O que podíamos ter feito melhor?"* texto (privado) → "Enviar à Bea" (sem Google).
  3. Sucesso (copy calorosa, voz Flora). Opcional: CTA discreto "Remarcar".
- **Ligações:** `POST /api/v1/public/feedback` (A3). `API_BASE` → domínio live.
- **Aceitação:** rating alto encaminha p/ Google e grava `encaminhadoGoogle`; rating baixo capta em privado e alerta Bea; honeypot e rate-limit ativos; Friction Index ≥ 90 (form curtíssimo).

---

## FASE D — Integração

### D1 · Gatilho N8N do feedback 24h
- **Artefacto:** spec do fluxo N8N (`N8N - Fluxos de automação prontos a importar/`): disparado ~24h após `sessao.realizada` (cron/queue), envia WhatsApp com link `…/forms/feedback.html?clienteId=&sessaoId=&n=`.
- Guard blacklist + `aceitaMarketing`. Texto na voz Flora (≤3 frases).
- Documentar o webhook `feedback.negativo` → notificação privada à Bea.
- **Aceitação:** documento claro pronto a importar; variáveis de webhook listadas.

### D2 · Teste ponta-a-ponta
- Testar os 3 forms contra a API live: onboarding (persistência), pós-sessão (serviço dinâmico + pesquisa), feedback (ambos os ramos).
- **Aceitação:** cada submissão cria/atualiza os registos certos; sem erros de domínio/CORS.

---

## FASE E — Entrega
- `npx tsc --noEmit --skipLibCheck` limpo.
- `git add` → commit descritivo → `git push` (deploy Vercel automático).
- Atualizar `04_CRM/CLAUDE.md` (tabela de estado/forms) e o link de Active Feature Plan para 008.

---

## Ordem de execução recomendada (Sonnet)

```
A1 → A2 → A3 → A4        (backend pronto antes dos forms)
B1                        (tokens NUIT)
C1 ∥ C2 ∥ C3              (forms — podem ir em paralelo após B1)
D1 → D2                   (integração + teste)
E                         (deploy)
```

Bloqueios: C3 espera input #1 (Google URL); C2 espera input #3 (terapeutas). C1 pode arrancar logo após B1.

## Princípios a respeitar (do CLAUDE.md)
- Comentários PT, código camelCase EN · respostas API `{ data, meta }` / `{ error, code }`.
- Upsert por telefone/email · sem `mode:"insensitive"` em dev SQLite · provider prod `postgresql`.
- Webhooks fire-and-forget (retry 3x, timeout 5s) · nunca bloquear resposta.
- Credenciais só em env · nunca `NEXT_PUBLIC_*` para chaves de API no browser.

## Registo de Friction Index (preencher na execução)
| Form | Antes | Depois |
|---|---|---|
| onboarding | _(C1)_ | |
| pós-sessão | _(C2)_ | |
| feedback 24h | n/a (novo) | _(C3)_ |
