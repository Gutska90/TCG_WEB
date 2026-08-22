import { expect, test } from "@playwright/test";

test("auth-google: stub provider creates a session without live Google", async ({ page, request }) => {
  const api = process.env.E2E_API_URL ?? "http://localhost:4000";
  const config = (await (await request.get(`${api}/v1/config`)).json()) as {
    features: { authStub?: boolean; enableGoogleAuth?: boolean };
  };
  test.skip(!config.features.authStub || !config.features.enableGoogleAuth, "AUTH_STUB_OAUTH + ENABLE_GOOGLE_AUTH required");

  await page.goto("/ingresar");
  await page.getByLabel("Aceptar términos para Google o Apple").check();
  await page.getByRole("button", { name: "Continuar con Google (prueba)" }).click();
  await expect(page).not.toHaveURL(/\/ingresar/);
  await expect(page.getByText("Email verificado")).toBeVisible();
});
