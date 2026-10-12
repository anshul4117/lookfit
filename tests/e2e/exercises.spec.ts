import { test, expect } from "@playwright/test";

test.describe("T08: Exercise Library Route Protection & Navigation", () => {
  test("redirects unauthenticated users accessing /exercises to /login with redirectTo", async ({
    page,
  }) => {
    await page.goto("/exercises");

    // Must be redirected to /login with redirectTo query param preserved
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fexercises/);

    const heading = page.locator("#login-heading");
    await expect(heading).toContainText("Sign In to LookFit");
  });

  test("redirects unauthenticated users accessing /exercises/[slug] to /login with nested redirectTo", async ({
    page,
  }) => {
    await page.goto("/exercises/cat-cow");

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fexercises%2Fcat-cow/);

    const heading = page.locator("#login-heading");
    await expect(heading).toBeVisible();
  });

  test("preserves /exercises redirectTo query parameter when toggling between login and register", async ({
    page,
  }) => {
    await page.goto("/login?redirectTo=%2Fexercises");

    const registerLink = page.locator('a[href*="/register"]');
    await registerLink.click();

    await expect(page).toHaveURL(/\/register\?redirectTo=%2Fexercises/);

    const loginLink = page.locator('a[href*="/login"]');
    await loginLink.click();

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fexercises/);
  });
});
