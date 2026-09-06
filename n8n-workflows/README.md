# Workflows N8N — Essence Wellness

Cada workflow do N8N vive na **sua própria pasta**, com:
- **`<nome>.json`** — backup do workflow real em produção (importável no N8N)
- **`README.md`** — o que faz, qual o trigger, que endpoints usa, notas

> 📚 A explicação detalhada de cada endpoint e os exemplos de pedido/resposta estão
> no **[Manual Prático da API](../02_DOCUMENTACAO/api/MANUAL-API-PRATICO.md)**
> (Parte 5 — Receitas).

---

## ⚠️ Ao reimportar um workflow a partir daqui

Os JSON deste diretório têm as **API keys substituídas por placeholders**
(`{{API_KEY_N8N}}`, `{{EVOLUTION_API_KEY}}`) — decisão deliberada para não
deixar chaves reais em texto simples no histórico do Git. Depois de importar
no N8N, é preciso voltar a preencher esses valores manualmente nos nós HTTP
Request (ver `CREDENCIAIS-PRIVADAS.local.md`). Nós que usam credenciais N8N
nativas (Gmail, Calendly, HubSpot, Groq) já ficam ligados automaticamente,
desde que a credencial com o mesmo `id` ainda exista na instância.

Alguns corpos de email HTML e um gerador de markdown foram abreviados no
backup para poupar espaço (ver nota em cada README individual) — a lógica de
negócio e a topologia de cada workflow estão completas.

---

## Convenção de nomes

```
03_WORKFLOWS_N8N/
├── _TEMPLATE/                    ← copia esta pasta para criar um workflow novo
│   ├── workflow.json
│   └── README.md
├── NN-nome-curto/                ← NN = mesma numeração usada no CLAUDE.md do CRM
│   ├── nome-curto.json
│   └── README.md
```

---

## Workflows ativos em produção (backup principal 2026-08-05, actualizado 2026-09-07)

⚠️ **2026-09-06**: os 8 workflows Claude Haiku (06/07/13/18/19/20/21/22)
tiveram um bug real de sintaxe JS em produção (aspas não escapadas,
introduzidas pela correcção de tom PT-PT do dia anterior) — corrigido e
verificado com `node --check` real. Os 7 agendados foram também
adiantados de um leque 9h-14h para **6h00-7h30** (espaçados 15 min) no
mesmo dia. Ver `../../CLAUDE.md` para o detalhe completo do incidente.

| Nº | Workflow | Trigger | Frequência | Estado |
|---|---|---|---|---|
| 01 | [Onboarding — Calendly → CRM](01-onboarding-calendly/) | Calendly | por evento | ⚠️ Inativo (decisão do Nuno) |
| 02 | [Onboarding — Ficha Recebida](02-onboarding-ficha-recebida/) | Webhook | por submissão | ✅ Ativo |
| 03 | [Confirmação 24h + Ficha Terapeuta](03-confirmacao-24h/) | Schedule | hora a hora (8-21h) | ✅ Ativo |
| 04 | [Notificação de Confirmação](04-notificacao-confirmacao/) | Webhook | por evento | ✅ Ativo |
| 05 | [Feedback Pós-Sessão](05-feedback-pos-sessao/) | Schedule | 7h + 19h + 20h | ✅ Ativo |
| 05b | [Lembrete Individual — Registo Sessão](05b-lembrete-individual/) | Sub-workflow (do 05) | por sessão pendente | ✅ Ativo |
| 06 | [Nutrição Pré-Sessão](06-nutricao-pre-sessao/) | Schedule | diário **6h30** | ✅ Ativo — migrado para Claude Haiku + aprovação (2026-09-05); bug de sintaxe corrigido e horário adiantado de 11h (2026-09-06) |
| 07 | [Feedback — Notificações](07-feedback-notificacoes/) | Webhook | por evento | ✅ Ativo — ganhou branch de reconhecimento de NPS baixo (2026-09-05); bug de sintaxe corrigido (2026-09-06) |
| 08 | [Leads — Nova Lead](08-leads-nova-lead/) | Webhook | por evento | ✅ Ativo |
| 09 | [Sugestão de Etiquetas](09-sugestao-etiquetas/) | Schedule | diário 6h30 | ✅ Ativo — alargado 2026-09-07 para cobrir também o tipo `experiencia` |
| 10 | [Atualizar Telefone/WhatsApp](10-atualizar-telefone-whatsapp/) | Calendly | por evento | ✅ Ativo (legado HubSpot) |
| 10 (N8N) | [Motor de Envio (Fila de Mensagens)](10b-motor-envio/) | Schedule + Webhook | 8h-20h/20min + push | ✅ Ativo — corrigido 2026-09-06/07: enviava por WhatsApp mensagens de canal não suportado (ex: email) em vez de as marcar como falhadas |
| 11 | [Drenagem — Lead Capture](11-drenagem-lead-capture/) | Webhook | por evento | ✅ Ativo (legado HubSpot) |
| 12 | [Fichas HubSpot → Drive](12-fichas-hubspot-drive/) | Schedule | semanal (2ª 8h) | ✅ Ativo (legado, baixa prioridade) |
| 13 | [Reativação — Geração de Mensagens](13-reativacao-mensagens/) | Schedule | diário **6h00** + manual | ✅ Ativo — decisão do Nuno 2026-09-05; bug de sintaxe corrigido e horário adiantado de 9h (2026-09-06) |
| 14 | [Alertas de Segurança (SIEM lite)](14-alertas-seguranca/) | Schedule | a cada 15 min | ⚠️ Inativo — construído 2026-08-25, nunca importado |
| 15 | [Vigilância WhatsApp](15-vigilancia-whatsapp/) | Schedule | a cada 15 min | ✅ Ativo |
| 16 | [Alerta de Falha de Workflow (central)](16-alerta-falha-workflow/) | Error Trigger | automático, por falha | ✅ Ativo |
| 17 | [Backup Diário da Base de Dados](17-backup-diario-bd/) | Schedule | diário 4h | ✅ Ativo |
| 18 | [Continuidade Pós-Sessão](18-continuidade-pos-sessao/) | Schedule | diário **6h15** + manual | ✅ Ativo — novo (2026-09-05); bug de sintaxe corrigido e horário adiantado de 10h (2026-09-06) |
| 19 | [Perdida — Reconquista](19-perdida-reconquista/) | Schedule | diário **6h45** + manual | ✅ Ativo — novo (2026-09-05); bug de sintaxe corrigido e horário adiantado de 11h (2026-09-06) |
| 20 | [VIP — Cuidado Proactivo](20-vip-cuidado/) | Schedule | diário **7h00** + manual | ✅ Ativo — novo (2026-09-05); bug de sintaxe corrigido e horário adiantado de 12h (2026-09-06) |
| 21 | [Lead — Primeira Impressão](21-lead-primeira-impressao/) | Schedule | diário **7h15** + manual | ✅ Ativo — novo (2026-09-05); bug de sintaxe corrigido e horário adiantado de 13h (2026-09-06) |
| 22 | [Ativa Frequente — Reconhecedora](22-ativa-frequente-reconhecedora/) | Schedule | diário **7h30** + manual | ✅ Ativo — novo (2026-09-05); bug de sintaxe corrigido e horário adiantado de 14h (2026-09-06) |

