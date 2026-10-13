import { describe, expect, it } from "vitest";
import {
  createRoutineSchema,
  updateRoutineSchema,
  archiveRoutineSchema,
  routineExerciseItemSchema,
} from "@/lib/validation/routine";

describe("T10: Routine Validation Schemas", () => {
  const validExerciseItem = {
    exercise_id: "00000000-0000-0000-0000-000000000001",
    position: 1,
    prescribed_sets: 3,
    prescribed_reps: 10,
    prescribed_duration_seconds: null,
    rest_seconds: 30,
  };

  describe("routineExerciseItemSchema", () => {
    it("accepts a valid reps-based exercise item", () => {
      const result = routineExerciseItemSchema.safeParse(validExerciseItem);
      expect(result.success).toBe(true);
    });

    it("accepts a valid duration-based exercise item", () => {
      const result = routineExerciseItemSchema.safeParse({
        exercise_id: "00000000-0000-0000-0000-000000000002",
        position: 2,
        prescribed_sets: 2,
        prescribed_reps: null,
        prescribed_duration_seconds: 45,
        rest_seconds: 15,
      });
      expect(result.success).toBe(true);
    });

    it("rejects an item missing both reps and duration", () => {
      const result = routineExerciseItemSchema.safeParse({
        exercise_id: "00000000-0000-0000-0000-000000000001",
        position: 1,
        prescribed_sets: 2,
        prescribed_reps: null,
        prescribed_duration_seconds: null,
        rest_seconds: 30,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(
          /either prescribed reps or duration/i
        );
      }
    });

    it("rejects non-positive position numbers", () => {
      const result = routineExerciseItemSchema.safeParse({
        ...validExerciseItem,
        position: 0,
      });
      expect(result.success).toBe(false);
    });

    it("enforces sets bounds (1 to 20)", () => {
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          prescribed_sets: 0,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          prescribed_sets: 21,
        }).success
      ).toBe(false);
    });

    it("enforces reps bounds (1 to 200)", () => {
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          prescribed_reps: 0,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          prescribed_reps: 201,
        }).success
      ).toBe(false);
    });

    it("enforces duration bounds (5 to 3600 seconds)", () => {
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          prescribed_reps: null,
          prescribed_duration_seconds: 4,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          prescribed_reps: null,
          prescribed_duration_seconds: 3601,
        }).success
      ).toBe(false);
    });

    it("enforces rest bounds (0 to 600 seconds)", () => {
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          rest_seconds: -1,
        }).success
      ).toBe(false);
      expect(
        routineExerciseItemSchema.safeParse({
          ...validExerciseItem,
          rest_seconds: 601,
        }).success
      ).toBe(false);
    });
  });

  describe("createRoutineSchema & Position Uniqueness", () => {
    it("accepts a valid routine payload with unique positions", () => {
      const result = createRoutineSchema.safeParse({
        name: "Morning Posture Routine",
        session_type: "morning",
        estimated_minutes: 25,
        status: "active",
        exercises: [
          validExerciseItem,
          {
            exercise_id: "00000000-0000-0000-0000-000000000002",
            position: 2,
            prescribed_sets: 3,
            prescribed_reps: 12,
            rest_seconds: 30,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects a routine payload with duplicate exercise positions", () => {
      const result = createRoutineSchema.safeParse({
        name: "Morning Posture Routine",
        session_type: "morning",
        estimated_minutes: 25,
        exercises: [
          validExerciseItem,
          {
            exercise_id: "00000000-0000-0000-0000-000000000002",
            position: 1, // Duplicate position!
            prescribed_sets: 3,
            prescribed_reps: 12,
            rest_seconds: 30,
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(
          /unique position number/i
        );
      }
    });

    it("rejects an empty exercise array", () => {
      const result = createRoutineSchema.safeParse({
        name: "Empty Routine",
        session_type: "morning",
        estimated_minutes: 20,
        exercises: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects client attempts to inject user_id or version into create payload", () => {
      const result = createRoutineSchema.safeParse({
        name: "Routine",
        session_type: "morning",
        user_id: "malicious-user-id",
        version: 99,
        exercises: [validExerciseItem],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateRoutineSchema", () => {
    it("validates routine ID format and updates", () => {
      const result = updateRoutineSchema.safeParse({
        id: "00000000-0000-0000-0000-000000000010",
        name: "Updated Name",
        estimated_minutes: 30,
        exercises: [validExerciseItem],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID for routine id", () => {
      const result = updateRoutineSchema.safeParse({
        id: "not-a-valid-uuid",
        name: "Updated Name",
      });
      expect(result.success).toBe(false);
    });

    it("rejects duplicate positions in update payload", () => {
      const result = updateRoutineSchema.safeParse({
        id: "00000000-0000-0000-0000-000000000010",
        exercises: [
          validExerciseItem,
          {
            ...validExerciseItem,
            exercise_id: "00000000-0000-0000-0000-000000000002",
            position: 1, // Duplicate position
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("archiveRoutineSchema", () => {
    it("accepts valid archive payload with UUID", () => {
      expect(
        archiveRoutineSchema.safeParse({
          id: "00000000-0000-0000-0000-000000000010",
        }).success
      ).toBe(true);
    });

    it("rejects invalid UUID in archive payload", () => {
      expect(
        archiveRoutineSchema.safeParse({
          id: "invalid-id",
        }).success
      ).toBe(false);
    });
  });
});
