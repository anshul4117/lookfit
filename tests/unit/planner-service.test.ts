import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateUserRoutinePlan } from "@/server/services/planner-service";
import type { Tables } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

type ProfileRecord = Tables<"profiles">;
type ExerciseRecord = Tables<"exercises">;

function createMockProfile(
  overrides: Partial<ProfileRecord> = {}
): ProfileRecord {
  return {
    user_id: "user-test-uuid-1111",
    display_name: "LookFit User",
    age_years: 23,
    fitness_level: "beginner",
    goals: ["posture", "mobility"],
    limitations: [],
    available_minutes: 30,
    timezone: "UTC",
    morning_time: "07:00:00",
    evening_time: "19:00:00",
    reminders_enabled: true,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

let _idCounter = 0;

function createMockExercise(
  overrides: Partial<ExerciseRecord> & Pick<ExerciseRecord, "slug" | "name">
): ExerciseRecord {
  _idCounter++;
  return {
    id: `00000000-0000-0000-0000-${String(_idCounter).padStart(12, "0")}`,
    description: `${overrides.name} description`,
    category: "posture_spine",
    difficulty: "beginner",
    routine_tags: ["both"],
    goal_tags: ["posture"],
    target_areas: ["spine"],
    equipment: [],
    instructions: ["Step one.", "Step two."],
    safety_notes: "Stop if sharp pain occurs.",
    is_active: true,
    default_sets: 2,
    default_reps: 10,
    default_duration_seconds: null,
    default_rest_seconds: 30,
    media_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockCatalog(): ExerciseRecord[] {
  return [
    createMockExercise({ slug: "cat-cow", name: "Cat-Cow", routine_tags: ["both"], category: "posture_spine", default_sets: 1, default_reps: 10 }),
    createMockExercise({ slug: "thoracic-rotation", name: "Thoracic Rotation", routine_tags: ["morning"], category: "mobility", default_sets: 2, default_reps: 8 }),
    createMockExercise({ slug: "wall-angels", name: "Wall Angels", routine_tags: ["morning"], category: "posture_spine", default_sets: 2, default_reps: 10 }),
    createMockExercise({ slug: "chin-tuck", name: "Chin Tuck", routine_tags: ["both"], category: "posture_spine", default_sets: 2, default_reps: 10 }),
    createMockExercise({ slug: "bird-dog", name: "Bird-Dog", routine_tags: ["both"], category: "core", default_sets: 3, default_reps: 10 }),
    createMockExercise({ slug: "glute-bridge", name: "Glute Bridge", routine_tags: ["both"], category: "legs", default_sets: 3, default_reps: 15 }),
    createMockExercise({ slug: "incline-knee-push-up", name: "Knee Push-Up", routine_tags: ["morning"], category: "push", default_sets: 3, default_reps: 10 }),
    createMockExercise({ slug: "bodyweight-squat", name: "Bodyweight Squat", routine_tags: ["morning"], category: "legs", default_sets: 3, default_reps: 12 }),
    createMockExercise({ slug: "prone-elbow-pullback", name: "Prone Elbow Pullback", routine_tags: ["both"], category: "pull", default_sets: 2, default_reps: 10 }),
    createMockExercise({ slug: "march-in-place", name: "March in Place", routine_tags: ["morning"], category: "cardio", default_sets: 2, default_reps: null, default_duration_seconds: 60, default_rest_seconds: 15 }),
    createMockExercise({ slug: "deep-breathing", name: "Deep Breathing", routine_tags: ["both"], category: "posture_spine", default_sets: 1, default_reps: null, default_duration_seconds: 120, default_rest_seconds: 0 }),
  ];
}

describe("planner-service: generateUserRoutinePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user session does not exist", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("No session"),
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await generateUserRoutinePlan("morning");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });

  it("returns FORBIDDEN when user onboarding is incomplete", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-test-uuid-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: createMockProfile({ onboarding_complete: false }),
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await generateUserRoutinePlan("morning");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("returns NO_SAFE_PLAN when the exercise catalog is empty", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-test-uuid-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: createMockProfile(),
              error: null,
            }),
          };
        }
        if (table === "exercises") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await generateUserRoutinePlan("morning");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NO_SAFE_PLAN");
    }
  });

  it("generates a successful morning plan when authenticated with valid profile and catalog", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-test-uuid-1111" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: createMockProfile(),
              error: null,
            }),
          };
        }
        if (table === "exercises") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: createMockCatalog(),
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await generateUserRoutinePlan("morning");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionType).toBe("morning");
      expect(result.data.exercises.length).toBeGreaterThan(0);
      expect(result.data.estimatedMinutes).toBeGreaterThanOrEqual(20);
      expect(result.data.estimatedMinutes).toBeLessThanOrEqual(30);
      expect(result.data.safetyNotes).toMatch(/sharp pain/i);
    }
  });
});
