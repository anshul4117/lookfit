"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createRoutineSchema,
  updateRoutineSchema,
  archiveRoutineSchema,
  type CreateRoutineInput,
  type UpdateRoutineInput,
  type SessionType,
} from "@/lib/validation/routine";
import type { Tables } from "@/types/database";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  fromZodError,
  sanitizeError,
} from "@/lib/errors";
import { generateUserRoutinePlan } from "@/server/services/planner-service";

export type RoutineRecord = Tables<"routines">;

/**
 * Creates a new routine along with its initial set of exercise prescriptions (Version 1).
 * Strictly derives user identity from server session and validates position uniqueness.
 */
export async function createRoutineAction(
  rawInput: unknown
): Promise<ActionResult<RoutineRecord>> {
  const parsed = createRoutineSchema.safeParse(rawInput);
  if (!parsed.success) {
    const actionError = fromZodError(parsed.error);
    return createErrorResult(
      actionError.code,
      actionError.message,
      actionError.details
    );
  }

  const input: CreateRoutineInput = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Execute atomic database RPC
    const { data: rpcRoutine, error: rpcError } = await supabase.rpc(
      "create_routine_with_exercises",
      {
        p_name: input.name,
        p_session_type: input.session_type,
        p_estimated_minutes: input.estimated_minutes,
        p_exercises: input.exercises,
        p_generated_by: "user",
      }
    );

    if (rpcError) {
      const isFunctionNotFound =
        rpcError.code === "42883" ||
        rpcError.code === "PGRST202" ||
        (typeof rpcError.message === "string" &&
          rpcError.message.toLowerCase().includes("could not find the function"));

      if (isFunctionNotFound) {
        return createErrorResult(
          "INTERNAL_ERROR",
          "Routine management database functions are not installed. Required migrations must be applied."
        );
      }

      const sanitized = sanitizeError(rpcError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!rpcRoutine) {
      return createErrorResult("INTERNAL_ERROR", "Failed to create routine");
    }

    revalidatePath("/routines");
    revalidatePath("/dashboard");
    return createSuccessResult(rpcRoutine as RoutineRecord);
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
 * Updates an existing routine by creating an incremented version (Version N + 1)
 * and archiving the previous version. Historical routine exercises and past workout
 * sessions referencing the previous version remain completely unaltered.
 */
export async function updateRoutineAction(
  rawInput: unknown
): Promise<ActionResult<RoutineRecord>> {
  const parsed = updateRoutineSchema.safeParse(rawInput);
  if (!parsed.success) {
    const actionError = fromZodError(parsed.error);
    return createErrorResult(
      actionError.code,
      actionError.message,
      actionError.details
    );
  }

  const input: UpdateRoutineInput = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Step 1: Verify ownership and inspect existing routine
    const { data: existingRoutine, error: fetchError } = await supabase
      .from("routines")
      .select("*")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      const sanitized = sanitizeError(fetchError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!existingRoutine) {
      return createErrorResult("NOT_FOUND", "Routine not found");
    }

    if (existingRoutine.status === "archived") {
      return createErrorResult(
        "CONFLICT",
        "Cannot edit an archived routine. Please select the active version."
      );
    }

    // If exercises are not provided in payload, fetch existing exercises to carry over
    let targetExercises = input.exercises;
    if (!targetExercises || targetExercises.length === 0) {
      const { data: existingExercises, error: fetchExError } = await supabase
        .from("routine_exercises")
        .select("*")
        .eq("routine_id", existingRoutine.id)
        .order("position", { ascending: true });

      if (fetchExError || !existingExercises || existingExercises.length === 0) {
        return createErrorResult(
          "VALIDATION_ERROR",
          "Routine must contain at least one exercise"
        );
      }

      targetExercises = existingExercises.map((e) => ({
        exercise_id: e.exercise_id,
        position: e.position,
        prescribed_sets: e.prescribed_sets,
        prescribed_reps: e.prescribed_reps,
        prescribed_duration_seconds: e.prescribed_duration_seconds,
        rest_seconds: e.rest_seconds,
      }));
    }

    // Execute atomic database RPC
    const { data: rpcRoutine, error: rpcError } = await supabase.rpc(
      "update_routine_version",
      {
        p_routine_id: existingRoutine.id,
        p_name: input.name ?? existingRoutine.name,
        p_estimated_minutes:
          input.estimated_minutes ?? existingRoutine.estimated_minutes,
        p_exercises: targetExercises,
      }
    );

    if (rpcError) {
      const isFunctionNotFound =
        rpcError.code === "42883" ||
        rpcError.code === "PGRST202" ||
        (typeof rpcError.message === "string" &&
          rpcError.message.toLowerCase().includes("could not find the function"));

      if (isFunctionNotFound) {
        return createErrorResult(
          "INTERNAL_ERROR",
          "Routine versioning database functions are not installed. Required migrations must be applied."
        );
      }

      const sanitized = sanitizeError(rpcError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!rpcRoutine) {
      return createErrorResult(
        "INTERNAL_ERROR",
        "Failed to update routine version"
      );
    }

    revalidatePath("/routines");
    revalidatePath(`/routines/${existingRoutine.id}`);
    revalidatePath(`/routines/${rpcRoutine.id}`);
    revalidatePath("/dashboard");
    return createSuccessResult(rpcRoutine as RoutineRecord);
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
 * Archives a routine, changing its status to 'archived'.
 */
export async function archiveRoutineAction(
  rawInput: unknown
): Promise<ActionResult<RoutineRecord>> {
  const parsed = archiveRoutineSchema.safeParse(rawInput);
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

    // Check ownership first
    const { data: existing, error: fetchError } = await supabase
      .from("routines")
      .select("*")
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      const sanitized = sanitizeError(fetchError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!existing) {
      return createErrorResult("NOT_FOUND", "Routine not found");
    }

    // Attempt RPC or direct update
    const { data: updatedRoutine, error: updateError } = await supabase
      .from("routines")
      .update({ status: "archived" })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updatedRoutine) {
      const sanitized = sanitizeError(updateError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    revalidatePath("/routines");
    revalidatePath(`/routines/${parsed.data.id}`);
    revalidatePath("/dashboard");
    return createSuccessResult(updatedRoutine);
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
 * Generates and saves a routine using the T09 deterministic planner.
 * If an active routine of this session type already exists, updates it to Version N + 1.
 * Otherwise, creates Version 1.
 */
export async function saveGeneratedRoutineAction(
  sessionType: SessionType
): Promise<ActionResult<RoutineRecord>> {
  try {
    const planResult = await generateUserRoutinePlan(sessionType);
    if (!planResult.success) {
      return planResult;
    }

    const plan = planResult.data;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Format prescribed exercises for routine insertion
    const exercisePayload = plan.exercises.map((item) => ({
      exercise_id: item.exerciseId,
      position: item.position,
      prescribed_sets: item.prescribedSets,
      prescribed_reps: item.prescribedReps,
      prescribed_duration_seconds: item.prescribedDurationSeconds,
      rest_seconds: item.restSeconds,
    }));

    // Check if an active routine of this session type already exists
    const { data: existingActive } = await supabase
      .from("routines")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_type", sessionType)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingActive) {
      // Update existing routine to next version
      return updateRoutineAction({
        id: existingActive.id,
        name: plan.routineName,
        estimated_minutes: Math.round(plan.estimatedMinutes),
        exercises: exercisePayload,
      });
    }

    // Create new initial routine version
    return createRoutineAction({
      name: plan.routineName,
      session_type: sessionType,
      estimated_minutes: Math.round(plan.estimatedMinutes),
      status: "active",
      exercises: exercisePayload,
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
