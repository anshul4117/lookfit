import { test, expect } from "@playwright/test";

test.describe("Protected Routes and Authentication Redirects", () => {
  test("redirects unauthenticated user accessing /dashboard to /login with redirectTo", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Must be redirected to /login with query param preserved
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);

    // Verify login page rendered
    const heading = page.locator("#login-heading");
    await expect(heading).toContainText("Sign In to LookFit");
  });

  test("redirects unauthenticated user accessing /workout/new to /login with nested path", async ({
    page,
  }) => {
    await page.goto("/workout/new");

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fworkout%2Fnew/);
    const heading = page.locator("#login-heading");
    await expect(heading).toBeVisible();
  });

  test("allows unauthenticated access to the public landing page", async ({
    page,
  }) => {
    await page.goto("/");

    // URL must remain at root
    await expect(page).toHaveURL(/\/$/);

    const heroTitle = page.locator("#hero-title");
    await expect(heroTitle).toContainText("LookFit");
  });
});
