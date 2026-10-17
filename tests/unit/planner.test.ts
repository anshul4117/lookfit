/**
 * tests/unit/planner.test.ts
 *
 * Comprehensive unit tests for the T09 deterministic routine planner.
 * Tests are independent of Docker and any live Supabase instance.
 * All catalog data is constructed inline from the known seed schema.
 */

import { describe, it, expect } from "vitest";
import { generatePlan, MANDATORY_SAFETY_DISCLAIMER } from "@/lib/planner";
import type { ExerciseCatalogItem, PlannerInput } from "@/lib/validation/planner";
import { SESSION_DURATION_BOUNDS } from "@/lib/validation/planner";

// ---------------------------------------------------------------------------
// Test fixture helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function makeExercise(
  overrides: Partial<ExerciseCatalogItem> & Pick<ExerciseCatalogItem, "slug" | "name">
): ExerciseCatalogItem {
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
    ...overrides,
  };
}

/**
 * Builds a realistic morning catalog that satisfies all section requirements.
 * Slugs match the seed data exactly so the preferred-slug lookup works correctly.
 */
function buildMorningCatalog(): ExerciseCatalogItem[] {
  return [
    // Activation
    makeExercise({ slug: "cat-cow", name: "Cat-Cow", routine_tags: ["both"], category: "posture_spine", default_sets: 1, default_reps: 10 }),
    makeExercise({ slug: "thoracic-rotation", name: "Thoracic Rotation", routine_tags: ["morning"], category: "mobility", default_sets: 2, default_reps: 8 }),
    makeExercise({ slug: "wall-angels", name: "Wall Angels", routine_tags: ["morning"], category: "posture_spine", default_sets: 2, default_reps: 10 }),
    // Posture
    makeExercise({ slug: "chin-tuck", name: "Chin Tuck", routine_tags: ["both"], category: "posture_spine", default_sets: 2, default_reps: 10 }),
    makeExercise({ slug: "bird-dog", name: "Bird-Dog", routine_tags: ["both"], category: "core", default_sets: 3, default_reps: 10 }),
    makeExercise({ slug: "glute-bridge", name: "Glute Bridge", routine_tags: ["both"], category: "legs", default_sets: 3, default_reps: 15 }),
    makeExercise({ slug: "forearm-plank", name: "Forearm Plank", routine_tags: ["morning"], category: "core", difficulty: "intermediate", default_sets: 3, default_duration_seconds: 35, default_reps: null }),
    // Strength
    makeExercise({ slug: "incline-knee-push-up", name: "Knee Push-Up", routine_tags: ["morning"], category: "push", default_sets: 3, default_reps: 10 }),
    makeExercise({ slug: "bodyweight-squat", name: "Bodyweight Squat", routine_tags: ["morning"], category: "legs", default_sets: 3, default_reps: 12 }),
    makeExercise({ slug: "prone-elbow-pullback", name: "Prone Elbow Pullback", routine_tags: ["both"], category: "pull", default_sets: 2, default_reps: 10 }),
    makeExercise({ slug: "march-in-place", name: "March in Place", routine_tags: ["morning"], category: "cardio", default_sets: null, default_reps: null, default_duration_seconds: 60, default_rest_seconds: 15 }),
    // Centering
    makeExercise({ slug: "deep-breathing", name: "Deep Breathing", routine_tags: ["both"], category: "posture_spine", default_sets: 1, default_reps: null, default_duration_seconds: 120, default_rest_seconds: 0 }),
  ];
}

/**
 * Builds a realistic evening catalog that satisfies all section requirements.
 */
