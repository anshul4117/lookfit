-- Fitness App MVP — initial schema
-- Apply only to a fresh development database.
-- Future schema changes must use new migration files.

create extension if not exists pgcrypto;

create schema if not exists private;

create type public.fitness_level as enum (
  'beginner', 'intermediate', 'advanced'
);

create type public.session_type as enum ('morning', 'evening');

create type public.workout_status as enum (
  'in_progress', 'completed', 'cancelled'
);

create type public.exercise_category as enum (
  'mobility', 'stretching', 'posture',
  'push', 'pull', 'legs', 'core', 'cardio'
);

create type public.routine_status as enum ('draft', 'active', 'archived');

-- ---------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  age_years smallint,
  fitness_level public.fitness_level not null default 'intermediate',
  goals text[] not null default array[
    'mobility', 'posture', 'strength', 'general_fitness'
  ]::text[],
  limitations text[] not null default '{}'::text[],
  available_minutes smallint not null default 20,
  timezone text not null default 'Asia/Kolkata',
  morning_time time not null default '06:30',
  evening_time time not null default '18:30',
  reminders_enabled boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profile_age_valid
    check (age_years is null or age_years between 10 and 100),
  constraint profile_duration_valid
    check (available_minutes between 5 and 120),
  constraint profile_timezone_not_empty
    check (length(trim(timezone)) > 0),
  constraint profile_goals_valid
    check (goals <@ array[
      'mobility', 'posture', 'strength', 'general_fitness',
      'flexibility', 'cardio'
    ]::text[])
);

-- Create a profile automatically after Supabase Auth creates a user.
create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- Global exercise catalog
-- Catalog rows are read-only to normal authenticated users.
-- ---------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category public.exercise_category not null,
  target_areas text[] not null default '{}'::text[],
  goal_tags text[] not null default '{}'::text[],
  difficulty public.fitness_level not null default 'beginner',
  equipment text[] not null default '{}'::text[],
  instructions text[] not null,
  safety_notes text not null,
  default_sets smallint,
  default_reps smallint,
  default_duration_seconds integer,
  default_rest_seconds smallint not null default 30,
  media_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint exercise_name_not_empty check (length(trim(name)) > 0),
  constraint exercise_instructions_nonempty
    check (cardinality(instructions) > 0),
  constraint exercise_sets_valid
    check (default_sets is null or default_sets between 1 and 20),
  constraint exercise_reps_valid
    check (default_reps is null or default_reps between 1 and 200),
  constraint exercise_duration_valid
    check (
      default_duration_seconds is null
      or default_duration_seconds between 5 and 3600
    ),
  constraint exercise_rest_valid
    check (default_rest_seconds between 0 and 600),
  constraint exercise_target_defined
    check (
      default_reps is not null
      or default_duration_seconds is not null
    )
);

create index exercises_category_active_idx
  on public.exercises (category, difficulty)
  where is_active = true;

create index exercises_goal_tags_idx
  on public.exercises using gin (goal_tags);

create index exercises_target_areas_idx
  on public.exercises using gin (target_areas);

-- ---------------------------------------------------------
-- User-owned routines
-- ---------------------------------------------------------

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  session_type public.session_type not null,
  version integer not null default 1,
  status public.routine_status not null default 'draft',
  estimated_minutes smallint not null default 20,
  generated_by text not null default 'deterministic_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint routine_name_not_empty check (length(trim(name)) > 0),
  constraint routine_version_valid check (version > 0),
  constraint routine_duration_valid check (estimated_minutes between 1 and 180),
  constraint routines_id_user_unique unique (id, user_id)
);

create index routines_user_status_idx
  on public.routines (user_id, status, session_type);

create trigger routines_touch_updated_at
before update on public.routines
for each row execute function public.touch_updated_at();

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position smallint not null,
  prescribed_sets smallint,
  prescribed_reps smallint,
  prescribed_duration_seconds integer,
  rest_seconds smallint not null default 30,
  created_at timestamptz not null default now(),

  constraint routine_exercise_position_valid check (position > 0),
  constraint routine_exercise_sets_valid
    check (prescribed_sets is null or prescribed_sets between 1 and 20),
  constraint routine_exercise_reps_valid
    check (prescribed_reps is null or prescribed_reps between 1 and 200),
  constraint routine_exercise_duration_valid
    check (
      prescribed_duration_seconds is null
      or prescribed_duration_seconds between 5 and 3600
    ),
  constraint routine_exercise_rest_valid check (rest_seconds between 0 and 600),
  constraint routine_exercise_target_defined
    check (
      prescribed_reps is not null
      or prescribed_duration_seconds is not null
    ),
  constraint routine_exercise_position_unique
    unique (routine_id, position),
  constraint routine_exercise_routine_owner_fk
    foreign key (routine_id, user_id)
    references public.routines(id, user_id) on delete cascade
);

