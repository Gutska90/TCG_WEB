import { expect, test } from "@playwright/test";

test("seller-storefront: public profile lists inventory with search", async ({ page }) => {
  await page.goto("/vendedores/vendedor-beta");
  await expect(page.getByRole("heading", { name: "Vendedor Beta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /carta/ })).toBeVisible();
  await expect(page.getByLabel("Buscar en esta tienda")).toBeVisible();
  await expect(page.getByRole("link", { name: /Test Mon/ }).first()).toBeVisible();
});
