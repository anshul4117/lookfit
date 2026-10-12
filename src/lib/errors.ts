import { z } from "zod";

/**
 * Standard error codes across server actions and domain operations.
 * Per Rule 01 and Architecture specification.
 */
export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  details?: Record<string, string[]>;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

/**
 * Constructs a successful action result.
 */
export function createSuccessResult<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Constructs a failed action result with structured error.
 */
export function createErrorResult(
  code: ActionErrorCode,
  message: string,
  details?: Record<string, string[]>
): ActionResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    },
  };
}

/**
 * Converts a ZodError into an ActionError with structured field details.
 */
export function fromZodError(error: z.ZodError): ActionError {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      for (const key of issue.keys) {
        if (!details[key]) {
          details[key] = [];
        }
        details[key].push(issue.message);
      }
    } else {
      const path = issue.path.length > 0 ? issue.path.join(".") : "_form";
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }
  }

  const issueCount = error.issues.length;
  const message =
    issueCount === 1
      ? error.issues[0]?.message || "Validation failed"
      : `Validation failed with ${issueCount} error${issueCount > 1 ? "s" : ""}`;

  return {
    code: "VALIDATION_ERROR",
    message,
    details,
  };
}

/**
 * Known Postgres error codes and their safe mapped ActionErrorCode.
 */
const POSTGRES_CODE_MAP: Record<string, { code: ActionErrorCode; message: string }> = {
  "28000": { code: "UNAUTHENTICATED", message: "Authentication required" },
  "P0002": { code: "NOT_FOUND", message: "Requested resource was not found" },
  "55000": { code: "CONFLICT", message: "The operation cannot be completed in the current state" },
  "23505": { code: "CONFLICT", message: "A record with this information already exists" },
  "23503": { code: "NOT_FOUND", message: "Referenced resource does not exist" },
  "42501": { code: "NOT_FOUND", message: "Requested resource was not found" }, // Obscure RLS denial as NOT_FOUND
};

/**
 * Known Supabase Auth error codes and their safe mapped ActionErrorCode.
 */
const AUTH_CODE_MAP: Record<string, { code: ActionErrorCode; message: string }> = {
  "invalid_credentials": {
    code: "UNAUTHENTICATED",
    message: "Invalid email or password",
  },
  "email_not_confirmed": {
    code: "UNAUTHENTICATED",
    message: "Please confirm your email address before signing in",
  },
  "user_already_exists": {
    code: "CONFLICT",
    message: "An account with this email already exists",
  },
  "over_email_send_rate_limit": {
    code: "RATE_LIMITED",
    message: "Too many attempts. Please try again later",
  },
  "over_request_rate_limit": {
    code: "RATE_LIMITED",
    message: "Too many attempts. Please try again later",
  },
};

/**
 * Patterns indicating sensitive database, system, or secret information
 * that must never be leaked to clients.
 */
const SENSITIVE_PATTERNS = [
  /postgres/i,
  /pq:/i,
  /relation ".*" does not exist/i,
  /column ".*" of relation/i,
  /syntax error at or near/i,
  /violates foreign key/i,
  /violates unique constraint/i,
  /violates check constraint/i,
  /table ".*"/i,
  /schema ".*"/i,
  /supabase/i,
  /anon_key/i,
  /service_role/i,
  /bearer /i,
  /jwt/i,
  /auth\.users/i,
  /password/i,
  /secret/i,
  /connection refused/i,
  /econnrefused/i,
  /stack trace/i,
  /node_modules/i,
];

function containsSensitiveInfo(text: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

const ACTION_ERROR_CODES: Set<string> = new Set([
  "UNAUTHENTICATED",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "FORBIDDEN",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);

/**
 * Sanitizes any caught error, ensuring that raw database messages,
 * schema names, stack traces, and secrets are never returned to clients.
 */
export function sanitizeError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred. Please try again."
): ActionError {
  // 1. If it's already a valid ActionError, pass through if message is safe
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    ACTION_ERROR_CODES.has((error as { code: string }).code) &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const actionErr = error as ActionError;
    if (containsSensitiveInfo(actionErr.message)) {
      return {
        code: actionErr.code,
        message: fallbackMessage,
      };
    }
    return actionErr;
  }

  // 2. If it's a ZodError, format safely
  if (error instanceof z.ZodError) {
    return fromZodError(error);
  }

  // 3. If it's a Postgres / PostgREST error object
  if (error !== null && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const code = typeof errObj.code === "string" ? errObj.code : undefined;

    if (code && POSTGRES_CODE_MAP[code]) {
      return {
        code: POSTGRES_CODE_MAP[code].code,
        message: POSTGRES_CODE_MAP[code].message,
      };
    }

    if (code && AUTH_CODE_MAP[code]) {
      return {
        code: AUTH_CODE_MAP[code].code,
        message: AUTH_CODE_MAP[code].message,
      };
    }

    const message = typeof errObj.message === "string" ? errObj.message : "";
    if (message) {
      if (containsSensitiveInfo(message)) {
        return {
          code: "INTERNAL_ERROR",
          message: fallbackMessage,
        };
      }
    }
  }

  // 4. Standard Error instance
  if (error instanceof Error) {
    if (containsSensitiveInfo(error.message)) {
      return {
        code: "INTERNAL_ERROR",
        message: fallbackMessage,
      };
    }
  }

  // 5. Default generic error
  return {
    code: "INTERNAL_ERROR",
    message: fallbackMessage,
  };
}
