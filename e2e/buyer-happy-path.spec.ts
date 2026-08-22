import { expect, test } from "@playwright/test";
import { BETA_USERS, SEARCH_CARD } from "./fixtures";
import { login, sandboxCheckout } from "./helpers";

test("buyer-happy-path: register, search, cart, sandbox checkout, order", async ({ page }) => {
  const email = `e2e.buyer.${Date.now()}@example.test`;
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Tester E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Contraseña/).fill("BetaPassw0rd!");
  await page.locator('input[name="acceptTerms"]').check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tester E2E" })).toBeVisible();
  await expect(page.getByText("Email pendiente de verificación")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login(page, BETA_USERS.buyer.email, BETA_USERS.buyer.password);

  await page.goto(`/buscar?q=${encodeURIComponent(SEARCH_CARD)}`);
  await page.getByRole("link", { name: /Test Mon #1 Pokémon/ }).click();
  await expect(page.getByRole("heading", { name: SEARCH_CARD })).toBeVisible();
  await sandboxCheckout(page);
  await page.getByRole("link", { name: "Ver mis compras" }).click();
  await expect(page.getByRole("heading", { name: "Mis compras" })).toBeVisible();
  await expect(page.locator("a[href^='/me/compras/']").first()).toBeVisible();
});
