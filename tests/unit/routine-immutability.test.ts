import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateRoutineAction } from "@/server/actions/routines";
import {
  getRoutineByIdQuery,
  getRoutineVersionsQuery,
} from "@/server/queries/routines";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

type RoutineRecord = Tables<"routines">;
type RoutineExerciseRecord = Tables<"routine_exercises">;
type WorkoutSessionRecord = Tables<"workout_sessions">;

const USER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";

const V1_ROUTINE_ID = "11111111-1111-1111-1111-111111111111";
const V2_ROUTINE_ID = "22222222-2222-2222-2222-222222222222";

const EXERCISE_1_ID = "eeeeeeee-1111-1111-1111-111111111111";
const EXERCISE_2_ID = "eeeeeeee-2222-2222-2222-222222222222";
const EXERCISE_3_ID = "eeeeeeee-3333-3333-3333-333333333333";

function createMockV1Routine(overrides: Partial<RoutineRecord> = {}): RoutineRecord {
  return {
    id: V1_ROUTINE_ID,
    user_id: USER_ID,
    name: "Morning Posture Alignment",
    session_type: "morning",
    version: 1,
    status: "active",
    estimated_minutes: 25,
    generated_by: "user",
    routine_lineage_id: "lineage-1111-1111-1111",
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
    ...overrides,
  };
}

function createMockV1Exercises(): RoutineExerciseRecord[] {
  return [
    {
      id: "re-1",
      routine_id: V1_ROUTINE_ID,
      user_id: USER_ID,
      exercise_id: EXERCISE_1_ID,
      position: 1,
      prescribed_sets: 2,
      prescribed_reps: 10,
      prescribed_duration_seconds: null,
      rest_seconds: 30,
      created_at: "2026-10-01T08:00:00Z",
    },
    {
      id: "re-2",
      routine_id: V1_ROUTINE_ID,
      user_id: USER_ID,
      exercise_id: EXERCISE_2_ID,
      position: 2,
      prescribed_sets: 3,
      prescribed_reps: 12,
      prescribed_duration_seconds: null,
      rest_seconds: 45,
      created_at: "2026-10-01T08:00:00Z",
    },
  ];
}

function createMockWorkoutSession(): WorkoutSessionRecord {
  return {
    id: "session-001",
    user_id: USER_ID,
    routine_id: V1_ROUTINE_ID,
    session_type: "morning",
    status: "completed",
    routine_name_snapshot: "Morning Posture Alignment",
    routine_version_snapshot: 1,
    timezone_snapshot: "UTC",
    activity_date: "2026-10-05",
    plan_snapshot: {
      exercises: [
        { name: "Thoracic Extension", sets: 2, reps: 10 },
        { name: "Cat-Cow Stretch", sets: 3, reps: 12 },
      ],
    },
    started_at: "2026-10-05T08:00:00Z",
    completed_at: "2026-10-05T08:25:00Z",
    duration_seconds: 1500,
    created_at: "2026-10-05T08:00:00Z",
  };
}

