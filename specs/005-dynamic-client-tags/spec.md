# Spec 005 — Sistema de Tags & Categorias Dinâmicas de Clientes

**Projeto:** Essence Wellness CRM
**Data:** 2026-06-19
**Estado:** Pronto para planeamento

---

## Contexto e Motivação

A Beatriz precisa de categorizar clientes de três formas distintas — que hoje não existem de forma usável:

1. **Condição de saúde** → saber antes de contactar se há restrição (grávida, pós-operatório)
2. **Filtro para campanhas WhatsApp** → agrupar clientes por interesse e disparar mensagens segmentadas (ex.: todas as que gostam de "Massagem de Casal")
3. **Actividade** → saber de relance há quantos dias cada cliente não vem

O sistema de etiquetas actual existe no código mas não é utilizável — sem categorias, sem filtros, sem integração com campanhas.

O objectivo: um sistema de tags visual, rápido de usar, directamente ligado ao fluxo de campanhas WhatsApp existente.

---

## Actores

- **Beatriz (Bea)** — única utilizadora do dashboard CRM

---

## Tipos de Tags

O sistema distingue **4 tipos** com comportamentos diferentes:

| Tipo | Criada por | Para quê | Exemplos |
|---|---|---|---|
| **Saúde** | Bea | Sinalizar condições clínicas; pode bloquear automações | Grávida, Pós-parto, Pós-operatório, Lesão ativa, Fibromialgia |
| **Campanha** | Bea | Filtrar grupos para campanhas WhatsApp segmentadas | Massagem de Casal, Puro Aroma, Pack 3, Aniversário próximo |
| **Preferência** | Bea | Notas de preferência pessoal | Só aromaterapia, Prefere manhãs, Não quer contacto automático |
| **Automática** | Sistema | Calculadas; nunca editáveis pela Bea | Ativa <30d, Inativa 30-60d, Voucher ativo, Voucher usado |

---

## Histórias de Utilizador

### US1 — Gerir tags no perfil de cliente
**Como** Bea,
**Quero** ver, adicionar e remover tags no perfil de uma cliente,
**Para** manter o contexto clínico e de interesses actualizado sem sair da página.

**Critérios de aceitação:**
- As tags aparecem no perfil agrupadas por tipo (Saúde · Campanha · Preferência · Automáticas)
- Posso adicionar uma tag existente com um clique (dropdown com pesquisa por nome)
- Posso criar uma nova tag on-the-fly: escrevo o nome, escolho o tipo e a cor — fica disponível no catálogo global
- Posso remover qualquer tag manual com um clique
- O estado CRM aparece como chip colorido clicável que abre selector com os 9 estados
- As tags Automáticas aparecem sem botão de remover

### US2 — Filtrar clientes e lançar campanha WhatsApp
**Como** Bea,
**Quero** filtrar a lista de clientes por uma ou mais tags e disparar uma campanha WhatsApp para esse grupo,
**Para** comunicar de forma segmentada (ex.: só as clientes de "Massagem de Casal") sem copiar números manualmente.

**Critérios de aceitação:**
- Na lista de clientes, cada linha mostra: dias sem vir + chips de tags de saúde (máximo 2) + estado CRM
- Posso filtrar por: nome, tag(s) (multi-select), estado CRM (multi-select), intervalo de inactividade
- Os filtros activos aparecem como chips removíveis com contador de resultados
- Com clientes filtrados, posso clicar "Criar campanha" → escolher template WhatsApp → o sistema gera uma MensagemIA por cliente → Bea revê e aprova cada uma individualmente (fluxo igual ao reengagement existente) → envia via WhatsApp
- Clientes com tag de Saúde bloqueante (configurável) são excluídos automaticamente das campanhas de automação

### US3 — Gerir o catálogo de tags
**Como** Bea,
**Quero** ter uma área onde vejo e organizo todas as tags existentes,
**Para** manter o catálogo limpo sem duplicados nem tags abandonadas.

**Critérios de aceitação:**
- Posso ver todas as tags agrupadas por tipo com contagem de clientes em cada
- Posso editar o nome e a cor de qualquer tag manual
- Posso apagar uma tag — o sistema mostra quantos clientes perdem essa tag e pede confirmação
- Após apagar, a tag desaparece de todos os perfis imediatamente

### US4 — Tags automáticas de actividade e vouchers
**Como** Bea,
**Quero** que o sistema calcule automaticamente o nível de actividade e o estado de voucher de cada cliente,
**Para** não ter de actualizar tags manualmente quando uma cliente volta ou usa um voucher.

**Critérios de aceitação:**
- Tag de actividade calculada com base em `ultimaSessao`:
  - "Ativa < 30 dias"
  - "Inativa 30–60 dias"
  - "Inativa 60–90 dias"
  - "Inativa 90+ dias"
  - "Sem sessões" (nunca teve sessão realizada)
- Quando um voucher é criado para um beneficiário que existe no CRM → tag "Voucher ativo"
- Quando voucher fica "usado" com cliente ligado → tag muda para "Voucher usado"
- Tags automáticas são visualmente distintas (ex.: ícone de raio ou fundo diferente)

---

## Requisitos Funcionais

### RF-001 Tipos de tags com comportamento diferenciado
Cada tag tem um `tipo`: `saude`, `campanha`, `preferencia`, `automatica`. Tags do tipo `saude` têm um campo booleano "bloqueia automações" — quando activo, clientes com essa tag são excluídos dos envios automáticos de reengagement e campanhas.

### RF-002 Criação de tags on-the-fly no perfil
No perfil de uma cliente, a Bea pode criar uma nova tag sem sair da página: escreve o nome, selecciona o tipo (`saude` / `campanha` / `preferencia`) e escolhe uma cor de uma paleta de 12 cores pré-definidas. A tag fica imediatamente disponível no catálogo global.

