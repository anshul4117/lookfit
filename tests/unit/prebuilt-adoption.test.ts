import { describe, expect, it, vi, beforeEach } from "vitest";
import { adoptPrebuiltRoutineAction } from "@/server/actions/routines";
import { PREBUILT_MORNING_ROUTINE } from "@/lib/domain/prebuilt-routines";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

type RoutineRecord = Tables<"routines">;

function createMockRoutine(
  overrides: Partial<RoutineRecord> = {}
): RoutineRecord {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "user-1111-1111-1111",
    name: PREBUILT_MORNING_ROUTINE.name,
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

const mockCatalogExercises = [
  { id: "00000000-0000-0000-0000-000000000001", slug: "cat-cow" },
  { id: "00000000-0000-0000-0000-000000000002", slug: "wall-angels" },
  { id: "00000000-0000-0000-0000-000000000003", slug: "chin-tuck" },
  { id: "00000000-0000-0000-0000-000000000004", slug: "bird-dog" },
  { id: "00000000-0000-0000-0000-000000000005", slug: "glute-bridge" },
  { id: "00000000-0000-0000-0000-000000000006", slug: "forearm-plank" },
  { id: "00000000-0000-0000-0000-000000000007", slug: "push-up" },
  { id: "00000000-0000-0000-0000-000000000008", slug: "bodyweight-squat" },
  { id: "00000000-0000-0000-0000-000000000009", slug: "reverse-lunge" },
  { id: "00000000-0000-0000-0000-000000000010", slug: "cobra-pose" },
  { id: "00000000-0000-0000-0000-000000000011", slug: "deep-breathing" },
];

describe("Pre-built Routine Adoption Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated adoption requests", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No session"),
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await adoptPrebuiltRoutineAction({ session_type: "morning" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("rejects invalid session types via schema validation", async () => {
    const result = await adoptPrebuiltRoutineAction({ session_type: "afternoon" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("creates Version 1 routine when user adopts blueprint for the first time", async () => {
    const createdRoutine = createMockRoutine({ version: 1 });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1111-1111-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "exercises") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockCatalogExercises,
              error: null,
            }),
          };
        }
        if (table === "routines") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null, // No existing active routine
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: createdRoutine,
        error: null,
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await adoptPrebuiltRoutineAction({ session_type: "morning" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.session_type).toBe("morning");
    }
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "create_routine_with_exercises",
      expect.objectContaining({
        p_name: PREBUILT_MORNING_ROUTINE.name,
        p_session_type: "morning",
      })
    );
  });

  it("returns existing active routine idempotently without creating duplicates on repeated submission", async () => {
    const existingRoutine = {
      ...createMockRoutine({
        id: "existing-routine-123",
        name: PREBUILT_MORNING_ROUTINE.name,
        version: 1,
      }),
      routine_exercises: Array(11).fill({ id: "re-1" }), // Matches blueprint exercise count
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1111-1111-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "exercises") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockCatalogExercises,
              error: null,
            }),
          };
        }
        if (table === "routines") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingRoutine,
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await adoptPrebuiltRoutineAction({ session_type: "morning" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("existing-routine-123");
      expect(result.data.version).toBe(1);
    }
    // Verifies no RPC call was made to create or update
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("updates to Version N + 1 when user has an active routine with different configuration", async () => {
    const existingRoutine = {
      ...createMockRoutine({
        id: "00000000-0000-0000-0000-000000000001",
        name: "Customized Morning Routine",
        version: 1,
      }),
      routine_exercises: Array(4).fill({ id: "re-custom" }), // Different count/name
    };

    const updatedRoutineV2 = createMockRoutine({
      id: "00000000-0000-0000-0000-000000000002",
      name: PREBUILT_MORNING_ROUTINE.name,
      version: 2,
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1111-1111-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "exercises") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: mockCatalogExercises,
              error: null,
            }),
          };
        }
        if (table === "routines") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingRoutine,
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: updatedRoutineV2,
        error: null,
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await adoptPrebuiltRoutineAction({ session_type: "morning" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(2);
      expect(result.data.id).toBe("00000000-0000-0000-0000-000000000002");
    }
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "update_routine_version",
      expect.objectContaining({
        p_routine_id: "00000000-0000-0000-0000-000000000001",
        p_name: PREBUILT_MORNING_ROUTINE.name,
      })
    );
  });

  it("handles missing catalog exercises gracefully with INTERNAL_ERROR", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1111-1111-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "exercises") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "00000000-0000-0000-0000-000000000001", slug: "cat-cow" }], // Missing other slugs
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await adoptPrebuiltRoutineAction({ session_type: "morning" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
      expect(result.error.message).toContain("Missing active catalog exercises");
    }
  });
});
