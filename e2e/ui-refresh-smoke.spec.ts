import { expect, test } from "@playwright/test";

test("ui-refresh-smoke: home, search, theme toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Encuentra. Colecciona. Compra. Vende." })).toBeVisible();
  await expect(page.getByRole("link", { name: /TCG MARKET/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vender" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Sistema" }).click();

  await page.goto("/buscar?q=Test%20Mon");
  await expect(page.getByRole("heading", { name: "Buscar cartas" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Test Mon #1/ }).first()).toBeVisible();
});

test("ui-refresh-smoke: cart heading", async ({ page }) => {
  await page.goto("/carrito");
  await expect(page.getByRole("heading", { name: "Carrito" })).toBeVisible();
});
