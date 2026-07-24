import { test, expect } from "../fixtures/auth";

/**
 * Fluxo mais importante por verificar: o toggle de edição do perfil do
 * cliente (`components/clientes/EdicaoPerfilToggle.tsx` +
 * `EdicaoPerfilContext`) nunca tinha sido clicado "a sério" — o ambiente
 * de preview usado durante o desenvolvimento não compunha frames, por
 * isso este comportamento ficou por confirmar visualmente.
 *
 * O botão liga o modo de edição para TODOS os campos do perfil ao mesmo
 * tempo (ver `InlineEditField.tsx`, modo "controlado"): antes do clique
 * os campos são texto simples; depois, tornam-se inputs editáveis.
 */
test.describe("Edição de perfil do cliente", () => {
  test("toggle 'Editar' abre os campos para edição", async ({ authenticatedPage: page }) => {
    await page.goto("/clientes");

    // Espera a lista carregar (scroll infinito client-side) e abre o
    // primeiro cliente.
    const primeiraLinha = page.locator('a[href^="/clientes/"]').first();
    await expect(primeiraLinha).toBeVisible({ timeout: 15_000 });
    await primeiraLinha.click();

    await page.waitForURL(/\/clientes\/[^/]+$/, { timeout: 15_000 });

    const botaoEditar = page.getByRole("button", { name: "Editar", exact: true });
    await expect(botaoEditar).toBeVisible();

    // Antes de editar: o telefone é texto simples, sem input.
    await expect(page.locator('input[type="tel"]')).toHaveCount(0);

    await botaoEditar.click();

    // O botão muda de texto para "Concluir edição".
    const botaoConcluir = page.getByRole("button", { name: "Concluir edição", exact: true });
    await expect(botaoConcluir).toBeVisible();

    // Pelo menos o campo de telefone passa a ter um input editável visível.
    const inputTelefone = page.locator('input[type="tel"]').first();
    await expect(inputTelefone).toBeVisible();
    await expect(inputTelefone).toBeEditable();

    // Clicar de novo devolve o botão ao estado "Editar" e fecha a edição.
    await botaoConcluir.click();
    await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toHaveCount(0);
  });
});
