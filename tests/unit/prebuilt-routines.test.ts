import { describe, expect, it } from "vitest";
import {
  PREBUILT_MORNING_ROUTINE,
  PREBUILT_EVENING_ROUTINE,
  PREBUILT_ROUTINES,
  getPrebuiltBlueprint,
} from "@/lib/domain/prebuilt-routines";

// Verified catalog of slugs from seed.sql
const VERIFIED_CATALOG_SLUGS = new Set([
  "cat-cow",
  "cobra-pose",
  "sphinx-pose",
  "wall-angels",
  "chin-tuck",
  "thoracic-extension",
  "seated-spinal-twist",
  "superman",
  "deep-breathing",
  "thoracic-rotation",
  "arm-circles",
  "shoulder-rolls",
  "wrist-circles",
  "ankle-circles",
  "worlds-greatest-stretch",
  "standing-hip-circles",
  "child-pose",
  "hamstring-stretch",
  "hip-flexor-stretch",
  "pigeon-pose",
  "figure-four-stretch",
  "doorway-chest-stretch",
  "doorway-free-chest-stretch",
  "knees-to-chest",
  "legs-up-the-wall",
  "calf-stretch",
  "quad-stretch",
  "seated-forward-fold",
  "neck-side-stretch",
  "bird-dog",
  "forearm-plank",
  "dead-bug",
  "side-plank",
  "reverse-crunch",
  "hollow-body-hold",
  "bicycle-crunch",
  "lying-leg-raises",
  "push-up",
  "incline-knee-push-up",
  "scapular-push-up",
  "pike-push-up",
  "self-resisted-row",
  "prone-elbow-pullback",
  "prone-w-raise",
  "prone-y-raise",
  "doorframe-isometric-row",
  "bodyweight-squat",
  "reverse-lunge",
  "glute-bridge",
  "split-squat",
  "calf-raise",
  "wall-sit",
  "mock-skipping",
  "march-in-place",
  "low-impact-jumping-jacks",
  "high-knees",
  "mountain-climber",
  "burpee-step-back",
]);

