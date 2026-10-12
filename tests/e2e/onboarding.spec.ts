import { test, expect } from "@playwright/test";

test.describe("T07: Onboarding and Settings Route Guards & UI", () => {
  test("redirects unauthenticated users accessing /settings to /login with redirectTo", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Must be redirected to /login with query param preserved
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fsettings/);

    // Verify login page rendered with accessible elements
    const heading = page.locator("#login-heading");
    await expect(heading).toContainText("Sign In to LookFit");
  });

  test("redirects unauthenticated users accessing /dashboard to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);
  });
});
