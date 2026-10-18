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

export interface WeeklyDayData {
  day: string;
  morning: number;
  evening: number;
}

export interface MonthlyWeekTrend {
  week: string;
  sessions: number;
  minutes: number;
}

export interface MeasurementItem {
  id: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  notes: string;
}

export interface ProgressData {
  kpis: {
    completedSessions: number;
    currentStreak: number;
    totalMobilityMinutes: number;
    activeDays: number;
  };
  weeklyData: WeeklyDayData[];
  monthlyTrend: MonthlyWeekTrend[];
  measurements: MeasurementItem[];
}

/**
 * Server query for Progress & Consistency Analytics.
 * Computes KPIs, weekly volume, monthly trends, and queries saved measurements.
 */
export async function getProgressDataQuery(): Promise<ActionResult<ProgressData>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // 1. Fetch user profile for timezone resolution
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    const timezone = profile?.timezone || "Asia/Kolkata";
    const todayDate = calculateActivityDate(new Date(), timezone);

    // 2. Fetch completed workout sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select("id, activity_date, duration_seconds, session_type, completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("activity_date", { ascending: false });

    if (sessionsError) {
      const sanitized = sanitizeError(sessionsError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const sessions = sessionsData || [];
    const totalSessions = sessions.length;
    const totalDurationSeconds = sessions.reduce(
      (acc, s) => acc + (s.duration_seconds || 0),
      0
    );
    const totalMinutes = Math.round(totalDurationSeconds / 60);

    const activityDates = sessions.map((s) => s.activity_date);
    const uniqueDates = Array.from(new Set(activityDates));
    const { currentStreak } = calculateStreaks(activityDates, todayDate);

    // 3. Compute Weekly Chart Data (current week Monday through Sunday)
    // Derive weekday from timezone-calibrated todayDate using UTC arithmetic
    const [year, month, day] = todayDate.split("-").map(Number);
    const todayUtc = new Date(Date.UTC(year, month - 1, day));
    // Monday as 0, Sunday as 6 in JS day offset
    const dayOfWeek = (todayUtc.getUTCDay() + 6) % 7;
    const mondayDate = addDays(todayDate, -dayOfWeek);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData: WeeklyDayData[] = dayLabels.map((label, index) => {
      const dateForDay = addDays(mondayDate, index);
      const daySessions = sessions.filter((s) => s.activity_date === dateForDay);

      const morningSeconds = daySessions
        .filter((s) => s.session_type === "morning")
        .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

      const eveningSeconds = daySessions
        .filter((s) => s.session_type === "evening")
        .reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

      return {
        day: label,
        morning: Math.round(morningSeconds / 60),
        evening: Math.round(eveningSeconds / 60),
      };
    });

    // 4. Compute 4-Week Monthly Trend
    const monthlyTrend: MonthlyWeekTrend[] = [3, 2, 1, 0].map((weeksAgo, idx) => {
      const startDay = addDays(todayDate, -(weeksAgo * 7 + 6));
      const endDay = addDays(todayDate, -(weeksAgo * 7));

      const weekSessions = sessions.filter(
        (s) => s.activity_date >= startDay && s.activity_date <= endDay
      );

      const weekDuration = weekSessions.reduce(
        (sum, s) => sum + (s.duration_seconds || 0),
        0
      );

      return {
        week: `Week ${idx + 1}`,
        sessions: weekSessions.length,
        minutes: Math.round(weekDuration / 60),
      };
    });

    // 5. Fetch Optional Body Measurements
    const { data: measurementsData, error: measurementsError } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false });

    if (measurementsError) {
      const sanitized = sanitizeError(measurementsError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const measurementsList = (measurementsData || []) as Tables<"body_measurements">[];
    const measurements: MeasurementItem[] = measurementsList.map((m) => ({
      id: m.id,
      date: m.measured_at.split("T")[0],
      weightKg: m.weight_kg ? Number(m.weight_kg) : undefined,
      heightCm: m.height_cm ? Number(m.height_cm) : undefined,
      notes: m.notes || "Posture & mobility check-in",
    }));

    return createSuccessResult<ProgressData>({
      kpis: {
        completedSessions: totalSessions,
        currentStreak,
        totalMobilityMinutes: totalMinutes,
        activeDays: uniqueDates.length,
      },
      weeklyData,
      monthlyTrend,
      measurements,
    });
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
  }
}
