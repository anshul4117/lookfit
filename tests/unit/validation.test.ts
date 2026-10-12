import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createSuccessResult,
  createErrorResult,
  fromZodError,
  sanitizeError,
  ActionError,
} from "@/lib/errors";
import {
  profileUpdateSchema,
  profileOnboardingSchema,
  bodyMeasurementSchema,
  isValidTimezone,
} from "@/lib/validation/profile";
import {
  createRoutineSchema,
  updateRoutineSchema,
  generateRoutineSchema,
  routineExerciseItemSchema,
} from "@/lib/validation/routine";
import {
  startWorkoutSchema,
  completeWorkoutSchema,
  cancelWorkoutSchema,
  exerciseResultItemSchema,
} from "@/lib/validation/workout";

describe("T05: Validation and Error Contracts", () => {
  describe("src/lib/errors.ts", () => {
    it("creates a standardized success result", () => {
      const result = createSuccessResult({ id: "123", name: "Test" });
      expect(result).toEqual({
        success: true,
        data: { id: "123", name: "Test" },
      });
    });

    it("creates a standardized error result", () => {
      const result = createErrorResult("NOT_FOUND", "Resource not found", {
        id: ["Item does not exist"],
      });
      expect(result).toEqual({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
          details: { id: ["Item does not exist"] },
        },
      });
    });

    it("formats Zod validation errors into ActionError with field details", () => {
      const schema = z.object({
        name: z.string().min(2, "Name too short"),
        age: z.number().min(18, "Must be adult"),
      });

      const parsed = schema.safeParse({ name: "A", age: 10 });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const actionError = fromZodError(parsed.error);
        expect(actionError.code).toBe("VALIDATION_ERROR");
        expect(actionError.details).toBeDefined();
        expect(actionError.details?.name).toContain("Name too short");
        expect(actionError.details?.age).toContain("Must be adult");
        expect(actionError.message).toContain("2 errors");
      }
    });

    it("sanitizes raw PostgreSQL and sensitive internal errors", () => {
      const rawPgError = new Error(
        'relation "public.profiles" does not exist at character 15'
      );
      const sanitized = sanitizeError(rawPgError);
      expect(sanitized.code).toBe("INTERNAL_ERROR");
      expect(sanitized.message).toBe("An unexpected error occurred. Please try again.");
      expect(sanitized.message).not.toContain("profiles");
      expect(sanitized.message).not.toContain("relation");
    });

    it("sanitizes errors containing leaked secrets or JWT tokens", () => {
      const leakError = new Error(
        "Failed to verify anon_key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
      );
      const sanitized = sanitizeError(leakError);
      expect(sanitized.code).toBe("INTERNAL_ERROR");
      expect(sanitized.message).not.toContain("eyJhbGci");
      expect(sanitized.message).not.toContain("anon_key");
    });

    it("maps known Postgres error codes to standardized ActionError codes", () => {
      expect(sanitizeError({ code: "28000", message: "auth fail" }).code).toBe(
        "UNAUTHENTICATED"
      );
      expect(sanitizeError({ code: "P0002", message: "no row" }).code).toBe(
        "NOT_FOUND"
      );
      expect(sanitizeError({ code: "55000", message: "finalized" }).code).toBe(
        "CONFLICT"
      );
      expect(sanitizeError({ code: "23505", message: "duplicate" }).code).toBe(
        "CONFLICT"
      );
      expect(sanitizeError({ code: "42501", message: "rls denied" }).code).toBe(
        "NOT_FOUND"
      );
    });

    it("passes through valid, non-sensitive ActionError objects", () => {
      const validError: ActionError = {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again in 1 minute.",
      };
      const sanitized = sanitizeError(validError);
      expect(sanitized).toEqual(validError);
    });
  });

  describe("src/lib/validation/profile.ts", () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";

    it("validates IANA timezones correctly", () => {
      expect(isValidTimezone("Asia/Kolkata")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("Mars/Curiosity")).toBe(false);
      expect(isValidTimezone("Not/A_Real_Timezone")).toBe(false);
    });

    it("validates onboarding defaults matching target profile (age 23)", () => {
      const parsed = profileOnboardingSchema.parse({});
      expect(parsed.age_years).toBe(23);
      expect(parsed.fitness_level).toBe("intermediate");
      expect(parsed.available_minutes).toBe(20);
      expect(parsed.timezone).toBe("Asia/Kolkata");
      expect(parsed.morning_time).toBe("06:30");
      expect(parsed.evening_time).toBe("18:30");
      expect(parsed.goals).toEqual([
        "mobility",
        "posture",
        "strength",
        "general_fitness",
      ]);
    });

    it("strictly rejects client-supplied user_id in onboarding", () => {
      const result = profileOnboardingSchema.safeParse({
        user_id: validUuid,
        age_years: 23,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Unrecognized key");
      }
    });

    it("strictly rejects client-supplied user_id and unknown keys in profile update", () => {
      const withUserId = profileUpdateSchema.safeParse({
        user_id: validUuid,
        available_minutes: 30,
      });
      expect(withUserId.success).toBe(false);

      const withUnknownKey = profileUpdateSchema.safeParse({
        is_admin: true,
        available_minutes: 30,
      });
      expect(withUnknownKey.success).toBe(false);
    });

    it("enforces age boundary constraints (10 to 100)", () => {
      expect(profileUpdateSchema.safeParse({ age_years: 10 }).success).toBe(true);
      expect(profileUpdateSchema.safeParse({ age_years: 100 }).success).toBe(true);
      expect(profileUpdateSchema.safeParse({ age_years: 9 }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ age_years: 101 }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ age_years: 25.5 }).success).toBe(false);
    });

    it("enforces duration boundary constraints (5 to 120 minutes)", () => {
      expect(profileUpdateSchema.safeParse({ available_minutes: 5 }).success).toBe(true);
      expect(profileUpdateSchema.safeParse({ available_minutes: 120 }).success).toBe(true);
      expect(profileUpdateSchema.safeParse({ available_minutes: 4 }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ available_minutes: 121 }).success).toBe(false);
    });

    it("enforces time format boundaries (00:00 to 23:59)", () => {
      expect(profileUpdateSchema.safeParse({ morning_time: "00:00" }).success).toBe(true);
      expect(profileUpdateSchema.safeParse({ morning_time: "23:59" }).success).toBe(true);
      expect(profileUpdateSchema.safeParse({ morning_time: "24:00" }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ morning_time: "12:60" }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ morning_time: "7:00" }).success).toBe(false);
      expect(profileUpdateSchema.safeParse({ morning_time: "abc" }).success).toBe(false);
    });

    it("rejects unauthorized goals outside database constraint", () => {
      expect(
        profileUpdateSchema.safeParse({ goals: ["mobility", "posture"] }).success
      ).toBe(true);
      expect(
        profileUpdateSchema.safeParse({ goals: ["height_increase" as never] }).success
      ).toBe(false);
      expect(
        profileUpdateSchema.safeParse({ goals: [] }).success
      ).toBe(false);
    });

    it("validates body measurements and enforces boundary values", () => {
      expect(
        bodyMeasurementSchema.safeParse({ weight_kg: 70.5, height_cm: 175 }).success
      ).toBe(true);
      expect(bodyMeasurementSchema.safeParse({ weight_kg: 0.5 }).success).toBe(false);
      expect(bodyMeasurementSchema.safeParse({ weight_kg: 501 }).success).toBe(false);
      expect(bodyMeasurementSchema.safeParse({ height_cm: 29 }).success).toBe(false);
      expect(bodyMeasurementSchema.safeParse({ height_cm: 301 }).success).toBe(false);
      expect(bodyMeasurementSchema.safeParse({}).success).toBe(false); // empty rejected
    });
  });

  describe("src/lib/validation/routine.ts", () => {
    const validExerciseId = "22222222-2222-4222-8222-222222222222";
    const validExerciseId2 = "33333333-3333-4333-8333-333333333333";
    const validRoutineId = "44444444-4444-4444-8444-444444444444";

    it("validates single routine exercise prescriptions", () => {
      // Reps defined
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 3,
          prescribed_reps: 10,
        }).success
      ).toBe(true);

      // Duration defined
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 3,
          prescribed_duration_seconds: 30,
        }).success
      ).toBe(true);

      // Fails when neither reps nor duration defined
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 3,
        }).success
      ).toBe(false);
    });

    it("enforces routine exercise boundary values", () => {
      // Sets (1..20)
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 1,
          prescribed_reps: 10,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 20,
          prescribed_reps: 10,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 0,
          prescribed_reps: 10,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_sets: 21,
          prescribed_reps: 10,
        }).success
      ).toBe(false);

      // Reps (1..200)
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 1,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 200,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 0,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 201,
        }).success
      ).toBe(false);

      // Duration (5..3600)
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_duration_seconds: 5,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_duration_seconds: 3600,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_duration_seconds: 4,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_duration_seconds: 3601,
        }).success
      ).toBe(false);

      // Rest (0..600)
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 10,
          rest_seconds: 0,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 10,
          rest_seconds: 600,
        }).success
      ).toBe(true);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 10,
          rest_seconds: -1,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          exercise_id: validExerciseId,
          position: 1,
          prescribed_reps: 10,
          rest_seconds: 601,
        }).success
      ).toBe(false);
    });

    it("validates routine creation and rejects duplicate exercise positions", () => {
      const validPayload = {
        name: "Morning Posture Routine",
        session_type: "morning",
        estimated_minutes: 25,
        exercises: [
          {
            exercise_id: validExerciseId,
            position: 1,
            prescribed_sets: 2,
            prescribed_reps: 10,
          },
          {
            exercise_id: validExerciseId2,
            position: 2,
            prescribed_sets: 3,
            prescribed_duration_seconds: 45,
          },
        ],
      };
      expect(createRoutineSchema.safeParse(validPayload).success).toBe(true);

      // Duplicate position 1
      const duplicatePosition = {
        ...validPayload,
        exercises: [
          { ...validPayload.exercises[0], position: 1 },
          { ...validPayload.exercises[1], position: 1 },
        ],
      };
      expect(createRoutineSchema.safeParse(duplicatePosition).success).toBe(false);
    });

    it("strictly rejects client-supplied user_id in routine creation and updates", () => {
      expect(
        createRoutineSchema.safeParse({
          user_id: "any-user-id",
          name: "Test Routine",
          session_type: "morning",
          exercises: [
            {
              exercise_id: validExerciseId,
              position: 1,
              prescribed_reps: 10,
            },
          ],
        }).success
      ).toBe(false);

      expect(
        updateRoutineSchema.safeParse({
          id: validRoutineId,
          user_id: "any-user-id",
          name: "Updated Name",
        }).success
      ).toBe(false);
    });

    it("validates deterministic routine generation parameters", () => {
      expect(
        generateRoutineSchema.safeParse({
          session_type: "morning",
          available_minutes: 25,
          fitness_level: "intermediate",
          limitations: ["wrist discomfort"],
        }).success
      ).toBe(true);

      // Invalid duration
      expect(
        generateRoutineSchema.safeParse({
          session_type: "evening",
          available_minutes: 150,
        }).success
      ).toBe(false);

      // Rejects unknown keys
      expect(
        generateRoutineSchema.safeParse({
          session_type: "morning",
          user_id: "spoofed",
        }).success
      ).toBe(false);
    });
  });

  describe("src/lib/validation/workout.ts", () => {
    const validRoutineId = "55555555-5555-4555-8555-555555555555";
    const validSessionId = "66666666-6666-4666-8666-666666666666";
    const validSessionExerciseId = "77777777-7777-4777-8777-777777777777";
    const validSessionExerciseId2 = "88888888-8888-4888-8888-888888888888";

    it("validates starting a workout and strictly rejects user_id and snapshot tampering", () => {
      expect(
        startWorkoutSchema.safeParse({
          routine_id: validRoutineId,
          session_type: "morning",
        }).success
      ).toBe(true);

      expect(
        startWorkoutSchema.safeParse({
          routine_id: null,
          session_type: "evening",
        }).success
      ).toBe(true);

      // Rejects client user_id
      expect(
        startWorkoutSchema.safeParse({
          user_id: "spoofed-user-id",
          session_type: "morning",
        }).success
      ).toBe(false);

      // Rejects client tampering with started_at or plan_snapshot
      expect(
        startWorkoutSchema.safeParse({
          session_type: "morning",
          started_at: new Date().toISOString(),
          plan_snapshot: {},
        }).success
      ).toBe(false);
    });

    it("validates exercise result items and enforces boundary checks", () => {
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 3,
          completed_reps: 12,
          actual_duration_seconds: 45,
          notes: "Felt great spinal decompression",
        }).success
      ).toBe(true);

      // Completed sets boundary (0..20)
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: false,
          completed_sets: 0,
        }).success
      ).toBe(true);
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 20,
        }).success
      ).toBe(true);
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 21,
        }).success
      ).toBe(false);

      // Reps boundary (0..200)
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 1,
          completed_reps: 200,
        }).success
      ).toBe(true);
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 1,
          completed_reps: 201,
        }).success
      ).toBe(false);

      // Actual duration boundary (0..86400)
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 1,
          actual_duration_seconds: 86400,
        }).success
      ).toBe(true);
      expect(
        exerciseResultItemSchema.safeParse({
          session_exercise_id: validSessionExerciseId,
          completed: true,
          completed_sets: 1,
          actual_duration_seconds: 86401,
        }).success
      ).toBe(false);
    });

    it("validates complete workout submission and rejects duplicate exercise results", () => {
      const validCompletion = {
        session_id: validSessionId,
        duration_seconds: 1250,
        results: [
          {
            session_exercise_id: validSessionExerciseId,
            completed: true,
            completed_sets: 3,
            completed_reps: 10,
          },
          {
            session_exercise_id: validSessionExerciseId2,
            completed: true,
            completed_sets: 2,
            actual_duration_seconds: 60,
          },
        ],
      };
      expect(completeWorkoutSchema.safeParse(validCompletion).success).toBe(true);

      // Rejects duplicate session_exercise_id matching RPC duplicate prevention
      const duplicateExerciseResult = {
        ...validCompletion,
        results: [
          validCompletion.results[0],
          { ...validCompletion.results[0] },
        ],
      };
      expect(completeWorkoutSchema.safeParse(duplicateExerciseResult).success).toBe(
        false
      );

      // Rejects empty results
      expect(
        completeWorkoutSchema.safeParse({
          session_id: validSessionId,
          results: [],
        }).success
      ).toBe(false);

      // Rejects client user_id
      expect(
        completeWorkoutSchema.safeParse({
          ...validCompletion,
          user_id: "spoofed",
        }).success
      ).toBe(false);
    });

    it("validates workout cancellation and rejects non-uuid or user_id tampering", () => {
      expect(
        cancelWorkoutSchema.safeParse({ session_id: validSessionId }).success
      ).toBe(true);

      expect(
        cancelWorkoutSchema.safeParse({ session_id: "not-a-uuid" }).success
      ).toBe(false);

      expect(
        cancelWorkoutSchema.safeParse({
          session_id: validSessionId,
          user_id: "spoofed",
        }).success
      ).toBe(false);
    });
  });
});
