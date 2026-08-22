import { expect, test } from "@playwright/test";
import { BETA_USERS } from "./fixtures";
import { login } from "./helpers";

test("auth-sessions: lists current session and revoke-all", async ({ page }) => {
  await login(page, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await page.goto("/me/seguridad");
  await expect(page.getByRole("heading", { name: "Seguridad" })).toBeVisible();
  await expect(page.getByText("Esta sesión")).toBeVisible();
  await expect(page.getByText("refreshTokenHash")).toHaveCount(0);
  await expect(page.getByText("accessToken")).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar todas las sesiones" }).click();
  await expect(page.getByText("Cerramos las otras sesiones.")).toBeVisible();
  await expect(page.getByText("Esta sesión")).toBeVisible();
});