### RF-003 Atribuição e remoção de tags no perfil
No perfil de cada cliente: (a) dropdown de pesquisa para adicionar tags existentes; (b) chip clicável com × para remover tags manuais; (c) tags automáticas mostradas sem × .

### RF-004 Estado CRM inline editável
O estado CRM aparece como chip colorido destacado no topo do perfil. Clicar abre um selector com os 9 estados e respectiva descrição. Seleccionar actualiza imediatamente.

### RF-005 Lista de clientes com tags e filtros
A lista de clientes mostra por linha: nome, dias sem vir (calculado de `ultimaSessao`), chips de tags de Saúde (máx. 2, com "+N" se mais), chip do estado CRM. Filtros disponíveis: pesquisa por nome, multi-select de tags, multi-select de estado CRM, selector de intervalo de inactividade (qualquer / <30d / 30-60d / 60-90d / 90+d).

### RF-006 Criar campanha a partir de filtro
Com resultados filtrados na lista, o botão "Criar campanha" abre selector de template WhatsApp. O sistema cria uma `MensagemIA` por cliente no estado `pendente`. A Bea revê e aprova no ecrã de Mensagens IA existente. O envio usa o fluxo N8N já existente.

### RF-007 Exclusão de clientes bloqueados de campanhas
Ao gerar mensagens de campanha ou reengagement automático, o sistema exclui automaticamente clientes com tags de Saúde cujo campo "bloqueia automações" está activo. A Bea vê o número de clientes excluídos e o motivo.

### RF-008 Gestão de catálogo de tags
Página (ou modal de gestão) com lista de todas as tags por tipo, contagem de clientes por tag, acções de editar e apagar. A eliminação é destrutiva (remove de todos os clientes) e requer confirmação com número de afectados.

### RF-009 Auto-tag de vouchers
Quando `GiftCard.beneficiarioTelefone` corresponde a um `Cliente.telefone` existente → associar tag automática "Voucher ativo". Quando `GiftCard.estado` passa a "usado" com `clienteId` preenchido → tag "Voucher usado" substitui "Voucher ativo". Tags automáticas de voucher são do tipo `automatica` e não editáveis manualmente.

### RF-010 Catálogo inicial pré-carregado
Na primeira instalação, o sistema cria automaticamente as seguintes tags:
- **Saúde (bloqueia automações = true):** Grávida, Pós-parto, Pós-operatório
- **Saúde (bloqueia automações = false):** Lesão ativa, Fibromialgia, Tensão crónica
- **Campanha:** Massagem de Casal, Puro Aroma, Pack 3, Drenagem Linfática, Primeira vez
- **Preferência:** Só aromaterapia, Prefere manhãs, Prefere tardes, Não quer contacto automático

---

## Casos Extremos

- Cliente com tag "Grávida" (bloqueia automações) → excluída de campanhas automáticas mas a Bea pode-lhe enviar mensagem manualmente
- Tag com nome duplicado → erro imediato, não cria
- Apagar tag com 0 clientes → sem confirmação adicional
- Estado CRM "blacklist" → chip vermelho vivo; pode ser atribuído manualmente, nunca alterado pelo motor automático
- Cliente sem telefone → correspondência de voucher não é feita automaticamente; Bea pode ligar manualmente
- Filtro com 0 resultados → estado vazio com sugestão de limpar filtros

---

## Entidades Chave

| Entidade | Alteração |
|---|---|
| `Etiqueta` | Adicionar campos: `tipo` (saude/campanha/preferencia/automatica), `bloqueiasAutomacoes` (boolean), `cor` (já existe) |
| `ClienteEtiqueta` | Sem alteração de estrutura |
| `Cliente` | Sem alteração — `estado` e `ultimaSessao` já existem |
| `GiftCard` | Já existe (Spec 004) — usado para auto-tags de voucher |
| `MensagemIA` | Sem alteração — reutilizada para campanhas segmentadas |

---

## Critérios de Sucesso

- SC-01: Adicionar ou remover uma tag de um cliente demora menos de 5 segundos
- SC-02: Criar uma nova tag on-the-fly no perfil demora menos de 15 segundos
- SC-03: Filtrar clientes por tag + estado CRM devolve resultados correctos em menos de 2 segundos
- SC-04: Criar campanha WhatsApp a partir de um filtro de tag leva a mensagens no estado "pendente" em menos de 30 segundos
- SC-05: Tags automáticas de actividade reflectem sempre a última sessão real (sem acção manual)
- SC-06: Clientes com tag de saúde bloqueante são sempre excluídos dos envios automáticos (0 excepções)
- SC-07: O catálogo inicial de 14 tags está disponível sem configuração adicional após deploy

---

## Âmbito — O que está FORA

- Notificações push ou email por alteração de tag
- Histórico de alterações de tags por cliente
- Permissões diferenciadas por tipo de tag
- Exportação de listas para Excel/CSV (spec futura)
- Tags partilhadas entre múltiplos negócios/terapeutas

---

## Dependências e Assunções

- `Etiqueta` e `ClienteEtiqueta` já existem no schema — serão estendidos (não recriados)
- `GiftCard` já existe (Spec 004)
- `MensagemIA` e o fluxo de aprovação/envio já existem — a campanha segmentada reutiliza-os
- O motor de reengagement automático (cron N8N) precisa de ser actualizado para verificar tags bloqueantes
- A Bea cria tags no perfil do cliente (não numa página separada prévia)
- O fluxo de campanha: filtrar → criar → aprovar individualmente → enviar (não disparo directo sem aprovação)
