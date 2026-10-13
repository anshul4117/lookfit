/**
 * src/lib/planner.ts
 *
 * PURE DETERMINISTIC ROUTINE PLANNER for LookFit.
 *
 * This module is a pure function with zero side-effects.
 * - No database reads or writes.
 * - No randomness; identical inputs always produce identical outputs.
 * - All I/O belongs in src/server/services/planner-service.ts.
 *
 * Health & Safety (Rule 05 — MANDATORY):
 * - Never guarantee height increase or claim exercises reopen growth plates.
 * - Always include the sharp-pain stopping rule.
 * - Users with pre-existing spinal or cervical conditions must consult a clinician.
 * - Hanging and inversion exercises are NEVER included in default plans.
 * - Prefer bird-dog over superman; exclude superman when spinal-shear rules apply.
 */

import type {
  ExerciseCatalogItem,
  PlannerInput,
  PlannerOutput,
  PrescribedExercise,
  RoutineSection,
  NoSafePlanError,
} from "./validation/planner";
import { SESSION_DURATION_BOUNDS } from "./validation/planner";
import type { FitnessLevel } from "./validation/profile";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLANNER_VERSION = "1.0.0" as const;

/**
 * Rule 05 mandatory disclaimer text.
 * This string must appear verbatim in every generated plan's safetyNotes.
 */
export const MANDATORY_SAFETY_DISCLAIMER =
  "IMPORTANT SAFETY NOTICE: Mild stretching tension is normal — stop immediately " +
  "if you experience sharp pain, joint pinching, numbness, or tingling. " +
  "These exercises support posture awareness and spinal mobility but do NOT increase " +
  "adult measured height or reopen growth plates. Any improvements in upright stance " +
  "reflect postural alignment, not skeletal change. " +
  "If you have a pre-existing spinal, cervical, or joint condition, consult a " +
  "healthcare professional before beginning these exercises.";

/**
 * Fitness level ordering used for difficulty ceiling enforcement.
 * Beginners receive only beginner exercises.
 * Intermediate users receive beginner + intermediate.
 * Advanced users receive all levels.
 */
const FITNESS_LEVEL_ORDER: Record<FitnessLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Slugs that are conservatively treated as hanging/inversion exercises.
 * The catalog currently has no such exercises, but this list provides explicit
 * future-proofing and defense-in-depth alongside the keyword-based filter.
 */
const EXCLUDED_SLUGS: ReadonlySet<string> = new Set([
  "pull-up",
  "chin-up",
  "bar-hang",
  "passive-hang",
  "active-hang",
  "dead-hang",
  "inversion-table",
  "headstand",
  "handstand",
  "shoulder-stand",
  "plow-pose",
]);

/**
 * Keywords that identify hanging or inversion exercises via catalog metadata.
 * Applied across: slug, name, description, target_areas, goal_tags, category.
 */
const HANGING_INVERSION_KEYWORDS: ReadonlyArray<string> = [
  "hang",
  "inversion",
  "headstand",
  "handstand",
  "shoulder-stand",
  "shoulder stand",
  "plow",
  "inverted",
];

/**
 * Documented limitation → contraindicated target-area or exercise-slug mappings.
 * Deliberately conservative. We do NOT diagnose; we exclude exercises that
 * involve the anatomical areas named in the user's stated limitations.
 *
 * Normalization: user limitations are lowercased and trimmed before matching.
 */
const LIMITATION_EXCLUSION_MAP: ReadonlyArray<{
  keywords: ReadonlyArray<string>;
  excludeTargetAreas: ReadonlyArray<string>;
  excludeSlugs: ReadonlyArray<string>;
}> = [
  {
    keywords: ["knee", "knees"],
    excludeTargetAreas: [],
    excludeSlugs: [
      "bodyweight-squat",
      "reverse-lunge",
      "split-squat",
      "wall-sit",
      "pigeon-pose",
      "high-knees",
      "mountain-climber",
      "burpee-step-back",
    ],
  },
  {
    keywords: ["wrist", "wrists"],
    excludeTargetAreas: ["wrists"],
    excludeSlugs: [
      "wrist-circles",
      "push-up",
      "scapular-push-up",
      "pike-push-up",
      "forearm-plank",
      "dead-bug",
      "side-plank",
      "mountain-climber",
      "burpee-step-back",
      "worlds-greatest-stretch",
    ],
  },
  {
    keywords: ["lower back", "lower_back", "lumbar"],
    excludeTargetAreas: [],
    excludeSlugs: [
      "superman",
      "reverse-lunge",
      "split-squat",
      "deadlift",
      "seated-forward-fold",
    ],
  },
  {
    keywords: ["shoulder", "shoulders"],
    excludeTargetAreas: [],
    excludeSlugs: [
      "pike-push-up",
      "mountain-climber",
      "burpee-step-back",
      "side-plank",
    ],
  },
  {
    keywords: ["neck", "cervical"],
    excludeTargetAreas: ["neck"],
    excludeSlugs: ["neck-side-stretch", "chin-tuck"],
  },
  {
    keywords: ["hip", "hips"],
    excludeTargetAreas: [],
    excludeSlugs: [
      "pigeon-pose",
      "worlds-greatest-stretch",
      "hip-flexor-stretch",
      "figure-four-stretch",
    ],
  },
];

