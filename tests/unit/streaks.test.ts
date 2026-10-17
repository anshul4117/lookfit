import { describe, expect, it } from "vitest";
import { calculateStreaks } from "@/lib/streaks";
import { addDays, diffDays, isValidDateString } from "@/lib/dates";

describe("Date utilities", () => {
  it("validates correct date strings", () => {
    expect(isValidDateString("2026-10-17")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true); // Leap year
    expect(isValidDateString("2023-02-29")).toBe(false); // Invalid leap day
    expect(isValidDateString("not-a-date")).toBe(false);
  });

  it("handles day additions and month roll-overs", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("calculates day differences accurately", () => {
    expect(diffDays("2026-10-15", "2026-10-16")).toBe(1);
    expect(diffDays("2026-10-15", "2026-10-15")).toBe(0);
    expect(diffDays("2026-10-16", "2026-10-15")).toBe(-1);
    expect(diffDays("2026-10-30", "2026-11-02")).toBe(3);
  });
});

describe("Streak calculation engine", () => {
  const TODAY = "2026-10-17";
  const YESTERDAY = "2026-10-16";

  it("returns zero for empty or invalid inputs", () => {
    expect(calculateStreaks([], TODAY)).toEqual({ currentStreak: 0, longestStreak: 0 });
    expect(calculateStreaks(["2026-10-17"], "invalid")).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it("counts today's workout towards current streak", () => {
    const dates = [TODAY];
    expect(calculateStreaks(dates, TODAY)).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("preserves streak if completed yesterday and not yet completed today", () => {
    const dates = [YESTERDAY, "2026-10-15", "2026-10-14"];
    expect(calculateStreaks(dates, TODAY)).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it("breaks current streak if last completion was 2 days ago", () => {
    const dates = ["2026-10-15", "2026-10-14", "2026-10-13"];
    expect(calculateStreaks(dates, TODAY)).toEqual({ currentStreak: 0, longestStreak: 3 });
  });

  it("counts multiple sessions on same day as single active day", () => {
    const dates = [TODAY, TODAY, YESTERDAY, YESTERDAY];
    expect(calculateStreaks(dates, TODAY)).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it("tracks historical longest streak separate from current streak", () => {
    // 5-day streak in past, 1-day streak today
    const dates = [
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      TODAY,
    ];
    expect(calculateStreaks(dates, TODAY)).toEqual({ currentStreak: 1, longestStreak: 5 });
  });

  it("handles cross-month boundary streak", () => {
    const dates = ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"];
    expect(calculateStreaks(dates, "2026-11-02")).toEqual({ currentStreak: 4, longestStreak: 4 });
  });
});
