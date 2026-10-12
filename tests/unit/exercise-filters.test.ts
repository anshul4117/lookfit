import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  exerciseFilterSchema,
  parseExerciseFilters,
  EXERCISE_CATEGORIES,
  ROUTINE_TAGS,
  FITNESS_LEVELS,
} from "@/lib/validation/exercise-filters";
import {
  getExercisesQuery,
  getExerciseBySlugQuery,
  type ExerciseRecord,
} from "@/server/queries/exercises";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

function createMockExercise(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    id: "ex-1111-2222-3333",
    slug: "cat-cow",
    name: "Cat-Cow",
    description: "Alternate gentle spinal flexion and extension.",
    category: "posture_spine",
    target_areas: ["spine", "back", "neck"],
    goal_tags: ["mobility", "posture"],
    routine_tags: ["both"],
    difficulty: "beginner",
    equipment: [],
    instructions: [
      "Start on hands and knees.",
      "Inhale, arch gently and look forward.",
      "Exhale, round the spine upward.",
    ],
    safety_notes: "Move comfortably. Stop for sharp pain.",
    media_url: null,
    default_sets: 1,
    default_reps: 10,
    default_duration_seconds: null,
    default_rest_seconds: 15,
    is_active: true,
    created_at: "2026-10-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("T08: Exercise Filters Validation & Normalization", () => {
  it("successfully parses valid filter inputs", () => {
    const valid = {
      search: "Spine Mobility",
      category: "posture_spine",
      routine_tag: "morning",
      difficulty: "beginner",
    };

    const parsed = exerciseFilterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.search).toBe("Spine Mobility");
      expect(parsed.data.category).toBe("posture_spine");
      expect(parsed.data.routine_tag).toBe("morning");
      expect(parsed.data.difficulty).toBe("beginner");
    }
  });

  it("normalizes empty strings and whitespace to undefined", () => {
    const raw = {
      search: "   ",
      category: "",
      routine_tag: "",
      difficulty: "",
    };

    const parsed = exerciseFilterSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.search).toBeUndefined();
      expect(parsed.data.category).toBeUndefined();
      expect(parsed.data.routine_tag).toBeUndefined();
      expect(parsed.data.difficulty).toBeUndefined();
    }
  });

  it("rejects unknown category values", () => {
    const invalid = { category: "invalid_category" };
    const parsed = exerciseFilterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown routine tag values", () => {
    const invalid = { routine_tag: "night" };
    const parsed = exerciseFilterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("parseExerciseFilters gracefully degrades when invalid values are received", () => {
    const rawParams = {
      category: "malicious_script",
      routine_tag: "unsupported_routine",
      search: "   wall angels   ",
      difficulty: "superhuman",
    };

    const normalized = parseExerciseFilters(rawParams);
    expect(normalized.category).toBeUndefined();
    expect(normalized.routine_tag).toBeUndefined();
    expect(normalized.difficulty).toBeUndefined();
    expect(normalized.search).toBe("wall angels");
  });

  it("parseExerciseFilters extracts first element from array searchParams", () => {
    const rawParams = {
      category: ["mobility", "stretching"],
      routine_tag: ["evening"],
    };

    const normalized = parseExerciseFilters(rawParams);
    expect(normalized.category).toBe("mobility");
    expect(normalized.routine_tag).toBe("evening");
  });
});

describe("T08: Exercise Server Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExercisesQuery", () => {
    it("returns UNAUTHENTICATED error when user session is missing", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("No session"),
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getExercisesQuery();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
        expect(result.error.message).toBe("Authentication required");
      }
    });

    it("queries active exercises and applies category and routine filters", async () => {
      const mockExercises = [
        createMockExercise({ name: "Cat-Cow", category: "posture_spine", routine_tags: ["both"] }),
        createMockExercise({ name: "Wall Angels", category: "posture_spine", routine_tags: ["morning"] }),
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          Promise.resolve(resolve({ data: mockExercises, error: null }))
        ),
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-111" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getExercisesQuery({
        category: "posture_spine",
        routine_tag: "morning",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("Cat-Cow");
      }

      // Check query builder was called with is_active = true and category filter
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("is_active", true);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("category", "posture_spine");
      expect(mockQueryBuilder.overlaps).toHaveBeenCalledWith("routine_tags", ["morning", "both"]);
    });

    it("applies evening routine overlap filter correctly", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          Promise.resolve(resolve({ data: [], error: null }))
        ),
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-111" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      await getExercisesQuery({ routine_tag: "evening" });
      expect(mockQueryBuilder.overlaps).toHaveBeenCalledWith("routine_tags", ["evening", "both"]);
    });

    it("applies both routine contains filter correctly", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) =>
          Promise.resolve(resolve({ data: [], error: null }))
        ),
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-111" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue(mockQueryBuilder),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      await getExercisesQuery({ routine_tag: "both" });
      expect(mockQueryBuilder.contains).toHaveBeenCalledWith("routine_tags", ["both"]);
    });
  });

  describe("getExerciseBySlugQuery", () => {
    it("returns exercise record when matching slug exists", async () => {
      const mockExercise = createMockExercise({ slug: "sphinx-pose", name: "Sphinx Pose" });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-111" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockExercise,
            error: null,
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getExerciseBySlugQuery("sphinx-pose");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.name).toBe("Sphinx Pose");
      }
    });

    it("returns null when exercise slug is not found", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-111" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const result = await getExerciseBySlugQuery("non-existent");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });
});
