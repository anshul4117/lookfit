"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsPending(true);

    try {
      const result = await signInAction(
        { email, password },
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

      // Successful sign in: navigate to destination and refresh RSC tree
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
      setIsPending(false);
    }
  }

  const registerHref = rawRedirectTo
    ? `/register?redirectTo=${encodeURIComponent(rawRedirectTo)}`
    : "/register";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && (
        <div
          id="login-error-banner"
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {generalError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email Address</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          required
        />
        {fieldErrors.email && (
          <p id="login-email-error" className="text-xs text-destructive">
            {fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
        </div>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? "login-password-error" : undefined
          }
          required
        />
        {fieldErrors.password && (
          <p id="login-password-error" className="text-xs text-destructive">
            {fieldErrors.password[0]}
          </p>
        )}
      </div>

      <Button
        id="login-submit"
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
            Signing In...
          </span>
        ) : (
          "Sign In"
        )}
      </Button>

      <div className="text-center text-xs text-muted-foreground pt-2">
        Don&apos;t have an account yet?{" "}
        <Link
          href={registerHref}
          className="font-medium text-primary hover:underline underline-offset-4"
        >
          Create an account
        </Link>
      </div>
    </form>
  );
}
