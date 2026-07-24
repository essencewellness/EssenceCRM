import { defineConfig, devices } from "@playwright/test";

// Base URL configurável — por omissão a porta 3200, usada nesta sessão de
// desenvolvimento para testes locais (evita conflito com um `npm run dev`
// já a correr na 3000). Define PLAYWRIGHT_BASE_URL se usares outra porta.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3200";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Sem webServer: não arrancamos `npm run dev` automaticamente aqui —
  // nem todos os ambientes onde isto corre têm uma base de dados
  // disponível. Quem correr os testes deve ter o servidor já a correr
  // contra `baseURL` (ver tests/e2e/README.md).
});
