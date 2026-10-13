-- Migration 0005: Atomic Routine Management and Versioning RPCs
--
-- Provides transactional safety for creating and updating routine versions.
-- Ensures that:
--  1. New routines and their exercise prescriptions are created atomically.
--  2. Routine updates atomically archive the previous version and create
--     the incremented version with new exercises.
--  3. Concurrency protection via 'SELECT ... FOR UPDATE' on the source routine.
--  4. Server-authoritative version calculation (v_prev.version + 1).

-- ---------------------------------------------------------
-- 1. Create Routine With Exercises (Atomic RPC)
-- ---------------------------------------------------------

create or replace function public.create_routine_with_exercises(
  p_name text,
  p_session_type public.session_type,
  p_estimated_minutes smallint default 20,
  p_exercises jsonb default '[]'::jsonb,
  p_generated_by text default 'user'
)
returns public.routines
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_routine public.routines%rowtype;
  v_exercise_item jsonb;
  v_exercise_id uuid;
  v_position smallint;
  v_sets smallint;
  v_reps smallint;
  v_duration integer;
  v_rest smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Routine name is required'
      using errcode = '22023';
  end if;

  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'Routine must contain at least one exercise'
      using errcode = '22023';
  end if;

  if p_estimated_minutes is null or p_estimated_minutes < 1 or p_estimated_minutes > 180 then
    raise exception 'Estimated minutes must be between 1 and 180'
      using errcode = '22023';
  end if;

  -- Validate unique positions before inserting
  if exists (
    select 1
    from jsonb_array_elements(p_exercises) as x(item)
    group by (x.item ->> 'position')::smallint
    having count(*) > 1
  ) then
    raise exception 'Each exercise in the routine must have a unique position number'
      using errcode = '22023';
  end if;

  -- Insert new routine header with version 1 and active status
  insert into public.routines (
    user_id,
    name,
    session_type,
    version,
    status,
    estimated_minutes,
    generated_by
  )
  values (
    v_user_id,
    trim(p_name),
    p_session_type,
    1,
    'active',
    p_estimated_minutes,
    coalesce(nullif(trim(p_generated_by), ''), 'user')
  )
  returning * into v_new_routine;

  -- Insert all exercise items
  for v_exercise_item in
    select item from jsonb_array_elements(p_exercises) as x(item)
  loop
    v_exercise_id := (v_exercise_item ->> 'exercise_id')::uuid;
    v_position := (v_exercise_item ->> 'position')::smallint;
    v_sets := case when v_exercise_item ->> 'prescribed_sets' is not null then (v_exercise_item ->> 'prescribed_sets')::smallint else null end;
    v_reps := case when v_exercise_item ->> 'prescribed_reps' is not null then (v_exercise_item ->> 'prescribed_reps')::smallint else null end;
    v_duration := case when v_exercise_item ->> 'prescribed_duration_seconds' is not null then (v_exercise_item ->> 'prescribed_duration_seconds')::integer else null end;
    v_rest := coalesce((v_exercise_item ->> 'rest_seconds')::smallint, 30);

    if v_reps is null and v_duration is null then
      raise exception 'Each routine exercise must specify either prescribed reps or duration'
        using errcode = '22023';
    end if;

    insert into public.routine_exercises (
      routine_id,
      user_id,
      exercise_id,
      position,
      prescribed_sets,
      prescribed_reps,
      prescribed_duration_seconds,
      rest_seconds
    )
    values (
      v_new_routine.id,
      v_user_id,
      v_exercise_id,
      v_position,
      v_sets,
      v_reps,
      v_duration,
      v_rest
    );
  end loop;

  return v_new_routine;
end;
$$;

-- ---------------------------------------------------------
-- 2. Update Routine Version (Atomic RPC with Concurrency Lock)
-- ---------------------------------------------------------

create or replace function public.update_routine_version(
  p_routine_id uuid,
  p_name text default null,
  p_estimated_minutes smallint default null,
  p_exercises jsonb default '[]'::jsonb
)
returns public.routines
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_prev_routine public.routines%rowtype;
  v_new_routine public.routines%rowtype;
  v_exercise_item jsonb;
  v_exercise_id uuid;
  v_position smallint;
  v_sets smallint;
  v_reps smallint;
  v_duration integer;
  v_rest smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'Routine must contain at least one exercise'
      using errcode = '22023';
  end if;

  -- Lock previous routine row against concurrent modifications
  select *
  into v_prev_routine
  from public.routines
  where id = p_routine_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Routine not found'
      using errcode = 'P0002';
  end if;

  if v_prev_routine.status = 'archived' then
    raise exception 'Cannot update an archived routine'
      using errcode = '55000';
  end if;

  -- Validate unique positions before inserting
  if exists (
    select 1
    from jsonb_array_elements(p_exercises) as x(item)
    group by (x.item ->> 'position')::smallint
    having count(*) > 1
  ) then
    raise exception 'Each exercise in the routine must have a unique position number'
      using errcode = '22023';
  end if;

  -- 1. Archive the previous routine version (leaves its routine_exercises intact)
  update public.routines
  set status = 'archived',
      updated_at = now()
  where id = p_routine_id and user_id = v_user_id;

  -- 2. Create incremented version row with active status
  insert into public.routines (
    user_id,
    name,
    session_type,
    version,
    status,
    estimated_minutes,
    generated_by
  )
  values (
    v_user_id,
    coalesce(nullif(trim(p_name), ''), v_prev_routine.name),
    v_prev_routine.session_type,
    v_prev_routine.version + 1,
    'active',
    coalesce(p_estimated_minutes, v_prev_routine.estimated_minutes),
    v_prev_routine.generated_by
  )
  returning * into v_new_routine;

  -- 3. Insert new exercises into the incremented version
  for v_exercise_item in
    select item from jsonb_array_elements(p_exercises) as x(item)
  loop
    v_exercise_id := (v_exercise_item ->> 'exercise_id')::uuid;
    v_position := (v_exercise_item ->> 'position')::smallint;
    v_sets := case when v_exercise_item ->> 'prescribed_sets' is not null then (v_exercise_item ->> 'prescribed_sets')::smallint else null end;
    v_reps := case when v_exercise_item ->> 'prescribed_reps' is not null then (v_exercise_item ->> 'prescribed_reps')::smallint else null end;
    v_duration := case when v_exercise_item ->> 'prescribed_duration_seconds' is not null then (v_exercise_item ->> 'prescribed_duration_seconds')::integer else null end;
    v_rest := coalesce((v_exercise_item ->> 'rest_seconds')::smallint, 30);

    if v_reps is null and v_duration is null then
      raise exception 'Each routine exercise must specify either prescribed reps or duration'
        using errcode = '22023';
    end if;

    insert into public.routine_exercises (
      routine_id,
      user_id,
      exercise_id,
      position,
      prescribed_sets,
      prescribed_reps,
      prescribed_duration_seconds,
      rest_seconds
    )
    values (
      v_new_routine.id,
      v_user_id,
      v_exercise_id,
      v_position,
      v_sets,
      v_reps,
      v_duration,
      v_rest
    );
  end loop;

  return v_new_routine;
end;
$$;

-- ---------------------------------------------------------
-- 3. Archive Routine (Atomic RPC)
-- ---------------------------------------------------------

create or replace function public.archive_routine(
  p_routine_id uuid
)
returns public.routines
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_routine public.routines%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  update public.routines
  set status = 'archived',
      updated_at = now()
  where id = p_routine_id and user_id = v_user_id
  returning * into v_routine;

  if not found then
    raise exception 'Routine not found'
      using errcode = 'P0002';
  end if;

  return v_routine;
end;
$$;
