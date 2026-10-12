# LookFit — Product Requirements Document

## 1. Product Overview

A private, responsive web application for home workouts without equipment, positioned as a **Posture & Mobility Fitness App**. It is designed around:
- Posture awareness and upper-back alignment.
- Spine mobility, thoracic extension, and gentle rotational flexibility.
- General lean strength and core stability (anti-extension and lateral endurance).
- Morning activation routines (20–30 minutes) combining mobility, posture, and bodyweight strength.
- Evening stretching and relaxation routines (15–25 minutes) focused on down-regulation and decompression.
- Daily habit tracking that supports healthy workplace ergonomics, posture, and recovery.

The application provides separate morning and evening sessions, guided exercise execution, workout history, a calendar, streaks, and progress tracking.

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
- **Equipment**: Equipment-free by default.
- **User Profile Target**: Age 23 (configurable during onboarding; never hardcoded in engine). Gender is optional and not required or assumed.
- **Timezone**: IANA timezone, defaulting to the browser's detected timezone.
- **Primary Sessions**: Morning (Activation + Posture + Strength) and Evening (Mobility + Stretching + Relaxation).
- **Scope Exclusions**: No social feeds, no external AI coach, no meal plans, no paid paywalls.

## 3. Health, Safety and Height Restrictions

1. **Absolute Height Claim Prohibition**:
   - Never claim that exercises increase adult bone height or reopen closed growth plates.
   - Do not promise 1–2 cm of height restoration.
   - Accurately explain that posture awareness and spinal decompression exercises may help an individual stand more upright, but measured standing height changes are variable, individual, and not guaranteed.
2. **Medical Disclaimer**:
   - The app does not provide medical diagnoses, clinical assessments, or guaranteed treatment outcomes.
   - Users with existing neck, spinal, or disc conditions must consult a qualified healthcare professional before beginning.
3. **Pain Stopping Guidance**:
   - Users are explicitly instructed to stop immediately if they experience sharp pain, pinching, numbness, or dizziness.
   - Mild stretching tension in muscles is normal, but joint or nerve pain is never acceptable.
4. **Hanging and Inversion Equipment**:
   - Inversion tables and bar hanging must never be default routine exercises.
   - If supported in advanced catalog filters, they must remain strictly optional, carry explicit cautionary disclaimers, and be easy to disable.

## 4. Goals

1. Make today's morning and evening sessions effortless to start, guide, and complete.
2. Provide clear setup steps, execution instructions, repetitions, durations, and safety notes.
3. Preserve completed workout history when routines change.
4. Make consistency understandable through local-time calendar, streaks, and summaries.
5. Generate predictable routines from explicit, testable, deterministic rules.
6. Support daily workplace posture and wellness habits through optional tracking.

## 5. Functional Requirements

### FR-01: Authentication and Private Access
- Sign in and sign out through Supabase Auth.
- Protect all private application routes in `(app)`.
- Validate ownership in every server action and database operation (`user_id = auth.uid()`).
- Enforce RLS on all user-owned tables.

### FR-02: Onboarding and Settings
- Collect required age (primary target: age 23) and fitness level.
- Collect goals: posture, mobility, strength, flexibility, cardio, general fitness.
- Collect known exercise limitations and exclusions.
- Collect optional gender (never mandatory).
- Collect available session duration (default: 20–30 min morning, 15–25 min evening).
- Save IANA timezone and schedule preferences.
- Present explicit medical disclaimer regarding exercise safety and spinal health.

### FR-03: Dashboard
- Display local date and concise greeting.
- Morning session card (20–30 min: Activation + Posture + Strength).
- Evening session card (15–25 min: Gentle Mobility + Stretching + Relaxation).
- Session statuses: planned, in progress, completed, or skipped.
- Current streak and longest streak indicators.
- Weekly completion summary.
- Direct action to start or resume an eligible session.

### FR-04: Exercise Library
Each exercise includes:
- Stable ID, slug, and name.
- Category: `posture_spine`, `mobility`, `stretching`, `core`, `push`, `pull`, `legs`, `cardio`.
- Target areas and goal tags.
- Routine suitability tags: `morning`, `evening`, `both`.
- Difficulty: beginner, intermediate, advanced.
- Detailed instructions (setup, execution, breathing).
- Beginner modifications and regressions.
- Safety notes and pain warnings.
- Prescribed sets, repetitions, or duration with rest intervals.

### FR-05: Routines & Deterministic Planning
- Morning Routine (20–30 min):
  1. Spinal & joint mobility warm-up (`cat-cow`, `thoracic-rotation`, `wall-angels`, `chin-tuck`).
  2. Posture activation & core stability (`cobra-pose`, `bird-dog`, `forearm-plank`, `glute-bridge`).
  3. Strength & conditioning block (`push-up`, `bodyweight-squat`, `reverse-lunge`, optional `mock-skipping`).
  4. Short cool-down.
- Evening Routine (15–25 min):
  1. Gentle mobility & spinal release (`child-pose`, `seated-spinal-twist`, `knees-to-chest`).
  2. Static flexibility & posture opening (`doorway-chest-stretch`, `hamstring-stretch`, `hip-flexor-stretch`, `pigeon-pose` or `figure-four-stretch`).
  3. Passive restoration & decompression (`sphinx-pose`, `legs-up-the-wall`, `deep-breathing`).
- Routine exercises have unique sequential positions. Editing a routine creates a new version and never alters past session snapshots.

### FR-06: Workout Player
- Interactive countdown and stopwatch timers.
- Actions: start, pause, resume, next, previous, skip, finish, and cancel.
- Clear visual display of instructions, beginner modifications, and safety notes.
- Starting a workout creates immutable snapshots in `workout_sessions` and `session_exercises`.
- Completing a workout invokes the atomic `complete_workout_session` RPC function.

### FR-07: Calendar and History
- Local-time monthly calendar displaying completed and planned days.
- Selecting a date reveals historical snapshot details (exercises, actual performance, duration).
- Historical views read exclusively from immutable snapshot records.

### FR-08: Streaks
- Calculated from distinct local dates where at least one session is `completed`.
- Completing both morning and evening sessions on the same calendar day counts as one active day.
- Timezone updates do not retroactively alter historical activity dates.

### FR-09: Progress Metrics
- Total completed sessions, active days, and workout minutes.
- Weekly and monthly completion charts.
- Optional body measurements (weight, height, notes) strictly optional.

### FR-10: Privacy and Data Ownership
- All user tables enforce RLS (`user_id = auth.uid()`).
- Composite foreign keys guarantee tenant boundary.
- Service-role credentials never enter client bundles.

### FR-11: Daily Habit Tracker (Planned)
Support tracking of daily posture, recovery, and ergonomic habits:
- **Sleep Target**: 7–8 hours (presented as a general wellness target, not medical prescription).
- **Movement Breaks**: Prompting movement approximately every 45 minutes of prolonged sitting.
- **Ergonomic Alignment**: Screen positioned near eye level to counter forward head posture.
- **Balanced Nutrition**: Protein-containing, balanced nutrition without restrictive diet prescriptions.
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