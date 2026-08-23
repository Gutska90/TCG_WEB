import { expect, test } from "@playwright/test";
import { ADMIN_URL, loginAdmin } from "./helpers";

test("admin-ops-path: login, dashboard, refunds and payouts lists", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${ADMIN_URL}/admin`);
  await expect(page.getByRole("heading", { name: "Operación", level: 1 })).toBeVisible();
  await expect(page.getByText("Refunds fallidos")).toBeVisible();
  await expect(page.getByText("Payouts pendientes")).toBeVisible();

  await page.goto(`${ADMIN_URL}/admin/refunds`);
  await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();

  await page.goto(`${ADMIN_URL}/admin/payouts`);
  await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear payout" })).toBeVisible();
  await expect(page.getByText("No hay transferencia bancaria en esta fase.")).toBeVisible();
});
