# Workflow: New Feature Implementation

Follow this repeatable step-by-step workflow for all feature implementations.

---

## 1. Inspect
- Review `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, and `docs/TASKS.md` for feature specifications.
- Inspect existing codebase to identify related schemas, components, utilities, and queries.
- Ensure no duplicate abstractions or conflicting implementations are introduced.

## 2. Plan
- Break down the feature into small, reviewable increments.
- Document affected files, required interfaces, and expected data flow.
- If the feature introduces architectural changes or destructive modifications, obtain user approval before writing code.

## 3. Database Migration (If Needed)
- If new tables, columns, constraints, or RPC functions are required, follow `.agent/workflows/add-migration.md`.
- Never modify existing migrations.
- Ensure RLS policies and ownership checks (`user_id = auth.uid()`) are defined for any new table.

## 4. Validation
- Define or update Zod schemas in `src/lib/validation/`.
- Infer TypeScript types from Zod schemas to ensure single-source-of-truth typing.
- Provide descriptive user-facing validation messages.

## 5. Server Operation
- Implement Server Queries in `src/server/queries/` for data reading.
- Implement Server Actions in `src/server/actions/` for mutations:
  1. Authenticate user via Supabase session.
  2. Parse and validate arguments with Zod.
  3. Enforce ownership and call domain service / database.
  4. Return standardized `ActionResult<T>`.
  5. Revalidate affected cache paths (`revalidatePath`).

## 6. UI Implementation
- Implement presentation components in `src/components/features/` and route pages in `src/app/`.
- Keep components as React Server Components by default; use `'use client'` only for interactive leaf components.
- Ensure mobile-first responsiveness (375px+), 44x44px touch targets, and accessible ARIA attributes.
- Handle all four mandatory states: **Loading**, **Empty**, **Error**, and **Success**.

## 7. Automated Tests
- Write unit tests for pure logic in `tests/unit/` (e.g. planner, streaks, date calculations).
- Write integration / E2E tests in `tests/e2e/` (e.g. authentication, onboarding, workout player, calendar).

## 8. Verification
- Execute `.agent/workflows/verify.md` to run lint, typecheck, unit tests, and production build.
- Inspect the command outputs directly; do not assume success.

## 9. Summary & Report
- Report changed files with file links.
- Report executed commands and their actual outputs.
- Highlight any unresolved questions or edge cases.
- Recommend the immediate next task.
