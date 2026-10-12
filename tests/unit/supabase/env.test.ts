import { describe, it, expect } from "vitest";
import {
  validatePublicEnv,
  validateServerEnv,
  ConfigurationError,
} from "@/lib/env";
import {
  isProtectedRoute,
  isAuthRoute,
  sanitizeRedirectPath,
} from "@/lib/supabase/middleware";

describe("Environment Validation Unit Tests", () => {
  const validPublicConfig = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key-12345",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };

  it("passes validation with complete public configuration", () => {
    const result = validatePublicEnv(validPublicConfig);
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("valid-anon-key-12345");
    expect(result.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("applies default NEXT_PUBLIC_APP_URL if omitted", () => {
    const result = validatePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key",
    });
    expect(result.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("throws ConfigurationError when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    expect(() =>
      validatePublicEnv({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key",
      })
    ).toThrow(ConfigurationError);

    try {
      validatePublicEnv({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key",
      });
    } catch (err) {
      const configError = err as ConfigurationError;
      expect(configError.fieldErrors.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    }
  });

  it("throws ConfigurationError when NEXT_PUBLIC_SUPABASE_URL is not a valid URL", () => {
    expect(() =>
      validatePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key",
      })
    ).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when NEXT_PUBLIC_SUPABASE_ANON_KEY is empty", () => {
    expect(() =>
      validatePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      })
    ).toThrow(ConfigurationError);
  });

  it("accepts NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in public configuration", () => {
    const result = validatePublicEnv({
      ...validPublicConfig,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
    });
    expect(result.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_test_key");
  });

  it("validates server configuration without requiring SUPABASE_SERVICE_ROLE_KEY", () => {
    const result = validateServerEnv(validPublicConfig);
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("accepts SUPABASE_SERVICE_ROLE_KEY when provided on server", () => {
    const result = validateServerEnv({
      ...validPublicConfig,
      SUPABASE_SERVICE_ROLE_KEY: "secret-service-role-key",
    });
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBe("secret-service-role-key");
  });
});

describe("Middleware Route Matching & Open Redirect Protection Tests", () => {
  it("matches protected routes by exact segment boundaries", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/")).toBe(true);
    expect(isProtectedRoute("/dashboard/history")).toBe(true);
    expect(isProtectedRoute("/workout/session-123")).toBe(true);
    expect(isProtectedRoute("/exercises")).toBe(true);
    expect(isProtectedRoute("/calendar")).toBe(true);
    expect(isProtectedRoute("/progress")).toBe(true);
    expect(isProtectedRoute("/settings")).toBe(true);
    expect(isProtectedRoute("/routines")).toBe(true);

    // Non-protected routes
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/register")).toBe(false);

    // Exact segment boundary check: '/dashboard-preview' must NOT match '/dashboard'
    expect(isProtectedRoute("/dashboard-preview")).toBe(false);
    expect(isProtectedRoute("/settings-general")).toBe(false);
  });

  it("identifies authentication routes accurately", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/register")).toBe(true);
    expect(isAuthRoute("/login/help")).toBe(true);
    expect(isAuthRoute("/login-help")).toBe(false);
    expect(isAuthRoute("/dashboard")).toBe(false);
  });

  it("sanitizes redirect paths and blocks open redirect vectors", () => {
    // Valid relative paths
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/workout/active")).toBe("/workout/active");
    expect(sanitizeRedirectPath("/calendar?month=10")).toBe("/calendar?month=10");

    // Open redirect attacks must default to safe internal path
    expect(sanitizeRedirectPath("https://malicious-site.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("http://attacker.com/steal-creds")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitizeRedirectPath("")).toBe("/dashboard");
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
    expect(sanitizeRedirectPath(undefined)).toBe("/dashboard");
  });
});
