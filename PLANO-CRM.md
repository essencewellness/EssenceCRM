# Plano CRM Essence Wellness — Nível HubSpot + N8N

> Dashboard financeiro separado — este plano cobre apenas CRM, comunicação e automação.
> Atualizado: 2026-05-21

---

## Estado Atual (✅ Feito)

| O que existe | Estado |
|---|---|
| Dashboard com KPIs, sessões hoje, mensagens para enviar | ✅ |
| Lista de clientes com 9 estados CRM e filtros | ✅ |
| Perfil completo de cliente (histórico clínico, sessões, notas) | ✅ |
| Top Clientes (por valor, em risco) | ✅ |
| Painel de mensagens IA com aprovação manual | ✅ |
| Tab de Atividade com feed unificado | ✅ |
| `POST/GET/PATCH /api/mensagens` (N8N básico) | ✅ |
| 9 estados CRM: lead → novo → ativa_recente → ativa_frequente → vip_embaixadora / vip_em_risco → reativacao → perdida / blacklist | ✅ |
| Histórico clínico: aromas, condições/alergias, estado emocional, zonas de tensão | ✅ |
| Etiquetas personalizadas com cor | ✅ |
| 59 clientes de teste cobrindo todos os estados e casos de uso | ✅ |
| Autenticação NextAuth (dashboard protegido) | ✅ |
| Geração de mensagens por IA ("Essence Wellness ✦") | ✅ |

---

## Modelos Prisma Existentes

```
Cliente        — perfil, 9 estados, histórico clínico, métricas
Sessao         — data, serviço, terapeuta, aroma, resumo, notas pós-sessão
MensagemIA     — pendente → aprovada → enviada / rejeitada
Etiqueta       — nome, cor
ClienteEtiqueta — relação N:N
User / Account / Session — NextAuth
```

---

## Roadmap

### FASE 0 — Autenticação da API · P0 · ~7h

> Sem isto o N8N não consegue ligar-se de forma segura.

**O que fazer:**
- `middleware.ts` — separar JWT (dashboard) de `X-API-Key` (N8N e integrações externas)
- Mover `/api/mensagens` → `/api/v1/mensagens` mantendo alias de compatibilidade
- Nunca uma só chave para tudo: chave N8N separada de chave webhooks externos

**Variáveis de ambiente a adicionar:**
```
API_KEY_N8N=<gerar com: openssl rand -hex 32>
API_KEY_WEBHOOKS_EXTERNOS=<chave diferente>
WEBHOOK_SECRET=<secret partilhado entre CRM e N8N>
```

**Middleware (estrutura):**
```typescript
// Rota pública — sem autenticação
if (pathname.startsWith("/api/v1/public/")) return NextResponse.next()

// API v1 — autenticação por API Key
if (pathname.startsWith("/api/v1/")) {
  const apiKey = request.headers.get("X-API-Key")
  if (!apiKey || apiKey !== process.env.API_KEY_N8N)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  return NextResponse.next()
}
```

**Entregável:** N8N consegue autenticar e usar `/api/v1/mensagens` existente.

---

### FASE 1 — CRUD Clientes + Sessões via API · P0 · ~9h

> N8N sincroniza Calendly → CRM automaticamente, sem entrada manual.

**Endpoints a criar:**

#### Clientes
```
GET  /api/v1/clientes
     ?estado=vip_em_risco
     &inactivos_desde_dias=45
     &aceitaMarketing=true
     &limit=50 &cursor=<id>
     → { clientes: [...], nextCursor, total }

POST /api/v1/clientes
     Body: { nome, telefone?, email?, fonte?, dataNascimento?, aceitaMarketing? }
     Lógica: upsert por telefone ou email (sem duplicados)
     → { cliente: {...}, created: boolean }

GET  /api/v1/clientes/[id]
     → perfil completo + últimas 10 sessões + etiquetas + últimas 5 mensagens

PATCH /api/v1/clientes/[id]
     Campos actualizáveis: estado, telefone, email, ultimaSessao, totalSessoes,
     notasPessoais, historicoAromasPreferidos, historicoCondicoesAlergias,
     historicoEstadoEmocional, historicoZonasTensao
     Side effect: disparar webhook quando estado muda (ver Fase 2)
```

