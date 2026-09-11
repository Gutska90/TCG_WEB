import { expect, test } from "@playwright/test";
import { BETA_USERS } from "./fixtures";
import { ADMIN_URL, login, loginAdmin } from "./helpers";

test("myl marketplace: search, compare, storefront, missing-card request, admin queue", async ({ page }) => {
  await page.goto("/mitos-y-leyendas");
  await expect(page.getByRole("heading", { name: "Mitos y Leyendas" })).toBeVisible();

  await page.goto("/mitos-y-leyendas/andes-demo/cumbre-andina");
  await expect(page.getByRole("heading", { name: "Cumbre Andina" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ofertas" })).toBeVisible();
  await expect(page.getByText("El precio más bajo publicado no representa necesariamente una venta realizada.")).toBeVisible();

  await page.goto("/vendedores/vendedor-beta");
  await expect(page.getByRole("heading", { name: "Vendedor Beta" })).toBeVisible();
  await expect(page.getByLabel("Buscar en esta tienda")).toBeVisible();
  await page.getByLabel("Buscar en esta tienda").fill("Test Mon");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText(/Test Mon/).first()).toBeVisible();

  await login(page, BETA_USERS.seller.email, BETA_USERS.seller.password);
  await page.goto("/vender");
  await expect(page.getByRole("link", { name: "Solicitar incorporación" })).toBeVisible();
  await page.getByRole("link", { name: "Solicitar incorporación" }).click();
  await expect(page.getByRole("heading", { name: "Solicitar incorporación" })).toBeVisible();
  const cardName = `Carta E2E ${Date.now()}`;
  await page.getByLabel("Nombre de la carta").fill(cardName);
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page.getByRole("heading", { name: "Solicitud enviada" })).toBeVisible();

  await loginAdmin(page);
  await page.goto(`${ADMIN_URL}/admin/catalog/submissions`);
  await expect(page.getByRole("heading", { name: "Solicitudes de catálogo" })).toBeVisible();
  await expect(page.getByRole("link", { name: cardName })).toBeVisible();
});
