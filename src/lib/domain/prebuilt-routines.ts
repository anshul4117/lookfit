/**
 * src/lib/domain/prebuilt-routines.ts
 *
 * Deterministic pre-built routine blueprints for LookFit.
 * Provides curated Morning and Evening routines calibrated for:
 * - Morning: Posture, spinal mobility, core stability, and lean bodyweight strength (20–30 min target).
 * - Evening: Gentle mobility, stretching, spinal decompression, and relaxation (15–25 min target).
 *
 * Health & Safety Rules:
 * - Exercises support posture alignment and decompression; no claims of adult height increase.
 * - All movements are equipment-free, with practical alternatives for wall/doorway exercises.
 * - Slugs strictly map to verified exercises in public.exercises.
 */

export interface PrebuiltExerciseBlueprint {
  slug: string;
  position: number;
  prescribedSets: number;
  prescribedReps: number | null;
  prescribedDurationSeconds: number | null;
  restSeconds: number;
  alternativeSlug?: string;
  alternativeName?: string;
}

export interface PrebuiltRoutineBlueprint {
  id: "prebuilt-morning" | "prebuilt-evening";
  name: string;
  sessionType: "morning" | "evening";
  estimatedMinutes: number;
  focus: string;
  description: string;
  exercises: PrebuiltExerciseBlueprint[];
}

export const PREBUILT_MORNING_ROUTINE: PrebuiltRoutineBlueprint = {
  id: "prebuilt-morning",
  name: "Morning Posture & Lean Strength",
  sessionType: "morning",
  estimatedMinutes: 25,
  focus: "Spinal Mobility, Core Stability & Functional Strength",
  description:
    "An invigorating 25-minute equipment-free sequence combining thoracic mobility, abdominal bracing, and functional bodyweight strength to counter desk slump and build a lean, upright physique.",
  exercises: [
    {
      slug: "cat-cow",
      position: 1,
      prescribedSets: 1,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 15,
    },
    {
      slug: "wall-angels",
      position: 2,
      prescribedSets: 2,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 30,
      alternativeSlug: "prone-w-raise",
      alternativeName: "Prone W Raise (Floor-Based Alternative)",
    },
    {
      slug: "chin-tuck",
      position: 3,
      prescribedSets: 2,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 20,
    },
    {
      slug: "bird-dog",
      position: 4,
      prescribedSets: 3,
      prescribedReps: 8,
      prescribedDurationSeconds: null,
      restSeconds: 30,
    },
    {
      slug: "glute-bridge",
      position: 5,
      prescribedSets: 3,
      prescribedReps: 15,
      prescribedDurationSeconds: null,
      restSeconds: 45,
    },
    {
      slug: "forearm-plank",
      position: 6,
      prescribedSets: 3,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 30,
    },
    {
      slug: "push-up",
      position: 7,
      prescribedSets: 3,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 45,
      alternativeSlug: "incline-knee-push-up",
      alternativeName: "Knee Push-Up (Beginner Regression)",
    },
    {
      slug: "bodyweight-squat",
      position: 8,
      prescribedSets: 3,
      prescribedReps: 15,
      prescribedDurationSeconds: null,
      restSeconds: 45,
    },
    {
      slug: "reverse-lunge",
      position: 9,
      prescribedSets: 3,
      prescribedReps: 10,
      prescribedDurationSeconds: null,
      restSeconds: 45,
    },
    {
      slug: "cobra-pose",
      position: 10,
      prescribedSets: 3,
      prescribedReps: null,
      prescribedDurationSeconds: 20,
      restSeconds: 30,
      alternativeSlug: "sphinx-pose",
      alternativeName: "Sphinx Pose (Gentler Extension)",
    },
    {
      slug: "deep-breathing",
      position: 11,
      prescribedSets: 1,
      prescribedReps: null,
      prescribedDurationSeconds: 120,
      restSeconds: 0,
    },
  ],
};

export const PREBUILT_EVENING_ROUTINE: PrebuiltRoutineBlueprint = {
  id: "prebuilt-evening",
  name: "Evening Spinal Mobility & Decompression",
  sessionType: "evening",
  estimatedMinutes: 20,
  focus: "Joint Release, Muscle Lengthening & Deep Relaxation",
  description:
    "A calming 20-minute recovery routine designed to release sitting tension, open tight chest and hip musculature, and decompress the spine before sleep.",
  exercises: [
    {
      slug: "child-pose",
      position: 1,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 45,
      restSeconds: 20,
    },
    {
      slug: "knees-to-chest",
      position: 2,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 40,
      restSeconds: 15,
    },
    {
      slug: "doorway-chest-stretch",
      position: 3,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 20,
      alternativeSlug: "doorway-free-chest-stretch",
      alternativeName: "Standing Chest Opener (Doorway-Free)",
    },
    {
      slug: "seated-spinal-twist",
      position: 4,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 20,
    },
    {
      slug: "sphinx-pose",
      position: 5,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 20,
    },
    {
      slug: "hamstring-stretch",
      position: 6,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 20,
    },
    {
      slug: "hip-flexor-stretch",
      position: 7,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 20,
    },
    {
      slug: "pigeon-pose",
      position: 8,
      prescribedSets: 2,
      prescribedReps: null,
      prescribedDurationSeconds: 30,
      restSeconds: 25,
      alternativeSlug: "figure-four-stretch",
      alternativeName: "Supine Figure-Four Stretch (Knee-Friendly)",
    },
    {
      slug: "legs-up-the-wall",
      position: 9,
      prescribedSets: 1,
      prescribedReps: null,
      prescribedDurationSeconds: 120,
      restSeconds: 0,
    },
    {
      slug: "deep-breathing",
      position: 10,
      prescribedSets: 1,
      prescribedReps: null,
      prescribedDurationSeconds: 120,
      restSeconds: 0,
    },
  ],
};

export const PREBUILT_ROUTINES: PrebuiltRoutineBlueprint[] = [
  PREBUILT_MORNING_ROUTINE,
  PREBUILT_EVENING_ROUTINE,
];

export function getPrebuiltBlueprint(
  sessionType: "morning" | "evening"
): PrebuiltRoutineBlueprint {
  return sessionType === "morning"
    ? PREBUILT_MORNING_ROUTINE
    : PREBUILT_EVENING_ROUTINE;
}
