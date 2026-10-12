# Rule 00: Project Scope, Architecture & Standards

## 1. Project Overview & Scope
LookFit is a private, production-grade personal fitness application engineered for home workouts without equipment. The product is designed around:
- Equipment-free exercises and mobility flows.
- Distinct morning and evening training sessions.
- Posture habits and spinal decompression movements.
- Predictable, deterministic workout generation derived from user profiles and limitations.
- Private, single-user operation with an architecture that is safely multi-tenant.

## 2. Specification Precedence
When resolving technical ambiguities or requirements, adhere strictly to this precedence hierarchy:
1. `docs/PRD.md` — Product scope, functional requirements (FR-01 to FR-10), non-functional requirements.
2. `docs/ARCHITECTURE.md` — Layer responsibilities, folder structure, data flow, timezone handling, caching.
3. `docs/PLAN.md` — Deterministic planner contract, eligibility engine, progressive overload policy.
4. `docs/TASKS.md` — Phase checklist and task tracking.
5. `supabase/migrations/` — Database schema, integrity constraints, and RLS policies.

Do not alter architectural decisions or discard specifications without explicit user approval.

## 3. Technology Stack & Boundaries
- **Framework**: Next.js App Router (React 19 / latest stable Next.js).
- **Language**: TypeScript in strict mode (`strict: true`, `noImplicitAny: true`).
- **Styling**: Tailwind CSS + shadcn/ui. No arbitrary inline styles, heavy animations, or extraneous CSS frameworks.
- **Backend**: Supabase PostgreSQL, Supabase Auth, and Row Level Security.
- **Validation**: Zod (v3) for all runtime boundaries.
- **Data Visualization**: Recharts for progress metrics and trend graphs.
- **Testing**: Vitest for unit/integration tests; Playwright for end-to-end tests.
- **Dependency Hygiene**: Do not introduce unnecessary dependencies or duplicate utility packages.

## 4. Directory Structure
All application source code resides under `src/`:
```text
src/
├── app/
│   ├── (auth)/             # Login, register, auth callback
│   ├── (app)/              # Authenticated application shell
│   │   ├── dashboard/      # Daily overview & streak summary
│   │   ├── workout/[id]/   # Interactive workout player
│   │   ├── exercises/      # Exercise library & detail views
│   │   ├── calendar/       # Local-time monthly calendar & past sessions
│   │   ├── progress/       # Analytics & optional body measurements
│   │   ├── settings/       # Preferences, schedule, timezone
│   │   └── routines/       # Morning & evening routine management
│   ├── api/                # HTTP route handlers (health check, integrations)
│   ├── layout.tsx          # Root HTML shell & providers
│   └── page.tsx            # Public landing / root redirect
├── components/
│   ├── ui/                 # Reusable shadcn/ui primitives
│   └── features/           # Domain-specific UI grouped by feature
├── lib/
│   ├── supabase/           # Request-scoped Supabase client factories
│   ├── validation/         # Zod schemas for all models & mutations
│   ├── planner.ts          # Pure deterministic workout planner
│   ├── streaks.ts          # Pure streak calculation utilities
│   ├── dates.ts            # Date formatting and timezone utilities
│   ├── errors.ts           # Standard application error definitions
│   └── utils.ts            # Formatting & CSS class merging (cn)
└── server/
    ├── actions/            # Server Actions (mutations with auth & validation)
    ├── queries/            # Server Queries (read operations with RLS)
    └── services/           # Reusable domain services & transactions
```

## 5. Architectural Principles
- **Server Components by Default**: Client Components (`'use client'`) are strictly limited to interactive leaf elements, active timer state, and browser event listeners.
- **Modular Monolith**: Maintain clean boundaries between presentation, server orchestration, and data access.
- **Immutable Snapshots**: Workout sessions must permanently snapshot exercise metadata and prescribed targets upon start. Historical views read only snapshot tables (`workout_sessions` and `session_exercises`).
- **Reviewable Increments**: Prefer small, focused commits and pull requests over expansive rewrites.
