import { describe, expect, it, vi, beforeEach } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { sanitizeRedirectPath } from "@/lib/supabase/middleware";
import { signInAction, signUpAction, signOutAction } from "@/server/actions/auth";

// Mock Supabase server client and Next.js cache revalidation
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("T06: Authentication Unit Tests", () => {
  describe("Zod Validation Schemas", () => {
    it("validates correct login credentials", () => {
      const valid = { email: "user@example.com", password: "password123" };
      const parsed = loginSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe("user@example.com");
      }
    });

    it("normalizes login email to lowercase and trims whitespace", () => {
      const parsed = loginSchema.safeParse({
        email: "  USER@Example.COM  ",
        password: "password123",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe("user@example.com");
      }
    });

    it("rejects invalid emails and short passwords in loginSchema", () => {
      expect(
        loginSchema.safeParse({ email: "invalid-email", password: "12345" }).success
      ).toBe(false);
      expect(
        loginSchema.safeParse({ email: "valid@test.com", password: "12345" }).success
      ).toBe(false); // password < 6
    });

    it("strictly rejects client-supplied user_id or unexpected keys in loginSchema", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        user_id: "spoofed-uuid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Unrecognized key");
      }
    });

    it("validates registerSchema and enforces minimum 8 characters password", () => {
      expect(
        registerSchema.safeParse({
          email: "user@example.com",
          password: "password123",
          confirmPassword: "password123",
        }).success
      ).toBe(true);

      expect(
        registerSchema.safeParse({
          email: "user@example.com",
          password: "pass7", // 7 chars, minimum is 8
          confirmPassword: "pass7",
        }).success
      ).toBe(false);
    });

    it("rejects mismatched passwords in registerSchema", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "differentPassword123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Passwords do not match");
      }
    });

    it("strictly rejects client-supplied user_id or unexpected keys in registerSchema", () => {
      const result = registerSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
        role: "admin",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("sanitizeRedirectPath Helper", () => {
    it("permits safe, internal relative paths", () => {
      expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
      expect(sanitizeRedirectPath("/workout/new")).toBe("/workout/new");
      expect(sanitizeRedirectPath("/settings")).toBe("/settings");
      expect(sanitizeRedirectPath("/dashboard?tab=morning")).toBe(
        "/dashboard?tab=morning"
      );
    });

    it("rejects null, undefined, empty, and non-relative inputs", () => {
      expect(sanitizeRedirectPath(null)).toBe("/dashboard");
      expect(sanitizeRedirectPath(undefined)).toBe("/dashboard");
      expect(sanitizeRedirectPath("")).toBe("/dashboard");
      expect(sanitizeRedirectPath("relative/path")).toBe("/dashboard");
    });

    it("rejects open-redirect attempts, absolute URLs, and protocol-relative URLs", () => {
      expect(sanitizeRedirectPath("https://attacker.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("http://attacker.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("//attacker.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("/\\attacker.com")).toBe("/dashboard");
      expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
      expect(sanitizeRedirectPath("/safe/path://evil")).toBe("/dashboard");
    });
  });

  describe("Server Actions Contracts", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("signInAction returns validation error without invoking Supabase on invalid input", async () => {
      const result = await signInAction({ email: "bad", password: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.details?.email).toBeDefined();
        expect(result.error.details?.password).toBeDefined();
      }
      expect(createClient).not.toHaveBeenCalled();
    });

    it("signInAction returns sanitized error when Supabase auth fails", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: {
              code: "invalid_credentials",
              message: "Invalid login credentials",
            },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await signInAction(
        { email: "user@example.com", password: "wrongpassword" },
        "/dashboard"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
        expect(result.error.message).toBe("Invalid email or password");
      }
    });

    it("signInAction returns sanitized redirect path on success", async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: { id: "user-123", email: "user@example.com" },
              session: { access_token: "tok" },
            },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await signInAction(
        { email: "user@example.com", password: "password123" },
        "https://attacker.com" // Malicious open-redirect payload
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Must sanitize to /dashboard
        expect(result.data.redirectTo).toBe("/dashboard");
      }
    });

    it("signUpAction handles email confirmation required (session is null)", async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: {
              user: { id: "user-456", email: "newuser@example.com" },
              session: null, // Email confirmation required
            },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await signUpAction({
        email: "newuser@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.needsEmailConfirmation).toBe(true);
        expect(result.data.email).toBe("newuser@example.com");
      }
    });

    it("signUpAction handles direct session creation (auto-confirm enabled)", async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: {
              user: { id: "user-456", email: "newuser@example.com" },
              session: { access_token: "tok" },
            },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await signUpAction(
        {
          email: "newuser@example.com",
          password: "password123",
          confirmPassword: "password123",
        },
        "/workout/new"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.needsEmailConfirmation).toBe(false);
        expect(result.data.redirectTo).toBe("/workout/new");
      }
    });

    it("signOutAction returns success result on clean sign out", async () => {
      const mockSupabase = {
        auth: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await signOutAction();
      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
