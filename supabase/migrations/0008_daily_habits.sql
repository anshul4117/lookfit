-- =========================================================
-- Migration 0008: Daily Habits Persistence & Tracking
-- =========================================================

create table if not exists public.daily_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_key text not null,
  activity_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),

  constraint daily_habits_user_date_key_unique unique (user_id, activity_date, habit_key),
  constraint daily_habits_key_valid check (
    habit_key in ('habit-sleep', 'habit-movement', 'habit-ergonomics', 'habit-nutrition')
  )
);

create index if not exists daily_habits_user_date_idx
  on public.daily_habits (user_id, activity_date desc);

alter table public.daily_habits enable row level security;

create policy daily_habits_select_own
  on public.daily_habits for select to authenticated
  using (user_id = (select auth.uid()));

create policy daily_habits_insert_own
  on public.daily_habits for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy daily_habits_update_own
  on public.daily_habits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy daily_habits_delete_own
  on public.daily_habits for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.daily_habits to authenticated;
