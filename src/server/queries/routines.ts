import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import type { RoutineStatus, SessionType } from "@/lib/validation/routine";

export type RoutineRecord = Tables<"routines">;
export type RoutineExerciseRecord = Tables<"routine_exercises">;

export interface RoutineExerciseDetail extends RoutineExerciseRecord {
  exercise: {
    id: string;
    slug: string;
    name: string;
    category: string;
    difficulty: string;
    target_areas: string[];
    equipment: string[];
    instructions: string[];
    safety_notes: string;
  } | null;
}

export interface RoutineWithExercises extends RoutineRecord {
  routine_exercises: RoutineExerciseDetail[];
}

export interface RoutineSummary extends RoutineRecord {
  exercise_count: number;
}

/**
 * Retrieves the authenticated user's routines under PostgreSQL RLS.
 * By default returns active routines, but allows filtering by status and session type.
 */
export async function getUserRoutinesQuery(options?: {
  status?: RoutineStatus;
  session_type?: SessionType;
}): Promise<ActionResult<RoutineSummary[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    let query = supabase
      .from("routines")
      .select("*, routine_exercises(id)")
      .eq("user_id", user.id)
      .order("session_type", { ascending: true })
      .order("created_at", { ascending: false });

    if (options?.status) {
      query = query.eq("status", options.status);
    } else {
      // Default to active routines for primary view
      query = query.eq("status", "active");
    }

    if (options?.session_type) {
      query = query.eq("session_type", options.session_type);
    }

    const { data, error } = await query;

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    const summaries: RoutineSummary[] = (data || []).map((row) => {
      const { routine_exercises, ...routine } = row as RoutineRecord & {
        routine_exercises: { id: string }[];
      };
      return {
        ...routine,
        exercise_count: Array.isArray(routine_exercises)
          ? routine_exercises.length
          : 0,
      };
    });

    return createSuccessResult(summaries);
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
 * Retrieves a single routine by ID along with its full exercise prescriptions
 * and catalog metadata, strictly verifying ownership under RLS.
 */
export async function getRoutineByIdQuery(
  routineId: string
): Promise<ActionResult<RoutineWithExercises>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // Load routine header
    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select("*")
      .eq("id", routineId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (routineError) {
      const sanitized = sanitizeError(routineError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    if (!routine) {
      return createErrorResult("NOT_FOUND", "Routine not found");
    }

    // Load routine exercises joined with catalog details
    const { data: routineExercises, error: exercisesError } = await supabase
      .from("routine_exercises")
      .select(
        `
        id,
        routine_id,
        user_id,
        exercise_id,
        position,
        prescribed_sets,
        prescribed_reps,
        prescribed_duration_seconds,
        rest_seconds,
        created_at,
        exercise:exercises (
          id,
          slug,
          name,
          category,
          difficulty,
          target_areas,
          equipment,
          instructions,
          safety_notes
        )
      `
      )
      .eq("routine_id", routineId)
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

    type JoinedRow = RoutineExerciseRecord & {
      exercise: {
        id: string;
        slug: string;
        name: string;
        category: string;
        difficulty: string;
        target_areas: string[];
        equipment: string[];
        instructions: string[];
        safety_notes: string;
      } | null;
    };

    const formattedExercises: RoutineExerciseDetail[] = (
      (routineExercises as unknown as JoinedRow[]) || []
    ).map((re) => ({
      id: re.id,
      routine_id: re.routine_id,
      user_id: re.user_id,
      exercise_id: re.exercise_id,
      position: re.position,
      prescribed_sets: re.prescribed_sets,
      prescribed_reps: re.prescribed_reps,
      prescribed_duration_seconds: re.prescribed_duration_seconds,
      rest_seconds: re.rest_seconds,
      created_at: re.created_at,
      exercise: re.exercise
        ? {
            id: re.exercise.id,
            slug: re.exercise.slug,
            name: re.exercise.name,
            category: re.exercise.category,
            difficulty: re.exercise.difficulty,
            target_areas: re.exercise.target_areas,
            equipment: re.exercise.equipment,
            instructions: re.exercise.instructions,
            safety_notes: re.exercise.safety_notes,
          }
        : null,
    }));

    return createSuccessResult({
      ...routine,
      routine_exercises: formattedExercises,
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
 * Retrieves all versions of a specific routine lineage for inspection and version history.
 * Strictly queries by routine_lineage_id under authenticated user ownership.
 */
export async function getRoutineVersionsQuery(
  routineLineageId: string
): Promise<ActionResult<RoutineSummary[]>> {
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
      .from("routines")
      .select("*, routine_exercises(id)")
      .eq("user_id", user.id)
      .eq("routine_lineage_id", routineLineageId)
      .order("version", { ascending: false });

    if (error) {
      const sanitized = sanitizeError(error);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    const summaries: RoutineSummary[] = (data || []).map((row) => {
      const { routine_exercises, ...routine } = row as RoutineRecord & {
        routine_exercises: { id: string }[];
      };
      return {
        ...routine,
        exercise_count: Array.isArray(routine_exercises)
          ? routine_exercises.length
          : 0,
      };
    });

    return createSuccessResult(summaries);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
