# LookFit — Product Requirements Document

## 1. Product Overview

A private, responsive web application for equipment-free home workouts, positioned as a **Lean Physique, Strength & Posture Fitness App**. It is designed around:
- **Lean Physique & Functional Strength**: Building an athletic, toned body with defined abs and balanced muscle development using progressive bodyweight exercises.
- **Morning Workout Sessions (20–30 minutes)**: Full-body strength and muscle development (push-ups, squats, lunges, glute and back-strengthening), targeted core and abs training, and posture/mobility activation calibrated to an intermediate level.
- **Evening Workout Sessions (15–25 minutes)**: Flexibility, spinal mobility, postural alignment, decompression, and restorative recovery, with optional short secondary core/strength routines (not exclusively stretching).
- **Spine Health & Posture Awareness**: Upper-back alignment, thoracic extension, and rotational mobility to counter sedentary desk work.
- **Habit Formation**: Daily tracking of restorative sleep, movement breaks, screen ergonomics, and balanced nutrition.

The application provides dual-session morning and evening scheduling, guided interactive exercise execution, immutable workout history, calendar visualization, streaks, and progress tracking.

## 2. Product Decisions

- **Platform**: Responsive web application; desktop and mobile browsers.
- **Framework**: Next.js App Router + TypeScript strict mode.
- **UI & Styling**: Tailwind CSS + shadcn/ui.
- **Backend**: Supabase PostgreSQL, Supabase Auth, and Row Level Security (RLS).
- **Validation**: Zod (v3).
- **Charts**: Recharts.
- **Testing**: Vitest + Playwright.
- **Architecture**: Single-owner default with multi-user-safe data isolation.
- **Fitness Level**: Intermediate by default; configurable.
- **Equipment**: Equipment-free home workouts.
- **User Profile Target**: Age 23 (configurable during onboarding; never hardcoded in engine). Gender is optional and not required or assumed.
- **Timezone**: IANA timezone, defaulting to the browser's detected timezone.
- **Primary Sessions**:
  - Morning (20–30 min): Full-body strength, core/abs, and posture activation.
  - Evening (15–25 min): Mobility, posture opening, recovery, and optional secondary core blocks.
- **Scope Exclusions**: No social feeds, no external AI coach, no meal plans, no paid paywalls.

## 3. Health, Safety and Height Restrictions

1. **Absolute Height Claim Prohibition**:
   - Never claim that exercises increase adult bone height or reopen closed growth plates.
   - Do not promise 1–2 cm of height restoration.
   - Accurately explain that posture awareness, spinal mobility, and back strengthening exercises help an individual stand straighter and more upright, but exercises cannot lengthen bones after growth plates close. Measured standing height changes are variable, individual, and not guaranteed.
2. **Medical Disclaimer**:
   - The app does not provide medical diagnoses, clinical assessments, or guaranteed treatment outcomes.
   - Users with existing neck, spinal, or disc conditions must consult a qualified healthcare professional before beginning.
3. **Pain Stopping Guidance**:
   - Users are explicitly instructed to stop immediately if they experience sharp pain, pinching, numbness, or dizziness.
   - Mild stretching tension and muscle fatigue are normal; joint, sharp spinal, or nerve pain is never acceptable.
4. **Hanging and Inversion Equipment**:
   - Inversion tables and bar hanging must never be default routine exercises.
   - Workouts remain completely equipment-free by default.

## 4. Goals

1. Deliver structured morning full-body strength/abs workouts and evening mobility/recovery workouts that are effortless to start and follow.
2. Build functional strength, core stability, and upper-back alignment through progressive bodyweight movements.
3. Provide clear setup steps, execution instructions, prescribed sets/repetitions, durations, and safety protocols.
4. Preserve completed workout history and exercise snapshots immutably.
5. Track consistency, completed sets/reps, exercise progression, and optional body measurements.
6. Support healthy posture and recovery habits through optional daily habit tracking.

## 5. Functional Requirements

### FR-01: Authentication and Private Access
- Sign in and sign out through Supabase Auth.
- Protect all private application routes in `(app)`.
- Validate ownership in every server action and database operation (`user_id = auth.uid()`).
- Enforce RLS on all user-owned tables.

### FR-02: Onboarding and Settings
- Collect required age (primary target: age 23) and fitness level (default: intermediate).
- Collect goals: lean athletic physique, defined abs & core, upper-back posture alignment, spinal mobility, functional lower body strength, flexibility & recovery.
- Collect known exercise limitations and exclusions.
- Collect optional gender (never mandatory).
- Collect available session duration (default: 20–30 min morning, 15–25 min evening).
- Save IANA timezone and schedule preferences.
- Present explicit medical disclaimer regarding exercise safety, upright stance, and spinal health.