**Cobertura completa dos 9 estados CRM alcançada em 2026-09-05** — os 8
tipos de mensagem (06/07/13/18/19/20/21/22) cobrem `novo`,
`ativa_recente`, `ativa_frequente`, `vip_embaixadora`, `vip_em_risco`,
`reativacao`, `perdida` e `lead`. Só `blacklist` fica de fora, de
propósito (nunca contactar).

## Estado do WF13 corrigido (2026-09-05)

Encontrado activo em produção durante esta auditoria (confirmado antes de
qualquer alteração desta sessão), contradizendo a nota anterior deste
README ("Inativo — nunca ligado a sério"). Zero mensagens reais geradas
(só 2 clientes em produção, nenhum nos estados que o WF13 consulta). O
Nuno confirmou explicitamente que quer deixá-lo activo — deixa de ser
"ligado por engano".

## Upgrade do sistema de mensagens (2026-09-05)

Os workflows **06**, **07** e **18** foram actualizados/criados na mesma
sessão de auditoria do sistema de mensagens, aplicados ao N8N real via a
API REST (`PUT`/`POST /api/v1/workflows`) depois de validados com
`validate_workflow` (zero erros). Resumo em `../CLAUDE.md`, secção
"Sistema de mensagens — upgrade completo". Os prompts do **07** (branch
NPS) e do **18** (continuidade) foram ainda afinados numa 2ª iteração no
mesmo dia, a partir de feedback directo do Nuno sobre as mensagens de
demonstração — ver READMEs de cada pasta.

Resumo do que cada um muda: **06** troca Groq por Claude Haiku e faz o toque
WhatsApp passar pela aprovação da Bea; **07** ganha um branch novo que gera
reconhecimento de NPS baixo em paralelo com o alerta já existente; **18** é
um workflow inteiramente novo (check-in de continuidade pós-sessão). Ver o
README de cada pasta para o detalhe completo.

**01 continua desligado de propósito** — decisão do Nuno, evita onboarding a
meio se cair uma marcação real antes de estar tudo testado.

**13** — dentro do N8N chama-se "11", mas esse número já estava ocupado
neste repositório; ver nota na pasta. Descoberto e exportado em 2026-08-14
(nunca tinha sido feito backup); limpo de dois nós órfãos nessa altura,
incluindo um webhook de teste sem autenticação — ver README da pasta.

**"10 (N8N)"** — o Motor de Envio chama-se literalmente "10 |" dentro do
próprio N8N, mas o número `10` já estava ocupado neste repositório (mesmo
problema do 13/11 acima) — ficou na pasta `10b-motor-envio/`.

**15-17** — construídos e testados ao vivo em 2026-08-31, ver READMEs
individuais para detalhe dos testes.

---

## Pré-requisitos comuns

| O quê | Onde | Notas |
|---|---|---|
| Credencial Calendly | N8N → Credentials | id `16kVKTnjEPByrYSX` |
| Credencial Gmail | N8N → Credentials | id `dG6PuQ0LhRtAJ5Ls` |
| Credencial Groq | N8N → Credentials | id `aHpMEvUqS3TI1f5K` — ver limites em `../../CLAUDE.md` |
| Credencial HubSpot App Token | N8N → Credentials | id `P94G7HXCLh5tzFRO` (workflows legados 10-12) |
| Evolution API key | hardcoded nos nós HTTP (placeholder `{{EVOLUTION_API_KEY}}` neste backup) | instância `essence_whatsapp` |
| `X-API-Key` do CRM | hardcoded nos nós HTTP (placeholder `{{API_KEY_N8N}}` neste backup) | ver `CREDENCIAIS-PRIVADAS.local.md` |

**Base URL da API:** `https://crm.essencewellnesspt.com/api/v1`
