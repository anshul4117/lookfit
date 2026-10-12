# Rule 03: Security, Authentication & Data Ownership

## 1. Authentication & Session Verification
- All application routes within the `(app)` group require an authenticated Supabase Auth session.
- Protected Server Actions and API Route Handlers must verify authentication before performing any action.
- Middleware must refresh auth tokens and redirect unauthenticated requests to `/login?redirectTo=...`.

## 2. Strict User Ownership Enforcement
- **Never trust client-supplied user identifiers**: Never accept `user_id` as an argument from the browser or form payload.
- Derive the active user ID strictly on the server:
  ```typescript
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } };
  }
  const userId = user.id;
  ```
- All user-owned database mutations and queries must filter on `user_id = userId` in application code, backed up by PostgreSQL RLS.

## 3. Credential Boundaries & Zero Secret Leakage
- **Client Bundle Restrictions**: Browser code must only have access to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Service Role Prohibition**: `SUPABASE_SERVICE_ROLE_KEY` must never be imported into client components or leaked into browser bundles. In the MVP, standard user flows operate exclusively under user-scoped JWT sessions.
- Sensitive environment variables belong in `.env.local` and must never be committed to git.

## 4. Defense-in-Depth Validation
Security must be enforced across four distinct layers:
1. **Client UI**: Validation feedback on form fields for immediate UX guidance.
2. **Server Actions**: Zod schema parsing and domain constraint validation.
3. **Database Constraints**: PostgreSQL `CHECK`, `NOT NULL`, `FOREIGN KEY`, and unique constraints.
4. **Row Level Security**: PostgreSQL RLS policies acting as the final, unbypassable boundary.

## 5. Safe Error Responses
- Never bubble raw PostgreSQL errors, query text, or internal stack traces to the browser.
- Log error details server-side using structured logging (stripping personal identifying tokens and passwords).
- Return standardized, generic user-facing messages (e.g. `"Workout session not found or unavailable"` instead of `"Record with ID x does not exist in table y"`).
- Treat missing rows and RLS-denied rows identically using 404 / `NOT_FOUND` to prevent ID enumeration.
