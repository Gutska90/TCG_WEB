import { type Page, expect } from "@playwright/test";

export async function login(page: Page, email: string, password: string, path = "/ingresar") {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/ingresar/);
}

export async function openSeedListingCard(page: Page) {
  await page.goto("/pokemon/test-set/test-mon-1");
  await expect(page.getByRole("heading", { name: "Test Mon #1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar al carrito" }).first()).toBeVisible();
}

export async function sandboxCheckout(page: Page) {
  await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
  await expect(page.getByText("Agregada al carrito.")).toBeVisible();
  await page.getByRole("link", { name: "Ver carrito" }).click();
  await expect(page.getByRole("heading", { name: "Carrito" })).toBeVisible();
  await page.getByRole("link", { name: "Ir a pagar" }).click();
  await expect(page.getByText("Pago de prueba / sandbox")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar pago de prueba" }).click();
  await page.getByRole("button", { name: "Simular pago de prueba" }).click();
  await expect(page.getByRole("heading", { name: "Pago recibido" })).toBeVisible();
}