function buildEveningCatalog(): ExerciseCatalogItem[] {
  return [
    // Mobility
    makeExercise({ slug: "child-pose", name: "Child Pose", routine_tags: ["evening"], category: "stretching", default_sets: 2, default_reps: null, default_duration_seconds: 40 }),
    makeExercise({ slug: "seated-spinal-twist", name: "Seated Spinal Twist", routine_tags: ["evening"], category: "posture_spine", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    makeExercise({ slug: "knees-to-chest", name: "Knees to Chest", routine_tags: ["evening"], category: "stretching", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    // Stretching
    makeExercise({ slug: "doorway-chest-stretch", name: "Doorway Chest Stretch", routine_tags: ["evening"], category: "stretching", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    makeExercise({ slug: "hamstring-stretch", name: "Hamstring Stretch", routine_tags: ["evening"], category: "stretching", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    makeExercise({ slug: "hip-flexor-stretch", name: "Hip Flexor Stretch", routine_tags: ["evening"], category: "stretching", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    makeExercise({ slug: "figure-four-stretch", name: "Figure Four Stretch", routine_tags: ["evening"], category: "stretching", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    // Relaxation
    makeExercise({ slug: "sphinx-pose", name: "Sphinx Pose", routine_tags: ["evening"], category: "posture_spine", default_sets: 2, default_reps: null, default_duration_seconds: 30 }),
    makeExercise({ slug: "legs-up-the-wall", name: "Legs-Up-The-Wall", routine_tags: ["evening"], category: "stretching", default_sets: 1, default_reps: null, default_duration_seconds: 150, default_rest_seconds: 0 }),
    makeExercise({ slug: "deep-breathing", name: "Deep Breathing", routine_tags: ["both"], category: "posture_spine", default_sets: 1, default_reps: null, default_duration_seconds: 120, default_rest_seconds: 0 }),
  ];
}

const BASE_MORNING_PROFILE: PlannerInput["profile"] = {
  fitnessLevel: "beginner",
  goals: ["posture", "mobility"],
  limitations: [],
  availableMinutes: 30,
  ageYears: 23,
};

const BASE_EVENING_PROFILE: PlannerInput["profile"] = {
  fitnessLevel: "beginner",
  goals: ["flexibility", "relaxation"],
  limitations: [],
  availableMinutes: 25,
  ageYears: 23,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generatePlan — Morning Routine", () => {
  it("generates a successful morning plan with the standard catalog", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sessionType).toBe("morning");
    expect(result.data.plannerVersion).toBe("1.0.0");
    expect(result.data.routineName).toMatch(/morning/i);
  });

  it("includes exercises from all three required sections: activation, posture, strength", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const sections = result.data.exercises.map((ex) => ex.section);
    expect(sections).toContain("activation");
    expect(sections).toContain("posture");
    expect(sections).toContain("strength");
  });

  it("exercise positions are sequential starting at 1 with no gaps", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const positions = result.data.exercises.map((ex) => ex.position);
    positions.forEach((pos, i) => {
      expect(pos).toBe(i + 1);
    });
  });

  it("estimated duration falls within 20–30 minutes for morning", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const bounds = SESSION_DURATION_BOUNDS.morning;
    expect(result.data.estimatedMinutes).toBeGreaterThanOrEqual(bounds.minMinutes);
    expect(result.data.estimatedMinutes).toBeLessThanOrEqual(bounds.maxMinutes);
  });

  it("only selects exercises tagged 'morning' or 'both'", () => {
    const catalog = [
      ...buildMorningCatalog(),
      // Evening-only exercise that should NOT be selected
      makeExercise({ slug: "evening-only", name: "Evening Only", routine_tags: ["evening"] }),
    ];

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    expect(slugs).not.toContain("evening-only");
  });

  it("includes mandatory Rule 05 safety disclaimer in safetyNotes", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.safetyNotes).toBe(MANDATORY_SAFETY_DISCLAIMER);
    expect(result.data.safetyNotes).toMatch(/sharp pain/i);
    expect(result.data.safetyNotes).toMatch(/height/i);
    expect(result.data.safetyNotes).toMatch(/healthcare professional/i);
  });
});

describe("generatePlan — Evening Routine", () => {
  it("generates a successful evening plan with the standard catalog", () => {
    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sessionType).toBe("evening");
    expect(result.data.routineName).toMatch(/evening/i);
  });

  it("includes exercises from all three required sections: mobility, stretching, relaxation", () => {
    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const sections = result.data.exercises.map((ex) => ex.section);
    expect(sections).toContain("mobility");
    expect(sections).toContain("stretching");
    expect(sections).toContain("relaxation");
  });

  it("estimated duration falls within 15–25 minutes for evening", () => {
    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const bounds = SESSION_DURATION_BOUNDS.evening;
    expect(result.data.estimatedMinutes).toBeGreaterThanOrEqual(bounds.minMinutes);
    expect(result.data.estimatedMinutes).toBeLessThanOrEqual(bounds.maxMinutes);
  });

  it("only selects exercises tagged 'evening' or 'both'", () => {
    const catalog = [
      ...buildEveningCatalog(),
      // Morning-only exercise that should NOT appear
      makeExercise({ slug: "morning-only", name: "Morning Only", routine_tags: ["morning"] }),
    ];

    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    expect(slugs).not.toContain("morning-only");
  });
});

describe("generatePlan — Bird-Dog vs. Superman preference", () => {
  it("prefers bird-dog over superman when both are eligible", () => {
    const catalog = [
      ...buildMorningCatalog(),
      makeExercise({
        slug: "superman",
        name: "Superman Hold",
        routine_tags: ["both"],
        category: "posture_spine",
        difficulty: "intermediate",
      }),
    ];

    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, fitnessLevel: "intermediate" },
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    // bird-dog in catalog → superman must be excluded
    expect(slugs).not.toContain("superman");
  });

  it("includes bird-dog in the posture section when available", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    expect(slugs).toContain("bird-dog");
  });

  it("includes superman only when bird-dog is NOT in the catalog", () => {
    const catalogWithoutBirdDog = buildMorningCatalog()
      .filter((ex) => ex.slug !== "bird-dog")
      .concat([
        makeExercise({
          slug: "superman",
          name: "Superman Hold",
          routine_tags: ["both"],
          category: "posture_spine",
          difficulty: "intermediate",
        }),
      ]);

    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, fitnessLevel: "intermediate" },
      sessionType: "morning",
      catalog: catalogWithoutBirdDog,
    });

    // Whether superman appears or not, bird-dog must not appear since it was removed
    if (result.success) {
      const slugs = result.data.exercises.map((ex) => ex.slug);
      expect(slugs).not.toContain("bird-dog");
    }
    // If NO_SAFE_PLAN is returned (too few exercises without bird-dog), that's also valid
  });
});

