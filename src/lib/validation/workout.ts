import { z } from "zod";
import { sessionTypeEnum } from "./routine";

/**
 * Valid workout session statuses matching database enum `public.workout_status`.
 */
export const workoutStatusEnum = z.enum(["in_progress", "completed", "cancelled"]);
export type WorkoutStatus = z.infer<typeof workoutStatusEnum>;

/**
 * Schema for starting a workout session.
 * Server creates the immutable snapshot and derives user_id from auth.
 * Strictly disallows client-provided user_id, timestamps, and snapshot fields.
 */
export const startWorkoutSchema = z
  .object({
    routine_id: z.string().uuid("Invalid routine ID").nullable().optional(),
    session_type: sessionTypeEnum,
  })
  .strict();

export type StartWorkoutInput = z.infer<typeof startWorkoutSchema>;

/**
 * Schema for an individual exercise result submitted upon workout completion.
 * Matches `public.complete_workout_session` RPC expectations and DB constraints.
 */
export const exerciseResultItemSchema = z
  .object({
    session_exercise_id: z.string().uuid("Invalid session exercise ID format"),
    completed: z.boolean(),
    completed_sets: z
      .number({ invalid_type_error: "Completed sets must be a number" })
      .int("Completed sets must be an integer")
      .min(0, "Completed sets must be between 0 and 20")
      .max(20, "Completed sets must be between 0 and 20")
      .default(0),
    completed_reps: z
      .number({ invalid_type_error: "Completed reps must be a number" })
      .int("Completed reps must be an integer")
      .min(0, "Completed reps must be between 0 and 200")
      .max(200, "Completed reps must be between 0 and 200")
      .nullable()
      .optional(),
    actual_duration_seconds: z
      .number({ invalid_type_error: "Actual duration must be a number" })
      .int("Actual duration must be an integer")
      .min(0, "Actual duration must be between 0 and 86400 seconds")
      .max(86400, "Actual duration must be between 0 and 86400 seconds")
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must not exceed 500 characters")
      .nullable()
      .optional(),
  })
  .strict();

export type ExerciseResultItemInput = z.infer<typeof exerciseResultItemSchema>;

/**
 * Schema for completing a workout session via the atomic RPC.
 * Strictly enforces unique session exercise IDs and disallows client user_id.
 */
export const completeWorkoutSchema = z
  .object({
    session_id: z.string().uuid("Invalid session ID format"),
    duration_seconds: z
      .number({ invalid_type_error: "Duration must be a number" })
      .int("Duration must be an integer")
      .min(0, "Duration must be between 0 and 86400 seconds")
      .max(86400, "Duration must be between 0 and 86400 seconds")
      .nullable()
      .optional(),
    results: z
      .array(exerciseResultItemSchema)
      .min(1, "Workout completion requires at least one exercise result")
      .refine(
        (items) => {
          const ids = items.map((item) => item.session_exercise_id);
          return new Set(ids).size === ids.length;
        },
        {
          message: "Duplicate session exercise IDs are not allowed in results",
          path: ["results"],
        }
      ),
  })
  .strict();

export type CompleteWorkoutInput = z.infer<typeof completeWorkoutSchema>;

/**
 * Schema for cancelling an in-progress workout session.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const cancelWorkoutSchema = z
  .object({
    session_id: z.string().uuid("Invalid session ID format"),
  })
  .strict();

export type CancelWorkoutInput = z.infer<typeof cancelWorkoutSchema>;
