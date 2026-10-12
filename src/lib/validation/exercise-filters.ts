import { z } from "zod";

export const EXERCISE_CATEGORIES = [
  "posture_spine",
  "mobility",
  "stretching",
  "posture",
  "core",
  "push",
  "pull",
  "legs",
  "cardio",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const ROUTINE_TAGS = ["morning", "evening", "both"] as const;
export type RoutineTag = (typeof ROUTINE_TAGS)[number];

export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

/**
 * Human-readable display labels for exercise categories.
 */
export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  posture_spine: "Posture & Spine",
  mobility: "Mobility",
  stretching: "Stretching & Flexibility",
  posture: "Posture Alignment",
  core: "Core Stability",
  push: "Upper Push",
  pull: "Upper Pull",
  legs: "Lower Body",
  cardio: "Cardio & Activation",
};

/**
 * Human-readable display labels for routine suitability.
 */
export const ROUTINE_TAG_LABELS: Record<RoutineTag, string> = {
  morning: "Morning Activation",
  evening: "Evening Relaxation",
  both: "Morning & Evening",
};

/**
 * Human-readable labels for difficulty levels.
 */
export const DIFFICULTY_LABELS: Record<FitnessLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Validation schema for exercise catalog filtering & search parameters.
 * Normalizes empty strings and whitespace to undefined for clean querying.
 */
export const exerciseFilterSchema = z.object({
  search: z
    .string()
    .trim()
    .max(100, "Search query must not exceed 100 characters")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  category: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .pipe(z.enum(EXERCISE_CATEGORIES).optional()),
  routine_tag: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .pipe(z.enum(ROUTINE_TAGS).optional()),
  difficulty: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined))
    .pipe(z.enum(FITNESS_LEVELS).optional()),
});

export type ExerciseFilterInput = z.infer<typeof exerciseFilterSchema>;

/**
 * Safe parser that normalizes untrusted URL searchParams into a valid ExerciseFilterInput.
 * Falls back safely to empty filters if invalid values are supplied.
 */
export function parseExerciseFilters(
  rawParams: Record<string, string | string[] | undefined>
): ExerciseFilterInput {
  const normalizedRaw: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") {
      normalizedRaw[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      normalizedRaw[key] = value[0];
    }
  }

  const parsed = exerciseFilterSchema.safeParse(normalizedRaw);
  if (parsed.success) {
    return parsed.data;
  }

  // Gracefully degrade by stripping invalid fields
  return {
    search: typeof normalizedRaw.search === "string" ? normalizedRaw.search.trim().slice(0, 100) : undefined,
    category: undefined,
    routine_tag: undefined,
    difficulty: undefined,
  };
}
