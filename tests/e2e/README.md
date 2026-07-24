# Testes E2E (Playwright)

Cobertura E2E do dashboard da Bea (login, edição de perfil de cliente). Corre
contra um servidor Next.js já a correr — **não** arranca `npm run dev`
automaticamente (nem todos os ambientes onde isto corre têm uma base de
dados disponível).

## Antes de correr

1. Servidor de dev a correr contra uma base de dados com **pelo menos um
   utilizador seed** (ver `npx tsx prisma/check-users.ts` para confirmar, ou
   `npm run db:seed`):

   ```powershell
   npm run dev
   ```

   Por omissão os testes assumem o servidor em `http://localhost:3200`
   (porta usada para não colidir com um `npm run dev` já a correr na 3000).
   Se usares outra porta/URL, define `PLAYWRIGHT_BASE_URL`.

2. Variáveis de ambiente com as credenciais de um utilizador de teste real
   (ex: a conta da Bea em dev):

   ```powershell
   $env:PLAYWRIGHT_TEST_EMAIL = "bea"
   $env:PLAYWRIGHT_TEST_PASSWORD = "<password de dev>"
   $env:PLAYWRIGHT_BASE_URL = "http://localhost:3200"   # opcional, default acima
   ```

   Não há defaults hardcoded nos testes — sem estas variáveis, os testes
   falham logo com um erro explícito em vez de tentar credenciais
   inventadas.

## Correr

```powershell
npm run test:e2e
```

Ou directamente:

```powershell
npx playwright test
npx playwright test tests/e2e/auth/login.spec.ts
npx playwright test --ui                 # modo interactivo
```

## Estrutura

```
tests/e2e/
├── fixtures/
│   └── auth.ts              ← fixture `authenticatedPage`: login real pelo /login
├── auth/
│   └── login.spec.ts        ← login OK, password errada, redirect sem sessão
└── clientes/
    └── editar-perfil.spec.ts ← toggle "Editar" no perfil de cliente (EdicaoPerfilToggle)
```

## Notas

- O login corre sempre pelo formulário real (`/login`), nunca por injeção
  de cookie/JWT — valida o fluxo Auth.js de ponta a ponta.
- `NODE_ENV` deve corresponder ao protocolo real usado (`http://localhost`
  em dev → cookies não-seguras). Correr os testes contra `npm run dev`
  local está correcto; correr contra um domínio HTTPS remoto exige que o
  servidor tenha `NODE_ENV=production` para as cookies `Secure` baterem
  certo com o que o middleware espera (`lib/env.ts`, `isSecureCookieEnv()`).
