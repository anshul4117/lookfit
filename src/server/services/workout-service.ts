import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import type { CompleteWorkoutInput } from "@/lib/validation/workout";

export type WorkoutSessionRecord = Tables<"workout_sessions">;
export type SessionExerciseRecord = Tables<"session_exercises">;

export interface WorkoutSessionDetail extends WorkoutSessionRecord {
  session_exercises: SessionExerciseRecord[];
}

/**
 * Service to atomically start a workout session from a saved routine.
 *
 * 1. Derives caller identity from the authenticated server-side Supabase session.
 * 2. Executes the atomic `start_workout_session` database RPC.
 * 3. Safely handles duplicate starts/retries via PostgreSQL advisory lock and
 *    returns the existing active in-progress session without creating duplicate snapshots.
 * 4. Resolves the user's saved IANA timezone to calculate the local activity_date.
 * 5. Returns the session and all immutable exercise snapshots.
 */
export async function startWorkoutSession(options: {
  routineId: string;
}): Promise<ActionResult<WorkoutSessionDetail>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Execute atomic PostgreSQL RPC
    const { data: rpcSession, error: rpcError } = await supabase.rpc(
      "start_workout_session",
      {
        p_routine_id: options.routineId,
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
          "Workout session database functions are not installed. Required migrations must be applied."
        );
      }

      const sanitized = sanitizeError(rpcError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!rpcSession) {
      return createErrorResult(
        "INTERNAL_ERROR",
        "Failed to initialize workout session"
      );
    }

    // Fetch existing immutable exercise snapshots for this session
    const { data: exercises, error: exercisesError } = await supabase
      .from("session_exercises")
      .select("*")
      .eq("session_id", rpcSession.id)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (exercisesError) {
      const sanitized = sanitizeError(exercisesError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    return createSuccessResult<WorkoutSessionDetail>({
      ...rpcSession,
      session_exercises: exercises || [],
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
 * Service to resume an eligible in-progress workout session.
 *
 * 1. Verifies caller identity strictly under authenticated server session.
 * 2. Confirms session ownership and resumable state (`status === 'in_progress'`).
 * 3. Rejects finalized (`completed` or `cancelled`) sessions with CONFLICT.
 * 4. Strictly performs a read-only query and never creates duplicate snapshots.
 */
export async function resumeWorkoutSession(
  sessionId: string
): Promise<ActionResult<WorkoutSessionDetail>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Step 1: Fetch session with ownership verification
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      const sanitized = sanitizeError(sessionError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!session) {
      return createErrorResult("NOT_FOUND", "Workout session not found");
    }

    // Step 2: Verify resumable state
    if (session.status !== "in_progress") {
      return createErrorResult(
        "CONFLICT",
        "Cannot resume a completed or cancelled workout session"
      );
    }

    // Step 3: Fetch existing exercise snapshots without mutation
    const { data: exercises, error: exercisesError } = await supabase
      .from("session_exercises")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (exercisesError) {
      const sanitized = sanitizeError(exercisesError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    return createSuccessResult<WorkoutSessionDetail>({
      ...session,
      session_exercises: exercises || [],
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
 * Retrieves a single workout session by ID under PostgreSQL RLS.
 */
export async function getWorkoutSessionByIdQuery(
  sessionId: string
): Promise<ActionResult<WorkoutSessionDetail | null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      const sanitized = sanitizeError(sessionError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!session) {
      return createSuccessResult<WorkoutSessionDetail | null>(null);
    }

    const { data: exercises, error: exercisesError } = await supabase
      .from("session_exercises")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (exercisesError) {
      const sanitized = sanitizeError(exercisesError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    return createSuccessResult<WorkoutSessionDetail>({
      ...session,
      session_exercises: exercises || [],
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
 * Service to atomically complete a workout session using database RPC.
 *
 * 1. Derives caller identity from authenticated server session.
 * 2. Invokes `complete_workout_session` RPC with active duration and exercise results.
 * 3. Atomic RPC validates session ownership, verifies that session is in progress,
 *    updates each session_exercise row, and marks workout_session as completed.
 * 4. Returns the completed session record.
 */
export async function completeWorkoutSession(
  input: CompleteWorkoutInput
): Promise<ActionResult<WorkoutSessionRecord>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    const { data: completedSession, error: rpcError } = await supabase.rpc(
      "complete_workout_session",
      {
        p_session_id: input.session_id,
        p_results: input.results,
        p_duration_seconds: input.duration_seconds ?? undefined,
      }
    );

    if (rpcError) {
      const sanitized = sanitizeError(rpcError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!completedSession) {
      return createErrorResult(
        "INTERNAL_ERROR",
        "Failed to complete workout session"
      );
    }

    return createSuccessResult<WorkoutSessionRecord>(completedSession);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
