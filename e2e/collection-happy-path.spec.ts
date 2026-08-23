import { expect, test } from "@playwright/test";
import { BETA_USERS, SEARCH_CARD } from "./fixtures";
import { login } from "./helpers";

test("collection-happy-path: add, list, edit, set progress, sell click", async ({ page }) => {
  await login(page, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await page.goto("/pokemon/test-set/test-mon-1");
  await expect(page.getByRole("heading", { name: SEARCH_CARD })).toBeVisible();
  await page.getByRole("button", { name: "Agregar a colección" }).click();
  await page.getByRole("button", { name: "Guardar en colección" }).click();
  await expect(page.getByText("Agregada a tu colección.")).toBeVisible();

  await page.goto("/me/coleccion");
  await expect(page.getByRole("heading", { name: "Mi colección" })).toBeVisible();
  await expect(page.getByText(SEARCH_CARD).first()).toBeVisible();
  await page.getByText(SEARCH_CARD).first().click();
  await expect(page.getByRole("heading", { name: SEARCH_CARD })).toBeVisible();
  await page.getByLabel("Cantidad").fill("2");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Ítem actualizado.")).toBeVisible();

  await page.goto("/me/coleccion");
  await page.getByRole("heading", { name: "Progreso por set" }).locator("..").getByRole("link").first().click();
  await expect(page.getByText(/Te faltan|Set completo/).first()).toBeVisible();

  await page.goto("/me/coleccion");
  await page.getByText(SEARCH_CARD).first().click();
  await page.getByRole("main").getByRole("link", { name: "Vender" }).click();
  await expect(page).toHaveURL(/\/vender|\/me\/vendedor/);
});
