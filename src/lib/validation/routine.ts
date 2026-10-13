import { z } from "zod";
import { fitnessLevelEnum } from "./profile";

/**
 * Valid session types matching database enum `public.session_type`.
 */
export const sessionTypeEnum = z.enum(["morning", "evening"]);
export type SessionType = z.infer<typeof sessionTypeEnum>;

/**
 * Valid routine statuses matching database enum `public.routine_status`.
 */
export const routineStatusEnum = z.enum(["draft", "active", "archived"]);
export type RoutineStatus = z.infer<typeof routineStatusEnum>;

/**
 * Schema for an individual exercise prescription within a routine.
 * Strictly enforces that either reps or duration is defined.
 */
export const routineExerciseItemSchema = z
  .object({
    exercise_id: z.string().uuid("Invalid exercise ID format"),
    position: z
      .number({ invalid_type_error: "Position must be a number" })
      .int("Position must be an integer")
      .min(1, "Position must be at least 1"),
    prescribed_sets: z
      .number({ invalid_type_error: "Prescribed sets must be a number" })
      .int("Prescribed sets must be an integer")
      .min(1, "Prescribed sets must be between 1 and 20")
      .max(20, "Prescribed sets must be between 1 and 20")
      .nullable()
      .optional(),
    prescribed_reps: z
      .number({ invalid_type_error: "Prescribed reps must be a number" })
      .int("Prescribed reps must be an integer")
      .min(1, "Prescribed reps must be between 1 and 200")
      .max(200, "Prescribed reps must be between 1 and 200")
      .nullable()
      .optional(),
    prescribed_duration_seconds: z
      .number({ invalid_type_error: "Prescribed duration must be a number" })
      .int("Prescribed duration must be an integer")
      .min(5, "Prescribed duration must be between 5 and 3600 seconds")
      .max(3600, "Prescribed duration must be between 5 and 3600 seconds")
      .nullable()
      .optional(),
    rest_seconds: z
      .number({ invalid_type_error: "Rest seconds must be a number" })
      .int("Rest seconds must be an integer")
      .min(0, "Rest seconds must be between 0 and 600")
      .max(600, "Rest seconds must be between 0 and 600")
      .default(30),
  })
  .strict()
  .refine(
    (data) =>
      data.prescribed_reps != null || data.prescribed_duration_seconds != null,
    {
      message: "Each routine exercise must specify either prescribed reps or duration",
      path: ["prescribed_reps"],
    }
  );

export type RoutineExerciseItemInput = z.infer<typeof routineExerciseItemSchema>;

/**
 * Schema for creating a new routine with prescribed exercises.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const createRoutineSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Routine name is required")
      .max(100, "Routine name must not exceed 100 characters"),
    session_type: sessionTypeEnum,
    estimated_minutes: z
      .number({ invalid_type_error: "Estimated duration must be a number" })
      .int("Estimated duration must be an integer")
      .min(1, "Estimated duration must be between 1 and 180 minutes")
      .max(180, "Estimated duration must be between 1 and 180 minutes")
      .default(20),
    status: routineStatusEnum.default("draft"),
    exercises: z
      .array(routineExerciseItemSchema)
      .min(1, "Routine must include at least one exercise")
      .refine(
        (exercises) => {
          const positions = exercises.map((e) => e.position);
          return new Set(positions).size === positions.length;
        },
        {
          message: "Each exercise in the routine must have a unique position number",
          path: ["exercises"],
        }
      ),
  })
  .strict();

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;

/**
 * Schema for updating an existing routine.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const updateRoutineSchema = z
  .object({
    id: z.string().uuid("Invalid routine ID"),
    name: z
      .string()
      .trim()
      .min(1, "Routine name cannot be empty")
      .max(100, "Routine name must not exceed 100 characters")
      .optional(),
    estimated_minutes: z
      .number({ invalid_type_error: "Estimated duration must be a number" })
      .int("Estimated duration must be an integer")
      .min(1, "Estimated duration must be between 1 and 180 minutes")
      .max(180, "Estimated duration must be between 1 and 180 minutes")
      .optional(),
    status: routineStatusEnum.optional(),
    exercises: z
      .array(routineExerciseItemSchema)
      .min(1, "Routine must include at least one exercise")
      .refine(
        (exercises) => {
          const positions = exercises.map((e) => e.position);
          return new Set(positions).size === positions.length;
        },
        {
          message: "Each exercise in the routine must have a unique position number",
          path: ["exercises"],
        }
      )
      .optional(),
  })
  .strict();

export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;

/**
 * Schema for deterministic routine generation request.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const generateRoutineSchema = z
  .object({
    session_type: sessionTypeEnum,
    available_minutes: z
      .number({ invalid_type_error: "Available duration must be a number" })
      .int("Available duration must be an integer")
      .min(5, "Available duration must be between 5 and 120 minutes")
      .max(120, "Available duration must be between 5 and 120 minutes")
      .optional(),
    fitness_level: fitnessLevelEnum.optional(),
    limitations: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Limitation entry must not be empty")
          .max(100, "Limitation entry must not exceed 100 characters")
      )
      .max(20, "Maximum of 20 limitations allowed")
      .optional(),
  })
  .strict();

export type GenerateRoutineInput = z.infer<typeof generateRoutineSchema>;

/**
 * Schema for archiving a routine.
 */
export const archiveRoutineSchema = z
  .object({
    id: z.string().uuid("Invalid routine ID"),
  })
  .strict();

export type ArchiveRoutineInput = z.infer<typeof archiveRoutineSchema>;
