import { expect, test } from "@playwright/test";
import { BETA_USERS } from "./fixtures";
import { ADMIN_URL, login, loginAdmin, openSeedListingCard, sandboxCheckout } from "./helpers";

test("dispute-path: open, message, admin list", async ({ browser, page }) => {
  await login(page, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await openSeedListingCard(page);
  await sandboxCheckout(page);
  await page.locator("a[href^='/me/compras/']").first().click();
  await page.getByRole("button", { name: "Abrir reclamo" }).click();
  await expect(page).toHaveURL(/\/me\/disputas\//);
  await page.getByPlaceholder("Escribe un mensaje").fill("Mensaje de prueba del comprador.");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByText("Mensaje de prueba del comprador.")).toBeVisible();

  const admin = await browser.newPage();
  await loginAdmin(admin);
  await admin.goto(`${ADMIN_URL}/admin/disputes`);
  await expect(admin.getByRole("heading", { name: "Disputas" })).toBeVisible();
  await expect(admin.getByText(/TCG-/).first()).toBeVisible({ timeout: 20_000 });
  await admin.close();
});
