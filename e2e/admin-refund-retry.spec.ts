import { expect, test } from "@playwright/test";
import { QA_REFUND_ORDER_PREFIX, QA_REFUND_REASON } from "./fixtures";
import { ADMIN_URL, loginAdmin } from "./helpers";

test("admin-refund-retry: FAILED seed → Reintentar refund", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`${ADMIN_URL}/admin/refunds?status=FAILED&q=${encodeURIComponent(QA_REFUND_ORDER_PREFIX)}`);
  await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: QA_REFUND_REASON }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Refund" })).toBeVisible();
  await expect(page.getByText("Fallido")).toBeVisible();
  await page.getByRole("button", { name: "Reintentar refund" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/Resultado: completed/)).toBeVisible();
  await expect(page.getByText("Completado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar refund" })).toHaveCount(0);
});
