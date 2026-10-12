"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  profileUpdateSchema,
  profileOnboardingSchema,
} from "@/lib/validation/profile";
import type { Tables, TablesUpdate } from "@/types/database";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  fromZodError,
  sanitizeError,
} from "@/lib/errors";

export type ProfileRecord = Tables<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;


/**
 * Server action to update existing profile preferences.
 * Crucial Security Contract:
 * - Derives user_id exclusively from supabase.auth.getUser().
 * - Rejects client attempts to pass user_id or onboarding_complete.
 * - Never modifies onboarding_complete status.
 */
export async function updateProfileSettingsAction(
  rawInput: unknown
): Promise<ActionResult<ProfileRecord>> {
  const parsed = profileUpdateSchema.safeParse(rawInput);
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Only update validated settings fields; never touch onboarding_complete
    const updatePayload: ProfileUpdate = {};
    if (parsed.data.display_name !== undefined) {
      updatePayload.display_name = parsed.data.display_name;
    }
    if (parsed.data.age_years !== undefined) {
      updatePayload.age_years = parsed.data.age_years;
    }
    if (parsed.data.fitness_level !== undefined) {
      updatePayload.fitness_level = parsed.data.fitness_level;
    }
    if (parsed.data.goals !== undefined) {
      updatePayload.goals = parsed.data.goals;
    }
    if (parsed.data.limitations !== undefined) {
      updatePayload.limitations = parsed.data.limitations;
    }
    if (parsed.data.available_minutes !== undefined) {
      updatePayload.available_minutes = parsed.data.available_minutes;
    }
    if (parsed.data.timezone !== undefined) {
      updatePayload.timezone = parsed.data.timezone;
    }
    if (parsed.data.morning_time !== undefined) {
      updatePayload.morning_time = parsed.data.morning_time;
    }
    if (parsed.data.evening_time !== undefined) {
      updatePayload.evening_time = parsed.data.evening_time;
    }
    if (parsed.data.reminders_enabled !== undefined) {
      updatePayload.reminders_enabled = parsed.data.reminders_enabled;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return createSuccessResult<ProfileRecord>(data);
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
 * Server action to complete initial Posture & Mobility onboarding.
 * Crucial Security Contract:
 * - Requires full validation against profileOnboardingSchema.
 * - Sets onboarding_complete: true exclusively on the server.
 * - Derives user_id exclusively from supabase.auth.getUser().
 */
export async function completeOnboardingAction(
  rawInput: unknown
): Promise<ActionResult<ProfileRecord>> {
  const parsed = profileOnboardingSchema.safeParse(rawInput);
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Set onboarding_complete: true ONLY on the server after full validation
    const completePayload: ProfileUpdate = {
      display_name: parsed.data.display_name,
      age_years: parsed.data.age_years,
      fitness_level: parsed.data.fitness_level,
      goals: parsed.data.goals,
      limitations: parsed.data.limitations,
      available_minutes: parsed.data.available_minutes,
      timezone: parsed.data.timezone,
      morning_time: parsed.data.morning_time,
      evening_time: parsed.data.evening_time,
      reminders_enabled: parsed.data.reminders_enabled,
      onboarding_complete: true,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(completePayload)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return createSuccessResult<ProfileRecord>(data);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
