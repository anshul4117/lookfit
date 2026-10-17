import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import type { HistoricalSessionItem } from "@/components/features/calendar/calendar-view";
import type { Tables } from "@/types/database";


/**
 * Server query for Calendar & Historical Workouts.
 * Returns immutable snapshots of completed sessions for the authenticated user under PostgreSQL RLS.
 */
export async function getCalendarSessionsQuery(): Promise<
  ActionResult<HistoricalSessionItem[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    const { data: rows, error: queryError } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("activity_date", { ascending: false })
      .order("completed_at", { ascending: false });

    if (queryError) {
      const sanitized = sanitizeError(queryError);
      return createErrorResult(
        sanitized.code,
        sanitized.message,
        sanitized.details
      );
    }

    const sessions = rows || [];
    const sessionIds = sessions.map((s) => s.id);

    let allExercises: Tables<"session_exercises">[] = [];
    if (sessionIds.length > 0) {
      const { data: exerciseRows } = await supabase
        .from("session_exercises")
        .select("*")
        .in("session_id", sessionIds);
      allExercises = exerciseRows || [];
    }

    const exercisesBySession = new Map<string, Tables<"session_exercises">[]>();
    for (const ex of allExercises) {
      const list = exercisesBySession.get(ex.session_id) || [];
      list.push(ex);
      exercisesBySession.set(ex.session_id, list);
    }

    const historicalSessions: HistoricalSessionItem[] = sessions.map((s) => {
      const sessionExercises = exercisesBySession.get(s.id) || [];
      const sortedExercises = sessionExercises
        .slice()
        .sort((a, b) => a.position - b.position);

      return {
        id: s.id,
        routineName: s.routine_name_snapshot,
        sessionType: s.session_type,
        version: s.routine_version_snapshot,
        date: s.activity_date,
        durationMinutes: Math.round((s.duration_seconds || 0) / 60),
        exercises: sortedExercises.map((ex) => ({
          name: ex.exercise_name_snapshot,
          category: ex.category_snapshot,
          prescribedSets: ex.prescribed_sets || 1,
          prescribedReps: ex.prescribed_reps ?? undefined,
          prescribedDurationSeconds: ex.prescribed_duration_seconds ?? undefined,
        })),
      };
    });

    return createSuccessResult(historicalSessions);
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(
      sanitized.code,
      sanitized.message,
      sanitized.details
    );
  }
}
