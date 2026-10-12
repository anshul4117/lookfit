import { test, expect } from "@playwright/test";

test.describe("LookFit Application Smoke Test", () => {
  test("renders the foundation landing page and branding", async ({ page }) => {
    await page.goto("/");

    // Verify main page elements
    const heading = page.locator("#hero-title");
    await expect(heading).toContainText("LookFit");

    const appStatus = page.locator("#app-status");
    await expect(appStatus).toHaveText("Online");

    // Verify routine pillars
    await expect(page.locator("#pillar-morning")).toBeVisible();
    await expect(page.locator("#pillar-evening")).toBeVisible();
  });
});