### FR-03: Dashboard
- Display local date and concise greeting.
- Morning session card (20–30 min: Full-Body Strength + Core/Abs + Posture Activation).
- Evening session card (15–25 min: Spinal Mobility + Posture Work + Recovery / Optional Core).
- Session statuses: planned, in progress, completed, or skipped.
- Current streak and longest streak indicators.
- Weekly completion summary, tracking active days, sets completed, and training minutes.
- Direct action to start or resume an eligible session.

### FR-04: Exercise Library
Each exercise includes:
- Stable ID, slug, and name.
- Category: `strength`, `core` (abs & core), `push` (upper body), `pull` (back & posture), `legs` (lower body), `posture_spine`, `mobility`, `stretching`, `recovery`.
- Target muscle areas (Chest, Quads, Core/Abs, Upper Back, Glutes, Hamstrings, Thoracic Spine, Hip Flexors).
- Routine suitability tags: `morning`, `evening`, `both`.
- Difficulty: beginner, intermediate, advanced.
- Detailed instructions (setup, execution, breathing).
- Beginner modifications and regressions.
- Safety notes and pain warnings.
- Prescribed sets, repetitions, or hold durations with rest intervals.

### FR-05: Routines & Deterministic Planning
- **Morning Routine (20–30 min)**:
  1. Spinal & joint mobility warm-up (`cat-cow`, `thoracic-rotation`, `wall-angels`, `chin-tuck`).
  2. Core & abs activation (`forearm-plank`, `bird-dog`, `glute-bridge`, `dead-bug`).
  3. Bodyweight strength block (`push-up`, `bodyweight-squat`, `reverse-lunge`, `cobra-pose`).
  4. Short recovery cool-down.
- **Evening Routine (15–25 min)**:
  1. Spinal decompression & joint release (`child-pose`, `seated-spinal-twist`, `knees-to-chest`).
  2. Posture opening & static flexibility (`doorway-chest-stretch`, `hamstring-stretch`, `hip-flexor-stretch`, `pigeon-pose`).
  3. Restorative decompression or secondary core finisher (`sphinx-pose`, `legs-up-the-wall`, `deep-breathing`).
- Routine exercises have unique sequential positions. Editing a routine creates a new version and never alters past session snapshots.

### FR-06: Workout Player
- Interactive countdown and stopwatch timers with set & rep tracking.
- Actions: start, pause, resume, next, previous, skip, finish, and cancel.
- Clear visual display of instructions, target muscle groups, beginner modifications, and safety notes.
- Starting a workout creates immutable snapshots in `workout_sessions` and `session_exercises`.
- Completing a workout invokes the atomic `complete_workout_session` RPC function.

### FR-07: Calendar and History
- Local-time monthly calendar displaying completed and planned workout days.
- Selecting a date reveals historical snapshot details (exercises, sets/reps completed, duration).
- Historical views read exclusively from immutable snapshot records.

### FR-08: Streaks
- Calculated from distinct local dates where at least one session is `completed`.
- Completing both morning and evening sessions on the same calendar day counts as one active day.
- Timezone updates do not retroactively alter historical activity dates.

### FR-09: Progress Metrics
- Total completed workouts, sets and reps logged, active days, and workout minutes.
- Weekly and monthly category distributions (Strength & Abs, Posture & Spine, Mobility & Recovery).
- Optional body measurements (weight, waist notes, posture status).

### FR-10: Privacy and Data Ownership
- All user tables enforce RLS (`user_id = auth.uid()`).
- Composite foreign keys guarantee tenant boundary.
- Service-role credentials never enter client bundles.

### FR-11: Daily Habit Tracker
Support tracking of daily posture, recovery, and ergonomic habits:
- **Sleep Target**: 7–8 hours (support tissue repair and spinal decompression).
- **Movement Breaks**: Prompting movement every 45 minutes of prolonged sitting.
- **Ergonomic Alignment**: Screen positioned near eye level to counter forward head posture.
- **Balanced Nutrition**: Protein-containing nutrition supporting muscle recovery without restrictive dieting.
Habits are optional and trackable alongside workout routines.

## 6. Non-functional Requirements
- TypeScript strict mode with zero `any`.
- Mobile-first responsive design (375px+ touch targets $\ge 44\times 44$px).
- Loading (skeletons), empty, error, and success states on every data screen.
- Server-side authorization on every mutation; derive user ID from session.
- Repeatable unit test suites for planner, streaks, and validation schemas.
- Playwright E2E suites covering auth, routine generation, player, and calendar.

## 7. MVP Screens
1. `/dashboard`
2. `/workout/[id]`
3. `/exercises`
4. `/calendar`
5. `/progress`
6. `/settings`
7. `/routines`