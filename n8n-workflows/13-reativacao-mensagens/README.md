# 11 | Reativação — Geração de Mensagens (Claude Haiku 4.5)

> **Nota de numeração:** dentro do N8N este workflow chama-se "11 | ..." —
> mas o número 11 já estava ocupado no repositório por
> `11-drenagem-lead-capture/`. Alguém atribuiu o mesmo número duas vezes no
> N8N; esta pasta usa `13-` para não colidir. O nome do ficheiro `.json` e o
> nome do workflow dentro dele mantêm o "11" original, tal como está no N8N.

**Estado no N8N:** ⚠️ inativo (`active: false`) — nunca foi ligado a sério.

**Trigger:** Agendado diário às 9h, ou execução manual.

**Exportado a 2026-08-14** — este workflow nunca tinha sido feito backup
antes (não estava em nenhuma versão anterior de `03_WORKFLOWS_N8N/`). Ao
exportar, foram removidos dois nós órfãos que existiam na versão ao vivo:

- `Teste Temporário v7 (apagar)` — um trigger de **webhook público sem
  autenticação** (`POST /webhook/teste-wf11-epico`), ligado diretamente ao
  mesmo fluxo dos triggers de produção. Como o workflow estava inativo, o
  webhook nunca chegou a ficar registado a sério, mas era uma exposição real
  (disparava busca de clientes reais + geração de mensagens + escrita no CRM
  sem exigir nenhuma chave) se o workflow alguma vez fosse ativado sem isto
  ser limpo primeiro.
- `Message a model` — nó `@n8n/n8n-nodes-langchain.anthropic` órfão, sem
  nenhuma ligação de entrada/saída, configuração vazia. Lixo de uma
  experiência anterior.

## O que faz

Gera mensagens de reativação personalizadas por IA (Claude Haiku, não Groq —
diferente do resto dos workflows) para clientes em estado `reativacao` ou
`vip_em_risco` que ainda não têm mensagem pendente:

1. Busca em paralelo: clientes em reativação, clientes VIP em risco, e
   mensagens já pendentes (para não duplicar).
2. Junta os dois grupos, remove duplicados e quem já tem mensagem pendente,
   limita a 15 candidatos por dia (protege a Bea de uma avalancha de
   aprovações e a quota do Groq/Claude partilhada).
3. Para cada candidato, busca o perfil completo (ficha clínica, observações,
   etiquetas, feedbacks, tarefas em aberto, mensagens já enviadas).
4. Monta um prompt com exemplos reais de como a Bea escreve, regras rígidas
   (só emocional, nunca prático/logístico, sem mencionar preços/packs,
   fecho e abertura variados por índice para não repetir padrão) e chama o
   Claude Haiku 4.5.
5. Faz parsing do JSON devolvido + uma rede de segurança determinística que
   varre o texto final à procura de padrões proibidos (ex. "vamos marcar",
   "combinar", 3ª pessoa) — mesmo que o prompt já proíba isto, o modelo já
   repetiu sugestões de marcação antes.
6. Filtra mensagens que falharam a validação e cria `MensagemIA` pendente
   no CRM para as que passaram.

## Endpoints usados

- `GET /api/v1/clientes?estado=reativacao&semMensagemDias=14&limit=10`
- `GET /api/v1/clientes?estado=vip_em_risco&semMensagemDias=14&limit=10`
- `GET /api/v1/mensagens?estado=pendente&limit=200`
- `GET /api/v1/clientes/{id}` (perfil completo)
- `POST /api/v1/mensagens`
- Anthropic API (`claude-haiku-4-5`), credencial `Anthropic account`
  (diferente da credencial `groqApi` usada no resto dos workflows)

## Antes de ativar

- Confirmar que os 15/dia não estouram a quota do Claude (credencial
  separada da `groqApi`, por isso não conta para os limites do Groq
  documentados no `CLAUDE.md` do projeto — mas vale a pena confirmar os
  limites próprios desta credencial Anthropic).
- É o único workflow do projeto que usa Claude em vez de Groq — confirmar
  que isto é intencional e não um resquício de teste antes de ligar a sério.
