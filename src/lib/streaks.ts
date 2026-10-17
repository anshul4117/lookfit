import { addDays, diffDays, isValidDateString } from "./dates";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculates current and longest workout streaks from a list of activity dates.
 *
 * Rules:
 * - At least one completed session counts as an active day.
 * - Multiple sessions on the same activity date count as a single active day.
 * - Current streak counts consecutive active days ending either on referenceDate
 *   or on yesterday (to preserve yesterday's active streak before today's workout is done).
 * - A missing day breaks the streak.
 * - Longest streak is the maximum consecutive active days across all recorded history.
 *
 * @param activityDates - Array of YYYY-MM-DD date strings from completed workout sessions
 * @param referenceDate - The local date (YYYY-MM-DD) representing "today" in the user's timezone
 */
export function calculateStreaks(
  activityDates: string[],
  referenceDate: string
): StreakResult {
  if (!activityDates || activityDates.length === 0 || !isValidDateString(referenceDate)) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Deduplicate and filter valid dates
  const uniqueDates = Array.from(
    new Set(activityDates.filter(isValidDateString))
  ).sort((a, b) => a.localeCompare(b)); // Ascending order

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dateSet = new Set(uniqueDates);

  // 1. Calculate Current Streak
  const yesterday = addDays(referenceDate, -1);
  let currentStreak = 0;

  let pointer: string | null = null;
  if (dateSet.has(referenceDate)) {
    pointer = referenceDate;
  } else if (dateSet.has(yesterday)) {
    pointer = yesterday;
  }

  if (pointer) {
    let checkDate = pointer;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  // 2. Calculate Longest Streak
  let longestStreak = 0;
  let runningStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = uniqueDates[i - 1];
    const curr = uniqueDates[i];
    const diff = diffDays(prev, curr);

    if (diff === 1) {
      runningStreak++;
    } else {
      longestStreak = Math.max(longestStreak, runningStreak);
      runningStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, runningStreak);

  return {
    currentStreak,
    longestStreak,
  };
}