#### Sessões
```
POST /api/v1/sessoes
     Body: { clienteId? | telefone? | email?, data, hora?, duracao?,
             servico?, preco?, terapeuta?, estado?, aromaSessao?,
             resumoSessao?, calendlyEventId? }
     Resolução do cliente: id → telefone → email (mesmo padrão do /api/mensagens)
     Default estado: "agendada"
     → { sessao: {...}, clienteId }

PATCH /api/v1/sessoes/[id]
     Campos: estado, resumoSessao, notasPosSessao, aromaSessao, linkDocumento
     Quando estado → "realizada": recalcular totalSessoes + totalGasto no cliente
     (em transacção Prisma para consistência)
     → { sessao: {...}, clienteActualizado: { totalSessoes, ultimaSessao } }

GET  /api/v1/sessoes
     ?clienteId= &estado= &de=<ISO> &ate=<ISO> &terapeuta= &limit=
```

#### Pipeline
```
GET /api/v1/pipeline
    → {
        estados: { lead: 8, novo: 5, ativa_recente: 12, ... },
        metricas: { totalClientes, sessoesHoje, mensagensPendentes }
      }
```

**Entregável:** N8N recebe webhook Calendly → cria/atualiza cliente → cria sessão "agendada" automaticamente.

---

### FASE 2 — Webhooks Bidirecionais · P0 · ~7h

> Quando Bea aprova mensagem → N8N envia automaticamente, sem polling.

#### CRM → N8N (Outbound)

`lib/webhooks.ts` — fire-and-forget com retry 3x e timeout 5s:

```typescript
async function dispararWebhook(evento: string, payload: object) {
  const url = process.env[`WEBHOOK_N8N_${evento.toUpperCase().replace('.', '_')}`]
  if (!url) return

  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": process.env.WEBHOOK_SECRET ?? "",
          "X-Evento": evento,
        },
        body: JSON.stringify({ evento, payload, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) break
    } catch { /* não bloquear a resposta ao utilizador */ }
  }
}
```

| Evento | Quando dispara | Payload mínimo |
|---|---|---|
| `mensagem.aprovada` | PATCH mensagem → aprovada | `{ mensagemId, clienteId, telefone, mensagemFinal, canal }` |
| `sessao.realizada` | PATCH sessão → realizada | `{ sessaoId, clienteId, preco, servico, terapeuta }` |
| `cliente.estado_alterado` | PATCH cliente muda estado | `{ clienteId, estadoAnterior, estadoNovo }` |
| `lead.criado` | POST /public/lead | `{ clienteId, nome, email, telefone, servicoInteresse }` |

Variáveis de ambiente:
```
WEBHOOK_N8N_MENSAGEM_APROVADA=https://n8n.essencewellness.pt/webhook/crm-mensagem-aprovada
WEBHOOK_N8N_SESSAO_REALIZADA=https://n8n.essencewellness.pt/webhook/crm-sessao-realizada
WEBHOOK_N8N_CLIENTE_ESTADO_ALTERADO=https://n8n.essencewellness.pt/webhook/crm-estado
WEBHOOK_N8N_LEAD_CRIADO=https://n8n.essencewellness.pt/webhook/crm-lead-criado
```

#### N8N → CRM (Inbound)

```
POST /api/v1/webhooks/calendly
     Valida header X-Calendly-Webhook-Subscription-Uuid
     Upsert cliente por email + criar sessão "agendada"
     → { clienteId, sessaoId, created }

POST /api/v1/webhooks/whatsapp
     N8N valida no Evolution API e repassa dados limpos
     Body: { telefone, mensagem, timestamp, tipo }
     Encontra cliente por telefone, classifica intenção
     → { clienteId, intencao: "marcar" | "nao_interessada" | "pergunta" | "outro" }

POST /api/v1/webhooks/confirmacao-envio
     N8N confirma resultado de envio WhatsApp
     Body: { mensagemId, sucesso: boolean, erroDescricao? }
     Actualiza MensagemIA.estado → "enviada" ou regista erro
```

**Entregável:** fluxo totalmente automático — Bea aprova → N8N envia → CRM regista confirmação.

---

### FASE 3 — Tasks e Follow-ups · P1 · ~5h

> Widget "Tarefas de Hoje" no dashboard, N8N cria tasks automáticas.

**Modelo a adicionar ao schema Prisma:**
```prisma
model Task {
  id          String    @id @default(cuid())
  clienteId   String
  titulo      String
  descricao   String?
  tipo        String    @default("followup") // followup | ligacao | email | outro
  estado      String    @default("aberta")   // aberta | concluida | cancelada
  dataLimite  DateTime?
  atribuidaA  String?   // "bea" | "cris"
  criadaEm    DateTime  @default(now())
  concluidaEm DateTime?
  criadaPor   String    @default("sistema")  // "sistema" | "bea" | "n8n"
  cliente     Cliente   @relation(fields: [clienteId], references: [id])
}
```

