# Implementation Tasks

## T01 — Initialize the project

Goal:
Create the Next.js App Router project with strict TypeScript, Tailwind,
shadcn/ui, Vitest, and Playwright.

Files:
- package.json
- tsconfig.json
- next.config.ts
- src/app/layout.tsx
- src/app/page.tsx
- tests/

Acceptance:
- Development server starts.
- Strict type checking is enabled.
- A sample component renders.
- Vitest and Playwright can execute a smoke test.

Test:
- npm run dev
- npm run typecheck
- npm run test
- npm run build

## T02 — Add project rules

Goal:
Create the Antigravity agent instructions.

Files:
- AGENTS.md
- .agent/rules/00-project.md
- .agent/rules/01-code-style.md
- .agent/rules/02-database.md
- .agent/rules/03-security.md
- .agent/rules/04-ui-ux.md
- .agent/rules/05-health-safety.md
- .agent/workflows/new-feature.md
- .agent/workflows/add-migration.md
- .agent/workflows/verify.md

Acceptance:
- Rules prohibit `any`, client secrets, unsafe database access, and height claims.
- Workflow instructions require tests and verification.
- Database instructions prohibit editing applied migrations.

Test:
- Review each rule and run the verify workflow against the starter project.

## T03 — Configure Supabase clients

Goal:
Support safe browser and server Supabase access.

Files:
- .env.example
- src/lib/supabase/client.ts
- src/lib/supabase/server.ts
- src/lib/supabase/middleware.ts
- middleware.ts or the supported Next.js proxy equivalent
- package.json

Acceptance:
- Environment variables are validated.
- Server client uses the authenticated user's cookies/session.
- Service-role secrets cannot enter client bundles.
- Protected routes redirect unauthenticated users.

Test:
- Missing environment variable produces a clear startup error.
- Unauthenticated Playwright navigation is redirected.
- Typecheck and build pass.

## T04 — Create database schema

Goal:
Apply initial schema, audit hardening, taxonomy extensions, and seed catalog.

Files:
- supabase/migrations/0001_init.sql
- supabase/migrations/0002_security_audit_fixes.sql
- supabase/migrations/0003_posture_spine_and_routine_tags.sql
- supabase/seed.sql
- docs/ARCHITECTURE.md

Acceptance:
- All tables, constraints, triggers, and RLS policies exist.
- Exercise catalog supports `posture_spine` category and `routine_tags` (`morning`, `evening`, `both`).
- Every user-owned table has user_id and RLS.
- Exercise catalog is readable by authenticated users.
- Seed is idempotent (`ON CONFLICT (slug) DO UPDATE`) and seeds 53 posture/mobility exercises.

Test:
- Start local Supabase instance.
- Apply migrations and seed.
- Inspect constraints, enums, indexes, and policies.
- Test cross-user access isolation.

## T05 — Add validation and error contracts

Goal:
Establish shared input validation and typed action results.

Files:
- src/lib/validation/profile.ts
- src/lib/validation/routine.ts
- src/lib/validation/workout.ts
- src/lib/errors.ts
- tests/unit/validation.test.ts

Acceptance:
- Invalid values fail before database writes.
- Unknown keys are handled deliberately.
- User-facing errors are sanitized.
- No server action trusts a client-supplied user ID.

Test:
- Vitest covers valid, invalid, missing, and boundary inputs.

## T06 — Authentication UI

Goal:
Implement sign-in, sign-out, and protected application layouts.

