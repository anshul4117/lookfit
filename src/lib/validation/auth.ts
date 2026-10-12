import { z } from "zod";

/**
 * Validation schema for user authentication (sign-in).
 * Strictly disallows client-provided user_id or unexpected fields.
 */
export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address")
      .toLowerCase(),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters")
      .max(72, "Password must not exceed 72 characters"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validation schema for new user registration (sign-up).
 * Enforces strong password boundary (minimum 8 characters) and confirms password match.
 * Strictly disallows client-provided user_id or unexpected fields.
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address")
      .toLowerCase(),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must not exceed 72 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password")
      .max(72)
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;
