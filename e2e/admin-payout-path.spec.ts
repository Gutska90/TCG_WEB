import { expect, test } from "@playwright/test";
import { BETA_USERS } from "./fixtures";
import { ADMIN_URL, adminApi, login, loginAdmin, openSeedListingCard, sandboxCheckout } from "./helpers";

test("admin-payout-path: completed sale → create, approve, mark paid (manual)", async ({ browser }) => {
  test.setTimeout(120_000);

  const buyer = await browser.newPage();
  await login(buyer, BETA_USERS.buyer.email, BETA_USERS.buyer.password);
  await openSeedListingCard(buyer);
  await sandboxCheckout(buyer);
  const orderLink = buyer.locator("a[href^='/me/compras/']").first();
  await expect(orderLink).toBeVisible();
  const orderHref = await orderLink.getAttribute("href");
  expect(orderHref).toBeTruthy();
  const orderId = orderHref!.replace("/me/compras/", "");

  const seller = await browser.newPage();
  await login(seller, BETA_USERS.seller.email, BETA_USERS.seller.password);
  await seller.goto(`/me/ventas/${orderId}`);
  await seller.getByRole("button", { name: "Marcar en preparación" }).click();
  await expect(seller.getByText("Marcada en preparación.")).toBeVisible();
  await seller.getByLabel("Lugar y hora del encuentro").fill("Plaza de Armas, 18:00");
  await seller.getByRole("button", { name: "Listo para encuentro" }).click();
  await expect(seller.getByText("Listo para el encuentro.")).toBeVisible();
  await seller.getByRole("button", { name: "Marcar entregado" }).click();
  await expect(seller.getByText("Marcada como entregada.")).toBeVisible();

  await buyer.goto(`/me/compras/${orderId}`);
  await buyer.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(buyer.getByText("Recepción confirmada.")).toBeVisible();

  const admin = await browser.newPage();
  await loginAdmin(admin);
  const order = await adminApi<{ seller: { id: string } }>(admin, `/v1/admin/orders/${orderId}`);
  await admin.goto(`${ADMIN_URL}/admin/payouts`);
  await admin.getByLabel("Seller ID").first().fill(order.seller.id);
  await admin.getByLabel("Order IDs (opcional)").fill(orderId);
  await admin.getByRole("button", { name: "Crear payout" }).click();
  await expect(admin).toHaveURL(/\/admin\/payouts\/[0-9a-f-]+/, { timeout: 20_000 });
  await admin.getByRole("button", { name: "Aprobar" }).click();
  await admin.getByRole("button", { name: "Confirmar" }).click();
  await expect(admin.getByRole("button", { name: "Marcar en proceso" })).toBeVisible();
  await admin.getByRole("button", { name: "Marcar en proceso" }).click();
  await admin.getByRole("button", { name: "Confirmar" }).click();
  await admin.getByLabel("providerRef").fill(`e2e-manual-${orderId.slice(0, 8)}`);
  await admin.getByRole("button", { name: "Marcar PAID" }).click();
  await expect(admin.getByRole("button", { name: "Marcar PAID" })).toHaveCount(0);
  await expect(admin.locator("span").filter({ hasText: /^Pagado$/ })).toBeVisible();

  await buyer.close();
  await seller.close();
  await admin.close();
});