**Endpoints:**
```
GET  /api/v1/tasks?atribuidaA=bea&estado=aberta&dataLimite=hoje
POST /api/v1/tasks  — N8N cria tasks automáticas ("ligar em 3 dias se não responder")
PATCH /api/v1/tasks/[id]  — marcar concluída, cancelar
```

**Dashboard:**
- Widget "Tarefas de Hoje" na página principal (`/`)
- Lista de tasks no perfil do cliente (tab Notas ou tab separado)

**Entregável:** Bea vê na página principal o que tem para fazer hoje por cliente.

---

### FASE 4 — Histórico de Atividade · P1 · ~5h

> Timeline completa de todas as interações por cliente, tipo HubSpot.

**Modelo a adicionar:**
```prisma
model Actividade {
  id          String   @id @default(cuid())
  clienteId   String
  tipo        String   // sessao_criada | sessao_realizada | mensagem_enviada |
                       // estado_alterado | nota_adicionada | whatsapp_recebido |
                       // task_criada | lead_convertido
  descricao   String
  metadata    String?  // JSON com dados extra (ex: estado anterior/novo)
  criadaEm    DateTime @default(now())
  criadaPor   String   @default("sistema") // "sistema" | "bea" | "cris" | "n8n"
  cliente     Cliente  @relation(fields: [clienteId], references: [id])
}
```

**Implementação:**
- Função `registarActividade(clienteId, tipo, descricao, metadata?, criadaPor?)` em `lib/actividade.ts`
- Chamada explicitamente em cada route handler ao fazer mutações (mais claro que Prisma middleware)
- `GET /api/v1/clientes/[id]/actividades?limit=20`

**Dashboard:**
- Tab "Atividade" no perfil do cliente (já tem estrutura de tabs)
- Feed com ícones por tipo + linha vertical conectora (já existe padrão na tab Atividade de mensagens)

**Entregável:** Bea vê o que aconteceu com cada cliente — sessões, mensagens, mudanças de estado.

---

### FASE 5 — Sequences de Reengagement · P1 · ~9h

> Define uma vez "sem sessão há 45 dias → 3 mensagens com 7 dias de intervalo" e corre sozinho.

**Modelos a adicionar:**
```prisma
model Sequencia {
  id       String           @id @default(cuid())
  nome     String           // "Reativação 60 dias", "Pós-primeira sessão"
  gatilho  String           // inativo_45d | inativo_60d | nova_cliente | aniversario | pos_sessao
  ativa    Boolean          @default(true)
  etapas   EtapaSequencia[]
  clientes ClienteSequencia[]
}

model EtapaSequencia {
  id                 String    @id @default(cuid())
  sequenciaId        String
  ordem              Int
  diasAposAnterior   Int       @default(0)
  canal              String    @default("whatsapp")
  templateMensagem   String    // Template com {{nome}}, {{servico}}, {{diasSemSessao}}
  sequencia          Sequencia @relation(fields: [sequenciaId], references: [id])
}

model ClienteSequencia {
  id              String    @id @default(cuid())
  clienteId       String
  sequenciaId     String
  etapaAtual      Int       @default(0)
  estado          String    @default("ativa") // ativa | pausada | concluida | cancelada
  iniciadaEm      DateTime  @default(now())
  proximaAcaoEm   DateTime?
  cliente         Cliente   @relation(fields: [clienteId], references: [id])
  sequencia       Sequencia @relation(fields: [sequenciaId], references: [id])
}
```

**Endpoints:**
```
GET  /api/v1/sequencias/pendentes
     N8N chama às 9h — retorna etapas para processar hoje
     → [{ clienteId, nome, telefone, template, canal, etapa }]

POST /api/v1/sequencias/[id]/clientes
     Inscrever cliente numa sequência (N8N ou manualmente)

PATCH /api/v1/sequencias/clientes/[id]
     Avançar etapa, pausar, cancelar
```

**Fluxo N8N:**
1. Cron às 9h → `GET /api/v1/sequencias/pendentes`
2. Para cada entrada: gerar texto via Claude API com o template
3. `POST /api/v1/mensagens` para criar MensagemIA com `estado: "pendente"`
4. Bea aprova no dashboard → webhook `mensagem.aprovada` → N8N envia

**Dashboard:**
- Página `/sequencias` para criar e editar templates
- Ver clientes inscritos em cada sequência e em que etapa estão

