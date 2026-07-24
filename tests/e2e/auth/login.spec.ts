import { test, expect } from "@playwright/test";

function credenciaisDeTeste(): { email: string; password: string } {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "PLAYWRIGHT_TEST_EMAIL e PLAYWRIGHT_TEST_PASSWORD têm de estar definidas " +
        "no ambiente para correr este teste. Ver tests/e2e/README.md."
    );
  }

  return { email, password };
}

test.describe("Login", () => {
  test("credenciais corretas levam ao dashboard", async ({ page }) => {
    const { email, password } = credenciaisDeTeste();

    await page.goto("/login");

    await page.locator("#username").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Sai de /login e fica numa página do dashboard autenticado.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/\/login/);

    // Sidebar/nav do dashboard só é renderizada com sessão válida.
    await expect(page.getByRole("link", { name: "Clientes", exact: true }).first()).toBeVisible();
  });

  test("password errada mostra erro e não autentica", async ({ page }) => {
    const { email } = credenciaisDeTeste();

    await page.goto("/login");

    await page.locator("#username").fill(email);
    await page.locator("#password").fill("password-definitivamente-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toContainText(
      /Username ou password incorrectos/i
    );

    // Continua em /login — não autenticou.
    await expect(page).toHaveURL(/\/login/);
  });

  test("aceder a /clientes sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/clientes");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain("callbackUrl=%2Fclientes");
  });
});
