import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";

export type ProfileRecord = Tables<"profiles">;

/**
 * Server query to fetch the authenticated user's profile under PostgreSQL RLS.
 * Derives user identity strictly from supabase.auth.getUser().
 * Distinguishes database query errors from a legitimately missing profile record.
 */
export async function getProfileQuery(): Promise<ActionResult<ProfileRecord | null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, display_name, age_years, fitness_level, goals, limitations, available_minutes, timezone, morning_time, evening_time, reminders_enabled, onboarding_complete, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    return createSuccessResult<ProfileRecord | null>(data);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