// ---------------------------------------------------------------------------
// Morning template: preferred slugs per section in priority order
// ---------------------------------------------------------------------------

const MORNING_SECTION_PREFERRED: Record<
  "activation" | "posture" | "strength" | "centering",
  ReadonlyArray<string>
> = {
  activation: [
    "cat-cow",
    "thoracic-rotation",
    "thoracic-extension",
    "wall-angels",
    "arm-circles",
    "shoulder-rolls",
    "standing-hip-circles",
    "worlds-greatest-stretch",
  ],
  posture: [
    "chin-tuck",
    "bird-dog", // preferred over superman per Rule 05
    "cobra-pose",
    "sphinx-pose",
    "glute-bridge",
    "forearm-plank",
    "dead-bug",
    "scapular-push-up",
    "prone-elbow-pullback",
  ],
  strength: [
    "push-up",
    "incline-knee-push-up",
    "bodyweight-squat",
    "reverse-lunge",
    "prone-w-raise",
    "self-resisted-row",
    "mock-skipping",
    "march-in-place",
    "low-impact-jumping-jacks",
    "glute-bridge",
    "calf-raise",
    "split-squat",
    "dead-bug",
    "side-plank",
  ],
  centering: ["deep-breathing"],
};

// ---------------------------------------------------------------------------
// Evening template: preferred slugs per section in priority order
// ---------------------------------------------------------------------------

const EVENING_SECTION_PREFERRED: Record<
  "mobility" | "stretching" | "relaxation",
  ReadonlyArray<string>
> = {
  mobility: [
    "child-pose",
    "seated-spinal-twist",
    "knees-to-chest",
    "shoulder-rolls",
    "neck-side-stretch",
    "ankle-circles",
    "wrist-circles",
  ],
  stretching: [
    "doorway-chest-stretch",
    "doorway-free-chest-stretch",
    "hamstring-stretch",
    "hip-flexor-stretch",
    "figure-four-stretch",
    "pigeon-pose",
    "calf-stretch",
    "quad-stretch",
    "seated-forward-fold",
  ],
  relaxation: ["sphinx-pose", "legs-up-the-wall", "deep-breathing"],
};

// ---------------------------------------------------------------------------
// Result type (explicit discriminated union, no exceptions for control flow)
// ---------------------------------------------------------------------------

export type PlanResult =
  | { success: true; data: PlannerOutput }
  | { success: false; error: NoSafePlanError };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the exercise involves hanging or inversion by any catalog signal. */
function isHangingOrInversion(ex: ExerciseCatalogItem): boolean {
  if (EXCLUDED_SLUGS.has(ex.slug)) return true;

  const searchableText = [
    ex.slug,
    ex.name.toLowerCase(),
    ex.description.toLowerCase(),
    ex.category.toLowerCase(),
    ...ex.target_areas.map((t) => t.toLowerCase()),
    ...ex.goal_tags.map((g) => g.toLowerCase()),
  ].join(" ");

  return HANGING_INVERSION_KEYWORDS.some((kw) => searchableText.includes(kw));
}

/** Returns true if the exercise is within the user's difficulty ceiling. */
function isWithinDifficultyCeiling(
  ex: ExerciseCatalogItem,
  userLevel: FitnessLevel
): boolean {
  return (
    FITNESS_LEVEL_ORDER[ex.difficulty] <= FITNESS_LEVEL_ORDER[userLevel]
  );
}

