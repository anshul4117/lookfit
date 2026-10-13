import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createRoutineAction,
  updateRoutineAction,
  archiveRoutineAction,
  saveGeneratedRoutineAction,
} from "@/server/actions/routines";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/services/planner-service", () => ({
  generateUserRoutinePlan: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { generateUserRoutinePlan } from "@/server/services/planner-service";

type RoutineRecord = Tables<"routines">;

function createMockRoutine(
  overrides: Partial<RoutineRecord> = {}
): RoutineRecord {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "user-1111-1111-1111",
    name: "Morning Posture Routine",
    session_type: "morning",
    version: 1,
    status: "active",
    estimated_minutes: 25,
    generated_by: "user",
    routine_lineage_id: "00000000-0000-0000-0000-000000000099",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const mockExercisePayload = [
  {
    exercise_id: "00000000-0000-0000-0000-000000000011",
    position: 1,
    prescribed_sets: 2,
    prescribed_reps: 10,
    prescribed_duration_seconds: null,
    rest_seconds: 30,
  },
  {
    exercise_id: "00000000-0000-0000-0000-000000000012",
    position: 2,
    prescribed_sets: 3,
    prescribed_reps: 12,
    prescribed_duration_seconds: null,
    rest_seconds: 30,
  },
];

describe("T10: Routine Actions & Versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRoutineAction", () => {
    it("returns UNAUTHENTICATED when user is not logged in", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("No session"),
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await createRoutineAction({
        name: "Morning Activation",
        session_type: "morning",
        estimated_minutes: 20,
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("creates a new routine with version 1 via atomic RPC when available", async () => {
      const createdRoutine = createMockRoutine({ version: 1 });
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1111-1111-1111" } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({
          data: createdRoutine,
          error: null,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await createRoutineAction({
        name: "Morning Activation",
        session_type: "morning",
        estimated_minutes: 20,
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.status).toBe("active");
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "create_routine_with_exercises",
        expect.objectContaining({
          p_name: "Morning Activation",
          p_session_type: "morning",
        })
      );
    });

    it("fails safely and returns actionable error when routine creation RPC is missing", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1111-1111-1111" } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "function not found", code: "42883" },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await createRoutineAction({
        name: "Morning Activation",
        session_type: "morning",
        estimated_minutes: 20,
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
        expect(result.error.message).toContain("migrations must be applied");
      }
    });
  });

  describe("updateRoutineAction & Version Incrementing", () => {
    it("rejects updating a routine owned by another user", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "attacker-user-id" } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                // If user_id is checked against attacker, returns null
                if (col === "user_id" && val === "attacker-user-id") {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
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

      const result = await updateRoutineAction({
        id: "00000000-0000-0000-0000-000000000001",
        name: "Hijacked Routine",
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("rejects editing an already archived routine", async () => {
      const archivedRoutine = createMockRoutine({ status: "archived" });
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1111-1111-1111" } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: archivedRoutine,
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateRoutineAction({
        id: archivedRoutine.id,
        name: "Attempted Edit on Archived",
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CONFLICT");
      }
    });

    it("creates a new routine version (v2) and archives previous version (v1)", async () => {
      const prevRoutine = createMockRoutine({ version: 1, status: "active" });
      const nextRoutine = createMockRoutine({
        id: "00000000-0000-0000-0000-000000000002",
        version: 2,
        name: "Morning Posture Routine Updated",
        status: "active",
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1111-1111-1111" } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: prevRoutine,
                error: null,
              }),
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({
          data: nextRoutine,
          error: null,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateRoutineAction({
        id: prevRoutine.id,
        name: "Morning Posture Routine Updated",
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(2);
        expect(result.data.status).toBe("active");
        expect(result.data.id).toBe("00000000-0000-0000-0000-000000000002");
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "update_routine_version",
        expect.objectContaining({
          p_routine_id: prevRoutine.id,
          p_name: "Morning Posture Routine Updated",
        })
      );
    });

    it("fails safely and returns actionable error when update RPC is missing", async () => {
      const prevRoutine = createMockRoutine({ version: 1, status: "active" });
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1111-1111-1111" } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: prevRoutine,
                error: null,
              }),
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "function not found", code: "PGRST202" },
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await updateRoutineAction({
        id: prevRoutine.id,
        name: "Morning Posture Routine Updated",
        exercises: mockExercisePayload,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
        expect(result.error.message).toContain("migrations must be applied");
      }
    });
  });

  describe("archiveRoutineAction", () => {
    it("archives an existing active routine", async () => {
      const activeRoutine = createMockRoutine({ status: "active" });
      const archivedRoutine = createMockRoutine({ status: "archived" });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1111-1111-1111" } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "routines") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: activeRoutine,
                error: null,
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: archivedRoutine,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await archiveRoutineAction({ id: activeRoutine.id });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("archived");
      }
    });
  });

  describe("saveGeneratedRoutineAction", () => {
    it("handles NO_SAFE_PLAN error gracefully from planner service", async () => {
      vi.mocked(generateUserRoutinePlan).mockResolvedValue({
        success: false,
        error: {
          code: "NO_SAFE_PLAN",
          message: "Available duration is below minimum required 20 min.",
          details: { reasons: ["User available minutes: 10"] },
        },
      });

      const result = await saveGeneratedRoutineAction("morning");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NO_SAFE_PLAN");
      }
    });
  });
});