**Entregável:** reengagement automático sem intervenção — só aprovação final da Bea.

---

### FASE 6 — Lead Forms e Captação · P2 · ~7h

> Contactos do Instagram/site entram automaticamente como leads no CRM.

**Endpoint público (sem autenticação, com rate limiting):**
```
POST /api/v1/public/lead
     Body: { nome, email, telefone?, servico_interesse?, como_nos_conheceu?, origin_url? }
     Rate limit: 5 submissões por IP por hora
     Side effect: criar Task "contactar lead" + disparar webhook lead.criado
     → { clienteId, created: boolean }
```

**Rate limiting simples (sem Redis):**
```typescript
const ipRequests = new Map<string, { count: number; reset: number }>()
// Verificar antes de processar; limpar entradas expiradas periodicamente
```

**Snippet embeddable:**
- Formulário HTML/JS leve para Instagram bio ou site WordPress
- Submit via fetch para `POST /api/v1/public/lead`
- Confirmação visual sem redirect

**Email Brevo via N8N:**
- `GET /api/v1/clientes?aceitaMarketing=true&estado=ativa_frequente` alimenta segmentos Brevo
- Webhook Brevo → N8N → `POST /api/v1/webhooks/email` para registar métricas de abertura/clique

**Modelo a adicionar:**
```prisma
model EventoEmail {
  id          String   @id @default(cuid())
  clienteId   String
  campanhaId  String?
  tipo        String   // enviado | aberto | clicado | bounce | unsubscribe
  registadoEm DateTime @default(now())
  cliente     Cliente  @relation(fields: [clienteId], references: [id])
}
```

**Entregável:** lead entra no CRM, recebe WhatsApp de boas-vindas via N8N, aparece na lista com estado "lead".

---

## Resumo do Roadmap

| Fase | Descrição | Prioridade | Esforço | Dependências |
|---|---|---|---|---|
| 0 | Autenticação API + middleware | P0 | ~7h | — |
| 1 | CRUD Clientes + Sessões via API | P0 | ~9h | F0 |
| 2 | Webhooks bidirecionais | P0 | ~7h | F1 |
| 3 | Tasks e follow-ups | P1 | ~5h | F0, F1 |
| 4 | Histórico de atividade | P1 | ~5h | F0, F2 |
| 5 | Sequences de reengagement | P1 | ~9h | F3, F2 |
| 6 | Lead forms + Brevo | P2 | ~7h | F0 |
| **Total** | | | **~49h** | |

---

## Arquitetura de Ficheiros a Criar

```
app/
  api/
    v1/
      clientes/
        route.ts              ← GET (lista/filtros), POST (upsert)
        [id]/
          route.ts            ← GET, PATCH
          actividades/
            route.ts          ← GET
          sessoes/
            route.ts          ← GET (sessões do cliente)
      sessoes/
        route.ts              ← POST, GET
        [id]/
          route.ts            ← GET, PATCH
      mensagens/
        route.ts              ← alias do /api/mensagens
        [id]/
          route.ts            ← PATCH individual
      pipeline/
        route.ts              ← GET métricas
      tasks/
        route.ts              ← GET, POST
        [id]/
          route.ts            ← PATCH
      sequencias/
        route.ts              ← GET, POST
        pendentes/
          route.ts            ← GET (N8N cron)
        [id]/
          clientes/
            route.ts          ← POST (inscrever cliente)
        clientes/
          [id]/
            route.ts          ← PATCH (avançar/pausar)
      webhooks/
        calendly/
          route.ts            ← POST (agendamentos)
        whatsapp/
          route.ts            ← POST (respostas Evolution API)
        confirmacao-envio/
          route.ts            ← POST (confirmação N8N)
        email/
          route.ts            ← POST (métricas Brevo)
      public/
        lead/
          route.ts            ← POST (sem auth, com rate limit)

lib/
  webhooks.ts                 ← dispararWebhook() fire-and-forget
  actividade.ts               ← registarActividade()
  api-auth.ts                 ← validarApiKey() helper

middleware.ts                 ← separação JWT / X-API-Key
```

---

## Convenções de Resposta da API

Sucesso:
```json
{ "data": {...}, "meta": { "timestamp": "..." } }
```

Erro:
```json
{ "error": "Descrição legível", "code": "CLIENTE_NAO_ENCONTRADO", "status": 404 }
```

Paginação (cursor-based):
```json
{ "data": [...], "meta": { "nextCursor": "clxxx", "total": 59 } }
```