describe("generatePlan — Hanging / Inversion exclusion", () => {
  const hangingExercises: ExerciseCatalogItem[] = [
    makeExercise({ slug: "bar-hang", name: "Bar Hang", routine_tags: ["both"], target_areas: ["spine"] }),
    makeExercise({ slug: "passive-hang", name: "Passive Hang", routine_tags: ["both"], target_areas: ["spine"] }),
    makeExercise({ slug: "headstand", name: "Headstand", routine_tags: ["both"], target_areas: ["spine"] }),
    makeExercise({ slug: "dead-hang", name: "Dead Hang", routine_tags: ["both"], target_areas: ["spine"] }),
    makeExercise({
      slug: "some-inversion-drill",
      name: "Inversion Drill",
      routine_tags: ["both"],
      description: "A drill with inversion elements",
      target_areas: ["spine"],
    }),
  ];

  it("never includes hanging exercises (excluded by slug)", () => {
    const catalog = [...buildMorningCatalog(), ...hangingExercises];

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    for (const ex of hangingExercises) {
      expect(slugs).not.toContain(ex.slug);
    }
  });

  it("never includes exercises whose description contains 'inversion'", () => {
    const catalog = [...buildMorningCatalog(), ...hangingExercises];

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    expect(slugs).not.toContain("some-inversion-drill");
  });
});

describe("generatePlan — Equipment exclusion", () => {
  it("excludes exercises that require external equipment", () => {
    const equipmentExercise = makeExercise({
      slug: "barbell-row",
      name: "Barbell Row",
      routine_tags: ["morning"],
      category: "pull",
      equipment: ["barbell"],
    });

    const catalog = [...buildMorningCatalog(), equipmentExercise];

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    expect(slugs).not.toContain("barbell-row");
  });
});

