# Contratos API — Sistema de Tags Dinâmicas (Spec 005)

Auth: `X-API-Key` header (para N8N). Dashboard usa Server Actions (NextAuth — sem `X-API-Key`).

---

## GET /api/v1/etiquetas

Lista todas as etiquetas com contagem de clientes.

**Response 200:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "nome": "Grávida",
      "cor": "#9b72cf",
      "tipo": "saude",
      "bloqueiaAutomacoes": true,
      "totalClientes": 3
    }
  ],
  "meta": { "total": 17, "timestamp": "..." }
}
```

**Query params opcionais:**
- `tipo=saude|campanha|preferencia|automatica` — filtrar por tipo
- `bloqueiaAutomacoes=true` — só as que bloqueiam

---

## POST /api/v1/clientes/[id]/etiquetas

Adiciona etiqueta a um cliente (para uso pelo N8N quando processa onboarding).

**Body:**
```json
{ "etiquetaId": "cuid..." }
```
Ou criar e atribuir inline (N8N pode não conhecer o ID):
```json
{ "etiquetaNome": "Grávida" }
```

**Response 200:**
```json
{ "data": { "clienteId": "...", "etiquetaId": "..." }, "meta": { "timestamp": "..." } }
```

**Response 404:** Cliente não encontrado
**Response 400:** `etiquetaId` e `etiquetaNome` ambos ausentes

---

## DELETE /api/v1/clientes/[id]/etiquetas/[etiquetaId]

Remove etiqueta de um cliente.

**Response 200:**
```json
{ "data": { "removida": true }, "meta": { "timestamp": "..." } }
```

**Response 404:** Relação não existe

---

## GET /api/v1/clientes (extensão do filtro existente)

Parâmetros adicionados:

| Param | Tipo | Exemplo | Descrição |
|---|---|---|---|
| `etiquetas` | `string[]` | `?etiquetas=cuid1&etiquetas=cuid2` | Clientes com pelo menos uma dessas tags |
| `sem_automacoes` | `boolean` | `?sem_automacoes=false` | Se `true`, exclui clientes bloqueados |

Parâmetros já existentes mantidos: `inactivos_desde_dias`, `estado`, `q`.

---

## POST /api/v1/campanhas (extensão)

Criar campanha segmentada a partir de um filtro de tags. O endpoint existente já aceita `segmento: Json` — apenas documentar o schema esperado.

**Body:**
```json
{
  "nome": "Campanha Massagem de Casal — Junho 2026",
  "templateId": "cuid...",
  "segmento": {
    "etiquetaIds": ["cuid1", "cuid2"],
    "estados": ["ativa_recente", "ativa_frequente"],
    "inativoDesdeDias": null
  }
}
```

**Response 201:**
```json
{
  "data": {
    "campanhaId": "...",
    "totalMensagensCriadas": 12,
    "totalExcluidos": 2,
    "motivoExclusao": "tag bloqueante"
  },
  "meta": { "timestamp": "..." }
}
```
