import { expect, test } from "@playwright/test";
import { SEARCH_CARD } from "./fixtures";

test("price-history: card ficha shows TCG Market Chile block and ranges", async ({ page }) => {
  await page.goto("/pokemon/test-set/test-mon-1");
  await expect(page.getByRole("heading", { name: SEARCH_CARD })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historial de precios" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3m" })).toBeVisible();
  await page.getByRole("button", { name: "1m" }).click();
  await expect(page.getByText("Índice TCG Market Chile")).toBeVisible();
  await expect(page.getByText(/Índice interno TCG Market Chile/)).toBeVisible();
});
