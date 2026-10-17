import { describe, expect, it, vi, beforeEach } from "vitest";
import { completeWorkoutAction } from "@/server/actions/workouts";
import { completeWorkoutSession } from "@/server/services/workout-service";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type WorkoutSessionRecord = Tables<"workout_sessions">;

const USER_ID = "00000000-0000-0000-0000-000000000001";
const SESSION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const EXERCISE_1_ID = "eeeeeeee-1111-1111-1111-111111111111";
const EXERCISE_2_ID = "eeeeeeee-2222-2222-2222-222222222222";

function createMockCompletedSession(): WorkoutSessionRecord {
  return {
    id: SESSION_ID,
    user_id: USER_ID,
    routine_id: "11111111-1111-1111-1111-111111111111",
    session_type: "morning",
    status: "completed",
    routine_name_snapshot: "Morning Posture Alignment",
    routine_version_snapshot: 1,
    timezone_snapshot: "Asia/Kolkata",
    activity_date: "2026-10-17",
    plan_snapshot: {},
    started_at: "2026-10-17T01:30:00Z",
    completed_at: "2026-10-17T01:52:00Z",
    duration_seconds: 1320,
    created_at: "2026-10-17T01:30:00Z",
  };
}

describe("completeWorkoutSession service & completeWorkoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user is not logged in", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Auth session missing" },
        }),
      },
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await completeWorkoutSession({
      session_id: SESSION_ID,
      duration_seconds: 1200,
      results: [
        {
          session_exercise_id: EXERCISE_1_ID,
          completed: true,
          completed_sets: 3,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("validates input and rejects empty results array", async () => {
    const result = await completeWorkoutAction({
      session_id: SESSION_ID,
      duration_seconds: 1200,
      results: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects duplicate session exercise IDs in payload", async () => {
    const result = await completeWorkoutAction({
      session_id: SESSION_ID,
      duration_seconds: 1200,
      results: [
        {
          session_exercise_id: EXERCISE_1_ID,
          completed: true,
          completed_sets: 2,
        },
        {
          session_exercise_id: EXERCISE_1_ID,
          completed: true,
          completed_sets: 3,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("successfully completes session and invalidates cache", async () => {
    const mockCompletedSession = createMockCompletedSession();
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: mockCompletedSession,
        error: null,
      }),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await completeWorkoutAction({
      session_id: SESSION_ID,
      duration_seconds: 1320,
      results: [
        {
          session_exercise_id: EXERCISE_1_ID,
          completed: true,
          completed_sets: 3,
          completed_reps: 10,
        },
        {
          session_exercise_id: EXERCISE_2_ID,
          completed: true,
          completed_sets: 3,
          completed_reps: 12,
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("completed");
      expect(result.data.duration_seconds).toBe(1320);
    }

    expect(mockSupabase.rpc).toHaveBeenCalledWith("complete_workout_session", {
      p_session_id: SESSION_ID,
      p_results: [
        {
          session_exercise_id: EXERCISE_1_ID,
          completed: true,
          completed_sets: 3,
          completed_reps: 10,
        },
        {
          session_exercise_id: EXERCISE_2_ID,
          completed: true,
          completed_sets: 3,
          completed_reps: 12,
        },
      ],
      p_duration_seconds: 1320,
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/calendar");
    expect(revalidatePath).toHaveBeenCalledWith("/progress");
    expect(revalidatePath).toHaveBeenCalledWith(`/workout/${SESSION_ID}`);
  });

  it("sanitizes PostgreSQL RPC errors correctly", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "55000",
          message: "Workout session is not in progress",
        },
      }),
    };
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

    const result = await completeWorkoutAction({
      session_id: SESSION_ID,
      duration_seconds: 1200,
      results: [
        {
          session_exercise_id: EXERCISE_1_ID,
          completed: true,
          completed_sets: 3,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONFLICT");
      expect(result.error.message).toContain("The operation cannot be completed in the current state");
    }
  });
});
