import { expect, test } from "@playwright/test";
import { BETA_USERS, SEARCH_CARD } from "./fixtures";
import { login } from "./helpers";

test("wishlist-happy-path: add from card, list, remove", async ({ page }) => {
  await login(page, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await page.goto("/pokemon/test-set/test-mon-1");
  await expect(page.getByRole("heading", { name: SEARCH_CARD })).toBeVisible();
  await page.getByRole("button", { name: "Añadir a wishlist" }).click();
  await page.getByLabel("Precio máximo (CLP)").fill("999999");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Guardada en wishlist.")).toBeVisible();

  await page.goto("/me/wishlist");
  await expect(page.getByRole("heading", { name: "Wishlist" })).toBeVisible();
  await expect(page.getByText(SEARCH_CARD).first()).toBeVisible();
  await page.getByRole("listitem").filter({ hasText: SEARCH_CARD }).getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByText(SEARCH_CARD)).toHaveCount(0);

  await page.goto("/me/notificaciones");
  await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible();
  await expect(page.getByText("Avisarme en la app si baja el precio 10% o más")).toBeVisible();
});