/** Returns true if the exercise requires no external equipment. */
function isEquipmentFree(ex: ExerciseCatalogItem): boolean {
  return ex.equipment.length === 0;
}

/** Returns true if the exercise's routine_tags match the session type. */
function matchesSessionType(
  ex: ExerciseCatalogItem,
  sessionType: "morning" | "evening"
): boolean {
  return (
    ex.routine_tags.includes(sessionType) || ex.routine_tags.includes("both")
  );
}

/**
 * Derives the set of excluded slugs from the user's stated limitations.
 * Normalization: lowercase + trim. Conservative: matches substring.
 */
function buildExcludedSlugsFromLimitations(
  limitations: ReadonlyArray<string>
): Set<string> {
  const excluded = new Set<string>();
  const normalizedLimitations = limitations.map((l) => l.toLowerCase().trim());

  for (const rule of LIMITATION_EXCLUSION_MAP) {
    const matched = rule.keywords.some((kw) =>
      normalizedLimitations.some((l) => l.includes(kw))
    );
    if (matched) {
      for (const slug of rule.excludeSlugs) {
        excluded.add(slug);
      }
    }
  }

  return excluded;
}

/**
 * Derives the set of excluded target areas from the user's stated limitations.
 */
function buildExcludedTargetAreasFromLimitations(
  limitations: ReadonlyArray<string>
): Set<string> {
  const excluded = new Set<string>();
  const normalizedLimitations = limitations.map((l) => l.toLowerCase().trim());

  for (const rule of LIMITATION_EXCLUSION_MAP) {
    const matched = rule.keywords.some((kw) =>
      normalizedLimitations.some((l) => l.includes(kw))
    );
    if (matched) {
      for (const area of rule.excludeTargetAreas) {
        excluded.add(area);
      }
    }
  }

  return excluded;
}

/**
 * Applies all eligibility filters to the catalog:
 * 1. is_active
 * 2. Routine tag matches session type
 * 3. Equipment-free
 * 4. Difficulty ceiling
 * 5. Hanging/inversion exclusion
 * 6. User limitation slug exclusions
 * 7. User limitation target-area exclusions
 *
 * Excludes `superman` when the user's fitness level is beginner OR when
 * `bird-dog` is available (bird-dog preference rule).
 */
function filterCatalog(
  catalog: ReadonlyArray<ExerciseCatalogItem>,
  sessionType: "morning" | "evening",
  fitnessLevel: FitnessLevel,
  limitations: ReadonlyArray<string>,
  hasBirdDog: boolean
): ExerciseCatalogItem[] {
  const excludedSlugs = buildExcludedSlugsFromLimitations(limitations);
  const excludedTargetAreas =
    buildExcludedTargetAreasFromLimitations(limitations);

  return catalog.filter((ex) => {
    if (!ex.is_active) return false;
    if (!matchesSessionType(ex, sessionType)) return false;
    if (!isEquipmentFree(ex)) return false;
    if (!isWithinDifficultyCeiling(ex, fitnessLevel)) return false;
    if (isHangingOrInversion(ex)) return false;
    if (excludedSlugs.has(ex.slug)) return false;

    // Exclude exercises whose target areas conflict with user limitations
    if (
      ex.target_areas.some((area) =>
        excludedTargetAreas.has(area.toLowerCase())
      )
    ) {
      return false;
    }

    // Bird-Dog vs. Superman: prefer bird-dog; exclude superman when bird-dog is available
    if (ex.slug === "superman" && hasBirdDog) return false;

    return true;
  });
}

/**
 * Estimates exercise duration in seconds.
 * Uses defaults from the catalog; falls back to estimating reps at ~3s/rep.
 */
function estimateExerciseDurationSeconds(
  ex: ExerciseCatalogItem,
  sets: number
): number {
  let activeSeconds: number;

  if (ex.default_duration_seconds != null) {
    activeSeconds = ex.default_duration_seconds * sets;
  } else if (ex.default_reps != null) {
    // Estimate 3 seconds per rep as a conservative average
    activeSeconds = ex.default_reps * 3 * sets;
  } else {
    // Fallback: 30 seconds per set
    activeSeconds = 30 * sets;
  }

  // Add rest between sets (not after last set)
  const restSeconds = Math.max(0, sets - 1) * ex.default_rest_seconds;

  return activeSeconds + restSeconds;
}


/**
 * Builds a PrescribedExercise from a catalog item, section, and position.
 */