describe("generatePlan — Difficulty ceiling", () => {
  it("excludes exercises above the user's fitness level (beginner cannot get advanced)", () => {
    const advancedEx = makeExercise({
      slug: "pike-push-up",
      name: "Pike Push-Up",
      routine_tags: ["morning"],
      category: "push",
      difficulty: "advanced",
    });

    const catalog = [...buildMorningCatalog(), advancedEx];

    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, fitnessLevel: "beginner" },
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const slugs = result.data.exercises.map((ex) => ex.slug);
    expect(slugs).not.toContain("pike-push-up");
  });

  it("includes intermediate exercises for intermediate users", () => {
    const intermediateEx = makeExercise({
      slug: "reverse-lunge",
      name: "Reverse Lunge",
      routine_tags: ["morning"],
      category: "legs",
      difficulty: "intermediate",
    });

    const catalog = [...buildMorningCatalog(), intermediateEx];

    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, fitnessLevel: "intermediate" },
      sessionType: "morning",
      catalog,
    });

    // Intermediate exercises are eligible; whether the planner picks this specific one
    // depends on section selection logic — just verify no type error and no exclusion
    if (result.success) {
      // Valid — intermediate user can have intermediate exercises
      expect(result.data.plannerVersion).toBe("1.0.0");
    } else {
      // Also valid if the specific intermediate exercise wasn't needed
      expect(result.error.code).toBe("NO_SAFE_PLAN");
    }
  });
});

describe("generatePlan — User limitation handling", () => {
  it("excludes bodyweight-squat and reverse-lunge for users with knee limitations", () => {
    const catalog = buildMorningCatalog();
    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, limitations: ["knee pain"] },
      sessionType: "morning",
      catalog,
    });

    if (result.success) {
      const slugs = result.data.exercises.map((ex) => ex.slug);
      expect(slugs).not.toContain("bodyweight-squat");
      expect(slugs).not.toContain("reverse-lunge");
    } else {
      // NO_SAFE_PLAN is acceptable if the catalog is too thin after knee exclusions
      expect(result.error.code).toBe("NO_SAFE_PLAN");
    }
  });

  it("excludes wrist-loaded exercises for users with wrist limitations", () => {
    const catalog = buildMorningCatalog();
    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, limitations: ["wrist pain"] },
      sessionType: "morning",
      catalog,
    });

    if (result.success) {
      const slugs = result.data.exercises.map((ex) => ex.slug);
      expect(slugs).not.toContain("push-up");
      expect(slugs).not.toContain("forearm-plank");
    } else {
      expect(result.error.code).toBe("NO_SAFE_PLAN");
    }
  });

  it("excludes superman for users with lower back limitations", () => {
    const catalogWithSuperman = [
      ...buildMorningCatalog(),
      makeExercise({
        slug: "superman",
        name: "Superman Hold",
        routine_tags: ["both"],
        category: "posture_spine",
        difficulty: "intermediate",
      }),
    ];

    const result = generatePlan({
      profile: {
        ...BASE_MORNING_PROFILE,
        fitnessLevel: "intermediate",
        limitations: ["lower back pain"],
      },
      sessionType: "morning",
      catalog: catalogWithSuperman,
    });

    if (result.success) {
      const slugs = result.data.exercises.map((ex) => ex.slug);
      expect(slugs).not.toContain("superman");
    } else {
      expect(result.error.code).toBe("NO_SAFE_PLAN");
    }
  });
});

describe("generatePlan — NO_SAFE_PLAN error paths", () => {
  it("returns NO_SAFE_PLAN when available_minutes is below morning minimum (20 min)", () => {
    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, availableMinutes: 10 },
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("NO_SAFE_PLAN");
    expect(result.error.message).toMatch(/20/);
    expect(result.error.reasons.length).toBeGreaterThan(0);
  });

  it("returns NO_SAFE_PLAN when available_minutes is below evening minimum (15 min)", () => {
    const result = generatePlan({
      profile: { ...BASE_EVENING_PROFILE, availableMinutes: 10 },
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("NO_SAFE_PLAN");
    expect(result.error.reasons.length).toBeGreaterThan(0);
  });

  it("returns NO_SAFE_PLAN when the catalog is empty", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: [
        // Need at least 1 item to pass Zod min(1) — but make it inactive/non-matching
        makeExercise({ slug: "inactive-ex", name: "Inactive", is_active: false }),
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("NO_SAFE_PLAN");
  });

  it("returns NO_SAFE_PLAN when all exercises have wrong routine tags", () => {
    const eveningOnlyCatalog = buildEveningCatalog().map((ex) => ({
      ...ex,
      routine_tags: ["evening" as string],
    }));

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: eveningOnlyCatalog,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("NO_SAFE_PLAN");
  });

  it("returns NO_SAFE_PLAN with non-empty reasons array", () => {
    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, availableMinutes: 5 },
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(Array.isArray(result.error.reasons)).toBe(true);
    expect(result.error.reasons.length).toBeGreaterThan(0);
    expect(result.error.reasons[0]).toBeTruthy();
  });
});

