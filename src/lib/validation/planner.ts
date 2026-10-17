import { z } from "zod";
import { fitnessLevelEnum } from "./profile";
import { sessionTypeEnum } from "./routine";

/**
 * Valid morning routine section labels.
 * Matches the three required morning sections per T09 acceptance criteria.
 */
export const morningSectionEnum = z.enum([
  "activation",
  "posture",
  "strength",
  "centering",
]);
export type MorningSection = z.infer<typeof morningSectionEnum>;

/**
 * Valid evening routine section labels.
 * Matches the three required evening sections per T09 acceptance criteria.
 */
export const eveningSectionEnum = z.enum([
  "mobility",
  "stretching",
  "core",
  "relaxation",
]);
export type EveningSection = z.infer<typeof eveningSectionEnum>;

export const routineSectionEnum = z.union([
  morningSectionEnum,
  eveningSectionEnum,
]);
export type RoutineSection = z.infer<typeof routineSectionEnum>;

/**
 * Schema for a single exercise item from the catalog, as needed by the planner.
 * Maps to the existing `exercises` table Row type.
 */
export const exerciseCatalogItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  difficulty: fitnessLevelEnum,
  routine_tags: z.array(z.string()),
  goal_tags: z.array(z.string()),
  target_areas: z.array(z.string()),
  equipment: z.array(z.string()),
  instructions: z.array(z.string()),
  safety_notes: z.string(),
  is_active: z.boolean(),
  default_sets: z.number().int().positive().nullable(),
  default_reps: z.number().int().positive().nullable(),
  default_duration_seconds: z.number().int().positive().nullable(),
  default_rest_seconds: z.number().int().min(0),
});

export type ExerciseCatalogItem = z.infer<typeof exerciseCatalogItemSchema>;

/**
 * Schema for a prescribed exercise within the generated plan.
 * Position is 1-indexed and strictly sequential.
 */
export const prescribedExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  section: routineSectionEnum,
  position: z.number().int().min(1),
  prescribedSets: z.number().int().min(1),
  prescribedReps: z.number().int().min(1).nullable(),
  prescribedDurationSeconds: z.number().int().min(5).nullable(),
  restSeconds: z.number().int().min(0),
  estimatedSeconds: z.number().int().min(0),
  instructions: z.array(z.string()),
  safetyNotes: z.string(),
  selectionReason: z.string(),
});

export type PrescribedExercise = z.infer<typeof prescribedExerciseSchema>;

/**
 * Schema for a validated profile as consumed by the planner.
 * Omits server-internal fields (user_id, timestamps, onboarding_complete).
 */
export const plannerProfileSchema = z.object({
  fitnessLevel: fitnessLevelEnum,
  goals: z.array(z.string()).min(1),
  limitations: z.array(z.string()),
  availableMinutes: z
    .number()
    .int()
    .min(5, "Available minutes must be at least 5")
    .max(120),
  ageYears: z.number().int().min(10).max(100).nullable(),
});

export type PlannerProfile = z.infer<typeof plannerProfileSchema>;

/**
 * Input schema for the deterministic planner.
 * catalog is the full active exercise list from the database.
 */
export const plannerInputSchema = z.object({
  profile: plannerProfileSchema,
  sessionType: sessionTypeEnum,
  catalog: z.array(exerciseCatalogItemSchema).min(1),
});

export type PlannerInput = z.infer<typeof plannerInputSchema>;

/**
 * Successful planner output with structured exercise sections.
 * Mandatory safetyNotes includes Rule 05 disclaimers (sharp-pain warning, no height claims).
 */
export const plannerOutputSchema = z.object({
  routineName: z.string().min(1),
  plannerVersion: z.literal("1.0.0"),
  sessionType: sessionTypeEnum,
  exercises: z.array(prescribedExerciseSchema).min(1),
  estimatedMinutes: z.number().positive(),
  /** Rule 05 mandatory safety disclaimers. Never omit. */
  safetyNotes: z.string().min(1),
  selectionReasons: z.array(z.string()),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

/**
 * Typed error returned when a safe, valid plan cannot be produced.
 * Used instead of throwing; callers must check the success/failure discriminant.
 */
export const noSafePlanErrorSchema = z.object({
  code: z.literal("NO_SAFE_PLAN"),
  message: z.string().min(1),
  /**
   * Detailed reasons explaining which constraints prevented plan generation.
   * Never includes sensitive user data or internal schema information.
   */
  reasons: z.array(z.string()).min(1),
});

export type NoSafePlanError = z.infer<typeof noSafePlanErrorSchema>;

/**
 * Duration constraints per session type (in minutes).
 * Morning: 20–30 minutes | Evening: 15–25 minutes.
 * Per docs/PLAN.md and T09 acceptance criteria.
 */
export const SESSION_DURATION_BOUNDS = {
  morning: { minMinutes: 20, maxMinutes: 30 },
  evening: { minMinutes: 15, maxMinutes: 25 },
} as const satisfies Record<
  "morning" | "evening",
  { minMinutes: number; maxMinutes: number }
>;

/**
 * Minimum exercises required per mandatory section before NO_SAFE_PLAN is raised.
 */
export const MIN_EXERCISES_PER_SECTION = 1 as const;