create index routine_exercises_user_routine_idx
  on public.routine_exercises (user_id, routine_id, position);

create index routine_exercises_catalog_idx
  on public.routine_exercises (exercise_id);

-- ---------------------------------------------------------
-- Workout sessions
-- Snapshot columns are copied at session start.
-- Do not build historical views from the current routine.
-- ---------------------------------------------------------

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid,
  session_type public.session_type not null,
  status public.workout_status not null default 'in_progress',
  routine_name_snapshot text not null,
  routine_version_snapshot integer not null,
  timezone_snapshot text not null,
  activity_date date not null,
  plan_snapshot jsonb not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),

  constraint workout_routine_owner_fk
    foreign key (routine_id, user_id)
    references public.routines(id, user_id) on delete set null,
  constraint workout_snapshot_object
    check (jsonb_typeof(plan_snapshot) = 'object'),
  constraint workout_version_valid check (routine_version_snapshot > 0),
  constraint workout_duration_valid
    check (duration_seconds is null or duration_seconds >= 0),
  constraint workout_completion_consistent
    check (
      (status = 'completed' and completed_at is not null)
      or
      (status <> 'completed' and completed_at is null)
    )
);

create index workout_sessions_user_date_idx
  on public.workout_sessions (user_id, activity_date desc);

create index workout_sessions_user_status_idx
  on public.workout_sessions (user_id, status, started_at desc);

create index workout_sessions_routine_idx
  on public.workout_sessions (routine_id)
  where routine_id is not null;

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  position smallint not null,
  exercise_name_snapshot text not null,
  category_snapshot public.exercise_category not null,
  instructions_snapshot text[] not null,
  safety_notes_snapshot text not null,
  prescribed_sets smallint,
  prescribed_reps smallint,
  prescribed_duration_seconds integer,
  rest_seconds smallint not null default 30,
  completed boolean not null default false,
  completed_sets smallint not null default 0,
  completed_reps smallint,
  actual_duration_seconds integer,
  notes text,
  created_at timestamptz not null default now(),

  constraint session_exercise_position_valid check (position > 0),
  constraint session_exercise_position_unique unique (session_id, position),
  constraint session_exercise_sets_valid
    check (
      (prescribed_sets is null or prescribed_sets between 1 and 20)
      and completed_sets between 0 and 20
    ),
  constraint session_exercise_reps_valid
    check (
      (prescribed_reps is null or prescribed_reps between 1 and 200)
      and (completed_reps is null or completed_reps between 0 and 200)
    ),
  constraint session_exercise_duration_valid
    check (
      (prescribed_duration_seconds is null
        or prescribed_duration_seconds between 5 and 3600)
      and (actual_duration_seconds is null
        or actual_duration_seconds between 0 and 86400)
    ),
  constraint session_exercise_rest_valid check (rest_seconds between 0 and 600)
);

create index session_exercises_session_order_idx
  on public.session_exercises (session_id, position);

create index session_exercises_user_session_idx
  on public.session_exercises (user_id, session_id);

-- ---------------------------------------------------------
-- Optional body measurements
-- ---------------------------------------------------------

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),

  constraint measurement_weight_valid
    check (weight_kg is null or weight_kg between 1 and 500),
  constraint measurement_height_valid
    check (height_cm is null or height_cm between 30 and 300),
  constraint measurement_not_empty
    check (weight_kg is not null or height_cm is not null or notes is not null)
);

create index body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_at desc);

-- ---------------------------------------------------------
-- Immutable history protections
-- ---------------------------------------------------------

create or replace function private.guard_workout_session_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('completed', 'cancelled') then
    raise exception 'Finalized workout sessions cannot be modified'
      using errcode = '55000';
  end if;

  if new.user_id is distinct from old.user_id
     or new.routine_name_snapshot is distinct from old.routine_name_snapshot
     or new.routine_version_snapshot is distinct from old.routine_version_snapshot
     or new.timezone_snapshot is distinct from old.timezone_snapshot
     or new.activity_date is distinct from old.activity_date
     or new.plan_snapshot is distinct from old.plan_snapshot
     or new.started_at is distinct from old.started_at
     or new.session_type is distinct from old.session_type then
    raise exception 'Workout snapshot fields are immutable'
      using errcode = '55000';
  end if;

  if old.status = 'in_progress'
     and new.status not in ('in_progress', 'completed', 'cancelled') then
    raise exception 'Invalid workout state transition'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger workout_sessions_guard_update
before update on public.workout_sessions
for each row execute function private.guard_workout_session_update();

create or replace function private.guard_session_exercise_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status public.workout_status;
begin
  if tg_op = 'DELETE' then
    select status into parent_status
    from public.workout_sessions
    where id = old.session_id;

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

