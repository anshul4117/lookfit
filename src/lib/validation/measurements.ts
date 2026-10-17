import { z } from "zod";

/**
 * Validation schema for optional posture and body measurement check-ins.
 * Enforces database constraints:
 * - weight_kg between 1 and 500
 * - height_cm between 30 and 300
 * - notes up to 1000 chars
 * - At least one value must be non-empty
 * Strictly disallows client-provided user_id or id.
 */
export const createMeasurementSchema = z
  .object({
    weight_kg: z
      .number({ invalid_type_error: "Weight must be a number" })
      .min(1, "Weight must be at least 1 kg")
      .max(500, "Weight must not exceed 500 kg")
      .nullable()
      .optional(),
    height_cm: z
      .number({ invalid_type_error: "Height must be a number" })
      .min(30, "Height must be at least 30 cm")
      .max(300, "Height must not exceed 300 cm")
      .nullable()
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must not exceed 1000 characters")
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
      message: "At least one measurement (weight, height, or note) must be provided",
    }
  );

export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
