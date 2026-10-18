import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDashboardDataQuery } from "@/server/queries/dashboard";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("getDashboardDataQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user is not logged in", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "No session" },
        }),
      },
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getDashboardDataQuery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("returns user-scoped dashboard data with streaks, routines, and session states", async () => {
    const mockProfile = {
      user_id: USER_ID,
      display_name: "Anshul Posture",
      timezone: "Asia/Kolkata",
      available_minutes: 25,
      fitness_level: "intermediate",
      onboarding_complete: true,
    };

    const mockRoutines = [
      {
        id: "routine-morning-1",
        user_id: USER_ID,
        name: "Morning Posture Alignment",
        session_type: "morning",
        status: "active",
        estimated_minutes: 20,
        routine_exercises: [
          { id: "re-1", position: 1, exercise: { name: "Cat-Cow Stretch" } },
          { id: "re-2", position: 2, exercise: { name: "Bird-Dog" } },
        ],
      },
      {
        id: "routine-evening-1",
        user_id: USER_ID,
        name: "Evening Spine Decompression",
        session_type: "evening",
        status: "active",
        estimated_minutes: 18,
        routine_exercises: [
          { id: "re-3", position: 1, exercise: { name: "Child's Pose" } },
        ],
      },
    ];

    const mockCompletedSessions = [
      {
        id: "sess-comp-1",
        activity_date: "2026-10-16",
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-16T02:00:00Z",
      },
      {
        id: "sess-comp-2",
        activity_date: "2026-10-17",
        duration_seconds: 1080,
        session_type: "evening",
        completed_at: "2026-10-17T14:00:00Z",
      },
    ];

    const mockInProgressSessions = [
      {
        id: "sess-active-1",
        routine_id: "routine-morning-1",
        session_type: "morning",
        started_at: "2026-10-17T08:00:00Z",
      },
    ];

    function createQueryBuilder(table: string) {
      let filterStatus: string | null = null;
      const builder: Record<string, unknown> = {};

      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn((field: string, val: string) => {
        if (field === "status") {
          filterStatus = val;
        }
        return builder;
      });
      builder.order = vi.fn().mockReturnValue(builder);
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: table === "profiles" ? mockProfile : null,
        error: null,
      });

      builder.then = (resolve: (arg: unknown) => void) => {
        if (table === "profiles") {
          resolve({ data: mockProfile, error: null });
        } else if (table === "routines") {
          resolve({ data: mockRoutines, error: null });
        } else if (table === "workout_sessions") {
          if (filterStatus === "completed") {
            resolve({ data: mockCompletedSessions, error: null });
          } else if (filterStatus === "in_progress") {
            resolve({ data: mockInProgressSessions, error: null });
          } else {
            resolve({ data: [], error: null });
          }
        } else {
          resolve({ data: [], error: null });
        }
      };

      return builder;
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: "anshul@lookfit.test" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => createQueryBuilder(table)),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getDashboardDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.displayName).toBe("Anshul Posture");
      expect(result.data.morningSession.routine?.name).toBe("Morning Posture Alignment");
      expect(result.data.morningSession.status).toBe("in_progress");
      expect(result.data.morningSession.activeSessionId).toBe("sess-active-1");
      expect(result.data.eveningSession.routine?.name).toBe("Evening Spine Decompression");
      expect(result.data.stats.totalSessionsDone).toBe(2);
      expect(result.data.stats.totalMobilityMinutes).toBe(38); // (1200+1080)/60 = 38
      expect(result.data.weeklyActivity).toHaveLength(7);
      expect(result.data.weeklyActivity.map((d) => d.day)).toEqual([
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
      ]);
    }
  });

  it("returns genuine zero statistics and empty weekly activity for a new user with no completed sessions", async () => {
    const mockProfile = {
      user_id: USER_ID,
      display_name: "New Athlete",
      timezone: "Asia/Kolkata",
      available_minutes: 20,
      fitness_level: "beginner",
      onboarding_complete: false,
    };

    function createQueryBuilder(table: string) {
      const builder: Record<string, unknown> = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.order = vi.fn().mockReturnValue(builder);
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: table === "profiles" ? mockProfile : null,
        error: null,
      });

      builder.then = (resolve: (arg: unknown) => void) => {
        if (table === "profiles") {
          resolve({ data: mockProfile, error: null });
        } else {
          resolve({ data: [], error: null }); // Zero routines, zero sessions
        }
      };

      return builder;
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: "new@lookfit.test" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => createQueryBuilder(table)),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getDashboardDataQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streak.activeStreak).toBe(0);
      expect(result.data.streak.longestStreak).toBe(0);
      expect(result.data.stats.totalSessionsDone).toBe(0);
      expect(result.data.stats.totalMobilityMinutes).toBe(0);
      expect(result.data.morningSession.routine).toBeNull();
      expect(result.data.morningSession.status).toBe("not_started");
      expect(result.data.eveningSession.routine).toBeNull();
      expect(result.data.eveningSession.status).toBe("not_started");

      // Verify weekly activity has exactly 7 days, all with zero activity
      expect(result.data.weeklyActivity).toHaveLength(7);
      for (const day of result.data.weeklyActivity) {
        expect(day.morning).toBe(false);
        expect(day.evening).toBe(false);
      }
      expect(result.data.weeklyActivity.some((d) => d.isToday)).toBe(true);
    }
  });

  it("computes accurate weekly activity with real morning and evening session indicators across Monday-Sunday", async () => {
    // Pin time to 2026-10-18T10:00:00Z (Sunday) in Asia/Kolkata (+05:30 -> 15:30 on 2026-10-18)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));

    const mockProfile = {
      user_id: USER_ID,
      display_name: "Weekly Athlete",
      timezone: "Asia/Kolkata",
      available_minutes: 20,
      fitness_level: "intermediate",
      onboarding_complete: true,
    };

    // Current week is Monday 2026-10-12 to Sunday 2026-10-18
    const mockCompletedSessions = [
      {
        id: "sess-1",
        activity_date: "2026-10-12", // Monday
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-12T08:00:00Z",
      },
      {
        id: "sess-2",
        activity_date: "2026-10-14", // Wednesday
        duration_seconds: 900,
        session_type: "evening",
        completed_at: "2026-10-14T19:00:00Z",
      },
      {
        id: "sess-3",
        activity_date: "2026-10-18", // Sunday (Today)
        duration_seconds: 1500,
        session_type: "morning",
        completed_at: "2026-10-18T08:30:00Z",
      },
      {
        id: "sess-old",
        activity_date: "2026-10-05", // Prior week Monday - should NOT appear in current week
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-05T08:00:00Z",
      },
    ];

    function createQueryBuilder(table: string) {
      let filterStatus: string | null = null;
      const builder: Record<string, unknown> = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn((field: string, val: string) => {
        if (field === "status") filterStatus = val;
        return builder;
      });
      builder.order = vi.fn().mockReturnValue(builder);
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: table === "profiles" ? mockProfile : null,
        error: null,
      });

      builder.then = (resolve: (arg: unknown) => void) => {
        if (table === "profiles") {
          resolve({ data: mockProfile, error: null });
        } else if (table === "workout_sessions" && filterStatus === "completed") {
          resolve({ data: mockCompletedSessions, error: null });
        } else {
          resolve({ data: [], error: null });
        }
      };

      return builder;
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: "weekly@lookfit.test" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => createQueryBuilder(table)),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getDashboardDataQuery();
    vi.useRealTimers();

    expect(result.success).toBe(true);
    if (result.success) {
      const days = result.data.weeklyActivity;
      expect(days).toHaveLength(7);

      // Mon (2026-10-12): morning true, evening false
      expect(days[0]).toMatchObject({
        day: "Mon",
        date: "2026-10-12",
        morning: true,
        evening: false,
        isToday: false,
      });

      // Tue (2026-10-13): empty day
      expect(days[1]).toMatchObject({
        day: "Tue",
        date: "2026-10-13",
        morning: false,
        evening: false,
        isToday: false,
      });

      // Wed (2026-10-14): morning false, evening true
      expect(days[2]).toMatchObject({
        day: "Wed",
        date: "2026-10-14",
        morning: false,
        evening: true,
        isToday: false,
      });

      // Sun (2026-10-18): today, morning true
      expect(days[6]).toMatchObject({
        day: "Sun",
        date: "2026-10-18",
        morning: true,
        evening: false,
        isToday: true,
      });
    }
  });

  it("selects the latest completed session deterministically when multiple sessions exist on the same day (F-D06)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z"));

    const mockProfile = {
      user_id: USER_ID,
      display_name: "Double Session Athlete",
      timezone: "Asia/Kolkata",
      available_minutes: 25,
      fitness_level: "intermediate",
      onboarding_complete: true,
    };

    const mockRoutines = [
      {
        id: "routine-morning-1",
        user_id: USER_ID,
        name: "Morning Posture",
        session_type: "morning",
        status: "active",
        estimated_minutes: 20,
        routine_exercises: [],
      },
    ];

    // Two morning sessions completed on 2026-10-18: one at 08:00 and another at 11:30
    const mockCompletedSessions = [
      {
        id: "sess-early",
        activity_date: "2026-10-18",
        duration_seconds: 600,
        session_type: "morning",
        completed_at: "2026-10-18T08:00:00Z",
      },
      {
        id: "sess-late",
        activity_date: "2026-10-18",
        duration_seconds: 1200,
        session_type: "morning",
        completed_at: "2026-10-18T11:30:00Z",
      },
    ];

    function createQueryBuilder(table: string) {
      let filterStatus: string | null = null;
      const builder: Record<string, unknown> = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn((field: string, val: string) => {
        if (field === "status") filterStatus = val;
        return builder;
      });
      builder.order = vi.fn().mockReturnValue(builder);
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: table === "profiles" ? mockProfile : null,
        error: null,
      });

      builder.then = (resolve: (arg: unknown) => void) => {
        if (table === "profiles") {
          resolve({ data: mockProfile, error: null });
        } else if (table === "routines") {
          resolve({ data: mockRoutines, error: null });
        } else if (table === "workout_sessions" && filterStatus === "completed") {
          // Emulate query ordered by completed_at descending (latest first)
          const sorted = [...mockCompletedSessions].sort((a, b) =>
            b.completed_at.localeCompare(a.completed_at)
          );
          resolve({ data: sorted, error: null });
        } else {
          resolve({ data: [], error: null });
        }
      };

      return builder;
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: "double@lookfit.test" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => createQueryBuilder(table)),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getDashboardDataQuery();
    vi.useRealTimers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.morningSession.status).toBe("completed");
      expect(result.data.morningSession.completedAt).toBe("2026-10-18T11:30:00Z");
      expect(result.data.stats.totalSessionsDone).toBe(2);
      expect(result.data.stats.totalMobilityMinutes).toBe(30); // (600 + 1200) / 60
    }
  });

  it("propagates database query failures gracefully with sanitized error", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID, email: "error@lookfit.test" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "42P01", message: "relation profiles does not exist" },
        }),
      })),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getDashboardDataQuery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
      expect(result.error.message).toBe("An unexpected error occurred. Please try again.");
    }
  });
});
