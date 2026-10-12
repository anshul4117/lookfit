# LookFit — System Architecture

## 1. Architecture Principles

- **Modular Monolith**: Next.js App Router; clear boundaries without microservices.
- **Server-First Data Access**: React Server Components by default; Client Components only for leaf interactivity.
- **Supabase Auth & RLS**: PostgreSQL with Row Level Security is the authoritative security boundary.
- **Zod at Every Boundary**: All external inputs, server action payloads, and route handler parameters are strictly validated.
- **Immutable Workout Snapshots**: Starting a workout snapshots routine, exercise order, instructions, safety notes, and targets. Historical analytics never read from mutable routines.
- **Deterministic Planning Logic**: Pure functions in `src/lib/planner.ts` with comprehensive unit tests; no black-box external AI dependencies.

## 2. Folder Structure

```text
lookfit/
├── AGENTS.md
├── .agent/
│   ├── rules/
│   │   ├── 00-project.md
│   │   ├── 01-code-style.md
│   │   ├── 02-database.md
│   │   ├── 03-security.md
│   │   ├── 04-ui-ux.md
│   │   └── 05-health-safety.md
│   └── workflows/
│       ├── new-feature.md
│       ├── add-migration.md
│       └── verify.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── PLAN.md
│   └── TASKS.md
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_security_audit_fixes.sql
│   │   └── 0003_posture_spine_and_routine_tags.sql
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── workout/[id]/
│   │   │   ├── exercises/
│   │   │   ├── calendar/
│   │   │   ├── progress/
│   │   │   ├── settings/
│   │   │   └── routines/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── features/
│   │       ├── dashboard/
│   │       ├── workout/
│   │       ├── exercises/
│   │       ├── calendar/
│   │       ├── progress/
│   │       ├── settings/
│   │       └── routines/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── validation/
│   │   ├── planner.ts
│   │   ├── streaks.ts
│   │   ├── dates.ts
│   │   ├── errors.ts
│   │   └── utils.ts
│   └── server/
│       ├── actions/
│       ├── queries/
│       └── services/
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
└── next.config.ts
```

## 3. Layer Responsibilities

### UI Components (`src/components/`, `src/app/`)
Render views and capture user interaction. Do not contain database queries, credentials, or business authorization rules. Leaf components managing local timer state or browser events use `'use client'`.

### Server Actions (`src/server/actions/`)
Mutations initiated by the user interface:
- Save onboarding preferences (age 23 target, optional gender, goals, limitations).
- Generate or edit morning/evening routines.
- Start, pause, cancel, or complete workout sessions.
- Record optional body measurements and planned daily habits.

Every Server Action must:
1. Authenticate caller identity via `supabase.auth.getUser()`. Never trust client-supplied `user_id`.
2. Parse inputs using Zod.
3. Call the domain service layer.
4. Return a structured `ActionResult<T>`.
5. Revalidate affected cache paths via `revalidatePath`.

### Server Queries (`src/server/queries/`)
Read-only queries for dashboard, exercise catalog, routines, calendar, and progress. Enforce ownership and RLS using request-scoped Supabase client.

### Domain Libraries (`src/lib/`)
Pure, deterministic business logic:
- `planner.ts`: Deterministic routine selection based on `routine_tags` (`morning`, `evening`, `both`), `posture_spine` category, goals, and limitations.
- `streaks.ts`: Calculates current and longest streaks based on distinct local dates of completed sessions.
- `dates.ts`: Timezone interval calculations `[start, end)`.

## 4. Data Model & Taxonomy Updates

### Exercise Categories
The `exercise_category` enum supports:
`'posture_spine'`, `'mobility'`, `'stretching'`, `'posture'`, `'core'`, `'push'`, `'pull'`, `'legs'`, `'cardio'`.

### Routine Tags
The `public.exercises` table contains `routine_tags text[] NOT NULL DEFAULT array['both']::text[]`:
- `'morning'`: Eligible for morning activation + posture + strength routines.
- `'evening'`: Eligible for evening gentle mobility + stretching + relaxation routines.
- `'both'`: Eligible for either morning or evening routines.
Indexed via GIN for efficient filtering.

### Planned Daily Habit Tracking Architecture
Daily habits (sleep 7–8h, 45-min movement breaks, eye-level screen position, balanced protein nutrition) are modeled for future implementation via a user-owned table:
```sql
-- Planned for future habit tracking phase
create table public.daily_habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  sleep_hours numeric(3,1),
  movement_breaks_completed smallint default 0,
  screen_ergonomics_checked boolean default false,
  protein_nutrition_checked boolean default false,
  created_at timestamptz not null default now(),
  constraint habit_logs_user_date_unique unique (user_id, log_date)
);
```
Habits remain optional and trackable without enforcing clinical diet rules or rigid metrics.

## 5. Security & Supabase Client Rules

- **Browser Client**: Public URL and Publishable Anon Key only.
- **Server Client**: Request-scoped client using secure session cookies.
- **Service-Role Client**: Strictly forbidden in client code; MVP uses user-scoped JWT sessions.
- **Row Level Security**: Mandatory on all user-owned tables.
- **Snapshot Immutability**: Protected by triggers `guard_workout_session_update` and `guard_session_exercise_update`.

## 6. Error Handling

Standardized Result contract:
```typescript
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ActionErrorCode; message: string; details?: Record<string, string[]> } };
```
Raw PostgreSQL error messages and database details are never returned to client bundles.

## 7. Timezone & Local Date Handling

- Event timestamps are stored in UTC `timestamptz`.
- User's IANA timezone is stored in `profiles.timezone`.
- At session start, timezone is snapshotted into `workout_sessions.timezone_snapshot`.
- Local `activity_date` is derived at start and permanently locked.
- Timezone edits do not retroactively alter historical session dates.
- Calendar queries use half-open UTC intervals `[start, end)`.

## 8. Immutable Workout History

When a session starts:
1. `routine_name_snapshot`, `routine_version_snapshot`, `timezone_snapshot`, and `activity_date` are written to `workout_sessions`.
2. Prescribed exercises, targets, instructions, and safety notes are written to `session_exercises`.
3. Completion executes atomically via `public.complete_workout_session(p_session_id, p_results, p_duration_seconds)`.
4. Triggers prevent updates to finalized sessions.

## 9. Testing Strategy

- **Unit Tests (Vitest)**: Planner eligibility, `routine_tags` matching, streak calculation, Zod validation, timezone boundary checks.
- **Integration Tests**: Supabase RLS policies, trigger immutability, atomic completion RPC.
- **Playwright E2E**: Onboarding, morning workout completion, evening routine execution, calendar history, cross-user isolation.