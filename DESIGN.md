---
name: Essence Wellness CRM
description: "Quiet luxury operativo para uma terapeuta no iPad: midnight, osso e champanhe velado como único metal."
colors:
  midnight: "#161a26"
  deep-night: "#0e1119"
  overlay: "#1f2433"
  bone: "#ece6d6"
  bone-soft: "#d8d2c2"
  champanhe-velado: "#d4b886"
  champanhe-velado-soft: "#b9a07a"
  smoke: "#7a7e8a"
  smoke-deep: "#4d5260"
  paper: "#f6f1e5"
  paper-deep: "#ebe5d4"
  sage: "#a0a996"
  sage-on-paper: "#5f6b52"
  destructive: "#b06050"
  destructive-on-paper: "#9a5b50"
  smoke-on-paper: "#6b6047"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "0"
  figure:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  nav:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 460
    letterSpacing: "0.01em"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 500
    letterSpacing: "0.30em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
  pill: "100px"
spacing:
  sm: "8px"
  md: "14px"
  lg: "22px"
  xl: "28px"
components:
  card-kpi:
    backgroundColor: "{colors.overlay}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sm}"
    padding: "22px 24px 20px"
  button-primary:
    backgroundColor: "{colors.champanhe-velado}"
    textColor: "{colors.midnight}"
    rounded: "{rounded.sm}"
    height: "32px"
  input:
    backgroundColor: "{colors.overlay}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sm}"
  nav-link:
    textColor: "{colors.bone-soft}"
    typography: "{typography.nav}"
    padding: "8px 12px"
  nav-link-active:
    backgroundColor: "rgba(212,184,134,0.08)"
    textColor: "{colors.bone}"
  badge-count:
    backgroundColor: "{colors.champanhe-velado}"
    textColor: "{colors.midnight}"
    height: "18px"
    padding: "0 4px"
---

# Design System: Essence Wellness CRM

## Overview

**Creative North Star: "A Sala Silenciosa"**

O CRM é uma sala de tratamento de noite: baixa, quente, sem ruído. A interface desaparece e fica a tarefa da Bea, que usa o iPad entre sessões, em pé e com pouco tempo. O escuro é o padrão (midnight e osso, com o champanhe velado como único metal); o modo claro em papel é uma escolha da utilizadora, com os mesmos nomes de token e outros valores.

A densidade é operativa, mas calma: fios finos em vez de caixas pesadas, tipografia serifada só para títulos e números que merecem peso, e movimento discreto que confirma o que aconteceu em vez de decorar. Direcção declarada no código: Aēsop, Aman, Sisley Paris, Kinfolk.

Rejeitado pelo Nuno: neon e aspecto tecnológico, clínico ou hospitalar, e tudo o que seja espalhafatoso (animação e cor a competir com a tarefa).

**Key Characteristics:**
- Um só metal: o champanhe velado, raro e nunca decorativo.
- Cantos quase rectos (2px) e fios finos em vez de sombras pesadas.
- Títulos e números em serifa (DM Serif Display); tudo o resto em Manrope.
- Movimento de feedback e continuidade; nunca coreografia de carregamento.
- Escuro por omissão, claro (paper) por escolha, ambos com os mesmos tokens semânticos.

## Colors

Paleta contida: duas famílias de superfície, um acento e cores de estado suaves.

