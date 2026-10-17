# LookFit — Antigravity Agent Guidelines

## 1. Project Purpose
**LookFit** is a private, production-grade personal fitness web application positioned as a **Lean Physique, Strength & Posture Fitness App**, focused on:
- Building a lean, athletic physique with defined abs, functional bodyweight strength, and postural alignment.
- Morning sessions (20–30 min: full-body strength, abs/core, push-ups/squats/lunges/glute/back, and posture activation).
- Evening sessions (15–25 min: flexibility, spinal mobility, postural opening, decompression, and optional secondary core blocks).
- Equipment-free home workouts calibrated to an intermediate fitness level.
- Daily habit tracking (sleep, movement breaks, screen ergonomics, balanced nutrition).
- Guided execution with countdown, stopwatch, and sets/reps tracking.
- Streak, calendar, exercise progression, and historical progress tracking.
- Deterministic, profile-driven routine planning (target profile: age 23, gender optional, no external AI dependency).

## 2. Technology Stack
- **Framework**: Next.js App Router (React Server Components by default)
- **Language**: TypeScript (`strict: true`, no `any`)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend & Database**: Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
- **Validation**: Zod (v3)
- **Data Visualization**: Recharts
- **Testing**: Vitest (Unit/Integration) + Playwright (E2E)

## 3. Important Commands
- **Dev Server**: `npm run dev`
- **Type Checking**: `npm run typecheck` (`tsc --noEmit`)
- **Linting**: `npm run lint`
- **Unit / Integration Tests**: `npm test` (`vitest run`)
- **Production Build**: `npm run build`
- **End-to-End Tests**: `npx playwright test`
- **Database (Supabase CLI)**:
  - Check status: `supabase status`
  - Reset & seed: `supabase db reset`
  - Generate migration: `supabase migration new <name>`

## 4. Golden Rules
1. **Zero Speculation / Verified Work Only**: Do not invent completed work. Never declare a task complete or a test passing without running and verifying the command.
2. **TypeScript Strictness**: Never use `any`, `as any`, or ignore type errors.
3. **Database Authority & Immutability**: PostgreSQL + RLS is the authoritative security boundary. Completed workout sessions and their exercise snapshots are strictly immutable.
4. **Mandatory Ownership**: Never accept `user_id` from client payloads. Always derive identity on the server via `supabase.auth.getUser()`.
5. **No Secret Leakage**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or raw database error strings to client bundles.
6. **Immutable Migrations**: Never modify an existing applied migration. Create sequential new migrations in `supabase/migrations/`.
7. **Health, Safety & Height Restrictions**:
   - Never claim exercises increase adult height, reopen growth plates, or guarantee 1–2 cm height restoration. Explain that posture improvements may help upright stance, but measured height is variable and not guaranteed.
   - Instruct users to stop immediately if they experience sharp pain (mild stretching tension is normal, pain is not).
   - Advise users with existing spinal or neck conditions to consult healthcare professionals.
   - Hanging and inversion are strictly non-default exercises.
8. **Consult Rules & Workflows**: Follow detailed standards in `.agent/rules/` and execution flows in `.agent/workflows/`.