describe("LookFit Pre-built Workout Plan Blueprints", () => {
  describe("Morning Routine Blueprint", () => {
    it("meets target duration of 20–30 minutes", () => {
      expect(PREBUILT_MORNING_ROUTINE.estimatedMinutes).toBeGreaterThanOrEqual(20);
      expect(PREBUILT_MORNING_ROUTINE.estimatedMinutes).toBeLessThanOrEqual(30);
      expect(PREBUILT_MORNING_ROUTINE.sessionType).toBe("morning");
    });

    it("references only valid catalog slugs and valid alternative slugs", () => {
      for (const ex of PREBUILT_MORNING_ROUTINE.exercises) {
        expect(
          VERIFIED_CATALOG_SLUGS.has(ex.slug),
          `Exercise slug "${ex.slug}" must exist in catalog`
        ).toBe(true);

        if (ex.alternativeSlug) {
          expect(
            VERIFIED_CATALOG_SLUGS.has(ex.alternativeSlug),
            `Alternative slug "${ex.alternativeSlug}" must exist in catalog`
          ).toBe(true);
        }
      }
    });

    it("maintains strictly sequential 1-indexed exercise ordering", () => {
      PREBUILT_MORNING_ROUTINE.exercises.forEach((ex, idx) => {
        expect(ex.position).toBe(idx + 1);
        expect(ex.prescribedSets).toBeGreaterThanOrEqual(1);
        expect(ex.restSeconds).toBeGreaterThanOrEqual(0);
        // Each exercise has either reps or duration
        const hasRepsOrDuration =
          (ex.prescribedReps !== null && ex.prescribedReps > 0) ||
          (ex.prescribedDurationSeconds !== null && ex.prescribedDurationSeconds > 0);
        expect(hasRepsOrDuration).toBe(true);
      });
    });

    it("sequences correctly: spinal mobility -> activation -> core -> strength -> cooldown", () => {
      const slugs = PREBUILT_MORNING_ROUTINE.exercises.map((e) => e.slug);
      // Spinal mobilization first
      expect(slugs[0]).toBe("cat-cow");
      // Postural cues early
      expect(slugs.slice(1, 3)).toEqual(["wall-angels", "chin-tuck"]);
      // Core stability & posterior chain
      expect(slugs.slice(3, 6)).toEqual(["bird-dog", "glute-bridge", "forearm-plank"]);
      // Lean strength
      expect(slugs.slice(6, 9)).toEqual(["push-up", "bodyweight-squat", "reverse-lunge"]);
      // Back extension & breathing finish
      expect(slugs[slugs.length - 2]).toBe("cobra-pose");
      expect(slugs[slugs.length - 1]).toBe("deep-breathing");
    });

    it("strictly avoids adult height-increase claims in descriptions or focus", () => {
      const text = `${PREBUILT_MORNING_ROUTINE.name} ${PREBUILT_MORNING_ROUTINE.focus} ${PREBUILT_MORNING_ROUTINE.description}`.toLowerCase();
      expect(text).not.toContain("increase height");
      expect(text).not.toContain("grow taller");
      expect(text).not.toContain("growth plate");
      expect(text).not.toContain("height restoration");
      expect(text).toContain("posture");
    });
  });

  describe("Evening Routine Blueprint", () => {
    it("meets target duration of 15–25 minutes", () => {
      expect(PREBUILT_EVENING_ROUTINE.estimatedMinutes).toBeGreaterThanOrEqual(15);
      expect(PREBUILT_EVENING_ROUTINE.estimatedMinutes).toBeLessThanOrEqual(25);
      expect(PREBUILT_EVENING_ROUTINE.sessionType).toBe("evening");
    });

    it("references only valid catalog slugs and valid alternative slugs", () => {
      for (const ex of PREBUILT_EVENING_ROUTINE.exercises) {
        expect(
          VERIFIED_CATALOG_SLUGS.has(ex.slug),
          `Exercise slug "${ex.slug}" must exist in catalog`
        ).toBe(true);

        if (ex.alternativeSlug) {
          expect(
            VERIFIED_CATALOG_SLUGS.has(ex.alternativeSlug),
            `Alternative slug "${ex.alternativeSlug}" must exist in catalog`
          ).toBe(true);
        }
      }
    });

    it("maintains strictly sequential 1-indexed exercise ordering", () => {
      PREBUILT_EVENING_ROUTINE.exercises.forEach((ex, idx) => {
        expect(ex.position).toBe(idx + 1);
        expect(ex.prescribedSets).toBeGreaterThanOrEqual(1);
        expect(ex.restSeconds).toBeGreaterThanOrEqual(0);
        const hasRepsOrDuration =
          (ex.prescribedReps !== null && ex.prescribedReps > 0) ||
          (ex.prescribedDurationSeconds !== null && ex.prescribedDurationSeconds > 0);
        expect(hasRepsOrDuration).toBe(true);
      });
    });

    it("is restorative and recovery-focused: avoids high-intensity strength movements", () => {
      const slugs = PREBUILT_EVENING_ROUTINE.exercises.map((e) => e.slug);
      // Recovery & decompression starts
      expect(slugs[0]).toBe("child-pose");
      expect(slugs[1]).toBe("knees-to-chest");
      // Gentle opening & gentle prone extension
      expect(slugs).toContain("doorway-chest-stretch");
      expect(slugs).toContain("seated-spinal-twist");
      expect(slugs).toContain("sphinx-pose");
      // Relaxation finish
      expect(slugs[slugs.length - 2]).toBe("legs-up-the-wall");
      expect(slugs[slugs.length - 1]).toBe("deep-breathing");

      // Verify no high-intensity movements
      expect(slugs).not.toContain("push-up");
      expect(slugs).not.toContain("burpee-step-back");
      expect(slugs).not.toContain("mountain-climber");
      expect(slugs).not.toContain("high-knees");
    });

    it("strictly avoids adult height-increase claims in descriptions or focus", () => {
      const text = `${PREBUILT_EVENING_ROUTINE.name} ${PREBUILT_EVENING_ROUTINE.focus} ${PREBUILT_EVENING_ROUTINE.description}`.toLowerCase();
      expect(text).not.toContain("increase height");
      expect(text).not.toContain("grow taller");
      expect(text).not.toContain("growth plate");
      expect(text).not.toContain("height restoration");
      expect(text).toContain("decompression");
    });
  });

  describe("Helper Functions", () => {
    it("getPrebuiltBlueprint returns the appropriate blueprint by session type", () => {
      expect(getPrebuiltBlueprint("morning")).toBe(PREBUILT_MORNING_ROUTINE);
      expect(getPrebuiltBlueprint("evening")).toBe(PREBUILT_EVENING_ROUTINE);
    });

    it("PREBUILT_ROUTINES contains both morning and evening blueprints", () => {
      expect(PREBUILT_ROUTINES).toHaveLength(2);
      expect(PREBUILT_ROUTINES.map((r) => r.sessionType)).toEqual(["morning", "evening"]);
    });
  });
});