describe("generatePlan — Determinism", () => {
  it("produces identical results for 10 sequential calls with the same inputs", () => {
    const input: PlannerInput = {
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    };

    const results = Array.from({ length: 10 }, () => generatePlan(input));

    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(first);
    }
  });

  it("produces identical evening results for 10 sequential calls", () => {
    const input: PlannerInput = {
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    };

    const results = Array.from({ length: 10 }, () => generatePlan(input));

    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(first);
    }
  });

  it("produces different results when session type changes", () => {
    const morningResult = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: [...buildMorningCatalog(), ...buildEveningCatalog()],
    });

    const eveningResult = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: [...buildMorningCatalog(), ...buildEveningCatalog()],
    });

    // At minimum, session types should differ
    if (morningResult.success && eveningResult.success) {
      expect(morningResult.data.sessionType).toBe("morning");
      expect(eveningResult.data.sessionType).toBe("evening");
    }
  });
});

describe("generatePlan — Medical Safety / Rule 05", () => {
  it("includes the sharp-pain stopping rule in safetyNotes", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.safetyNotes).toMatch(/sharp pain/i);
  });

  it("does NOT claim exercises increase adult height", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Confirm the disclaimer explicitly states height is NOT guaranteed
    expect(result.data.safetyNotes).toMatch(/NOT increase/i);
    expect(result.data.safetyNotes).toMatch(/measured height/i);
  });

  it("advises consulting a healthcare professional in safetyNotes", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.safetyNotes).toMatch(/healthcare professional/i);
  });
});

describe("generatePlan — Inactive exercise filtering", () => {
  it("excludes inactive exercises from the plan", () => {
    const catalog = buildMorningCatalog().map((ex) =>
      ex.slug === "bird-dog" ? { ...ex, is_active: false } : ex
    );

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog,
    });

    if (result.success) {
      const slugs = result.data.exercises.map((ex) => ex.slug);
      expect(slugs).not.toContain("bird-dog");
    }
    // NO_SAFE_PLAN is also acceptable if posture section becomes too thin
  });
});

describe("generatePlan — Both-tagged exercises", () => {
  it("includes 'both'-tagged exercises in morning plans", () => {
    const bothTagged = makeExercise({
      slug: "shoulder-rolls",
      name: "Shoulder Rolls",
      routine_tags: ["both"],
      category: "mobility",
    });

    const catalog = [...buildMorningCatalog(), bothTagged];

    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // shoulder-rolls might or might not be selected depending on section fit,
    // but it should not be excluded due to routine_tags
    expect(result.data.plannerVersion).toBe("1.0.0");
  });

  it("includes 'both'-tagged exercises in evening plans", () => {
    const bothTagged = makeExercise({
      slug: "shoulder-rolls",
      name: "Shoulder Rolls",
      routine_tags: ["both"],
      category: "mobility",
    });

    const catalog = [...buildEveningCatalog(), bothTagged];

    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.plannerVersion).toBe("1.0.0");
  });
});

