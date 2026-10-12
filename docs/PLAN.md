# LookFit — Deterministic Posture & Mobility Workout Planner

## 1. Purpose

Generate reproducible, safe, and balanced morning and evening routines from the user's saved profile, physical limitations, and curated exercise catalog. The planner is a pure, deterministic function requiring no external AI or black-box recommendation service.

## 2. Inputs

Required:
- **Age in years**: Configured during onboarding (primary target: age 23).
- **Fitness level**: Beginner, intermediate, or advanced.
- **Goals**: One or more supported goals (posture, mobility, strength, flexibility, cardio, general fitness).
- **Available minutes per session**:
  - Morning default: 20–30 minutes.
  - Evening default: 15–25 minutes.
- **Limitations and exclusions**: Joint sensitivities, past injuries, movement contraindications.
- **Gender**: Optional; never assumed or required.

Additional inputs:
- Session type: `morning` or `evening`.
- Active exercise catalog (with `category`, `routine_tags`, `goal_tags`, `difficulty`).
- Recent completed sessions and performance load.
- Existing routine version.

## 3. Planner Contract

Implemented in `src/lib/planner.ts`.

```typescript
export interface PlannerInput {
  profile: ValidatedProfile;
  sessionType: 'morning' | 'evening';
  catalog: ExerciseCatalogItem[];
  recentSessions: CompletedSessionSummary[];
  currentRoutineVersion?: number;
}

export interface PlannerOutput {
  routineName: string;
  plannerVersion: string;
  sessionType: 'morning' | 'evening';
  exercises: PrescribedRoutineExercise[];
  estimatedMinutes: number;
  selectionReasons: string[];
}
```

The planner must be a pure function. Database reads and writes belong strictly in the service layer. Identical normalized inputs must always produce identical outputs.

## 4. Eligibility & Safety Rules

Reject an exercise when:
1. It is marked inactive (`is_active = false`).
2. It requires equipment when the user's profile specifies equipment-free.
3. Its `routine_tags` do not match the requested session type:
   - Morning sessions require exercises tagged `'morning'` or `'both'`.
   - Evening sessions require exercises tagged `'evening'` or `'both'`.
4. It conflicts with an explicit user exclusion or joint limitation (e.g., knee discomfort excludes deep lunges).
5. It exceeds the user's configured difficulty ceiling.
6. It belongs to restricted categories (e.g. hanging or inversion must **never** be included in default routines; if ever supported, they must be strictly opt-in and cautionary).
7. Required prescription targets are missing.

### Health, Safety & Ethics Boundaries:
- **Height-Claim Restrictions**: Never promise height increases, growth plate reopening, or 1–2 cm height restoration. Explain that posture alignment may help upright stance, but measured standing height changes are variable and not guaranteed.
- **Pain vs. Tension**: Exercise instructions must emphasize that mild stretching tension is normal, but sharp pain or joint pinching requires immediate cessation.
- **Pre-existing Conditions**: Users with chronic spinal or cervical pain must be directed to consult healthcare professionals.
- **Bird-Dog vs. Superman**: Prefer `bird-dog` over `superman` as a lower-shear spinal stability default. Provide beginner modifications for all compound movements.

## 5. Session Construction Templates

### Morning Routine: 20–30 Minutes (Activation + Posture + Strength)
Designed to awaken the nervous system, align the spine, and activate posture muscles for the day:
1. **Spine & Joint Mobility (4–6 min)**:
   - `cat-cow` (10 reps)
   - `thoracic-rotation` (2 × 8 reps) or `thoracic-extension` (2 × 8 reps)
   - `wall-angels` (2 × 10 reps)
2. **Posture Activation & Core Stability (6–8 min)**:
   - `chin-tuck` (2 × 10 reps, 5-second holds)
   - `cobra-pose` (3 × 20 seconds) or `sphinx-pose` (gentle alternative)
   - `glute-bridge` (3 × 15 reps)
   - `bird-dog` (3 × 10 reps) or `superman` (controlled hold)
   - `forearm-plank` (3 × 30–45 seconds)
3. **Strength & Conditioning Block (8–12 min)**:
   - `push-up` (3 × 10–15 reps; regression: `incline-knee-push-up`)
   - `bodyweight-squat` (3 × 10–15 reps)
   - `reverse-lunge` (3 × 10–15 reps per leg)
   - Optional cardio: `mock-skipping` (3 × 1 min) or `march-in-place` (if fitness level is appropriate)
4. **Cool-down / Centering (2 min)**:
   - Standing posture reset or `deep-breathing`.

### Evening Routine: 15–25 Minutes (Gentle Mobility + Stretching + Relaxation)
Designed to decompress the spine, release postural tension from sitting, and promote sleep readiness:
1. **Gentle Spinal Release & Mobility (4–6 min)**:
   - `child-pose` (2 × 40 seconds)
   - `seated-spinal-twist` (2 × 30 seconds per side)
   - `knees-to-chest` (2 × 30 seconds)
2. **Static Flexibility & Posture Opening (7–10 min)**:
   - `doorway-chest-stretch` (2 × 30 seconds)
   - `hamstring-stretch` (2 × 30 seconds per side)
   - `hip-flexor-stretch` (2 × 30 seconds per side)
   - `pigeon-pose` (2 × 30 seconds per side; gentler alternative: `figure-four-stretch`)
3. **Passive Restoration & Decompression (4–6 min)**:
   - `sphinx-pose` (2 × 30 seconds)
   - `legs-up-the-wall` (1 × 2–3 minutes)
   - `deep-breathing` (1 × 2 minutes)

## 6. Weekly Movement Balance & Overload

- **Schedule Structure**: Seven-day deterministic schedule balancing strength activation days with recovery and mobility days.
- **Progressive Overload Rules**:
  - Only progress when the last 2 consecutive exposures were completed with good form and zero reported pain.
  - Adjust one variable at a time (e.g. +1 repetition or +5 seconds duration).
  - If discomfort or fatigue is reported, hold the prescription or offer a regression.
  - Never alter historical session snapshots; store changes in future routine versions.

## 7. Daily Habit Tracking Integration (Planned)

Alongside morning and evening workouts, the planner coordinates with the planned habit tracker:
1. **Sleep**: 7–8 hours wellness target to support tissue recovery and postural muscle tone.
2. **Movement Breaks**: 1–2 minute posture breaks every 45 minutes of sustained sitting.
3. **Ergonomic Eye-Level Screens**: Visual reminders to keep workstation screens aligned with eye level.
4. **Balanced Nutrition**: Protein-containing balanced meals supporting muscle recovery.

## 8. Unit Testing Requirements

Planner test suites in `tests/unit/planner.test.ts` must cover:
- Age 23 default handling and custom age validation.
- Filtering by `routine_tags` (`morning` vs. `evening`).
- Inclusion of `posture_spine` category exercises.
- Exclusion of equipment-requiring or contraindicated exercises.
- Enforcement of duration limits (20–30 min morning, 15–25 min evening).
- Fallback to beginner modifications (e.g. `figure-four-stretch` when `pigeon-pose` is excluded).
- Typed `NO_SAFE_PLAN` error generation when constraints prevent safe routine assembly.