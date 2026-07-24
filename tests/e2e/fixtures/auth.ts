import { test as base, expect, type Page } from "@playwright/test";

/**
 * Fixture de autenticação — faz login pelo formulário real em `/login`
 * (não por injeção de cookie/JWT) para que os testes que a usam validem
 * o fluxo de auth de ponta a ponta, incluindo o próprio Auth.js.
 *
 * Credenciais vêm de variáveis de ambiente, sem defaults hardcoded — se
 * não estiverem definidas o teste falha logo com uma mensagem clara em
 * vez de tentar um login com credenciais inventadas.
 */

interface AuthFixtures {
  /** Página já autenticada — navegação inicial fica em `/`. */
  authenticatedPage: Page;
}

function credenciaisDeTeste(): { email: string; password: string } {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD têm de estar definidas " +
        "no ambiente para correr os testes E2E autenticados. Ver tests/e2e/README.md."
    );
  }

  return { email, password };
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const { email, password } = credenciaisDeTeste();

    await page.goto("/login");

    await page.locator("#username").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Confirmar que autenticou mesmo — não só que o POST teve sucesso.
    // O login em `components/login-form.tsx` faz `signIn(..., { redirect: false })`
    // e só navega para o callbackUrl (por omissão "/") depois de a
    // signIn resolver sem erro; se as credenciais estiverem erradas ou a
    // sessão não "pegar" (ex.: problema de cookie Secure/non-Secure),
    // a navegação nunca sai de "/login" ou o middleware manda de volta
    // — por isso validamos a URL final, não a resposta HTTP.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/\/login/);

    await use(page);
  },
});

export { expect };
