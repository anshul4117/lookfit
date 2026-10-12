-- Fitness App MVP — Database Audit Corrections
-- Migration 0004: Hardens trigger security and routine_tags validation
-- Safe and idempotent for fresh and existing environments.

-- ---------------------------------------------------------
-- 1. Fix 1: Trigger Function Security Hardening
--
-- In migration 0002, private.guard_session_exercise_update was
-- security invoker. When an authenticated user deletes an in-progress
-- session, the cascade delete on session_exercises executes as 'authenticated',
-- which lacks direct select privileges on auth.users in Supabase.
--
-- We replace the function with SECURITY DEFINER and SET search_path = ''.
-- Object references are fully qualified to eliminate privilege-escalation risks.
-- Immutability protections on completed/cancelled sessions and prescription
-- fields are strictly preserved.
-- ---------------------------------------------------------

create or replace function private.guard_session_exercise_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_status public.workout_status;
begin
  if tg_op = 'DELETE' then
    -- If user was already deleted from auth.users (account cascade), allow deletion
    if not exists (select 1 from auth.users where id = old.user_id) then
      return old;
    end if;

    -- Check status of parent session
    select status into parent_status
    from public.workout_sessions
    where id = old.session_id;

    -- If parent session was already deleted via cascade, allow delete
    if parent_status is null then
      return old;
    end if;

    -- If parent session exists, only in_progress exercises may be deleted
    if parent_status is distinct from 'in_progress' then
      raise exception 'Finalized workout exercises cannot be deleted'
        using errcode = '55000';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    select status into parent_status
    from public.workout_sessions
    where id = old.session_id;

    if parent_status is distinct from 'in_progress' then
      raise exception 'Finalized workout exercises cannot be modified'
        using errcode = '55000';
    end if;

    if new.session_id is distinct from old.session_id
       or new.user_id is distinct from old.user_id
       or new.exercise_id is distinct from old.exercise_id
       or new.position is distinct from old.position
       or new.exercise_name_snapshot is distinct from old.exercise_name_snapshot
       or new.category_snapshot is distinct from old.category_snapshot
       or new.instructions_snapshot is distinct from old.instructions_snapshot
       or new.safety_notes_snapshot is distinct from old.safety_notes_snapshot
       or new.prescribed_sets is distinct from old.prescribed_sets
       or new.prescribed_reps is distinct from old.prescribed_reps
       or new.prescribed_duration_seconds is distinct from old.prescribed_duration_seconds
       or new.rest_seconds is distinct from old.rest_seconds then
      raise exception 'Session exercise prescription is immutable'
        using errcode = '55000';
    end if;
  end if;

  return new;
end;
$$;

-- In PostgreSQL, firing a table trigger during DML does not require the executing role
-- to have USAGE on the function schema or EXECUTE on the trigger function (permissions
-- are evaluated at CREATE TRIGGER time).
-- Revoke all function permissions from client roles and maintain private schema isolation.
revoke all on function private.guard_session_exercise_update()
  from public, anon, authenticated;

revoke all on schema private
  from public, anon, authenticated;

-- ---------------------------------------------------------
-- 2. Fix 2: Hardened Routine-Tag Validation
--
-- In migration 0003, 'routine_tags <@ array[...]' accepted empty
-- arrays '{}' because the empty set is a subset of any set.
--
-- We replace the constraint with one that strictly enforces:
--   a) Non-empty array (cardinality > 0)
--   b) Every element must be 'morning', 'evening', or 'both'
-- Compatible whether migration 0003 was applied or not.
-- ---------------------------------------------------------

alter table public.exercises
  add column if not exists routine_tags text[] not null default array['both']::text[];

alter table public.exercises
  drop constraint if exists exercise_routine_tags_valid;

alter table public.exercises
  add constraint exercise_routine_tags_valid
  check (
    cardinality(routine_tags) > 0
    and routine_tags <@ array['morning', 'evening', 'both']::text[]
  );
