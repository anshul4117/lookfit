-- Fitness App MVP — Posture & Mobility Taxonomy Update
-- Migration 0003: Adds 'posture_spine' category and 'routine_tags' to exercises
-- Safe and idempotent for fresh or existing environments.

-- ---------------------------------------------------------
-- 1. Add 'posture_spine' to exercise_category enum
-- ---------------------------------------------------------

alter type public.exercise_category add value if not exists 'posture_spine';

-- ---------------------------------------------------------
-- 2. Add 'routine_tags' column to public.exercises
-- Allowed values: 'morning', 'evening', 'both'
-- ---------------------------------------------------------

alter table public.exercises
  add column if not exists routine_tags text[] not null default array['both']::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercise_routine_tags_valid'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercise_routine_tags_valid
      check (routine_tags <@ array['morning', 'evening', 'both']::text[]);
  end if;
end $$;

-- ---------------------------------------------------------
-- 3. GIN index for routine suitability filtering
-- ---------------------------------------------------------

create index if not exists exercises_routine_tags_idx
  on public.exercises using gin (routine_tags);
