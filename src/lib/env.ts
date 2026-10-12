import { z } from "zod";

export class ConfigurationError extends Error {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ConfigurationError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Schema for public environment variables exposed to both browser and server.
 * Only variables with NEXT_PUBLIC_ prefix are permitted here.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required")
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Schema for server-only environment variables.
 * Never accessible in client bundles or browser contexts.
 */
export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty")
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatZodErrors(error: z.ZodError): {
  message: string;
  fieldErrors: Record<string, string[]>;
} {
  const flattened = error.flatten();
  const rawErrors = flattened.fieldErrors;
  const fieldErrors: Record<string, string[]> = {};

  for (const [field, errors] of Object.entries(rawErrors)) {
    if (errors && errors.length > 0) {
      fieldErrors[field] = errors;
    }
  }

  const messages: string[] = [];
  for (const [field, errors] of Object.entries(fieldErrors)) {
    messages.push(`  - ${field}: ${errors.join(", ")}`);
  }

  const message = `[LookFit Configuration Error]: Invalid environment variables:\n${messages.join(
    "\n"
  )}`;

  return { message, fieldErrors };
}

/**
 * Validates an arbitrary dictionary against public environment schema.
 * Useful for deterministic testing.
 */
export function validatePublicEnv(env: Record<string, unknown>): PublicEnv {
  const result = publicEnvSchema.safeParse(env);
  if (!result.success) {
    const { message, fieldErrors } = formatZodErrors(result.error);
    throw new ConfigurationError(message, fieldErrors);
  }
  return result.data;
}

/**
 * Validates an arbitrary dictionary against server environment schema.
 * Useful for deterministic testing.
 */
export function validateServerEnv(env: Record<string, unknown>): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) {
    const { message, fieldErrors } = formatZodErrors(result.error);
    throw new ConfigurationError(message, fieldErrors);
  }
  return result.data;
}

/**
 * Returns validated public environment variables from process.env.
 * Throws a clear ConfigurationError if required public variables are missing or malformed.
 */
export function getPublicEnv(): PublicEnv {
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return validatePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}

/**
 * Returns validated server environment variables from process.env.
 * Throws a clear ConfigurationError if required variables are missing or malformed.
 */
export function getServerEnv(): ServerEnv {
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return validateServerEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