function prescribe(
  ex: ExerciseCatalogItem,
  section: RoutineSection,
  position: number,
  selectionReason: string
): PrescribedExercise {
  const sets = ex.default_sets ?? 2;
  const estimatedSeconds = estimateExerciseDurationSeconds(ex, sets);

  return {
    exerciseId: ex.id,
    slug: ex.slug,
    name: ex.name,
    section,
    position,
    prescribedSets: sets,
    prescribedReps: ex.default_reps,
    prescribedDurationSeconds: ex.default_duration_seconds,
    restSeconds: ex.default_rest_seconds,
    estimatedSeconds,
    instructions: ex.instructions,
    safetyNotes: ex.safety_notes,
    selectionReason,
  };
}

/**
 * Verifies that the total estimated duration (in minutes) falls within the
 * acceptable window for the session type. Returns detailed constraint info.
 */
function checkDurationBudget(
  exercises: PrescribedExercise[],
  sessionType: "morning" | "evening",
  availableMinutes: number
): { withinBounds: boolean; estimatedMinutes: number; reasons: string[] } {
  const bounds = SESSION_DURATION_BOUNDS[sessionType];
  const totalSeconds = exercises.reduce(
    (sum, ex) => sum + ex.estimatedSeconds,
    0
  );
  const estimatedMinutes = Math.round((totalSeconds / 60) * 10) / 10;

  // Clamp the effective budget to the user's stated available minutes,
  // but the minimum required is always the session's minMinutes.
  const effectiveMax = Math.min(availableMinutes, bounds.maxMinutes);

  const reasons: string[] = [];
  let withinBounds = true;

  if (estimatedMinutes < bounds.minMinutes) {
    withinBounds = false;
    reasons.push(
      `Estimated duration ${estimatedMinutes} min is below the required minimum of ` +
        `${bounds.minMinutes} min for a ${sessionType} session. ` +
        `Insufficient eligible exercises to fill the required time window.`
    );
  }

  if (estimatedMinutes > effectiveMax) {
    withinBounds = false;
    reasons.push(
      `Estimated duration ${estimatedMinutes} min exceeds the ` +
        `${sessionType === "morning" ? "30 min morning maximum" : "25 min evening maximum"} ` +
        `(user available: ${availableMinutes} min). Exercise selection could not fit within budget.`
    );
  }

  if (availableMinutes < bounds.minMinutes) {
    withinBounds = false;
    reasons.push(
      `User's available minutes (${availableMinutes}) is below the minimum required ` +
        `for a ${sessionType} session (${bounds.minMinutes} min). ` +
        `Please set at least ${bounds.minMinutes} available minutes to generate a ${sessionType} plan.`
    );
  }

  return { withinBounds, estimatedMinutes, reasons };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * generatePlan — deterministic, pure routine planner.
 *
 * @param input - Validated PlannerInput (profile, sessionType, catalog)
 * @returns PlanResult — discriminated union of success (PlannerOutput) or
 *          failure (NoSafePlanError with typed code "NO_SAFE_PLAN")
 *
 * Health & Safety:
 *   - Returns NO_SAFE_PLAN if the user's available minutes are below the
 *     session's minimum, or if eligible exercises are insufficient.
 *   - Never claims exercises increase adult height or reopen growth plates.
 *   - Always includes MANDATORY_SAFETY_DISCLAIMER in safetyNotes.
 *   - Hanging/inversion exercises are unconditionally excluded.
 *   - Bird-Dog is preferred over Superman when both are eligible.
 */
export function generatePlan(input: PlannerInput): PlanResult {
  const { profile, sessionType, catalog } = input;
  const reasons: string[] = [];

  // --- Step 1: Check available_minutes against session minimum ---
  const bounds = SESSION_DURATION_BOUNDS[sessionType];
  if (profile.availableMinutes < bounds.minMinutes) {
    return {
      success: false,
      error: {
        code: "NO_SAFE_PLAN",
        message: `Cannot generate a ${sessionType} plan: your available minutes (${profile.availableMinutes}) are below the required minimum of ${bounds.minMinutes} minutes.`,
        reasons: [
          `User's available minutes (${profile.availableMinutes}) is below the minimum required ` +
            `for a ${sessionType} session (${bounds.minMinutes} min). ` +
            `Please set at least ${bounds.minMinutes} available minutes in your profile settings.`,
        ],
      },
    };
  }

  // --- Step 2: Check if bird-dog is available (for superman exclusion rule) ---
  const hasBirdDog = catalog.some(
    (ex) => ex.slug === "bird-dog" && ex.is_active
  );

  // --- Step 3: Filter catalog to eligible exercises ---
  const eligible = filterCatalog(
    catalog,
    sessionType,
    profile.fitnessLevel,
    profile.limitations,
    hasBirdDog
  );

  if (eligible.length === 0) {
    return {
      success: false,
      error: {
        code: "NO_SAFE_PLAN",
        message: `No eligible exercises found for a ${sessionType} session with the current profile constraints.`,
        reasons: [
          `After applying routine tag (${sessionType}), equipment-free, difficulty (${profile.fitnessLevel}), ` +
            `and limitation filters, zero exercises remain eligible. ` +
            `Review your stated limitations or fitness level.`,
        ],
      },
    };
  }

  // --- Step 4: Assemble sections ---
  const usedIds = new Set<string>();
  const exercises: PrescribedExercise[] = [];
  let position = 1;

  if (sessionType === "morning") {
    // Define which exercise categories are appropriate for each morning section.
    // Strictly no push/pull/cardio/legs in activation to avoid overlap.
    const sectionCategoryFilter: Record<
      "activation" | "posture" | "strength" | "centering",
      (ex: ExerciseCatalogItem) => boolean
    > = {
      activation: (ex) =>
        ["posture_spine", "mobility", "posture"].includes(ex.category),
      posture: (ex) =>
        [
          "posture_spine",
          "posture",
          "core",
          "pull",
          "mobility",
        ].includes(ex.category),
      strength: (ex) =>
        [
          "push",
          "pull",
          "legs",
          "core",
          "cardio",
          "posture_spine",
          "posture",
        ].includes(ex.category),
      centering: (ex) =>
        ex.slug === "deep-breathing" ||
        ["posture_spine", "posture", "stretching", "mobility"].includes(
          ex.category
        ),
    };

    const sectionTargetCount: Record<
      "activation" | "posture" | "strength" | "centering",
      number
    > = {
      activation: 3,
      posture: 4,
      strength: 4,
      centering: 1,
    };

    const requiredSections: Array<
      "activation" | "posture" | "strength" | "centering"
    > = ["activation", "posture", "strength", "centering"];

    for (const section of requiredSections) {
      const preferred = MORNING_SECTION_PREFERRED[section];
      const targetCount = sectionTargetCount[section];
      const categoryFilter = sectionCategoryFilter[section];

      // Pool of eligible exercises appropriate for this section, not yet used.
      // Exercises explicitly listed in preferred list for this section are always eligible;
      // fallback exercises must pass categoryFilter.
      const sectionEligible = eligible.filter(
        (ex) =>
          !usedIds.has(ex.id) &&
          (preferred.includes(ex.slug) || categoryFilter(ex))
      );

      let added = 0;
      // Iterate over preferred slugs first, then fall back to alphabetical order
      const orderedCandidates: ExerciseCatalogItem[] = [];
      for (const slug of preferred) {
        const match = sectionEligible.find((ex) => ex.slug === slug);
        if (match) orderedCandidates.push(match);
      }
      // Append any remaining eligible exercises not in the preferred list (alphabetical)
      const preferredIds = new Set(orderedCandidates.map((ex) => ex.id));
      const fallback = sectionEligible
        .filter((ex) => !preferredIds.has(ex.id))
        .sort((a, b) => a.slug.localeCompare(b.slug));
      orderedCandidates.push(...fallback);

      for (const candidate of orderedCandidates) {
        if (added >= targetCount) break;
        if (usedIds.has(candidate.id)) continue;

        exercises.push(
          prescribe(
            candidate,
            section,
            position++,
            `Selected for ${section} section: matches ${sessionType} routine tags, within ${profile.fitnessLevel} difficulty.`
          )
        );
        usedIds.add(candidate.id);
        added++;
      }

      const isMandatory = ["activation", "posture", "strength"].includes(
        section
      );
      if (isMandatory && added === 0) {
        reasons.push(
          `Required morning section "${section}" has no eligible exercises after applying all filters.`
        );
      }
    }
  } else {
    // Evening routine — no cross-contamination between section pools
    const sectionCategoryFilter: Record<
      "mobility" | "stretching" | "relaxation",
      (ex: ExerciseCatalogItem) => boolean
    > = {
      mobility: (ex) =>
        ["mobility", "posture_spine", "posture", "stretching"].includes(
          ex.category
        ),
      stretching: (ex) =>
        ["stretching", "posture_spine", "posture", "mobility"].includes(
          ex.category
        ),
      relaxation: (ex) =>
        ex.slug === "deep-breathing" ||
        ex.slug === "legs-up-the-wall" ||
        ["stretching", "posture_spine", "posture"].includes(ex.category),
    };

    const sectionTargetCount: Record<
      "mobility" | "stretching" | "relaxation",
      number
    > = {
      mobility: 3,
      stretching: 4,
      relaxation: 3,
    };

    const requiredSections: Array<"mobility" | "stretching" | "relaxation"> = [
      "mobility",
      "stretching",
      "relaxation",
    ];

    for (const section of requiredSections) {
      const preferred = EVENING_SECTION_PREFERRED[section];
      const targetCount = sectionTargetCount[section];
      const categoryFilter = sectionCategoryFilter[section];

      const sectionEligible = eligible.filter(
        (ex) =>
          !usedIds.has(ex.id) &&
          (preferred.includes(ex.slug) || categoryFilter(ex))
      );

      let added = 0;
      const orderedCandidates: ExerciseCatalogItem[] = [];
      for (const slug of preferred) {
        const match = sectionEligible.find((ex) => ex.slug === slug);
        if (match) orderedCandidates.push(match);
      }
      const preferredIds = new Set(orderedCandidates.map((ex) => ex.id));
      const fallback = sectionEligible
        .filter((ex) => !preferredIds.has(ex.id))
        .sort((a, b) => a.slug.localeCompare(b.slug));
      orderedCandidates.push(...fallback);

      for (const candidate of orderedCandidates) {
        if (added >= targetCount) break;
        if (usedIds.has(candidate.id)) continue;

        exercises.push(
          prescribe(
            candidate,
            section,
            position++,
            `Selected for ${section} section: matches ${sessionType} routine tags, within ${profile.fitnessLevel} difficulty.`
          )
        );
        usedIds.add(candidate.id);
        added++;
      }

      if (added === 0) {
        reasons.push(
          `Required evening section "${section}" has no eligible exercises after applying all filters.`
        );
      }
    }
  }


  // --- Step 5: Check mandatory section coverage ---
  if (reasons.length > 0) {
    return {
      success: false,
      error: {
        code: "NO_SAFE_PLAN",
        message: `Cannot generate a complete ${sessionType} plan: one or more required sections are empty.`,
        reasons,
      },
    };
  }

  if (exercises.length === 0) {
    return {
      success: false,
      error: {
        code: "NO_SAFE_PLAN",
        message: `No exercises could be assembled for a ${sessionType} session.`,
        reasons: [
          "Exercise selection returned no items after section assembly. " +
            "Review profile limitations and fitness level.",
        ],
      },
    };
  }

  // --- Step 6: Check duration budget ---
  const { withinBounds, estimatedMinutes, reasons: durationReasons } =
    checkDurationBudget(exercises, sessionType, profile.availableMinutes);

  if (!withinBounds) {
    return {
      success: false,
      error: {
        code: "NO_SAFE_PLAN",
        message: `The assembled ${sessionType} plan does not meet duration requirements (${estimatedMinutes} min estimated).`,
        reasons: durationReasons,
      },
    };
  }

  // --- Step 7: Build output ---
  const routineName =
    sessionType === "morning"
      ? "Morning Posture & Activation Routine"
      : "Evening Spinal Decompression & Relaxation";

  const selectionReasons = [
    `Session type: ${sessionType}`,
    `Fitness level: ${profile.fitnessLevel}`,
    `Goals: ${profile.goals.join(", ")}`,
    `Limitations applied: ${profile.limitations.length > 0 ? profile.limitations.join(", ") : "none"}`,
    `Bird-dog preference enforced: ${hasBirdDog ? "yes (superman excluded)" : "bird-dog not available"}`,
    `Hanging/inversion exercises: unconditionally excluded`,
    `Exercises selected: ${exercises.length}`,
    `Estimated duration: ${estimatedMinutes} min`,
  ];

  return {
    success: true,
    data: {
      routineName,
      plannerVersion: PLANNER_VERSION,
      sessionType,
      exercises,
      estimatedMinutes,
      safetyNotes: MANDATORY_SAFETY_DISCLAIMER,
      selectionReasons,
    },
  };
}
