# Rule 01: Code Style & TypeScript Standards

## 1. Strict TypeScript Enforcement
- Maintain `"strict": true` across the entire project.
- **Zero `any`**: `any` and `as any` are strictly banned. Use concrete types, generics, or `unknown` with runtime type narrowing.
- **No Unsafe Type Assertions**: Avoid casting (`as SomeType`) to bypass compiler checks. Validate using Zod instead.
- **Discriminated Unions**: Model multi-state objects (e.g. workout status: `'in_progress' | 'completed' | 'cancelled'`, timer states: `'idle' | 'running' | 'paused' | 'rest'`) using discriminated unions.
- **Explicit Return Types**: Top-level server actions, query functions, and exported helpers must have explicit return type signatures.

## 2. Layer Separation & Responsibilities
Code must be organized into four distinct tiers:
1. **Presentation / UI (`src/components/`, `src/app/`)**:
   - Focus solely on layout, rendering, and interaction.
   - Never embed direct database calls, privileged credentials, or business calculations.
2. **Server Actions (`src/server/actions/`)**:
   - Handle form mutations and user-triggered state changes.
   - Responsibilities:
     1. Authenticate the caller session.
     2. Parse input arguments via Zod.
     3. Call the appropriate service function.
     4. Return a typed `ActionResult<T>`.
     5. Revalidate cache tags or paths (`revalidatePath`).
3. **Server Queries (`src/server/queries/`)**:
   - Provide read-only data fetching for Server Components.
   - Enforce ownership and RLS automatically via request-scoped Supabase client.
   - Select only needed columns; avoid `SELECT *`.
4. **Domain Services & Pure Libraries (`src/lib/`, `src/server/services/`)**:
   - `src/lib/planner.ts`, `src/lib/streaks.ts`, `src/lib/dates.ts` must be pure functions with zero database or browser coupling.
   - Business calculations must be deterministic, portable, and comprehensively unit-tested.

## 3. Standard Action Result Contract
Every Server Action must return the standardized `ActionResult<T>` structure:
```typescript
export type ActionErrorCode =
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  details?: Record<string, string[]>;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };
```

## 4. Input Validation with Zod
- Every external boundary (action arguments, route handler query params, request bodies, environment variables) must be parsed through a Zod schema.
- Co-locate Zod schemas in `src/lib/validation/` and infer TypeScript types directly from them (`z.infer<typeof schema>`).
- Provide human-readable, user-friendly error messages on constraints.
- Reject undeclared properties using `.strict()` where appropriate.

## 5. React Server Components vs. Client Components
- Keep the component tree primarily on the server.
- Mark files with `'use client'` only when they:
  - Utilize React hooks (`useState`, `useEffect`, `useReducer`, `useRef`).
  - Listen to DOM events (clicks, keydowns, gestures).
  - Use browser-only APIs (e.g. `Audio`, `localStorage`, `matchMedia`, `requestAnimationFrame`).
- Push `'use client'` boundaries down to the smallest possible leaf component.
