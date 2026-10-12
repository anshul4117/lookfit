"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/server/actions/auth";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface SignOutButtonProps extends Omit<ButtonProps, "onClick"> {
  redirectTo?: string;
}

export function SignOutButton({
  className,
  variant = "ghost",
  size = "sm",
  redirectTo = "/login",
  ...props
}: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  async function handleSignOut() {
    if (isPending) return;
    setIsPending(true);

    try {
      await signOutAction();
      router.push(redirectTo);
      router.refresh();
    } catch {
      // In case of unexpected failure, redirect to ensure local transition
      router.push(redirectTo);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      id="sign-out-button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleSignOut}
      disabled={isPending}
      aria-busy={isPending}
      {...props}
    >
      {isPending ? (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Signing Out...
        </span>
      ) : (
        "Sign Out"
      )}
    </Button>
  );
}