### Primary
- **Champanhe Velado** (#d4b886 no escuro, #b9a07a no claro): a única cor de acento. Acções primárias, item activo, foco, contadores, hairline no topo dos cartões. Variante suave `champanhe-velado-soft` (#b9a07a) para etiquetas e rótulos.

### Neutral
- **Meia-Noite** (#161a26): fundo principal, a base de toda a interface no escuro.
- **Noite Profunda** (#0e1119): barra lateral e zonas mais fundas.
- **Sobreposição** (#1f2433): cartões, campos, menus e janelas sobre a meia-noite.
- **Osso** (#ece6d6): texto principal e títulos. **Osso Suave** (#d8d2c2): corpo de texto.
- **Fumo** (#7a7e8a): texto secundário, com regra de tamanho (ver abaixo). **Fumo Profundo** (#4d5260): fios e divisores, nunca texto.
- **Papel** (#f6f1e5) e **Papel Fundo** (#ebe5d4): superfícies do modo claro e o mesmo par usado nos formulários públicos.

### Estado
- **Salva** (#a0a996, e #5f6b52 sobre papel): positivo e confirmado.
- **Destrutivo** (#b06050, e #9a5b50 sobre papel): apagar, erro, urgência real.
- No modo claro, o texto secundário passa a #6b6047 (`smoke-on-paper`).

### Named Rules
**A Regra do Metal Único.** O champanhe velado aparece em poucos elementos por ecrã (acção principal, item activo, foco). A raridade é a marca.

**A Regra do Fumo.** O `smoke` (#7a7e8a) só serve texto a partir de 18px (ou 14px com peso 600). Texto pequeno usa `bone-soft`. Regra herdada da auditoria de acessibilidade do NUIT.

## Typography

**Display Font:** DM Serif Display (400, normal e itálico), com Georgia como recurso
**Body Font:** Manrope (300 a 700), com system-ui como recurso

**Character:** uma serifa editorial que dá peso a títulos e números, contra uma sans humanista e neutra para tudo o que se lê e se toca.

### Hierarchy
- **Display** (400, 30px, 1.04, 26px em ecrã estreito): título de cada página.
- **Figure** (400, 34px, 1, tracking -0.02em): números grandes dos cartões de indicadores.
- **Body** (400, 13px, 1.6): texto corrido e campos. Medida de leitura entre 65 e 75ch quando é prosa.
- **Nav** (peso 460 fixo, 12.5px, tracking 0.01em): itens de navegação. O peso não muda entre activo e inactivo, para o texto nunca saltar.
- **Label** (500, 9px a 11px, tracking 0.30em a 0.32em, maiúsculas, `champanhe-velado-soft`): rótulos de secção e de cartões, já presentes em todo o CRM.

O tamanho base escala com a preferência da utilizadora (`--ui-font-scale`: 1, 1.02, 1.10 ou 1.18). Campos de formulário nunca descem de 16px, para o Safari do iPad não fazer zoom.

### Named Rules
**A Regra do Peso Fixo.** O peso da letra nunca muda com o estado activo; a distinção faz-se pela cor.

## Layout

Casca fixa: barra lateral de 216px, colante, a partir de 1024px; abaixo disso, uma barra inferior de 60px com gaveta para o resto. O conteúdo é centrado, com largura máxima de 1560px e margens de 16px, 24px e 32px conforme o ecrã. O cabeçalho de página deixa 28px até ao conteúdo; grelhas de cartões usam 14px de intervalo (quatro colunas para indicadores). O ritmo interno é de 8px, 14px, 22px e 28px.

Estruturalmente responsivo: a navegação, as grelhas e as tabelas reorganizam-se; o texto não usa tipografia fluida.

## Elevation & Depth

Profundidade por camadas tonais (deep-night, midnight, overlay) separadas por fios finos, com sombra suave só em resposta a estado (hover) e em janelas sobrepostas. O fundo da casca tem um gradiente subtil de champanhe e uma grelha ténue de 44px a baixa opacidade; é parte do sistema actual.

### Shadow Vocabulary
- **Repouso** (`0 1px 2px rgba(0,0,0,0.30), 0 1px 1px rgba(0,0,0,0.20)`; no claro, tinta a 10%): cartões.
- **Elevado** (`0 8px 24px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.25)`): hover de cartões, menus.
- **Sobreposição** (`0 30px 60px rgba(0,0,0,0.55), 0 10px 20px rgba(0,0,0,0.30)`): janelas modais e gaveta.

### Fios
`rule` (champanhe a 30%), `rule-soft` (a 16%) e `rule-bone` (osso a 16%). No claro, os fios finos passam a tinta a 10%.

### Named Rules
**A Regra da Sombra Funda.** As sombras são profundas e neutras, nunca coloridas. Os brilhos coloridos que existem nos botões `btn-lift`, `btn-approve` e `btn-reject` são herança e não se repetem em componentes novos.

## Shapes

Cantos quase rectos: 2px por omissão (`--radius`, "NUIT é sharp"), 4px e 8px em elementos internos e menus, pílulas de 100px para etiquetas e círculos para avatares. Fios de 1px em champanhe a 16% definem contornos; nunca um `border-left` colorido grosso, e o marcador activo da navegação usa um traço interior de 2px que não ocupa espaço.

## Components

Refinados e contidos, com toque generoso: aspecto discreto, alvos grandes para o dedo.

### Buttons
- **Shape:** 2px de raio, sem sombra em repouso.
- **Primary:** fundo champanhe velado, texto meia-noite; a altura por omissão do componente é 32px (mais pequena do que o alvo de toque ideal).
- **Hover / Focus:** levantar 1px ou 2px e resposta ao clique (`scale 0.97`); foco visível com anel champanhe a 35%.
- **Ghost / Outline:** fundo transparente e fio champanhe; `hover` acende um fundo champanhe a 5%.

### Cards / Containers (indicadores)
- **Corner Style:** 2px. **Background:** overlay. **Border:** 1px champanhe a 16%, com um fio de 1px no topo na cor do indicador (opacidade 45%).
- **Padding:** 22px 24px 20px. Número grande em serifa, rótulo em maiúsculas espaçadas.

### Inputs / Fields
- **Style:** fundo overlay, contorno fino, 16px no mínimo.
- **Focus:** contorno champanhe a 60% e halo de 3px a 12%; nunca sem indicador de foco.
- **Saved:** um flash de champanhe a 22% que esmorece em 900ms confirma a gravação de um campo.

### Navigation
- **Lateral (desktop):** itens de 8px 12px, ícone de 14px em traço 1.5. O item activo tem um marcador partilhado que desliza (fundo champanhe a 8% e traço interior de 2px) e um traço fino por baixo que se desenha ao passar o rato.
- **Inferior (telemóvel/iPad estreito):** quatro destinos e um "Menu" que abre uma gaveta; o activo é marcado por uma linha champanhe no topo do item.
- **Etiquetas de contagem:** fundo champanhe, texto meia-noite, 18px de altura.

### Motion
Movimento serve estado e continuidade. Feedback imediato entre 150 e 200ms; mudanças de estado 280ms; entradas 420 a 550ms com desaceleração exponencial `cubic-bezier(0.22, 1, 0.36, 1)`; saídas mais rápidas que as entradas. Respeita `prefers-reduced-motion`: fica só cor e opacidade. Sem coreografia de carregamento; o CRM abre numa tarefa.

## Do's and Don'ts

### Do:
- **Do** usar o champanhe velado só para a acção principal, o item activo e o foco.
- **Do** dar aos alvos de toque das acções frequentes pelo menos 44px, porque a Bea usa o iPad com uma mão.
- **Do** ligar todo o texto pequeno a `bone-soft` (ou `bone`); o `smoke` só a partir de 18px.
- **Do** manter o peso da letra fixo entre estados e mudar só a cor.
- **Do** usar os mesmos nomes de token nos dois modos e trocar só os valores.
- **Do** dar sempre uma alternativa de movimento reduzido: cor, opacidade e estado ficam, o deslocamento sai.

### Don't:
- **Don't** usar gradientes, brilhos ou efeitos que evoquem tecnologia ou neon.
- **Don't** usar branco frio, ícones médicos ou qualquer tom de consultório.
- **Don't** deixar animação ou cor competir com a tarefa; nada que distraia entre sessões.
- **Don't** usar `border-left` colorido grosso, nem cartões dentro de cartões.
- **Don't** introduzir sombras coloridas novas nem sombras duras deslocadas.
- **Don't** usar a palavra "você" nem tom corporativo em texto de interface; português europeu, calmo, directo.