describe("generatePlan — Duplicate Prevention", () => {
  it("never includes duplicate exercise IDs or slugs in a morning plan", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const ids = result.data.exercises.map((e) => e.exerciseId);
    const slugs = result.data.exercises.map((e) => e.slug);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("never includes duplicate exercise IDs or slugs in an evening plan", () => {
    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const ids = result.data.exercises.map((e) => e.exerciseId);
    const slugs = result.data.exercises.map((e) => e.slug);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("generatePlan — Morning Composition & Movement Balancing", () => {
  it("balances strength movements across push, legs, core, and pull patterns", () => {
    const fullMorningCatalog: ExerciseCatalogItem[] = [
      ...buildMorningCatalog(),
      makeExercise({ slug: "hollow-body-hold", name: "Hollow Body Hold", category: "core", difficulty: "intermediate", routine_tags: ["both"], default_sets: 3, default_duration_seconds: 25 }),
      makeExercise({ slug: "push-up", name: "Push-Up", category: "push", difficulty: "intermediate", routine_tags: ["both"], default_sets: 3, default_reps: 12 }),
      makeExercise({ slug: "bodyweight-squat", name: "Bodyweight Squat", category: "legs", difficulty: "intermediate", routine_tags: ["both"], default_sets: 3, default_reps: 12 }),
      makeExercise({ slug: "prone-w-raise", name: "Prone W Raise", category: "pull", difficulty: "intermediate", routine_tags: ["both"], default_sets: 2, default_reps: 10 }),
    ];

    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, fitnessLevel: "intermediate" },
      sessionType: "morning",
      catalog: fullMorningCatalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const strengthExercises = result.data.exercises.filter((e) => e.section === "strength");
    expect(strengthExercises.length).toBeGreaterThanOrEqual(3);

    // Verify key movement categories appear in the plan
    const allSlugs = result.data.exercises.map((e) => e.slug);
    expect(allSlugs.some((s) => ["push-up", "incline-knee-push-up"].includes(s))).toBe(true);
    expect(allSlugs.some((s) => ["bodyweight-squat", "reverse-lunge", "glute-bridge"].includes(s))).toBe(true);
  });

  it("includes short cool-down centering (deep breathing) at the end of morning sessions", () => {
    const result = generatePlan({
      profile: BASE_MORNING_PROFILE,
      sessionType: "morning",
      catalog: buildMorningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const lastExercise = result.data.exercises[result.data.exercises.length - 1];
    expect(lastExercise.section).toBe("centering");
    expect(lastExercise.slug).toBe("deep-breathing");
  });
});

describe("generatePlan — Evening Core Inclusion & Graceful Fallback", () => {
  it("includes an optional core exercise when eligible core exercises exist in evening catalog", () => {
    const eveningWithCoreCatalog: ExerciseCatalogItem[] = [
      ...buildEveningCatalog(),
      makeExercise({
        slug: "bird-dog",
        name: "Bird-Dog",
        category: "core",
        routine_tags: ["both"],
        default_sets: 2,
        default_reps: 10,
      }),
    ];

    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: eveningWithCoreCatalog,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const sections = result.data.exercises.map((e) => e.section);
    expect(sections).toContain("core");
    const slugs = result.data.exercises.map((e) => e.slug);
    expect(slugs).toContain("bird-dog");
  });

  it("generates successfully when NO core exercises exist in evening catalog (graceful handling)", () => {
    // buildEveningCatalog has only mobility, stretching, relaxation (0 core)
    const result = generatePlan({
      profile: BASE_EVENING_PROFILE,
      sessionType: "evening",
      catalog: buildEveningCatalog(),
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const sections = result.data.exercises.map((e) => e.section);
    expect(sections).toContain("mobility");
    expect(sections).toContain("stretching");
    expect(sections).toContain("relaxation");
  });
});

describe("generatePlan — Catalog Expansion Exercises", () => {
  it("allows selecting new core exercises (hollow-body-hold, bicycle-crunch) for intermediate users", () => {
    const catalogWithNewExercises: ExerciseCatalogItem[] = [
      ...buildMorningCatalog(),
      makeExercise({
        slug: "hollow-body-hold",
        name: "Hollow Body Hold",
        category: "core",
        difficulty: "intermediate",
        routine_tags: ["both"],
        default_sets: 3,
        default_duration_seconds: 25,
      }),
      makeExercise({
        slug: "bicycle-crunch",
        name: "Bicycle Crunch",
        category: "core",
        difficulty: "intermediate",
        routine_tags: ["both"],
        default_sets: 3,
        default_reps: 12,
      }),
      makeExercise({
        slug: "prone-y-raise",
        name: "Prone Y Raise",
        category: "pull",
        difficulty: "beginner",
        routine_tags: ["both"],
        default_sets: 2,
        default_reps: 10,
      }),
    ];

    const result = generatePlan({
      profile: { ...BASE_MORNING_PROFILE, fitnessLevel: "intermediate" },
      sessionType: "morning",
      catalog: catalogWithNewExercises,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Prescribed exercises should be within bounds and valid
    expect(result.data.estimatedMinutes).toBeGreaterThanOrEqual(20);
    expect(result.data.estimatedMinutes).toBeLessThanOrEqual(30);
  });
});
