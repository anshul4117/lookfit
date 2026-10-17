"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
  fromZodError,
} from "@/lib/errors";
import { calculateActivityDate } from "@/lib/domain/workout";
import { toggleHabitSchema, type ToggleHabitInput } from "@/lib/validation/habits";

export async function toggleDailyHabitAction(
  rawInput: ToggleHabitInput
): Promise<ActionResult<{ completed: boolean; activityDate: string }>> {
  try {
    const parseResult = toggleHabitSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const actionError = fromZodError(parseResult.error);
      return createErrorResult(
        actionError.code,
        actionError.message,
        actionError.details
      );
    }

    const { habitKey, activityDate, completed } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    let targetDate = activityDate;
    if (!targetDate) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle();

      const timezone = profile?.timezone || "Asia/Kolkata";
      targetDate = calculateActivityDate(new Date(), timezone);
    }

    const { error: upsertError } = await supabase.from("daily_habits").upsert(
      {
        user_id: user.id,
        habit_key: habitKey,
        activity_date: targetDate,
        completed,
      },
      {
        onConflict: "user_id,activity_date,habit_key",
      }
    );

    if (upsertError) {
      const sanitized = sanitizeError(upsertError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    revalidatePath("/habits");
    revalidatePath("/dashboard");

    return createSuccessResult({
      completed,
      activityDate: targetDate,
    });
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
  }
}
