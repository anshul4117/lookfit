"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [confirmationNotice, setConfirmationNotice] = React.useState<{
    email: string;
  } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsPending(true);

    try {
      const result = await signUpAction(
        { email, password, confirmPassword },
        rawRedirectTo
      );

      if (!result.success) {
        setGeneralError(result.error.message);
        if (result.error.details) {
          setFieldErrors(result.error.details);
        }
        setIsPending(false);
        return;
      }

      if (result.data.needsEmailConfirmation) {
        setConfirmationNotice({ email: result.data.email });
        setIsPending(false);
        return;
      }

      // Auto-confirmed or direct session available
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
      setIsPending(false);
    }
  }

  const loginHref = rawRedirectTo
    ? `/login?redirectTo=${encodeURIComponent(rawRedirectTo)}`
    : "/login";

  if (confirmationNotice) {
    return (
      <div
        id="confirmation-banner"
        role="region"
        aria-live="polite"
        className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-6 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">
              {confirmationNotice.email}
            </span>
            . Please confirm your email to sign in to LookFit.
          </p>
        </div>
        <div className="pt-2">
          <Link href={loginHref}>
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && (
        <div
          id="register-error-banner"
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {generalError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email Address</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={
            fieldErrors.email ? "register-email-error" : undefined
          }
          required
        />
        {fieldErrors.email && (
          <p id="register-email-error" className="text-xs text-destructive">
            {fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-password">Password (8+ characters)</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? "register-password-error" : undefined
          }
          required
        />
        {fieldErrors.password && (
          <p id="register-password-error" className="text-xs text-destructive">
            {fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-confirm-password">Confirm Password</Label>
        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={
            fieldErrors.confirmPassword
              ? "register-confirm-password-error"
              : undefined
          }
          required
        />
        {fieldErrors.confirmPassword && (
          <p
            id="register-confirm-password-error"
            className="text-xs text-destructive"
          >
            {fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      <Button
        id="register-submit"
        type="submit"
        className="w-full"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Creating Account...
          </span>
        ) : (
          "Create Account"
        )}
      </Button>

      <div className="text-center text-xs text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
