"use server";

import { revalidatePath } from "next/cache";
import {
  startRoutineWorkoutSchema,
  resumeWorkoutSchema,
} from "@/lib/validation/workout";
import {
  type ActionResult,
  createErrorResult,
  fromZodError,
  sanitizeError,
} from "@/lib/errors";
import {
  startWorkoutSession,
  resumeWorkoutSession,
  type WorkoutSessionDetail,
} from "@/server/services/workout-service";

export type { WorkoutSessionDetail };

/**
 * Server action to start a workout session from a saved routine.
 *
 * Enforces:
 * - Server-authoritative user authentication (never trusts client user_id).
 * - Strict input validation against startRoutineWorkoutSchema (requires valid routine_id).
 * - Atomic creation of workout session and exercise snapshots via database RPC.
 * - Idempotent return of existing in-progress session upon duplicate start retries.
 */
export async function startWorkoutAction(
  rawInput: unknown
): Promise<ActionResult<WorkoutSessionDetail>> {
  const parsed = startRoutineWorkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    const actionError = fromZodError(parsed.error);
    return createErrorResult(
      actionError.code,
      actionError.message,
      actionError.details
    );
  }

  const { routine_id } = parsed.data;

  try {
    const result = await startWorkoutSession({ routineId: routine_id });

    if (result.success) {
      revalidatePath("/dashboard");
      revalidatePath("/routines");
      revalidatePath("/workouts");
    }

    return result;
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
 * Server action to resume an eligible in-progress workout session.
 *
 * Enforces:
 * - Server-authoritative user authentication.
 * - Strict verification that session belongs to caller.
 * - Strict state verification (only in_progress sessions can be resumed).
 * - Read-only retrieval of existing snapshots without mutation or duplication.
 */
export async function resumeWorkoutAction(
  rawInput: unknown
): Promise<ActionResult<WorkoutSessionDetail>> {
  const parsed = resumeWorkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    const actionError = fromZodError(parsed.error);
    return createErrorResult(
      actionError.code,
      actionError.message,
      actionError.details
    );
  }

  try {
    return await resumeWorkoutSession(parsed.data.session_id);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
