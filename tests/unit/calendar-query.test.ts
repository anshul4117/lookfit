import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCalendarSessionsQuery } from "@/server/queries/calendar";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

const USER_ID = "00000000-0000-0000-0000-000000000001";

describe("getCalendarSessionsQuery", () => {
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

    const result = await getCalendarSessionsQuery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("returns user-scoped completed sessions with mapped snapshots", async () => {
    const mockSessionRows = [
      {
        id: "sess-1",
        user_id: USER_ID,
        routine_name_snapshot: "Morning Posture Alignment",
        session_type: "morning",
        routine_version_snapshot: 1,
        activity_date: "2026-10-17",
        duration_seconds: 1200,
        status: "completed",
        completed_at: "2026-10-17T02:00:00Z",
        session_exercises: [
          {
            id: "se-1",
            position: 1,
            exercise_name_snapshot: "Cat-Cow Stretch",
            category_snapshot: "mobility",
            prescribed_sets: 3,
            prescribed_duration_seconds: 45,
          },
          {
            id: "se-2",
            position: 2,
            exercise_name_snapshot: "Bird-Dog",
            category_snapshot: "core",
            prescribed_sets: 3,
            prescribed_reps: 10,
          },
        ],
      },
    ];

    const mockExercises = [
      {
        id: "se-1",
        session_id: "sess-1",
        position: 1,
        exercise_name_snapshot: "Cat-Cow Stretch",
        category_snapshot: "mobility",
        prescribed_sets: 3,
        prescribed_duration_seconds: 45,
      },
      {
        id: "se-2",
        session_id: "sess-1",
        position: 2,
        exercise_name_snapshot: "Bird-Dog",
        category_snapshot: "core",
        prescribed_sets: 3,
        prescribed_reps: 10,
      },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "workout_sessions") {
          const b: Record<string, unknown> = {};
          b.select = vi.fn().mockReturnValue(b);
          b.eq = vi.fn().mockReturnValue(b);
          b.order = vi.fn().mockReturnValue(b);
          b.then = (resolve: (arg: unknown) => void) => {
            resolve({ data: mockSessionRows, error: null });
          };
          return b;
        }
        if (table === "session_exercises") {
          const b: Record<string, unknown> = {};
          b.select = vi.fn().mockReturnValue(b);
          b.in = vi.fn().mockReturnValue(b);
          b.then = (resolve: (arg: unknown) => void) => {
            resolve({ data: mockExercises, error: null });
          };
          return b;
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    };

    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await getCalendarSessionsQuery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe("sess-1");
      expect(result.data[0].routineName).toBe("Morning Posture Alignment");
      expect(result.data[0].durationMinutes).toBe(20);
      expect(result.data[0].exercises.length).toBe(2);
      expect(result.data[0].exercises[0].name).toBe("Cat-Cow Stretch");
    }
  });
});
