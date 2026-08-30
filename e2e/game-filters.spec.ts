import { expect, test } from "@playwright/test";

test("game-filters: set page shows the same sidebar as search", async ({ page }) => {
  await page.goto("/mitos-y-leyendas/andes-demo");
  await expect(page.getByRole("heading", { name: "Filtros" })).toBeVisible();
  await expect(page.getByText("Tipo de carta").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Cumbre Andina/ })).toBeVisible();
});

test("game-filters: Pokémon type stays in the URL and Yu-Gi-Oh replaces Pokémon filters", async ({ page }) => {
  await page.goto("/buscar?game=pokemon&attr.pokemonType=FIRE");
  await expect(page).toHaveURL(/game=pokemon/);
  await expect(page).toHaveURL(/attr\.pokemonType=FIRE/);
  await expect(page.getByRole("link", { name: /Ember Pup/ })).toBeVisible();

  await page.goto("/buscar?game=yugioh");
  await expect(page.locator('aside select[name="game"]')).toHaveValue("yugioh");
  await expect(page.getByText("Categoría").first()).toBeVisible();
  await expect(page.getByLabel("Tipo Pokémon")).toHaveCount(0);

  await page.goto("/buscar?game=yugioh&attr.attribute=DARK");
  await expect(page.getByRole("link", { name: /Mirrorchain Mage/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Scalebound Duelist/ })).toBeVisible();
});
