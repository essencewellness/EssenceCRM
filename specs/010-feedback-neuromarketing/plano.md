# Plano — Feedback pós-sessão orientado a neuromarketing e recorrência

Estado: **implementado e publicado** · 2026-07-31

> **Revisão 2 (mesma data):** troca das estrelas 1-5 por uma escala estilo
> NPS (0-10), mais informal e centrada na cliente, e aplicação mais
> profunda dos 7 princípios de Cialdini (não só compromisso/consistência).
> Ver secções 2.9 e 3 atualizadas.

## 1. Porque o formulário atual não chega

O `feedback.html` atual (após a passagem de CRO) já reduz atrito, mas é um
formulário de **medição** — pergunta "como correu?" e regista a resposta.
Não faz nada para **construir a decisão de voltar**. Ele recolhe intenção
("quando gostavas de voltar?") mas nunca pede à cliente para se comprometer
com essa intenção nem transforma isso numa ação concreta (marcação).

A pesquisa mostra que isto é a diferença entre um formulário que *mede*
satisfação e um que *gera* recorrência.

## 2. Base científica (com fontes)

### 2.1 Compromisso e Consistência (Cialdini)
Uma vez que uma pessoa investe esforço numa decisão — mesmo pequena — sente
pressão interna para se manter consistente com ela. Funciona melhor como
**série de pequenos compromissos progressivos**, não um pedido grande de
início.
[Cialdini's Consistency Principle](https://www.roeltimmermans.com/ecommerce/cialdini-consistency-principle-guide) · [Commitment & Consistency](https://www.cognitigence.com/blog/commitment-and-consistency-principle)

**Aplicação:** o formulário já faz isto parcialmente (estrelas → chips →
recorrência). Falta o último degrau: transformar a intenção em compromisso
escrito e, já agora, num pedido de marcação.

### 2.2 Persuasão auto-gerada (self-generated persuasion)
Pessoas que **escrevem por palavras próprias** porque vão fazer algo têm
intenção mais forte e mais follow-through do que pessoas a quem é dito
porque deveriam fazê-lo. Vendedores que ajudam o cliente a descobrir as
próprias razões enfrentam zero resistência — a cliente não discute consigo
própria.
[Self-Generated Persuasion (PubMed)](https://pubmed.ncbi.nlm.nih.gov/22352326/) · [Self-persuasion as marketing technique](https://www.emerald.com/ejm/article/51/5-6/1075/85379/Self-persuasion-as-marketing-technique-the-role-of)

**Aplicação:** em vez de só perguntar "quando queres voltar" (escolha
passiva), pedir um micro-texto: *"Numa frase — porque vale a pena voltares?"*
É a cliente a convencer-se a si mesma, não a Essence a convencê-la.

### 2.3 Compromisso escrito > verbal
Compromissos escritos são ~23% mais eficazes do que verbais a prever
comportamento futuro, porque exigem mais esforço e ficam como registo
tangível. O compromisso é mais vinculativo quando é **ativo, público e
esforçado**.
[Forms of Commitment (Journal of Legal Studies)](https://www.journals.uchicago.edu/doi/10.1086/737229)

**Aplicação:** a frase que a cliente escreve não é só armazenada — é
**mostrada de volta a ela** no ecrã seguinte ("Guardámos isto: *[a frase
dela]*"), reforçando que é dela, escrita, e registada.

### 2.4 Implementation intentions ("se X, então Y")
Planos do tipo "se acontecer X, farei Y" fazem as pessoas concretizarem
objetivos 2 a 3 vezes mais do que só ter a intenção. Um plano vago ("quero
voltar") raramente vira ação; um plano específico ("dia 15, às 18h") quase
sempre vira.
[Gollwitzer & Sheeran meta-análise, d=0.65](https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/)

**Aplicação:** depois da cliente escolher "daqui a 2 semanas", oferecer
logo a opção de a Beatriz **já a contactar para marcar** essa data
específica — passa de intenção vaga a compromisso concreto no mesmo fluxo,
sem a cliente ter de voltar a abrir o WhatsApp mais tarde (quando a
motivação já arrefeceu).

### 2.5 Peak-End Rule (Kahneman)
As pessoas avaliam uma experiência pelo momento mais intenso (peak) e pelo
fim — não pela média. O que a cliente **lembra** da sessão é moldável pelo
que lhe pedimos para relembrar no momento certo.
[Peak-End Rule em CX](https://www.yotpo.com/blog/the-peak-end-rule-in-cx/)

**Aplicação:** antes de pedir a avaliação Google, perguntar qual foi "o
momento em que sentiste mais alívio" — isto faz a cliente reviver
ativamente o pico positivo da sessão mesmo antes de escrever a review ou
de decidir voltar. Também nos diz qual técnica/serviço teve mais impacto,
dado accionável para a Beatriz.

### 2.6 Rotulagem de identidade (labeling / altercasting)
Quando alguém é rotulado com um traço ("és o tipo de pessoa que cuida de
si"), tende a agir de forma consistente com esse rótulo nas decisões
seguintes. "Um corredor" tem mais probabilidade de correr uma maratona do
que "alguém que corre".
[The Power of Labeling](https://cerebralselling.com/the-power-of-labeling/)

**Aplicação:** o ecrã final não diz só "obrigada" — reforça uma identidade
("és das nossas clientes que sabem cuidar de si primeiro") ligada
diretamente ao hábito de voltar.

### 2.7 Goal-Gradient Effect
O esforço e a motivação aumentam à medida que a pessoa se aproxima do fim
de uma tarefa — indicadores visuais de progresso (mesmo que discretos)
aumentam a taxa de conclusão.
[Goal-Gradient Effect](https://blog.logrocket.com/ux-design/goal-gradient-effect/)

**Aplicação:** pontos de progresso subtis (não uma barra %) nos 3-4 ecrãs
do fluxo positivo, para a cliente sentir que está quase a terminar.

### 2.8 Lógica de ramificação (branching) reduz abandono
Formulários que só mostram perguntas relevantes ao que a pessoa já
respondeu têm mais conclusão do que formulários lineares — mas a lógica
tem de ser simples, não uma árvore complexa.
[Skip Logic & Branching](https://qualaroo.com/blog/skip-logic-survey/)

**Aplicação:** manter a regra atual (positivo vs. negativo) e acrescentar
**no máximo mais uma bifurcação** — não construir uma árvore de decisão
complicada.

### 2.9 Escala estilo NPS (Net Promoter Score) — informal e centrada na pessoa

O NPS clássico pergunta "de 0 a 10, o quanto recomendarias X a um
amigo/colega?" e segmenta em três grupos:

- **Promotores (9-10)** — leais, entusiastas, avançam sozinhos para
  recomendar
- **Passivos (7-8)** — satisfeitos mas não fidelizados, fáceis de perder
  para a concorrência
- **Detratores (0-6)** — insatisfeitos, risco real de não voltar

[NPS segmentation guide](https://www.omniconvert.com/blog/promoters-passives-detractors-nps/) · [Net Promoter Score question best practices](https://www.totango.com/blog/what-to-do-after-asking-the-nps-question)

**Porque isto é melhor do que as 5 estrelas:**
- As estrelas só medem satisfação. O NPS mede **intenção de recomendar** —
  que é o que realmente move recorrência e novas clientes por passa-palavra.
- Dá-nos 3 grupos, não 2 — o que significa um caminho dedicado para quem
  está "satisfeita mas não fidelizada" (passivos), que hoje é tratada
  exatamente como uma promotora e recebe o mesmo pedido agressivo de review
  Google — o que não faz sentido e pode até incomodar.

**Mas o pedido de "recomendarias a uma amiga" pode soar frio/corporativo.**
Por isso a pergunta em `feedback.html` não vai usar a palavra "recomendar"
nem "NPS" — fica: *"De 0 a 10 — quanto gostavas que uma amiga tua vivesse
isto também?"*. Mesma escala, mesmo poder de segmentação, mas em registo
de cuidado, não de métrica de negócio.

### 2.10 Os 7 princípios de Cialdini (Influence) aplicados um a um

O livro identifica 7 gatilhos de persuasão. Já cobrimos Compromisso e
Consistência (secção 2.1). Os outros 6, aplicados a este formulário:

**Reciprocidade** — as pessoas sentem-se compelidas a retribuir algo que
receberam primeiro, mesmo não pedido.
[Cialdini's 7 Principles](https://www.suebehaviouraldesign.com/en/blog/cialdini-principles-of-persuasion/)
→ **Aplicação:** depois de a cliente escolher o "momento de mais alívio",
o formulário dá-lhe algo de volta — uma mini-dica pessoal da Beatriz
ligada a essa escolha (ex.: escolheu "o calor" → "um duche morno antes de
dormir prolonga esse efeito") — **antes** de pedir a review Google ou o
compromisso de regresso. A cliente recebe valor primeiro.

**Prova social** — em situações de incerteza, as pessoas seguem o
comportamento dos outros. **Importante:** nunca inventar números
("9 em cada 10 clientes...") sem dados reais — isso seria enganoso. Usar
prova social qualitativa e verdadeira: "cada review ajuda outra pessoa a
encontrar-nos, tal como tu encontraste".

**Autoridade** — as pessoas confiam mais em quem tem competência
reconhecida. → **Aplicação:** o ecrã de sugestão de regresso já se chama
"Retorno Recomendado" no perfil da sessão (existe no CRM). No formulário,
a sugestão de marcação pode assinar-se como vinda da Beatriz
("sugestão da Beatriz"), não do "sistema".

**Simpatia (liking)** — persuade mais quem gostamos, sobretudo alguém
próximo/semelhante/que coopera connosco. → **Aplicação:** manter o tom
pessoal já existente (assinatura Flora/Beatriz, nunca "sistema"); usar o
primeiro nome da cliente quando disponível (hoje o formulário não pede o
nome nem o carrega — ficaria para uma fase técnica seguinte, não
bloqueante para este plano).

**Escassez** — as pessoas valorizam mais o que é raro ou está prestes a
esgotar. → **Aplicação: só se for verdade.** Nunca fabricar urgência falsa
("só restam 2 vagas!" quando não é verdade) — isso viola a confiança que
o resto do formulário está a construir. Se a Beatriz tiver mesmo poucos
horários livres nalguns dias, podemos refletir isso na sugestão de
marcação de forma honesta ("as sextas à tarde costumam encher primeiro").
Ficaria como opção a validar contigo, nunca automática por defeito.

**Unidade** — identidade partilhada ("nós": família, comunidade, tribo)
persuade mais do que simples semelhança.
[Unity — o 7º princípio](https://news.wpcarey.asu.edu/20250422-gentle-science-persuasion-part-seven-unity)
→ **Aplicação:** o ecrã final já usa rotulagem de identidade (secção 2.6);
reforça-se com linguagem de pertença — "a comunidade Essence", não "os
nossos clientes" (que soa a "eles e nós").

## 3. Fluxo proposto (revisto — 3 ramos estilo NPS)

```
"De 0 a 10 — quanto gostavas que uma amiga tua vivesse isto também?"
   │
   ├── 0–6 (DETRATOR) → NEGATIVO
   │           │
   │           ├── "O que poderíamos ter feito melhor?" (já existe)
   │           ├── "O que precisarias sentir para teres vontade de
   │           │    voltar?" (texto livre, opcional) — self-generated,
   │           │    mas em registo honesto/privado, SEM nenhuma técnica
   │           │    de compromisso público (seria antiético empurrar
   │           │    quem teve má experiência)
   │           └── Envia → alerta privado à Bea (como já existe)
   │
   ├── 7–8 (PASSIVO) → caminho leve, sem pedido de review pública
   │           │
   │           ├── ECRÃ — "O que faltou para ser um 10?" (texto livre,
   │           │    opcional) — pergunta clássica de follow-up para
   │           │    passivos, específica e accionável
   │           ├── ECRÃ — "Quando gostavas de voltar?" + interesse de
   │           │    serviço (igual ao ramo promotor, sem o ecrã de
   │           │    pedido de contacto — ainda não ganhou esse nível
   │           │    de compromisso)
   │           └── Envia → sem alerta negativo, sem review pública
   │
   └── 9–10 (PROMOTOR) → caminho completo
               │
               ├── ECRÃ 1 — "O que mais gostaste?" (chips, já existe)
               │
               ├── ECRÃ 2 — "Qual foi o momento em que sentiste mais
               │    alívio?" (chips) → ancora o peak-end, dado accionável
               │
               ├── ECRÃ 2b — NOVO (Reciprocidade): mini-dica pessoal da
               │    Beatriz ligada à escolha do ecrã 2 — a Essence dá
               │    algo primeiro, antes de pedir seja o que for
               │
               ├── ECRÃ 3 — Avaliação Google (já existe; copy passa a
               │    ter prova social qualitativa e verdadeira, nunca
               │    números inventados)
               │
               ├── ECRÃ 4 — "Numa frase — porque vale a pena voltares?"
               │    (self-generated commitment)
               │    ↓ ecrã seguinte MOSTRA de volta a frase dela
               │    (compromisso escrito)
               │
               ├── ECRÃ 5 — "Quando gostavas de voltar?" + interesse de
               │    serviço (já existe)
               │
               ├── ECRÃ 6 — condicional (só se ecrã 5 ≠ "ainda não
               │    sei"): "Queres que a Beatriz já trate da tua
               │    marcação?" — implementation intention concreta,
               │    vira lead quente via webhook
               │
               └── ECRÃ FINAL — rotulagem de identidade + linguagem de
                    unidade ("comunidade Essence")
```

**Porque 3 ramos e não 2:** a pesquisa de branching logic diz para manter
a lógica simples — e continua simples: é uma decisão por faixa de
pontuação (0-6 / 7-8 / 9-10), não uma árvore de condições cruzadas. O
ganho é real: hoje uma cliente com experiência "ok mas não incrível"
(passiva) recebe o mesmo pedido de review pública que uma entusiasta —
o que nem é eficaz (ela pode nem responder) nem é o ideal para uma marca
que se quer genuína.

Caminho promotor: 6 ecrãs completos. Caminho passivo: 2 ecrãs. Caminho
detrator: 2 ecrãs (igual ao já existente + 1 pergunta nova).

## 4. Dados novos a capturar

| Campo | Tipo | Ramo | Uso |
|---|---|---|---|
| `npsScore` | int 0-10 | Todos | Substitui/complementa `rating`; segmenta promotor/passivo/detrator |
| `momentoPico` | string (chip único) | Promotor | Saber que técnica/detalhe gerar mais nas próximas sessões |
| `motivoRegresso` | string (texto curto, max ~200) | Promotor | Compromisso auto-gerado — usar depois em mensagens de reativação IA |
| `pedidoContactoMarcacao` | boolean | Promotor (condicional) | Dispara webhook novo `feedback.pedido_contacto` |
| `faltaParaDez` | string (texto curto) | Passivo | Follow-up accionável clássico do NPS — o que falta para fidelizar |

Todos os campos são opcionais — nenhum bloqueia o envio do formulário.

### 4.1 Decisão em aberto — como o `npsScore` convive com o `rating` existente

O campo `rating` (1-5) já existe, tem dados históricos, e é usado para
`encaminhadoGoogle = rating >= 4` e no dashboard. Trocar simplesmente a
escala partiria essa semântica a meio da tabela (linhas antigas em 1-5,
linhas novas teoricamente em 0-10 misturadas na mesma coluna).

**Proposta:** adicionar `npsScore` como coluna nova (0-10, a fonte de
verdade a partir de agora), e continuar a preencher `rating` com um
mapeamento automático para não quebrar nada que já lê esse campo:

| npsScore | rating derivado |
|---|---|
| 9-10 | 5 |
| 7-8 | 4 |
| 4-6 | 3 |
| 2-3 | 2 |
| 0-1 | 1 |

Isto mantém `encaminhadoGoogle = rating >= 4` a funcionar sem alterações,
e o dashboard continua a ler `rating` sem saber que mudou nada por trás.
**A confirmar contigo antes de implementar.**

## 5. Novo webhook

`feedback.pedido_contacto` — disparado só quando `pedidoContactoMarcacao = true`.
Payload: `clienteId`, `nomeCliente`, `telefone`, `quandoVoltar`,
`interesseServico`, `motivoRegresso`. Isto é o gancho direto para a fase 2
do roadmap (mensagens com IA) — a IA já teria a razão da cliente nas
próprias palavras para personalizar a mensagem de remarcação.

## 6. Ecrã de Indicações (revisão 3, pedido do Nuno) + espaço de Leads no CRM

> Isto liga-se diretamente ao programa já existente **"O Miminho"**
> (`08_REATIVACAO_CLIENTES/12-programa-referral-e-indicacoes.md`): quem
> indica uma amiga que venha a marcar recebe um mini ritual de pés grátis
> na visita seguinte. Hoje esse programa não tem nenhum ponto de captura
> digital — vive só em mensagens manuais da Beatriz. Este ecrã é o
> primeiro ponto de captura automático.

### 6.1 O ecrã

Aparece logo a seguir ao ecrã de pontuação (0-10), **sempre que a
pontuação for ≥ 6** — antes de o formulário continuar pelo caminho
normal (promotor/passivo/detrator, que se mantém exatamente como já
desenhado). Pede até 3 amigas (nome + WhatsApp), **cada uma
individualmente opcional**, com um botão claro para saltar sem preencher
nada.

Copy proposta:
- Título: *"Conheces alguém que também merecia este momento?"*
- Sub-texto: *"Totalmente opcional — só se te apetecer. Podes deixar 1, 2, 3 ou nenhuma."*
- 3 pares de campos (Nome / WhatsApp), claramente rotulados "opcional"
- Botão principal: "Indicar ✦" (só ativo se pelo menos 1 nome preenchido)
- Botão secundário, sempre visível: "Prefiro não indicar agora"

**Porque a pontuação ≥ 6 e não só promotoras (9-10):** foi decisão tua
explícita — alguém que dá um 6, 7 ou 8 também pode ter uma amiga em mente,
e não faz mal perguntar num tom leve e sem pressão, já que é opcional.

### 6.2 O que acontece a cada amiga indicada

Cada nome+telefone preenchido cria um novo registo `Cliente` com:
- `estado = "lead"` (o mesmo estado que já existe e já aparece em
  `/clientes` e `/pipeline` — não é preciso inventar um estado novo)
- `comoNosConheceu = "indicacao"` (valor que **já existe** no schema,
  documentado em `12-programa-referral-e-indicacoes.md` — só nunca foi
  preenchido automaticamente até agora)
- `indicadoPorId` — **campo novo**, auto-relação para o `Cliente` que
  fez o feedback. É isto que permite ao CRM saber quem indicou quem, e à
  Beatriz saber quem tem um mini ritual de pés por dar.

### 6.3 Espaço de Leads no CRM (dashboard)

Hoje os leads (`estado = "lead"`) só aparecem misturados dentro de
`/clientes` e `/pipeline` — não há nenhum sítio dedicado a triá-los.
Proposta: página nova `/leads` no dashboard, mostrando só clientes com
`estado = "lead"`, agrupados/filtráveis por `comoNosConheceu`:

| Origem | Como chega hoje |
|---|---|
| Indicação | **Novo** — vem automaticamente deste ecrã |
| LP Drenagem / outras landing pages | Já existe, via `/api/v1/public/lead` |
| Manual | **Novo** — botão "adicionar lead" na própria página, para quando alguém pergunta pelo WhatsApp/Instagram e depois não responde mais nada, e a Bea quer guardar o contacto na mesma |

Na ficha de cada cliente que já é cliente ativa, passa a aparecer também
"Indicou: [lista de nomes]" — para a Beatriz saber, sessão a sessão,
quem ainda tem um mimo por dar.

**O que fica fora deste MVP, de propósito:** rastreio automático de
"o miminho já foi dado" (checkbox/data). A Bea decide isso caso a caso,
como já descrito no documento do programa — automatizar isso agora seria
construir para um problema que ainda não existe.

### 6.4 Novo webhook

Reaproveita-se `lead.criado` (já existe em `lib/webhooks.ts`), só
acrescentando `indicadoPorNome` ao payload quando aplicável — não é
preciso um webhook novo de propósito.

## 7. O que NÃO muda

- Fluxo negativo mantém-se privado e sem técnicas de compromisso — seria
  antiético empurrar alguém insatisfeita para um compromisso público.
- Tema visual NUIT dark, tipografia e marca mantêm-se.
- Nenhum campo obrigatório novo — tudo opcional, na linha do que já existe.
- `pontosPositivos`, `pontosMelhorar`, `comentario`, `quandoVoltar`,
  `interesseServico` mantêm-se tal como estão.

## 8. Fases de implementação (propostas, atualizado)

1. **Schema** — coluna `npsScore` (int 0-10) + `momentoPico` +
   `motivoRegresso` + `pedidoContactoMarcacao` + `faltaParaDez` em
   `Feedback`; `indicadoPorId` (self-relation) em `Cliente` +
   `lib/validations.ts` + `lib/webhooks.ts`.
2. **`feedback.html` final** — escala NPS, 3 ramos, ecrã de reciprocidade,
   ecrã de indicações, tudo o que já está validado no protótipo.
3. **Endpoint de indicação** — `POST /api/v1/public/indicacao` (ou
   reaproveitar `/public/lead` com um campo `indicadoPorId`).
4. **Página `/leads` no dashboard** — lista + filtro por origem + botão
   "adicionar lead manual".
5. **Teste manual completo** — os 3 ramos (promotor/passivo/detrator) +
   indicações + os 2 espaços de leads (automático e manual).
6. **Documentar no N8N** — `feedback.pedido_contacto` e o fluxo de
   `lead.criado` com origem "indicacao" ficam marcados como "por
   construir" até ligares isso a notificações reais para a Bea.

## Sources
- [Cialdini's Consistency Principle: Impact of Tiny Commitments](https://www.roeltimmermans.com/ecommerce/cialdini-consistency-principle-guide)
- [Commitment & Consistency Principle](https://www.cognitigence.com/blog/commitment-and-consistency-principle)
- [Self-Generated Persuasion (PubMed)](https://pubmed.ncbi.nlm.nih.gov/22352326/)
- [Self-persuasion as marketing technique](https://www.emerald.com/ejm/article/51/5-6/1075/85379/Self-persuasion-as-marketing-technique-the-role-of)
- [Forms of Commitment: Written vs Verbal](https://www.journals.uchicago.edu/doi/10.1086/737229)
- [Implementation Intentions — Gollwitzer & Sheeran meta-analysis](https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/)
- [Implementation intention — Wikipedia](https://en.wikipedia.org/wiki/Implementation_intention)
- [The Peak-End Rule In CX](https://www.yotpo.com/blog/the-peak-end-rule-in-cx/)
- [The Power of Labeling](https://cerebralselling.com/the-power-of-labeling/)
- [Goal-Gradient Effect](https://blog.logrocket.com/ux-design/goal-gradient-effect/)
- [Skip Logic: Why Surveys Get Abandoned](https://qualaroo.com/blog/skip-logic-survey/)
- [Foot In The Door Technique](https://cxl.com/blog/foot-in-the-door-technique/)
