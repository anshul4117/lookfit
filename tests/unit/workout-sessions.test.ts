import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  startWorkoutAction,
  resumeWorkoutAction,
} from "@/server/actions/workouts";
import {
  startWorkoutSession,
  resumeWorkoutSession,
} from "@/server/services/workout-service";
import { calculateActivityDate } from "@/lib/domain/workout";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

type WorkoutSessionRecord = Tables<"workout_sessions">;
type SessionExerciseRecord = Tables<"session_exercises">;

const USER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";
const ROUTINE_ID = "11111111-1111-1111-1111-111111111111";
const ARCHIVED_ROUTINE_ID = "33333333-3333-3333-3333-333333333333";
const SESSION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_SESSION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const EXERCISE_1_ID = "eeeeeeee-1111-1111-1111-111111111111";
const EXERCISE_2_ID = "eeeeeeee-2222-2222-2222-222222222222";

function createMockSession(
  overrides: Partial<WorkoutSessionRecord> = {}
): WorkoutSessionRecord {
  return {
    id: SESSION_ID,
    user_id: USER_ID,
    routine_id: ROUTINE_ID,
    session_type: "morning",
    status: "in_progress",
    routine_name_snapshot: "Morning Posture Alignment",
    routine_version_snapshot: 1,
    timezone_snapshot: "Asia/Kolkata",
    activity_date: "2026-10-14",
    plan_snapshot: {
      routine_id: ROUTINE_ID,
      routine_name: "Morning Posture Alignment",
      version: 1,
      session_type: "morning",
      estimated_minutes: 25,
      exercises: [
        { position: 1, name: "Cat-Cow Stretch" },
        { position: 2, name: "Bird-Dog" },
      ],
    },
    started_at: "2026-10-14T01:30:00Z",
    completed_at: null,
    duration_seconds: null,
    created_at: "2026-10-14T01:30:00Z",
    ...overrides,
  };
}

function createMockSessionExercises(): SessionExerciseRecord[] {
  return [
    {
      id: "se-1",
      session_id: SESSION_ID,
      user_id: USER_ID,
      exercise_id: EXERCISE_1_ID,
      position: 1,
      exercise_name_snapshot: "Cat-Cow Stretch",
      category_snapshot: "posture",
      instructions_snapshot: ["Inhale arch", "Exhale round"],
      safety_notes_snapshot: "Move gently without forcing range",
      prescribed_sets: 2,
      prescribed_reps: 10,
      prescribed_duration_seconds: null,
      rest_seconds: 30,
      completed: false,
      completed_sets: 0,
      completed_reps: null,
      actual_duration_seconds: null,
      notes: null,
      created_at: "2026-10-14T01:30:00Z",
    },
    {
      id: "se-2",
      session_id: SESSION_ID,
      user_id: USER_ID,
      exercise_id: EXERCISE_2_ID,
      position: 2,
      exercise_name_snapshot: "Bird-Dog",
      category_snapshot: "core",
      instructions_snapshot: ["Extend opposite arm and leg"],
      safety_notes_snapshot: "Keep pelvis level",
      prescribed_sets: 3,
      prescribed_reps: 8,
      prescribed_duration_seconds: null,
      rest_seconds: 45,
      completed: false,
      completed_sets: 0,
      completed_reps: null,
      actual_duration_seconds: null,
      notes: null,
      created_at: "2026-10-14T01:30:00Z",
    },
  ];
}