create trigger session_exercises_guard_update
before update on public.session_exercises
for each row execute function private.guard_session_exercise_update();

create trigger session_exercises_guard_delete
before delete on public.session_exercises
for each row execute function private.guard_session_exercise_update();

-- ---------------------------------------------------------
-- Atomic completion function
--
-- p_results example:
-- [
--   {
--     "session_exercise_id": "UUID",
--     "completed": true,
--     "completed_sets": 3,
--     "completed_reps": 10,
--     "actual_duration_seconds": 45,
--     "notes": null
--   }
-- ]
--
-- The caller must authenticate through Supabase Auth.
-- This function does not bypass RLS.
-- ---------------------------------------------------------

create or replace function public.complete_workout_session(
  p_session_id uuid,
  p_results jsonb
)
returns public.workout_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_result jsonb;
  v_exercise_id uuid;
  v_updated_count integer := 0;
  v_total_count integer := 0;
  v_completed_count integer := 0;
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

  -- Reject duplicate exercise IDs before applying updates.
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

  -- Results must account for every exercise in the snapshot.
  if jsonb_array_length(p_results) <> v_total_count then
    raise exception 'Submit exactly one result per session exercise'
      using errcode = '22023';
  end if;

  select count(*) into v_completed_count
  from public.session_exercises
  where session_id = p_session_id
    and user_id = v_user_id
    and completed = true;

  v_duration := greatest(
    0,
    floor(extract(epoch from (now() - v_session.started_at)))::integer
  );

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

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.body_measurements enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using (user_id = (select auth.uid()));

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check (user_id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy exercises_read_active
on public.exercises for select to authenticated
using (is_active = true);

create policy routines_select_own
on public.routines for select to authenticated
using (user_id = (select auth.uid()));

create policy routines_insert_own
on public.routines for insert to authenticated
with check (user_id = (select auth.uid()));

create policy routines_update_own
on public.routines for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy routines_delete_own
on public.routines for delete to authenticated
using (user_id = (select auth.uid()));

create policy routine_exercises_select_own
on public.routine_exercises for select to authenticated
using (user_id = (select auth.uid()));

create policy routine_exercises_insert_own
on public.routine_exercises for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routines r
    where r.id = routine_id
      and r.user_id = (select auth.uid())
      and r.status <> 'archived'
  )
);

create policy routine_exercises_update_own
on public.routine_exercises for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routines r
    where r.id = routine_id and r.user_id = (select auth.uid())
  )
);

create policy routine_exercises_delete_own
on public.routine_exercises for delete to authenticated
using (user_id = (select auth.uid()));

create policy workout_sessions_select_own
on public.workout_sessions for select to authenticated
using (user_id = (select auth.uid()));

create policy workout_sessions_insert_own
on public.workout_sessions for insert to authenticated
with check (user_id = (select auth.uid()));

create policy workout_sessions_update_own
on public.workout_sessions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy workout_sessions_delete_in_progress_own
on public.workout_sessions for delete to authenticated
using (
  user_id = (select auth.uid())
  and status = 'in_progress'
);

create policy session_exercises_select_own
on public.session_exercises for select to authenticated
using (user_id = (select auth.uid()));

create policy session_exercises_insert_own
on public.session_exercises for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workout_sessions s
    where s.id = session_id
      and s.user_id = (select auth.uid())
      and s.status = 'in_progress'
  )
);

create policy session_exercises_update_own
on public.session_exercises for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workout_sessions s
    where s.id = session_id
      and s.user_id = (select auth.uid())
      and s.status = 'in_progress'
  )
)
with check (user_id = (select auth.uid()));

create policy session_exercises_delete_own
on public.session_exercises for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.workout_sessions s
    where s.id = session_id
      and s.user_id = (select auth.uid())
      and s.status = 'in_progress'
  )
);

create policy body_measurements_select_own
on public.body_measurements for select to authenticated
using (user_id = (select auth.uid()));

create policy body_measurements_insert_own
on public.body_measurements for insert to authenticated
with check (user_id = (select auth.uid()));

create policy body_measurements_update_own
on public.body_measurements for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy body_measurements_delete_own
on public.body_measurements for delete to authenticated
using (user_id = (select auth.uid()));

-- Restrict access to the completion function to authenticated callers.
revoke all on function public.complete_workout_session(uuid, jsonb)
  from public, anon;
grant execute on function public.complete_workout_session(uuid, jsonb)
  to authenticated;

-- The private helper schema must not be accessible to browser roles.
revoke all on schema private from public, anon, authenticated;

-- Notes:
-- 1. Supabase project defaults/grants should be reviewed during deployment.
-- 2. Keep migrations immutable once applied to a shared environment.
-- 3. Seed catalog rows through the trusted migration/seed workflow.