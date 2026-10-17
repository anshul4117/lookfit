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
    }
  });
});