describe("T11: Start and Resume Workouts Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Valid Workout Start & Response Paths", () => {
    it("Response Path A: atomically starts a new workout session from a saved routine and returns full snapshots", async () => {
      const mockSession = createMockSession();
      const mockExercises = createMockSessionExercises();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        rpc: vi.fn().mockImplementation((fnName: string, args: { p_routine_id: string }) => {
          if (fnName === "start_workout_session") {
            expect(args.p_routine_id).toBe(ROUTINE_ID);
            return Promise.resolve({ data: mockSession, error: null });
          }
          return Promise.resolve({ data: null, error: { code: "42883" } });
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col1: string, val1: string) => ({
              eq: vi.fn().mockImplementation((col2: string, val2: string) => ({
                order: vi.fn().mockResolvedValue({
                  data: mockExercises,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(SESSION_ID);
        expect(result.data.status).toBe("in_progress");
        expect(result.data.routine_name_snapshot).toBe("Morning Posture Alignment");
        expect(result.data.routine_version_snapshot).toBe(1);
        expect(result.data.timezone_snapshot).toBe("Asia/Kolkata");
        expect(result.data.activity_date).toBe("2026-10-14");
        expect(result.data.session_exercises).toHaveLength(2);
        expect(result.data.session_exercises[0].exercise_name_snapshot).toBe("Cat-Cow Stretch");
        expect(result.data.session_exercises[0].category_snapshot).toBe("posture");
        expect(result.data.session_exercises[1].exercise_name_snapshot).toBe("Bird-Dog");
      }
    });

    it("Response Path B: returns existing in-progress session idempotently upon duplicate start", async () => {
      const existingSession = createMockSession({
        id: SESSION_ID,
        status: "in_progress",
      });
      const existingExercises = createMockSessionExercises();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({
          data: existingSession,
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockResolvedValue({
                  data: existingExercises,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(SESSION_ID);
        expect(result.data.session_exercises).toHaveLength(2);
      }
    });

    it("verifies snapshot consistency between session header, routine version, and exercise rows", async () => {
      const mockSession = createMockSession({ routine_version_snapshot: 2 });
      const mockExercises = createMockSessionExercises();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({
          data: mockSession,
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockResolvedValue({
                  data: mockExercises,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.routine_version_snapshot).toBe(2);
        expect(result.data.session_exercises[0].position).toBe(1);
        expect(result.data.session_exercises[1].position).toBe(2);
      }
    });
  });

  describe("2. Routine Authorization and Eligibility", () => {
    it("rejects starting another user's routine with NOT_FOUND to prevent enumeration", async () => {
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
            code: "P0002",
            message: "Routine not found",
          },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Requested resource was not found");
      }
    });

    it("rejects creating a new workout session for an archived routine with CONFLICT", async () => {
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
            message: "Cannot start an archived routine",
          },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ARCHIVED_ROUTINE_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CONFLICT");
      }
    });

    it("returns existing in-progress session if routine was subsequently archived after session started", async () => {
      // In-flight workout started when routine was v1; routine was subsequently updated/archived
      const inFlightSession = createMockSession({
        id: SESSION_ID,
        routine_id: ARCHIVED_ROUTINE_ID,
        status: "in_progress",
      });
      const inFlightExercises = createMockSessionExercises();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({
          data: inFlightSession,
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockResolvedValue({
                  data: inFlightExercises,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ARCHIVED_ROUTINE_ID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(SESSION_ID);
        expect(result.data.status).toBe("in_progress");
      }
    });
  });

  describe("3. Strict Routine Validation via startRoutineWorkoutSchema", () => {
    it("rejects malformed UUID format with VALIDATION_ERROR", async () => {
      const result = await startWorkoutAction({ routine_id: "not-a-valid-uuid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("rejects null routine_id with VALIDATION_ERROR", async () => {
      const result = await startWorkoutAction({ routine_id: null });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("rejects missing routine_id with VALIDATION_ERROR", async () => {
      const result = await startWorkoutAction({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("strictly rejects client-supplied user_id tampering via Zod strictness", async () => {
      const result = await startWorkoutAction({
        routine_id: ROUTINE_ID,
        user_id: OTHER_USER_ID,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("4. Atomic Failure and Rollback Behavior", () => {
    it("fails safely and returns an actionable error if the required RPC migration is missing", async () => {
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
            code: "PGRST202",
            message: "Could not find the function public.start_workout_session",
          },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
        expect(result.error.message).toContain("Required migrations must be applied");
      }
    });

    it("returns sanitized error when database transaction rolls back due to snapshot mismatch", async () => {
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
            code: "22023",
            message: "Routine must contain at least one valid exercise",
          },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("5. Duplicate Start / Retry Idempotency", () => {
    it("returns the existing active in-progress session on retry without creating duplicate snapshots", async () => {
      const existingSession = createMockSession({
        id: SESSION_ID,
        status: "in_progress",
      });
      const existingExercises = createMockSessionExercises();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({
          data: existingSession,
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                order: vi.fn().mockResolvedValue({
                  data: existingExercises,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const firstAttempt = await startWorkoutAction({ routine_id: ROUTINE_ID });
      const secondAttempt = await startWorkoutAction({ routine_id: ROUTINE_ID });

      expect(firstAttempt.success).toBe(true);
      expect(secondAttempt.success).toBe(true);

      if (firstAttempt.success && secondAttempt.success) {
        expect(firstAttempt.data.id).toBe(secondAttempt.data.id);
        expect(firstAttempt.data.session_exercises).toHaveLength(2);
        expect(secondAttempt.data.session_exercises).toHaveLength(2);
      }
    });
  });

  describe("6. Timezone and Activity Date Calculations", () => {
    it("calculates the activity date correctly across midnight UTC boundaries", () => {
      // 2026-10-13 23:30:00 UTC
      const testDate = new Date("2026-10-13T23:30:00.000Z");

      // In Tokyo (UTC+9), it is 2026-10-14 08:30:00
      const tokyoDate = calculateActivityDate(testDate, "Asia/Tokyo");
      expect(tokyoDate).toBe("2026-10-14");

      // In New York (UTC-4 / EDT), it is 2026-10-13 19:30:00
      const nyDate = calculateActivityDate(testDate, "America/New_York");
      expect(nyDate).toBe("2026-10-13");

      // In Kolkata (UTC+5:30), it is 2026-10-14 05:00:00
      const kolkataDate = calculateActivityDate(testDate, "Asia/Kolkata");
      expect(kolkataDate).toBe("2026-10-14");
    });

    it("falls back safely to UTC if an invalid timezone string is provided", () => {
      const testDate = new Date("2026-10-13T23:30:00.000Z");
      const result = calculateActivityDate(testDate, "Invalid/Nonexistent_Timezone");
      expect(result).toBe("2026-10-13");
    });
  });

  describe("7. Successful Resume Without Duplicate Snapshots", () => {
    it("resumes an existing in-progress session and reads original exercise snapshots without mutation", async () => {
      const activeSession = createMockSession({ status: "in_progress" });
      const existingExercises = createMockSessionExercises();

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((tableName: string) => {
          if (tableName === "workout_sessions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => ({
                  eq: vi.fn().mockImplementation(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: activeSession,
                      error: null,
                    }),
                  })),
                })),
              }),
            };
          }
          if (tableName === "session_exercises") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => ({
                  eq: vi.fn().mockImplementation(() => ({
                    order: vi.fn().mockResolvedValue({
                      data: existingExercises,
                      error: null,
                    }),
                  })),
                })),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await resumeWorkoutAction({ session_id: SESSION_ID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(SESSION_ID);
        expect(result.data.status).toBe("in_progress");
        expect(result.data.session_exercises).toHaveLength(2);
        expect(result.data.session_exercises[0].exercise_name_snapshot).toBe("Cat-Cow Stretch");
      }
    });
  });

  describe("8. Rejection of Another User's Session on Resume", () => {
    it("returns NOT_FOUND when attempting to resume a session owned by another user", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // RLS filters out rows belonging to another user
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await resumeWorkoutAction({ session_id: OTHER_SESSION_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Workout session not found");
      }
    });
  });

  describe("9. Rejection of Finalized or Non-Resumable Session", () => {
    it("rejects resuming a completed session with CONFLICT", async () => {
      const completedSession = createMockSession({
        status: "completed",
        completed_at: "2026-10-14T02:00:00Z",
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: completedSession,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await resumeWorkoutAction({ session_id: SESSION_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CONFLICT");
        expect(result.error.message).toContain("Cannot resume a completed or cancelled");
      }
    });

    it("rejects resuming a cancelled session with CONFLICT", async () => {
      const cancelledSession = createMockSession({
        status: "cancelled",
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: cancelledSession,
                  error: null,
                }),
              })),
            })),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await resumeWorkoutAction({ session_id: SESSION_ID });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CONFLICT");
      }
    });
  });

  describe("10. Unauthenticated Access Protection", () => {
    it("rejects startWorkoutAction when user is not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Auth session missing" },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await startWorkoutAction({ routine_id: ROUTINE_ID });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("rejects resumeWorkoutAction when user is not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Auth session missing" },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await resumeWorkoutAction({ session_id: SESSION_ID });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });
  });
});
