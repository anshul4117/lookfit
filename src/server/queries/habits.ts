import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  createSuccessResult,
  createErrorResult,
  sanitizeError,
} from "@/lib/errors";
import { calculateActivityDate } from "@/lib/domain/workout";
import { addDays } from "@/lib/dates";
import { HABIT_KEYS, type HabitKey } from "@/lib/validation/habits";

export interface HabitDataModel {
  id: HabitKey;
  title: string;
  target: string;
  category: "recovery" | "ergonomics" | "posture";
  description: string;
  completed: boolean;
  history: boolean[]; // 7 days (6 days prior + today)
}

export interface HabitsData {
  habits: HabitDataModel[];
  streakDays: number;
  daysOfWeek: string[];
  todayDate: string;
}

const HABIT_DEFINITIONS: Record<
  HabitKey,
  {
    title: string;
    target: string;
    category: "recovery" | "ergonomics" | "posture";
    description: string;
  }
> = {
  "habit-sleep": {
    title: "Restorative Sleep",
    target: "7–8 Hours",
    category: "recovery",
    description:
      "Support spinal decompression and tissue repair with adequate sleep in a supportive alignment.",
  },
  "habit-movement": {
    title: "45-Minute Movement Breaks",
    target: "Standing & Walking",
    category: "ergonomics",
    description:
      "Break prolonged seated postures every 45 minutes with a brief standing stretch or walk.",
  },
  "habit-ergonomics": {
    title: "Eye-Level Screen Alignment",
    target: "Counter Forward Head",
    category: "posture",
    description:
      "Keep the top third of your display at eye level to prevent excessive neck flexion and cervical strain.",
  },
  "habit-nutrition": {
    title: "Balanced Protein Nutrition",
    target: "Whole Foods",
    category: "recovery",
    description:
      "Incorporate balanced, protein-containing meals to fuel muscle recovery without restrictive dieting.",
  },
};

export async function getHabitsDataQuery(): Promise<ActionResult<HabitsData>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResult("UNAUTHENTICATED", "Authentication required");
    }

    // 1. Fetch user profile for timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    const timezone = profile?.timezone || "Asia/Kolkata";
    const todayStr = calculateActivityDate(new Date(), timezone);

    // 2. Generate 7 days range: [today - 6, ..., today]
    const past7Days: string[] = [];
    const daysOfWeek: string[] = [];
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

    for (let i = 6; i >= 0; i--) {
      const dStr = addDays(todayStr, -i);
      past7Days.push(dStr);

      if (i === 0) {
        daysOfWeek.push("Today");
      } else {
        const [y, m, d] = dStr.split("-").map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d));
        daysOfWeek.push(weekdayFormatter.format(utcDate));
      }
    }

    // 3. Query habits for the past 7 days
    const { data: recentHabits, error: habitsError } = await supabase
      .from("daily_habits")
      .select("habit_key, activity_date, completed")
      .eq("user_id", user.id)
      .gte("activity_date", past7Days[0])
      .lte("activity_date", todayStr);

    if (habitsError) {
      const sanitized = sanitizeError(habitsError);
      return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
    }

    const rows = recentHabits || [];

    // Map habits
    const habits: HabitDataModel[] = HABIT_KEYS.map((key) => {
      const def = HABIT_DEFINITIONS[key];
      const history = past7Days.map((dStr) => {
        const entry = rows.find(
          (r) => r.habit_key === key && r.activity_date === dStr
        );
        return entry ? entry.completed : false;
      });
      const completed = history[history.length - 1] ?? false;

      return {
        id: key,
        title: def.title,
        target: def.target,
        category: def.category,
        description: def.description,
        completed,
        history,
      };
    });

    // 4. Calculate habit streak (consecutive days with at least 1 completed habit)
    const { data: allCompletedDates } = await supabase
      .from("daily_habits")
      .select("activity_date")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("activity_date", { ascending: false });

    let streakDays = 0;
    if (allCompletedDates && allCompletedDates.length > 0) {
      const uniqueDates = Array.from(
        new Set(allCompletedDates.map((r) => r.activity_date))
      ).sort((a, b) => (a < b ? 1 : -1)); // desc

      let checkDate = todayStr;
      // If today has no completed habit, check if yesterday starts the streak
      if (!uniqueDates.includes(todayStr)) {
        checkDate = addDays(todayStr, -1);
      }

      while (uniqueDates.includes(checkDate)) {
        streakDays++;
        checkDate = addDays(checkDate, -1);
      }
    }

    return createSuccessResult({
      habits,
      streakDays,
      daysOfWeek,
      todayDate: todayStr,
    });
  } catch (err) {
    const sanitized = sanitizeError(err);
    return createErrorResult(sanitized.code, sanitized.message, sanitized.details);
  }
}
