# Essence CRM — Instruções de Arranque Local

## Pré-requisitos
- Node.js 20+ (tens o v24 instalado — perfeito)
- npm 11+

## Arrancar pela primeira vez

```bash
cd "04_CRM/essence-crm"

# 1. Instalar dependências
npm install

# 2. Gerar o cliente Prisma
npm run db:generate

# 3. Criar a base de dados (SQLite local)
npm run db:migrate

# 4. Popular com dados de teste
npm run db:seed

# 5. Arrancar o servidor
npm run dev
```

Abre o browser em: **http://localhost:3000**

## Credenciais de teste

Definidas via `SETUP_PASSWORD` ao correr `npx tsx prisma/create-users.ts`.
Ver `CREDENCIAIS-PRIVADAS.local.md` (nunca versionado).

## Comandos úteis

```bash
npm run dev          # Servidor local (http://localhost:3000)
npm run db:studio    # Interface visual da base de dados
npm run db:seed      # Repopular com dados de teste (apaga os existentes)
npm run db:reset     # Reset completo da BD + seed
npm run build        # Build de produção
```

## Estrutura das páginas

| URL | Página |
|---|---|
| / | Dashboard — sessões do dia e da semana |
| /clientes | Lista de todos os clientes |
| /clientes/[id] | Perfil completo de um cliente |
| /mensagens | Mensagens IA pendentes de aprovação |
| /top-clientes | Ranking por valor gasto e sessões |

## Variáveis de ambiente (.env)

```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="..."          # gerado automaticamente
AUTH_URL="http://localhost:3000"
CLAUDE_API_KEY=""          # adicionar quando tiveres a chave Anthropic
```

## Deploy no servidor (quando estiver pronto)

Ver ficheiro `04_CRM/documentacao/deploy-servidor.md`
