# Data Model — Sistema de Tags Dinâmicas (Spec 005)

## Alterações ao schema Prisma

### 1. Novo Enum `TipoEtiqueta`

```prisma
enum TipoEtiqueta {
  saude        // condição clínica — pode bloquear automações
  campanha     // interesse/segmento para campanhas WhatsApp
  preferencia  // preferência pessoal da cliente
  automatica   // calculada pelo sistema (vouchers); nunca editável pela Bea
}
```

### 2. Modelo `Etiqueta` — extensão

**Campos adicionados:**

| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `tipo` | `TipoEtiqueta` | `campanha` | Categoria da tag |
| `bloqueiaAutomacoes` | `Boolean` | `false` | Se `true` e tipo=`saude`, exclui cliente de envios automáticos |

**Schema resultante:**

```prisma
model Etiqueta {
  id                 String            @id @default(cuid())
  nome               String            @unique
  cor                String            @default("#b9a07a")
  tipo               TipoEtiqueta      @default(campanha)
  bloqueiaAutomacoes Boolean           @default(false)
  clientes           ClienteEtiqueta[]

  @@index([tipo])
  @@index([bloqueiaAutomacoes])
}
```

### 3. Modelo `ClienteEtiqueta` — sem alteração

O modelo join existente é suficiente. Não é necessário adicionar metadata (data de atribuição, quem atribuiu) nesta fase.

### 4. Modelo `Cliente` — sem alteração

O campo `estado: EstadoCliente` já existe. A edição inline do estado usa `prisma.cliente.update` directo via Server Action.

### 5. Modelo `GiftCard` — sem alteração ao schema

As auto-tags de voucher são criadas programaticamente como registos `ClienteEtiqueta` quando:
- `GiftCard` é criado com `beneficiarioTelefone` que existe em `Cliente.telefone` → tag "Voucher ativo"
- `GiftCard.estado` passa para `usado` com `clienteId` preenchido → tag "Voucher ativo" removida, "Voucher usado" adicionada

---

## Auto-tags de Actividade (calculadas, não stored)

| Badge | Condição | Cor |
|---|---|---|
| Ativa < 30 dias | `ultimaSessao` há ≤ 30 dias | `#7a9e7e` |
| Inativa 30–60 dias | `ultimaSessao` há 31–60 dias | `#d4956b` |
| Inativa 60–90 dias | `ultimaSessao` há 61–90 dias | `#b06050` |
| Inativa 90+ dias | `ultimaSessao` há > 90 dias | `#9d9d9a` |
| Sem sessões | `ultimaSessao` é null | `#9d9d9a` |

Implementadas como função pura em `lib/etiquetas.ts`:

```typescript
export function calcularTagActividade(ultimaSessao: Date | string | null): {
  label: string; cor: string; dias: number | null
} { ... }
```

---

## Catálogo inicial de tags (seed)

Criado via `prisma/seed-tags.ts` (ou incluído no `seed-demo.ts`):

### Saúde — bloqueiaAutomacoes: true

| Nome | Cor |
|---|---|
| Grávida | `#9b72cf` |
| Pós-parto | `#9b72cf` |
| Pós-operatório | `#6d7fcc` |

### Saúde — bloqueiaAutomacoes: false

| Nome | Cor |
|---|---|
| Lesão ativa | `#d4956b` |
| Fibromialgia | `#d4956b` |
| Tensão crónica | `#b9a07a` |

### Campanha

| Nome | Cor |
|---|---|
| Massagem de Casal | `#b9a07a` |
| Puro Aroma | `#7a9e7e` |
| Pack 3 Sessões | `#a0a996` |
| Drenagem Linfática | `#4d9ab0` |
| Primeira vez | `#a0a996` |

### Preferência

| Nome | Cor |
|---|---|
| Só aromaterapia | `#7a9e7e` |
| Prefere manhãs | `#a0a996` |
| Prefere tardes | `#a0a996` |
| Não quer contacto automático | `#b06050` |

### Automáticas (sistema)

| Nome | Cor |
|---|---|
| Voucher ativo | `#4d9ab0` |
| Voucher usado | `#a0a996` |

---

## Queries Prisma chave

### Filtrar clientes por tags + estado + inactividade

```typescript
prisma.cliente.findMany({
  where: {
    apagadoEm: null,
    ...(etiquetaIds.length > 0 ? {
      etiquetas: { some: { etiquetaId: { in: etiquetaIds } } }
    } : {}),
    ...(estados.length > 0 ? { estado: { in: estados } } : {}),
    ...(inativoDesdeDias ? {
      ultimaSessao: { lt: new Date(Date.now() - inativoDesdeDias * 86400000) }
    } : {}),
  },
  include: {
    etiquetas: { include: { etiqueta: true } }
  }
})
```

### Excluir clientes com tags bloqueantes de automações

```typescript
prisma.cliente.findMany({
  where: {
    apagadoEm: null,
    // exclui clientes que tenham qualquer tag com bloqueiaAutomacoes=true
    NOT: {
      etiquetas: {
        some: {
          etiqueta: { bloqueiaAutomacoes: true }
        }
      }
    }
  }
})
```

### Listar tags com contagem de clientes

```typescript
prisma.etiqueta.findMany({
  include: {
    _count: { select: { clientes: true } }
  },
  orderBy: { tipo: "asc" }
})
```
