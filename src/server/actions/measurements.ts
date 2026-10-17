"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMeasurementSchema } from "@/lib/validation/measurements";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  fromZodError,
  sanitizeError,
} from "@/lib/errors";
import type { Tables } from "@/types/database";

export type MeasurementRecord = Tables<"body_measurements">;

/**
 * Server action to log an optional posture or body measurement check-in.
 *
 * Enforces:
 * - Server-authoritative user authentication (never trusts client user_id).
 * - Strict schema validation via createMeasurementSchema.
 * - PostgreSQL RLS policy enforcement.
 * - Revalidates `/progress` cache.
 */
export async function createMeasurementAction(
  rawInput: unknown
): Promise<ActionResult<MeasurementRecord>> {
  const parsed = createMeasurementSchema.safeParse(rawInput);
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

    const input = parsed.data;

    const { data: record, error: insertError } = await supabase
      .from("body_measurements")
      .insert({
        user_id: user.id,
        weight_kg: input.weight_kg ?? null,
        height_cm: input.height_cm ?? null,
        notes: input.notes ?? null,
        measured_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      const sanitized = sanitizeError(insertError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    revalidatePath("/progress");
    return createSuccessResult(record);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
