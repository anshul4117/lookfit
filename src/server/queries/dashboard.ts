import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import { calculateActivityDate } from "@/lib/domain/workout";
import { calculateStreaks } from "@/lib/streaks";
import { addDays } from "@/lib/dates";
import type { Tables } from "@/types/database";

export interface DashboardRoutineInfo {
  id: string;
  name: string;
  sessionType: "morning" | "evening";
  estimatedMinutes: number;
  exerciseCount: number;
  exercisesSummary: string[];
}

export interface DashboardSessionState {
  routine: DashboardRoutineInfo | null;
  status: "not_started" | "in_progress" | "completed";
  activeSessionId?: string;
  completedAt?: string;
}

export interface DashboardWeeklyDay {
  day: string;
  date: string;
  morning: boolean;
  evening: boolean;
  isToday: boolean;
}

export interface DashboardData {
  user: {
    displayName: string;
    email: string;
    timezone: string;
    availableMinutes: number;
    fitnessLevel: string;
    isOnboardingComplete: boolean;
    todayFormatted: string;
  };
  streak: {
    activeStreak: number;
    longestStreak: number;
  };
  stats: {
    totalSessionsDone: number;
    totalMobilityMinutes: number;
  };
  morningSession: DashboardSessionState;
  eveningSession: DashboardSessionState;
  weeklyActivity: DashboardWeeklyDay[];
}

type RoutineRow = Tables<"routines"> & {
  routine_exercises?: {
    id: string;
    position: number;
    exercise?: { name: string } | null;
  }[];
};

/**
 * Server query for LookFit Dashboard.
 * Derives user identity strictly from auth session and queries user-scoped data.
 */
export async function getDashboardDataQuery(): Promise<ActionResult<DashboardData>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // 1. Fetch Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      const sanitized = sanitizeError(profileError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const timezone = profile?.timezone || "Asia/Kolkata";
    const todayDate = calculateActivityDate(new Date(), timezone);

    // 2. Fetch Active Routines
    const { data: routinesData, error: routinesError } = await supabase
      .from("routines")
      .select("*, routine_exercises(id, position, exercise:exercises(name))")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (routinesError) {
      const sanitized = sanitizeError(routinesError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const routines = (routinesData || []) as RoutineRow[];

    const mapRoutine = (sessionType: "morning" | "evening"): DashboardRoutineInfo | null => {
      const found = routines.find((r) => r.session_type === sessionType);
      if (!found) return null;

      const exercises = (found.routine_exercises || [])
        .slice()
        .sort((a, b) => a.position - b.position);

      const exercisesSummary = exercises
        .map((e) => e.exercise?.name || "Exercise")
        .filter(Boolean);

      return {
        id: found.id,
        name: found.name,
        sessionType,
        estimatedMinutes: found.estimated_minutes,
        exerciseCount: exercises.length,
        exercisesSummary,
      };
    };

    const morningRoutine = mapRoutine("morning");
    const eveningRoutine = mapRoutine("evening");

    // 3. Fetch Completed Sessions for Streaks and Aggregate Metrics
    const { data: completedSessions, error: completedError } = await supabase
      .from("workout_sessions")
      .select("id, activity_date, duration_seconds, session_type, completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("activity_date", { ascending: false })
      .order("completed_at", { ascending: false });

    if (completedError) {
      const sanitized = sanitizeError(completedError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const sessions = completedSessions || [];
    const totalSessionsDone = sessions.length;
    const totalDurationSeconds = sessions.reduce(
      (sum, s) => sum + (s.duration_seconds || 0),
      0
    );
    const totalMobilityMinutes = Math.round(totalDurationSeconds / 60);

    const activityDates = sessions.map((s) => s.activity_date);
    const { currentStreak, longestStreak } = calculateStreaks(activityDates, todayDate);

    // 4. Compute Weekly Activity Timeline (Monday through Sunday)
    // Derive weekday from timezone-calibrated todayDate using UTC arithmetic
    const [year, month, day] = todayDate.split("-").map(Number);
    const todayUtc = new Date(Date.UTC(year, month - 1, day));
    // Monday as 0, Sunday as 6 in JS day offset
    const dayOfWeek = (todayUtc.getUTCDay() + 6) % 7;
    const mondayDate = addDays(todayDate, -dayOfWeek);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyActivity: DashboardWeeklyDay[] = dayLabels.map((label, index) => {
      const dateForDay = addDays(mondayDate, index);
      const daySessions = sessions.filter((s) => s.activity_date === dateForDay);

      return {
        day: label,
        date: dateForDay,
        morning: daySessions.some((s) => s.session_type === "morning"),
        evening: daySessions.some((s) => s.session_type === "evening"),
        isToday: dateForDay === todayDate,
      };
    });

    const todayFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(todayUtc);

    // 5. Fetch Active In-Progress Sessions
    const { data: inProgressSessions, error: inProgressError } = await supabase
      .from("workout_sessions")
      .select("id, routine_id, session_type, started_at")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false });

    if (inProgressError) {
      const sanitized = sanitizeError(inProgressError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const activeList = inProgressSessions || [];
    const activeMorning = activeList.find((s) => s.session_type === "morning");
    const activeEvening = activeList.find((s) => s.session_type === "evening");

    // 6. Determine today's completion state
    const todayMorningCompleted = sessions.find(
      (s) => s.activity_date === todayDate && s.session_type === "morning"
    );
    const todayEveningCompleted = sessions.find(
      (s) => s.activity_date === todayDate && s.session_type === "evening"
    );

    const morningState: DashboardSessionState = {
      routine: morningRoutine,
      status: todayMorningCompleted
        ? "completed"
        : activeMorning
        ? "in_progress"
        : "not_started",
      activeSessionId: activeMorning?.id,
      completedAt: todayMorningCompleted?.completed_at || undefined,
    };

    const eveningState: DashboardSessionState = {
      routine: eveningRoutine,
      status: todayEveningCompleted
        ? "completed"
        : activeEvening
        ? "in_progress"
        : "not_started",
      activeSessionId: activeEvening?.id,
      completedAt: todayEveningCompleted?.completed_at || undefined,
    };

    return createSuccessResult<DashboardData>({
      user: {
        displayName:
          profile?.display_name || user.email?.split("@")[0] || "Posture Champion",
        email: user.email || "",
        timezone,
        availableMinutes: profile?.available_minutes || 20,
        fitnessLevel: profile?.fitness_level || "intermediate",
        isOnboardingComplete: Boolean(profile?.onboarding_complete),
        todayFormatted,
      },
      streak: {
        activeStreak: currentStreak,
        longestStreak,
      },
      stats: {
        totalSessionsDone,
        totalMobilityMinutes,
      },
      morningSession: morningState,
      eveningSession: eveningState,
      weeklyActivity,
    });
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
  }
}
