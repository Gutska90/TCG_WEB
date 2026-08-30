import { expect, test } from "@playwright/test";

test("planes: public comparison is visible", async ({ page }) => {
  await page.goto("/planes");
  await expect(page.getByRole("heading", { name: "Planes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seller Plus" })).toBeVisible();
  await expect(page.getByText(/Sin mensualidad obligatoria/)).toBeVisible();
});
