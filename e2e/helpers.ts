import { type Page, expect } from "@playwright/test";
import { BETA_USERS } from "./fixtures";

export const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://localhost:3002";

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

export async function loginAdmin(page: Page) {
  await page.goto(`${ADMIN_URL}/admin/ingresar`);
  await page.getByLabel("Email").fill(BETA_USERS.admin.email);
  await page.getByLabel("Contraseña").fill(BETA_USERS.admin.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/ingresar/, { timeout: 20_000 });
}

export async function adminApi<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (apiPath) => {
    const token = sessionStorage.getItem("tcg.admin.accessToken");
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(apiPath, { headers, credentials: "include" });
    if (!res.ok) {
      throw new Error(`adminApi ${apiPath} → ${res.status}`);
    }
    return (await res.json()) as T;
  }, path);
}
