"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { sanitizeRedirectPath } from "@/lib/supabase/middleware";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  fromZodError,
  sanitizeError,
} from "@/lib/errors";

export interface SignInResult {
  redirectTo: string;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
  email: string;
  redirectTo: string;
}

/**
 * Server action to sign in an existing user with email and password.
 * Strictly parses untrusted input and returns a standardized ActionResult.
 */
export async function signInAction(
  input: unknown,
  rawRedirectTo?: string | null
): Promise<ActionResult<SignInResult>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const actionError = fromZodError(parsed.error);
    return createErrorResult(
      actionError.code,
      actionError.message,
      actionError.details
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    const safeRedirect = sanitizeRedirectPath(rawRedirectTo);
    revalidatePath("/", "layout");

    return createSuccessResult({ redirectTo: safeRedirect });
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}

/**
 * Server action to register a new user with email and password.
 * Correctly distinguishes whether a session was created or email confirmation is required.
 */
export async function signUpAction(
  input: unknown,
  rawRedirectTo?: string | null
): Promise<ActionResult<SignUpResult>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const actionError = fromZodError(parsed.error);
    return createErrorResult(
      actionError.code,
      actionError.message,
      actionError.details
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    const safeRedirect = sanitizeRedirectPath(rawRedirectTo);
    const hasSession = Boolean(data.session);

    if (hasSession) {
      revalidatePath("/", "layout");
    }

    return createSuccessResult({
      needsEmailConfirmation: !hasSession,
      email: parsed.data.email,
      redirectTo: safeRedirect,
    });
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}

/**
 * Server action to sign out the active user.
 * Destroys session cookies on the server and revalidates cached layouts.
 */
export async function signOutAction(): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    revalidatePath("/", "layout");
    return createSuccessResult<void>(undefined);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
