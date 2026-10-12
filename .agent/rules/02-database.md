# Rule 02: Database Architecture, Migrations & RLS

## 1. PostgreSQL Authority & Migrations
- PostgreSQL is the authoritative source of truth.
- All database modifications must be recorded in ordered SQL migrations within `supabase/migrations/` (e.g. `0001_init.sql`, `0002_add_feature.sql`).
- **Migration Immutability**: Never edit an existing migration file that has been applied or committed. Always create a new, numbered migration file for any schema adjustments.
- Migrations must be idempotent and repeatable from scratch on a clean database (`supabase db reset`).
- Seed data lives in `supabase/seed.sql` and must use `ON CONFLICT DO NOTHING` or similar safe idempotency constructs.

## 2. Row Level Security (RLS) Mandate
- RLS is mandatory for all user-owned tables:
  - `public.profiles`
  - `public.routines`
  - `public.routine_exercises`
  - `public.workout_sessions`
  - `public.session_exercises`
  - `public.body_measurements`
- **Ownership Pattern**: User tables must enforce ownership using `user_id = (select auth.uid())` in policies.
- **Catalog Protection**: The `public.exercises` table is read-only for authenticated users (`USING (is_active = true)`). Direct inserts, updates, or deletes by normal users are forbidden.
- **Schema Isolation**: The `private` schema and internal helper functions must have permissions revoked from `anon` and `authenticated` roles (`REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;`).

## 3. Immutable Workout History Architecture
- When a user starts a workout session, the system must snapshot:
  - Routine details: `routine_name_snapshot`, `routine_version_snapshot`.
  - Timezone & date: `timezone_snapshot`, `activity_date`.
  - Prescribed exercise targets, order, instructions, and safety notes into `workout_sessions` and `session_exercises`.
- **Database Trigger Enforcement**:
  - `private.guard_workout_session_update`: Prevents updates to snapshot fields (`started_at`, `activity_date`, `timezone_snapshot`, `plan_snapshot`) and prevents modifying finalized sessions (`completed`, `cancelled`).
  - `private.guard_session_exercise_update`: Prevents modifying or deleting exercises once the parent session is finalized.
- Historical dashboard views, streaks, calendars, and progress queries must read exclusively from snapshot rows (`workout_sessions` and `session_exercises`), never from current mutable routine rows. Routine updates must never alter past workout records.

## 4. Atomic Completion RPC
- Session completion must execute through the database function `public.complete_workout_session(p_session_id uuid, p_results jsonb)`.
- The completion RPC enforces:
  1. Caller authentication via `auth.uid()`.
  2. Row-level lock on the session row (`FOR UPDATE`) to prevent race conditions.
  3. One-to-one validation matching submitted results against snapshot exercises.
  4. Atomic recording of sets, reps, duration, and completion status.
  5. State transition of the session from `in_progress` to `completed`.
- Do not mark sessions complete through multiple disjoint client queries.

## 5. Timezone & Local Date Handling
- Store all timestamps in PostgreSQL as `timestamptz` in UTC.
- Store the user's active IANA timezone (e.g. `'Asia/Kolkata'`, `'America/New_York'`).
- The session's `activity_date` is a snapshot date calculated at start from UTC `started_at` in the user's timezone.
- Historical date grouping must use the stored `activity_date` and `timezone_snapshot`. Never reinterpret past session dates when a user updates their timezone preference.
- Calendar queries must evaluate date ranges using half-open UTC intervals `[start, end)`.
