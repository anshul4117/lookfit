# Workflow: Add Database Migration

Follow this workflow whenever a schema change, new table, constraint, RLS policy, or database function is required.

---

## 1. Inspect Existing Migrations & Applied State
- Check `supabase/migrations/` to review all existing migration files and determine the next sequential sequence number:
  ```bash
  ls -la supabase/migrations/
  ```
- **Rule of Immutability**: Never modify an existing migration file that has been applied or committed.
- Verify applied database state with Supabase CLI:
  ```bash
  supabase status
  supabase db diff
  ```

## 2. Design Schema Changes
Ensure proposed SQL changes strictly follow project standards:
- **Tables**: Include `user_id uuid not null references auth.users(id) on delete cascade` for all user-owned rows.
- **Constraints**: Add explicit `CHECK` and `NOT NULL` constraints to enforce valid domains.
- **RLS Mandate**:
  - `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`
  - Write explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
  - Ensure policies enforce `user_id = (select auth.uid())`.
- **Functions, RPCs & Triggers**:
  - Set `set search_path = ''` to prevent search path hijacking, and schema-qualify all referenced objects.
  - Declare `SECURITY INVOKER` by default; use `SECURITY DEFINER` only when elevated catalog/auth access (e.g. `auth.users`) is strictly required.
  - **Client-callable RPCs**: Restrict permissions: `REVOKE ALL ON FUNCTION ... FROM public, anon; GRANT EXECUTE ... TO authenticated;`.
  - **Internal Trigger Functions & Helpers**: Reside in `private` schema. Revoke all execution and schema usage from client roles (`REVOKE ALL ON FUNCTION ... FROM public, anon, authenticated; REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;`). Table triggers execute via table definitions without requiring client `EXECUTE` or schema `USAGE`.
- **Immutable Snapshots**: Never remove immutability triggers on workout session snapshot tables.

## 3. Create Migration File
Generate a new migration using the Supabase CLI or create the next numbered file:
```bash
supabase migration new <feature_name>
```
File naming convention: `supabase/migrations/000X_<descriptive_name>.sql`.

## 4. Test Local Migration Application
- Reset local database and run all migrations from scratch to confirm repeatability:
  ```bash
  supabase db reset
  ```
- Verify that `supabase/seed.sql` applies without conflict or errors.
- Confirm RLS policies prevent cross-user data access.

## 5. Generate Updated TypeScript Types
- Regenerate database definitions for the application layer:
  ```bash
  supabase gen types typescript --local > src/types/database.ts
  ```
- Review git diff to ensure only intended schema types changed.
