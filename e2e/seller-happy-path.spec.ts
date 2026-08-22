import { expect, test } from "@playwright/test";
import { BETA_USERS, SEARCH_CARD } from "./fixtures";
import { login, openSeedListingCard, sandboxCheckout } from "./helpers";

test("seller-happy-path: listing, sale, prepare, ship", async ({ browser }) => {
  const seller = await browser.newPage();
  await login(seller, BETA_USERS.seller.email, BETA_USERS.seller.password);
  await seller.goto("/me/publicaciones");
  await expect(seller.getByRole("heading", { name: "Mis publicaciones" })).toBeVisible();
  await expect(seller.getByText(SEARCH_CARD).first()).toBeVisible();
  await expect(seller.getByText(/Stock/).first()).toBeVisible();

  const buyer = await browser.newPage();
  await login(buyer, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await openSeedListingCard(buyer);
  await sandboxCheckout(buyer);
  const orderLink = buyer.locator("a[href^='/me/compras/']").first();
  await expect(orderLink).toBeVisible();
  const orderHref = await orderLink.getAttribute("href");
  expect(orderHref).toBeTruthy();
  const orderId = orderHref!.replace("/me/compras/", "");

  await seller.goto(`/me/ventas/${orderId}`);
  await expect(seller.getByRole("heading", { name: /^TCG-/ })).toBeVisible();
  await seller.getByRole("button", { name: "Marcar en preparación" }).click();
  await expect(seller.getByText("Marcada en preparación.")).toBeVisible();
  await seller.getByLabel("Lugar y hora del encuentro").fill("Plaza de Armas, 18:00");
  await seller.getByRole("button", { name: "Listo para encuentro" }).click();
  await expect(seller.getByText("Listo para el encuentro.")).toBeVisible();

  await buyer.close();
  await seller.close();
});
