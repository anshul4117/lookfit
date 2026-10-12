import { test, expect } from "@playwright/test";

test.describe("T06: Authentication UI and Route Protection", () => {
  test("renders sign-in form with all accessible elements and labels", async ({
    page,
  }) => {
    await page.goto("/login");

    // Page title and heading
    await expect(page).toHaveTitle(/Sign In — LookFit/);
    const heading = page.locator("#login-heading");
    await expect(heading).toContainText("Sign In to LookFit");

    // Form inputs and labels
    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    const submitButton = page.locator("#login-submit");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText("Sign In");

    // Link to registration
    const registerLink = page.locator('a[href*="/register"]');
    await expect(registerLink).toBeVisible();
  });

  test("renders sign-up form with all accessible elements and labels", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(page).toHaveTitle(/Create Account — LookFit/);
    const heading = page.locator("#register-heading");
    await expect(heading).toContainText("Create an Account");

    const emailInput = page.locator("#register-email");
    const passwordInput = page.locator("#register-password");
    const confirmPasswordInput = page.locator("#register-confirm-password");
    const submitButton = page.locator("#register-submit");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toHaveText("Create Account");
  });

  test("displays validation errors on invalid input submissions", async ({
    page,
  }) => {
    await page.goto("/login");

    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    const submitButton = page.locator("#login-submit");

    // Enter invalid email format and short password
    await emailInput.fill("notanemail");
    await passwordInput.fill("123");
    await submitButton.click();

    // Check for inline validation feedback
    const emailError = page.locator("#login-email-error");
    const passwordError = page.locator("#login-password-error");

    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText("Please enter a valid email address");

    await expect(passwordError).toBeVisible();
    await expect(passwordError).toContainText(
      "Password must be at least 6 characters"
    );
  });

  test("displays accessible error banner on invalid login attempt", async ({
    page,
  }) => {
    await page.goto("/login");

    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    const submitButton = page.locator("#login-submit");

    await emailInput.fill("unregistered_user@example.com");
    await passwordInput.fill("wrongpassword123");
    await submitButton.click();

    // Error banner should be present with role="alert"
    const errorBanner = page.locator("#login-error-banner");
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toHaveAttribute("role", "alert");
  });

  test("preserves redirectTo query parameter between login and register links", async ({
    page,
  }) => {
    await page.goto("/login?redirectTo=%2Fworkout%2Fnew");

    // Click register link
    const registerLink = page.locator('a[href*="/register"]');
    await registerLink.click();

    // URL should retain redirectTo
    await expect(page).toHaveURL(/\/register\?redirectTo=%2Fworkout%2Fnew/);

    // Return to sign in
    const loginLink = page.locator('a[href*="/login"]');
    await loginLink.click();
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fworkout%2Fnew/);
  });
});
