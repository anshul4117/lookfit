-- Migration 0007: Atomic Start Workout Session RPC and Idempotency Constraint
--
-- Provides transactional safety for creating workout sessions from saved routines.
-- Ensures that:
--  1. Preflight check detects any existing duplicate in-progress sessions without modifying user data.
--  2. A partial unique index prevents concurrent duplicate in-progress sessions for the same routine.
--  3. The workout session and all its exercise snapshots are created in one PostgreSQL transaction.
--  4. Routine ownership is verified under row lock before duplicate lookup, preserving no-enumeration.
--  5. Retries for already in-progress sessions return the existing active session idempotently.
--  6. Creating a new session for an archived routine is strictly forbidden.
--  7. Row locks guarantee snapshot consistency between routine version, plan snapshot, and exercise rows.
--  8. The authenticated user's saved IANA timezone is resolved and used to determine activity_date.
--  9. All snapshots (routine name, version, exercise targets, instructions, safety notes) are persisted immutably.

-- ---------------------------------------------------------
-- 1. Preflight Check & Partial Unique Index
-- ---------------------------------------------------------

do $$
declare
  v_duplicate_count integer;
begin
  select count(*)
  into v_duplicate_count
  from (
    select user_id, routine_id
    from public.workout_sessions
    where status = 'in_progress' and routine_id is not null
    group by user_id, routine_id
    having count(*) > 1
  ) dups;

  if v_duplicate_count > 0 then
    raise exception 'Cannot create unique index: % duplicate in_progress routine sessions found. Please resolve active duplicate sessions before applying migration 0007.', v_duplicate_count
      using errcode = '23505';
  end if;
end $$;

create unique index if not exists workout_sessions_user_routine_in_progress_idx
  on public.workout_sessions (user_id, routine_id)
  where status = 'in_progress' and routine_id is not null;

-- ---------------------------------------------------------
-- 2. Atomic Start Workout Session Function
-- ---------------------------------------------------------

create or replace function public.start_workout_session(
  p_routine_id uuid
)
returns public.workout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_routine public.routines%rowtype;
  v_existing_session public.workout_sessions%rowtype;
  v_new_session public.workout_sessions%rowtype;
  v_user_timezone text;
  v_activity_date date;
  v_plan_snapshot jsonb;
  v_re_count integer;
  v_exercise_count integer;
  v_inserted_count integer;