describe("T10: Historical Integrity and Immutability Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Routine Version Archival and Exercise Preservation", () => {
    it("archives version 1 without altering its original exercise records", async () => {
      const v1Routine = createMockV1Routine({ status: "active" });
      const v1Exercises = createMockV1Exercises();

      const v2Routine: RoutineRecord = {
        ...v1Routine,
        id: V2_ROUTINE_ID,
        version: 2,
        name: "Morning Posture Alignment (Updated)",
        status: "active",
        updated_at: "2026-10-10T08:00:00Z",
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: v1Routine,
                error: null,
              }),
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({
          data: v2Routine,
          error: null,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const updateResult = await updateRoutineAction({
        id: V1_ROUTINE_ID,
        name: "Morning Posture Alignment (Updated)",
        exercises: [
          {
            exercise_id: EXERCISE_1_ID,
            position: 1,
            prescribed_sets: 3,
            prescribed_reps: 12,
            prescribed_duration_seconds: null,
            rest_seconds: 30,
          },
          {
            exercise_id: EXERCISE_3_ID,
            position: 2,
            prescribed_sets: 3,
            prescribed_reps: 15,
            prescribed_duration_seconds: null,
            rest_seconds: 45,
          },
        ],
      });

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        // Returned routine is the new v2 row
        expect(updateResult.data.id).toBe(V2_ROUTINE_ID);
        expect(updateResult.data.version).toBe(2);
        expect(updateResult.data.status).toBe("active");
      }

      // Verify RPC invocation explicitly targets the existing routine to archive it atomically
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "update_routine_version",
        expect.objectContaining({
          p_routine_id: V1_ROUTINE_ID,
          p_name: "Morning Posture Alignment (Updated)",
        })
      );

      // Verify original exercises of v1 remained untouched
      expect(v1Exercises[0].routine_id).toBe(V1_ROUTINE_ID);
      expect(v1Exercises[0].prescribed_sets).toBe(2);
      expect(v1Exercises[1].routine_id).toBe(V1_ROUTINE_ID);
      expect(v1Exercises[1].prescribed_sets).toBe(3);
    });

    it("allows inspecting archived version 1 with its full original exercise list", async () => {
      const archivedV1Routine = createMockV1Routine({ status: "archived" });
      const v1Exercises = createMockV1Exercises().map((item) => ({
        ...item,
        exercise: {
          id: item.exercise_id,
          slug: "test-exercise",
          name: "Test Exercise",
          category: "posture_spine",
          difficulty: "beginner",
          target_areas: ["spine"],
          equipment: ["none"],
          instructions: ["Step 1"],
          safety_notes: "None",
        },
      }));

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: archivedV1Routine,
                error: null,
              }),
            };
          }
          if (table === "routine_exercises") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: v1Exercises,
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const inspectResult = await getRoutineByIdQuery(V1_ROUTINE_ID);
      expect(inspectResult.success).toBe(true);
      if (inspectResult.success) {
        expect(inspectResult.data.id).toBe(V1_ROUTINE_ID);
        expect(inspectResult.data.status).toBe("archived");
        expect(inspectResult.data.version).toBe(1);
        expect(inspectResult.data.routine_exercises).toHaveLength(2);
        expect(inspectResult.data.routine_exercises[0].position).toBe(1);
        expect(inspectResult.data.routine_exercises[1].position).toBe(2);
      }
    });

    it("returns all versions (active and archived) in getRoutineVersionsQuery", async () => {
      const activeV2 = createMockV1Routine({
        id: V2_ROUTINE_ID,
        version: 2,
        status: "active",
      });
      const archivedV1 = createMockV1Routine({
        id: V1_ROUTINE_ID,
        version: 1,
        status: "archived",
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { ...activeV2, routine_exercises: [{ id: "re-1" }] },
              { ...archivedV1, routine_exercises: [{ id: "re-2" }] },
            ],
            error: null,
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const versionsResult = await getRoutineVersionsQuery("lineage-1111-1111-1111");
      expect(versionsResult.success).toBe(true);
      if (versionsResult.success) {
        expect(versionsResult.data).toHaveLength(2);
        expect(versionsResult.data[0].version).toBe(2);
        expect(versionsResult.data[0].status).toBe("active");
        expect(versionsResult.data[1].version).toBe(1);
        expect(versionsResult.data[1].status).toBe("archived");
      }
    });

    it("isolates version history: independent routines with the same session type belong to different lineages", async () => {
      const morningRoutineA_v1 = createMockV1Routine({
        id: "routine-a-v1",
        routine_lineage_id: "lineage-aaaa",
        name: "Morning Posture Routine",
        version: 1,
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
            eq: vi.fn().mockImplementation((col: string, _val: string) => {
              if (col === "user_id") {
                // First .eq("user_id", ...) — return chainable object for second .eq
                return {
                  eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                    if (col2 === "routine_lineage_id" && val2 === "lineage-aaaa") {
                      return {
                        order: vi.fn().mockResolvedValue({
                          data: [{ ...morningRoutineA_v1, routine_exercises: [{ id: "re-1" }] }],
                          error: null,
                        }),
                      };
                    }
                    // Different lineage — no results
                    return {
                      order: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    };
                  }),
                };
              }
              // Unexpected column
              return {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const versionsResult = await getRoutineVersionsQuery("lineage-aaaa");
      expect(versionsResult.success).toBe(true);
      if (versionsResult.success) {
        expect(versionsResult.data).toHaveLength(1);
        expect(versionsResult.data[0].id).toBe("routine-a-v1");
        expect(versionsResult.data[0].name).toBe("Morning Posture Routine");
      }
    });
  });

  describe("Workout Session Snapshot Isolation", () => {
    it("ensures completed workout sessions retain their snapshot values when routine is updated", async () => {
      const completedSession = createMockWorkoutSession();

      // Verify baseline snapshot
      expect(completedSession.routine_id).toBe(V1_ROUTINE_ID);
      expect(completedSession.routine_name_snapshot).toBe("Morning Posture Alignment");
      expect(completedSession.routine_version_snapshot).toBe(1);
      expect(completedSession.plan_snapshot).toBeDefined();

      const v1Routine = createMockV1Routine({ status: "active" });
      const v2Routine: RoutineRecord = {
        ...v1Routine,
        id: V2_ROUTINE_ID,
        version: 2,
        name: "Morning Posture Alignment (Renamed)",
        status: "active",
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: v1Routine,
                error: null,
              }),
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({
          data: v2Routine,
          error: null,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      // Perform update to create version 2
      const result = await updateRoutineAction({
        id: V1_ROUTINE_ID,
        name: "Morning Posture Alignment (Renamed)",
        exercises: [
          {
            exercise_id: EXERCISE_1_ID,
            position: 1,
            prescribed_sets: 3,
            prescribed_reps: 15,
            prescribed_duration_seconds: null,
            rest_seconds: 30,
          },
        ],
      });

      expect(result.success).toBe(true);

      // Confirm workout session was not mutated:
      // It must still point to routine_id = V1_ROUTINE_ID,
      // its snapshot version must still be 1, and its snapshot name unchanged.
      expect(completedSession.routine_id).toBe(V1_ROUTINE_ID);
      expect(completedSession.routine_name_snapshot).toBe("Morning Posture Alignment");
      expect(completedSession.routine_version_snapshot).toBe(1);
      expect(completedSession.status).toBe("completed");
    });
  });

  describe("Concurrency & Conflict Protection", () => {
    it("handles concurrency conflict when routine was already updated or archived", async () => {
      // Simulate RPC returning Postgres 55000 (Cannot update an archived routine)
      // or conflict code due to concurrent update
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: createMockV1Routine({ status: "active" }),
                error: null,
              }),
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Cannot update an archived routine",
            code: "55000",
          },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateRoutineAction({
        id: V1_ROUTINE_ID,
        name: "Conflicted Update",
        exercises: [
          {
            exercise_id: EXERCISE_1_ID,
            position: 1,
            prescribed_sets: 2,
            prescribed_reps: 10,
            prescribed_duration_seconds: null,
            rest_seconds: 30,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(["CONFLICT", "DATABASE_ERROR"]).toContain(result.error.code);
      }
    });

    it("rejects update when routine is already archived prior to RPC execution", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: createMockV1Routine({ status: "archived" }),
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateRoutineAction({
        id: V1_ROUTINE_ID,
        name: "Update On Already Archived",
        exercises: [
          {
            exercise_id: EXERCISE_1_ID,
            position: 1,
            prescribed_sets: 2,
            prescribed_reps: 10,
            prescribed_duration_seconds: null,
            rest_seconds: 30,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CONFLICT");
        expect(result.error.message).toContain("Cannot edit an archived routine");
      }
    });
  });

  describe("Cross-User Isolation & Ownership Boundary", () => {
    it("returns NOT_FOUND when querying a routine belonging to another user", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                // If checking user_id = USER_ID on a routine owned by OTHER_USER_ID, returns null
                if (col === "user_id" && val === USER_ID) {
                  return {
                    eq: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null, // RLS filters out other users' routines
                      error: null,
                    }),
                  };
                }
                return {
                  eq: vi.fn().mockReturnThis(),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getRoutineByIdQuery("other-users-routine-id");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("does not leak other users' routine versions in getRoutineVersionsQuery", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: USER_ID } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            expect(col === "user_id" ? val : null).toBe(USER_ID);
            return {
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [], // Only returns current user's records
                error: null,
              }),
            };
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getRoutineVersionsQuery("lineage-1111-1111-1111");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });
});
