import { z } from "zod";

/**
 * Valid fitness levels matching database enum `public.fitness_level`.
 */
export const fitnessLevelEnum = z.enum(["beginner", "intermediate", "advanced"]);
export type FitnessLevel = z.infer<typeof fitnessLevelEnum>;

/**
 * Valid profile goals matching database constraint `profile_goals_valid`.
 */
export const profileGoalEnum = z.enum([
  "mobility",
  "posture",
  "strength",
  "general_fitness",
  "flexibility",
  "cardio",
]);
export type ProfileGoal = z.infer<typeof profileGoalEnum>;

/**
 * Validates whether a given string is a recognized IANA timezone identifier.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string" || tz.trim().length === 0) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Standard 24-hour time format regex: HH:MM (00:00 to 23:59).
 */
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Schema for updating an existing user profile.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const profileUpdateSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .max(100, "Display name must not exceed 100 characters")
      .nullable()
      .optional(),
    age_years: z
      .number({ invalid_type_error: "Age must be a valid number" })
      .int("Age must be an integer")
      .min(10, "Age must be at least 10")
      .max(100, "Age must not exceed 100")
      .nullable()
      .optional(),
    fitness_level: fitnessLevelEnum.optional(),
    goals: z
      .array(profileGoalEnum)
      .min(1, "Select at least one fitness goal")
      .max(6, "Cannot select more than 6 goals")
      .optional(),
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
    available_minutes: z
      .number({ invalid_type_error: "Duration must be a number" })
      .int("Duration must be an integer")
      .min(5, "Available duration must be at least 5 minutes")
      .max(120, "Available duration must not exceed 120 minutes")
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(1, "Timezone is required")
      .refine(isValidTimezone, { message: "Invalid IANA timezone identifier" })
      .optional(),
    morning_time: z
      .string()
      .regex(TIME_REGEX, "Morning time must be in HH:MM format (00:00–23:59)")
      .optional(),
    evening_time: z
      .string()
      .regex(TIME_REGEX, "Evening time must be in HH:MM format (00:00–23:59)")
      .optional(),
    reminders_enabled: z.boolean().optional(),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Schema for completing onboarding.
 * Target profile defaults to age 23 with balanced settings.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const profileOnboardingSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .max(100, "Display name must not exceed 100 characters")
      .nullable()
      .optional(),
    age_years: z
      .number({ invalid_type_error: "Age must be a valid number" })
      .int("Age must be an integer")
      .min(10, "Age must be at least 10")
      .max(100, "Age must not exceed 100")
      .default(23),
    fitness_level: fitnessLevelEnum.default("intermediate"),
    goals: z
      .array(profileGoalEnum)
      .min(1, "Select at least one fitness goal")
      .max(6, "Cannot select more than 6 goals")
      .default(["mobility", "posture", "strength", "general_fitness"]),
    limitations: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Limitation entry must not be empty")
          .max(100, "Limitation entry must not exceed 100 characters")
      )
      .max(20, "Maximum of 20 limitations allowed")
      .default([]),
    available_minutes: z
      .number({ invalid_type_error: "Duration must be a number" })
      .int("Duration must be an integer")
      .min(5, "Available duration must be at least 5 minutes")
      .max(120, "Available duration must not exceed 120 minutes")
      .default(20),
    timezone: z
      .string()
      .trim()
      .min(1, "Timezone is required")
      .refine(isValidTimezone, { message: "Invalid IANA timezone identifier" })
      .default("Asia/Kolkata"),
    morning_time: z
      .string()
      .regex(TIME_REGEX, "Morning time must be in HH:MM format (00:00–23:59)")
      .default("06:30"),
    evening_time: z
      .string()
      .regex(TIME_REGEX, "Evening time must be in HH:MM format (00:00–23:59)")
      .default("18:30"),
    reminders_enabled: z.boolean().default(false),
  })
  .strict();

export type ProfileOnboardingInput = z.infer<typeof profileOnboardingSchema>;

/**
 * Schema for logging optional body measurements.
 * Strictly disallows client-provided user_id and unknown keys.
 */
export const bodyMeasurementSchema = z
  .object({
    measured_at: z.string().datetime().optional(),
    weight_kg: z
      .number()
      .min(1, "Weight must be at least 1 kg")
      .max(500, "Weight must not exceed 500 kg")
      .nullable()
      .optional(),
    height_cm: z
      .number()
      .min(30, "Height must be at least 30 cm")
      .max(300, "Height must not exceed 300 cm")
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must not exceed 500 characters")
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.weight_kg != null ||
      data.height_cm != null ||
      (data.notes != null && data.notes.length > 0),
    {
      message: "At least one measurement (weight, height, or notes) must be provided",
    }
  );

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>;