Files:
- src/app/(auth)/*
- src/app/(app)/layout.tsx
- src/components/features/auth/*
- src/server/actions/auth.ts

Acceptance:
- Users can sign in and sign out.
- Private pages require an authenticated session.
- Sign-out does not leave private data visible.
- Error and loading states are accessible.

Test:
- Playwright covers successful login, invalid login, logout, and route guards.

## T07 — Onboarding and settings persistence

Goal:
Collect Posture & Mobility profile preferences and save them to Supabase.

Files:
- src/app/(app)/settings/*
- src/components/features/settings/*
- src/server/actions/profile.ts
- src/server/queries/profile.ts
- src/lib/validation/profile.ts

Acceptance:
- Primary age target 23 validated; gender strictly optional.
- Posture, mobility, and spine health goals supported.
- Medical disclaimer presented regarding spinal conditions and sharp pain.
- Timezone is saved as an IANA identifier.
- Preferences remain after refresh.
- Incomplete onboarding cannot generate a plan.

Test:
- Vitest validates boundary cases.
- Playwright completes onboarding and verifies persistence.

## T08 — Exercise library

Goal:
Render searchable, filterable posture and mobility exercise content.

Files:
- src/app/(app)/exercises/*
- src/components/features/exercises/*
- src/server/queries/exercises.ts
- src/lib/validation/exercise-filters.ts

Acceptance:
- Category filters include `posture_spine`, `mobility`, `stretching`, etc.
- Routine suitability filters (`morning`, `evening`, `both`) work correctly.
- Instructions, beginner modifications, and safety notes are clearly visible.
- Missing media has a graceful fallback.
- Catalog editing is restricted from ordinary users.

Test:
- Unit tests cover filtering and routine tag queries.
- Playwright searches, filters by `posture_spine` and `morning`, and inspects details.

## T09 — Planner implementation

Goal:
Generate deterministic morning activation and evening relaxation routines.

Files:
- src/lib/planner.ts
- src/lib/validation/planner.ts
- src/server/services/planner-service.ts
- tests/unit/planner.test.ts
- docs/PLAN.md

Acceptance:
- Morning routines (20–30 min: Activation + Posture + Strength) select exercises tagged `morning` or `both`.
- Evening routines (15–25 min: Gentle Mobility + Stretching + Relaxation) select exercises tagged `evening` or `both`.
- `bird-dog` preferred over `superman`; hanging/inversion excluded from default plans.
- Height increase guarantees strictly prohibited; sharp pain warnings integrated.
- Equipment-free and user limitations respected.
- An impossible plan returns typed `NO_SAFE_PLAN` error.

Test:
- Unit tests cover filtering, routine tags, duration budgets, and error paths.

## T10 — Routine management

Goal:
Save, inspect, and edit routines with versioning.

Files:
- src/app/(app)/routines/*
- src/components/features/routines/*
- src/server/actions/routines.ts
- src/server/queries/routines.ts

Acceptance:
- Routine exercises have unique positions.
- Routine edits create a new version.
- Owner checks apply to every mutation.
- Historical sessions remain unchanged.

Test:
- Integration test updates a routine and verifies an earlier snapshot.

## T11 — Start and resume workouts

Goal:
Create a workout session and its exercise snapshots atomically.

Files:
- src/server/actions/workouts.ts
- src/server/services/workout-service.ts
- src/lib/validation/workout.ts

Acceptance:
- Session and exercise snapshots are created in one transaction.
- Timezone, activity date, routine name, version, targets, instructions, and safety notes are snapshotted.
- Duplicate start requests are handled deliberately.
- Another user's routine cannot be started.

Test:
- Integration tests cover valid start, invalid owner, and rollback.

## T12 — Workout player

Goal:
Guide the user through a saved posture & mobility session.

Files:
- src/app/(app)/workout/[id]/*
- src/components/features/workout/*
- src/server/actions/workouts.ts

Acceptance:
- Start, pause, resume, next, previous, skip, and finish work.
- Timers, repetition counters, and rest intervals functional.
- Safety reminder displayed: stop immediately if experiencing sharp pain.
- Beginner modifications accessible in one tap.
- Finalized sessions cannot be edited.

Test:
- Playwright completes a session and reloads its details.

## T13 — Atomic session completion

Goal:
Complete sessions through the atomic database RPC.

Files:
- supabase/migrations/0002_security_audit_fixes.sql
- src/server/actions/workouts.ts
- src/lib/validation/workout.ts
- tests/integration/complete-session.test.ts

Acceptance:
- Invokes `complete_workout_session` RPC with active duration support.
- Every exercise result is validated.
- Duplicate, foreign, and missing exercise results are rejected.
- Direct UPDATE bypass is blocked by RLS.
- Completed session cannot be completed again.

Test:
- Integration tests simulate valid, duplicate, partial, and cross-user payloads.

## T14 — Streak calculation

Goal:
Implement current and longest streak calculations.

Files:
- src/lib/streaks.ts
- src/lib/dates.ts
- tests/unit/streaks.test.ts

Acceptance:
- At least one completed session counts as an active day.
- Completing both morning and evening sessions on the same day counts once.
- Missing days break the streak.
- Uses `workout_sessions_completed_streaks_idx` for fast evaluation.

Test:
- Unit tests cover midnight, month boundaries, missing dates, and timezone cases.

## T15 — Calendar and history

Goal:
Show daily activity and immutable historical sessions.

Files:
- src/app/(app)/calendar/*
- src/components/features/calendar/*
- src/server/queries/calendar.ts
- src/lib/dates.ts

Acceptance:
- Monthly activity indicators match saved sessions.
- Selecting a day displays its snapshot sessions and exercises.
- Historical data does not depend on mutable current routines.
- Half-open UTC intervals used for queries.

Test:
- Playwright completes a workout and finds it on the correct date.

## T16 — Dashboard

Goal:
Bring daily sessions, streak, and weekly activity into one view.

Files:
- src/app/(app)/dashboard/*
- src/components/features/dashboard/*
- src/server/queries/dashboard.ts

Acceptance:
- Morning (Activation/Strength) and evening (Mobility/Relaxation) session cards rendered.
- Progress is based on persisted records.
- Empty, loading, and error states work.
- User can start or resume an eligible session.

Test:
- Playwright verifies dashboard state before and after completion.

## T17 — Progress and measurements

Goal:
Add weekly/monthly summaries and optional measurements.

Files:
- src/app/(app)/progress/*
- src/components/features/progress/*
- src/server/actions/measurements.ts
- src/server/queries/progress.ts
- tests/unit/progress.test.ts

Acceptance:
- In-progress and cancelled sessions are excluded from completion totals.
- Missing measurements are not treated as zero.
- Height measurements include caution: posture improves standing alignment, but measured height varies.
- Body measurements remain strictly optional.

Test:
- Unit tests compare aggregates against known fixture data.

## T18 — Daily habit tracking (planned)

Goal:
Support optional daily tracking for posture, recovery, and ergonomic habits.

Files:
- src/app/(app)/habits/*
- src/components/features/habits/*
- src/server/actions/habits.ts
- src/server/queries/habits.ts
- src/lib/validation/habits.ts

Acceptance:
- 7–8 hours sleep target tracked as wellness habit.
- Movement breaks every 45 minutes tracked.
- Eye-level screen positioning ergonomics tracked.
- Balanced protein nutrition tracked without restrictive diet rules.
- Habits remain optional and non-prescriptive.

Test:
- Unit tests validate habit inputs and date boundaries.
- Playwright records daily habit completions.

## T19 — Reminder preferences

Goal:
Persist reminder times and notification preferences.

Files:
- src/app/(app)/settings/*
- src/server/actions/profile.ts
- src/lib/validation/profile.ts

Acceptance:
- Users can configure morning and evening reminders.
- Preferences are stored with the profile.
- UI clearly indicates browser notification status.

Test:
- Vitest validates time inputs.
- Playwright saves and reloads preferences.

## T20 — Final verification and deployment

Goal:
Prepare a production-ready MVP.

Files:
- package.json
- playwright.config.ts
- docs/*
- deployment configuration

Acceptance:
- All checks pass (`typecheck`, `lint`, `test`, `build`, `test:e2e`).
- Required environment variables are documented.
- Migrations 0001, 0002, 0003 apply cleanly to fresh database.
- Curated 53-exercise posture and mobility seed catalog is available.
- Health safety restrictions and disclaimers verified.

Test:
- npm run lint
- npm run typecheck
- npm run test
- npm run build
- npm run test:e2e