begin
  -- 1. Explicit authorization check
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  if p_routine_id is null then
    raise exception 'Routine ID is required'
      using errcode = '22023';
  end if;

  -- 2. Concurrency control: serialize concurrent starts for this user and routine
  perform pg_advisory_xact_lock(hashtext(v_user_id::text || p_routine_id::text));

  -- 3. Verify routine ownership under row lock to prevent concurrent modifications
  -- This runs FIRST to preserve no-enumeration defense: requests for routines not owned
  -- by the caller fail immediately with P0002 without revealing session or archive state.
  select *
  into v_routine
  from public.routines
  where id = p_routine_id
    and user_id = v_user_id
  for share;

  if not found then
    raise exception 'Routine not found'
      using errcode = 'P0002';
  end if;

  -- 4. Check for existing in-progress session for this routine (idempotent duplicate-start handling)
  select *
  into v_existing_session
  from public.workout_sessions
  where user_id = v_user_id
    and routine_id = p_routine_id
    and status = 'in_progress'
  order by started_at desc
  limit 1;

  if found then
    -- INTENDED RETRY BEHAVIOR:
    -- If a session is already in_progress for this routine, return the existing active session
    -- idempotently. Even if the routine was subsequently archived (e.g., edited to a new version
    -- or archived by the user while the workout was ongoing), the existing session represents an
    -- in-flight workout that was legitimately started when active. Returning the existing session
    -- ensures network retries succeed safely without creating duplicate sessions or snapshots.
    return v_existing_session;
  end if;

  -- 5. If no in-progress session exists, a NEW workout session cannot be created for an archived routine
  if v_routine.status = 'archived' then
    raise exception 'Cannot start an archived routine'
      using errcode = '55000';
  end if;

  -- 6. Lock and verify routine exercises under row lock for snapshot consistency
  perform 1
  from public.routine_exercises
  where routine_id = v_routine.id and user_id = v_user_id
  for share;

  select count(*)
  into v_re_count
  from public.routine_exercises
  where routine_id = v_routine.id and user_id = v_user_id;

  if v_re_count is null or v_re_count = 0 then
    raise exception 'Routine must contain at least one valid exercise'
      using errcode = '22023';
  end if;

  select count(*)
  into v_exercise_count
  from public.routine_exercises re
  join public.exercises e on e.id = re.exercise_id
  where re.routine_id = v_routine.id
    and re.user_id = v_user_id;

  if v_exercise_count <> v_re_count then
    raise exception 'One or more routine exercises are missing from catalog'
      using errcode = '22023';
  end if;

  -- 7. Resolve user's saved IANA timezone from profile
  select timezone
  into v_user_timezone
  from public.profiles
  where user_id = v_user_id;

  if v_user_timezone is null or length(trim(v_user_timezone)) = 0 then
    v_user_timezone := 'Asia/Kolkata';
  end if;

  -- Calculate local activity date in the user's timezone safely
  begin
    v_activity_date := (now() at time zone v_user_timezone)::date;
  exception when others then
    -- Documented fallback: fallback to UTC if stored IANA string cannot be parsed by PostgreSQL's tzdata
    v_user_timezone := 'UTC';
    v_activity_date := (now() at time zone 'UTC')::date;
  end;

  -- 8. Build plan snapshot JSON object matching locked routine version
  select jsonb_build_object(
    'routine_id', v_routine.id,
    'routine_name', v_routine.name,
    'version', v_routine.version,
    'session_type', v_routine.session_type,
    'estimated_minutes', v_routine.estimated_minutes,
    'exercises', (
      select jsonb_agg(
        jsonb_build_object(
          'position', re.position,
          'exercise_id', re.exercise_id,
          'name', e.name,
          'category', e.category,
          'instructions', e.instructions,
          'safety_notes', e.safety_notes,
          'prescribed_sets', re.prescribed_sets,
          'prescribed_reps', re.prescribed_reps,
          'prescribed_duration_seconds', re.prescribed_duration_seconds,
          'rest_seconds', re.rest_seconds
        ) order by re.position asc
      )
      from public.routine_exercises re
      join public.exercises e on e.id = re.exercise_id
      where re.routine_id = v_routine.id and re.user_id = v_user_id
    )
  ) into v_plan_snapshot;

  -- 9. Insert workout session row
  insert into public.workout_sessions (
    user_id,
    routine_id,
    session_type,
    status,
    routine_name_snapshot,
    routine_version_snapshot,
    timezone_snapshot,
    activity_date,
    plan_snapshot,
    started_at
  )
  values (
    v_user_id,
    v_routine.id,
    v_routine.session_type,
    'in_progress',
    v_routine.name,
    v_routine.version,
    v_user_timezone,
    v_activity_date,
    v_plan_snapshot,
    now()
  )
  returning * into v_new_session;

  -- 10. Insert all session exercises in one statement (atomic)
  insert into public.session_exercises (
    session_id,
    user_id,
    exercise_id,
    position,
    exercise_name_snapshot,
    category_snapshot,
    instructions_snapshot,
    safety_notes_snapshot,
    prescribed_sets,
    prescribed_reps,
    prescribed_duration_seconds,
    rest_seconds,
    completed,
    completed_sets
  )
  select
    v_new_session.id,
    v_user_id,
    re.exercise_id,
    re.position,
    e.name,
    e.category,
    e.instructions,
    e.safety_notes,
    re.prescribed_sets,
    re.prescribed_reps,
    re.prescribed_duration_seconds,
    coalesce(re.rest_seconds, 30),
    false,
    0
  from public.routine_exercises re
  join public.exercises e on e.id = re.exercise_id
  where re.routine_id = v_routine.id
    and re.user_id = v_user_id
  order by re.position asc;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count <> v_exercise_count then
    raise exception 'Exercise snapshot count mismatch'
      using errcode = '22023';
  end if;

  return v_new_session;
end;
$$;

-- ---------------------------------------------------------
-- 3. Execution Grants & Privileges
-- ---------------------------------------------------------

revoke all on function public.start_workout_session(uuid) from public;
revoke all on function public.start_workout_session(uuid) from anon;
grant execute on function public.start_workout_session(uuid) to authenticated;
