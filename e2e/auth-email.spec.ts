import { expect, test } from "@playwright/test";
import { BETA_USERS } from "./fixtures";
import { login } from "./helpers";

test("auth-email: login, account, logout", async ({ page }) => {
  await login(page, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await expect(page.getByRole("heading", { name: "Comprador Beta" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/me");
  await expect(page).toHaveURL(/\/ingresar/);
});
