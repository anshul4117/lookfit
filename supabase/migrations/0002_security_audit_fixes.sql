-- Fitness App MVP — Security & Correctness Audit Fixes
-- Migration 0002: Applies fixes identified during database audit
-- Safe to apply to development and production environments.

-- ---------------------------------------------------------
-- 1. Fix C-01: Prevent trigger from blocking user deletion cascade
-- Allow DELETE on session_exercises when parent session is already
-- deleted or when the user account is being deleted.
-- ---------------------------------------------------------

create or replace function private.guard_session_exercise_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status public.workout_status;
begin
  if tg_op = 'DELETE' then
    -- If user was already deleted from auth.users, allow cascade delete
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

-- ---------------------------------------------------------
-- 2. Fix C-02 & H-02: Prevent direct completion bypass and snapshot deletion
-- ---------------------------------------------------------

-- Drop individual deletion policy on session_exercises (snapshots must not be fragmented)
drop policy if exists session_exercises_delete_own on public.session_exercises;

-- Restrict direct UPDATE on workout_sessions so status can only remain in_progress
-- or transition to cancelled. Completion is strictly reserved for the atomic RPC.
drop policy if exists workout_sessions_update_own on public.workout_sessions;

create policy workout_sessions_update_own
on public.workout_sessions for update to authenticated
using (
  user_id = (select auth.uid())
  and status = 'in_progress'
)
with check (
  user_id = (select auth.uid())
  and status in ('in_progress', 'cancelled')
);

-- ---------------------------------------------------------
-- 3. Fix H-01: Composite Foreign Key for session_exercises
-- Enforces that session_exercises.user_id strictly matches workout_sessions.user_id
-- ---------------------------------------------------------

alter table public.workout_sessions
  add constraint workout_sessions_id_user_unique unique (id, user_id);

alter table public.session_exercises
  add constraint session_exercises_session_user_fk
  foreign key (session_id, user_id)
  references public.workout_sessions(id, user_id) on delete cascade;

-- ---------------------------------------------------------
-- 4. Fix H-03 & M-03: Atomic Completion RPC with duration & early count check
-- ---------------------------------------------------------

drop function if exists public.complete_workout_session(uuid, jsonb);

create or replace function public.complete_workout_session(
  p_session_id uuid,
  p_results jsonb,
  p_duration_seconds integer default null
)
returns public.workout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_result jsonb;
  v_exercise_id uuid;
  v_updated_count integer := 0;
  v_total_count integer := 0;
  v_wall_clock_duration integer;
  v_duration integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    raise exception 'Results must be a JSON array'
      using errcode = '22023';
  end if;

  select *
  into v_session
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Workout session not found'
      using errcode = 'P0002';
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Workout session is not in progress'
      using errcode = '55000';
  end if;

  select count(*) into v_total_count
  from public.session_exercises
  where session_id = p_session_id and user_id = v_user_id;

  -- Fix M-03: Validate exercise count BEFORE executing row updates
  if jsonb_array_length(p_results) <> v_total_count then
    raise exception 'Submit exactly one result per session exercise'
      using errcode = '22023';
  end if;

  -- Reject duplicate exercise IDs before applying updates
  if exists (
    select 1
    from jsonb_array_elements(p_results) as r(item)
    group by r.item ->> 'session_exercise_id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate exercise result'
      using errcode = '22023';
  end if;

  for v_result in
    select item from jsonb_array_elements(p_results) as x(item)
  loop
    if jsonb_typeof(v_result) <> 'object'
       or coalesce(v_result ->> 'session_exercise_id', '') = ''
       or jsonb_typeof(v_result -> 'completed') <> 'boolean' then
      raise exception 'Invalid exercise result'
        using errcode = '22023';
    end if;

    begin
      v_exercise_id := (v_result ->> 'session_exercise_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid session exercise ID'
        using errcode = '22023';
    end;

    update public.session_exercises
    set completed = (v_result ->> 'completed')::boolean,
        completed_sets = coalesce(
          (v_result ->> 'completed_sets')::smallint, 0
        ),
        completed_reps = (v_result ->> 'completed_reps')::smallint,
        actual_duration_seconds =
          (v_result ->> 'actual_duration_seconds')::integer,
        notes = nullif(v_result ->> 'notes', '')
    where id = v_exercise_id
      and session_id = p_session_id
      and user_id = v_user_id;

    get diagnostics v_updated_count = row_count;

    if v_updated_count <> 1 then
      raise exception 'Exercise does not belong to this session'
        using errcode = '22023';
    end if;
  end loop;

  -- Fix H-03: Use active duration if provided and reasonable; fallback to wall-clock time
  v_wall_clock_duration := greatest(
    0,
    floor(extract(epoch from (now() - v_session.started_at)))::integer
  );

  if p_duration_seconds is not null and p_duration_seconds >= 0 then
    -- Cap active duration to elapsed wall clock + 300s clock drift buffer
    v_duration := least(p_duration_seconds, v_wall_clock_duration + 300);
  else
    v_duration := v_wall_clock_duration;
  end if;

  update public.workout_sessions
  set status = 'completed',
      completed_at = now(),
      duration_seconds = v_duration
  where id = p_session_id
    and user_id = v_user_id
    and status = 'in_progress'
  returning * into v_session;

  if not found then
    raise exception 'Workout could not be completed'
      using errcode = '55000';
  end if;

  return v_session;
end;
$$;

revoke all on function public.complete_workout_session(uuid, jsonb, integer)
  from public, anon;
grant execute on function public.complete_workout_session(uuid, jsonb, integer)
  to authenticated;

-- ---------------------------------------------------------
-- 5. Fix M-01: Partial Index for Completed Streaks & Calendar Lookups
-- ---------------------------------------------------------

create index if not exists workout_sessions_completed_streaks_idx
  on public.workout_sessions (user_id, activity_date desc)
  where status = 'completed';

-- ---------------------------------------------------------
-- 6. Fix M-02: Align Profile Goals Taxonomy with Exercise Catalog
-- ---------------------------------------------------------

alter table public.profiles
  drop constraint if exists profile_goals_valid;

alter table public.profiles
  add constraint profile_goals_valid
  check (goals <@ array[
    'mobility', 'posture', 'strength', 'general_fitness',
    'flexibility', 'cardio', 'lean_fitness', 'relaxation'
  ]::text[]);
