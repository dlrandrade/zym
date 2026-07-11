-- Zym database schema
-- Run once in Supabase SQL Editor, then run seed.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Atleta',
  goal text not null default 'hipertrofia' check (goal in ('hipertrofia', 'forca', 'condicionamento', 'saude')),
  level text not null default 'iniciante' check (level in ('iniciante', 'intermediario', 'avancado')),
  days_per_week smallint not null default 3 check (days_per_week between 1 and 7),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  default_rest_seconds integer not null default 90 check (default_rest_seconds between 15 and 600),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text not null,
  instructions text[] not null default '{}',
  tips text[] not null default '{}',
  demo_type text not null default 'press' check (demo_type in ('press', 'pull', 'squat', 'hinge', 'lunge', 'curl', 'extension', 'raise', 'core')),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 1800),
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  goal text not null check (goal in ('hipertrofia', 'forca', 'condicionamento', 'saude')),
  level text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  duration_weeks smallint not null default 8 check (duration_weeks between 1 and 52),
  session_minutes smallint not null default 50 check (session_minutes between 10 and 240),
  tags text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.routine_templates(id) on delete cascade,
  name text not null,
  position smallint not null check (position between 1 and 20),
  created_at timestamptz not null default now(),
  unique (template_id, position)
);

create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references public.template_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position smallint not null check (position between 1 and 100),
  sets smallint not null default 3 check (sets between 1 and 30),
  reps_min integer not null default 8 check (reps_min between 0 and 10000),
  reps_max integer not null default 12 check (reps_max between 0 and 10000),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 1800),
  notes text not null default '',
  unique (template_day_id, position)
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_template_id uuid references public.routine_templates(id) on delete set null,
  name text not null,
  goal text not null default 'hipertrofia' check (goal in ('hipertrofia', 'forca', 'condicionamento', 'saude')),
  days_per_week smallint not null default 3 check (days_per_week between 1 and 7),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  name text not null,
  position smallint not null check (position between 1 and 20),
  created_at timestamptz not null default now(),
  unique (routine_id, position)
);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position smallint not null check (position between 1 and 100),
  sets smallint not null default 3 check (sets between 1 and 30),
  reps_min integer not null default 8 check (reps_min between 0 and 10000),
  reps_max integer not null default 12 check (reps_max between 0 and 10000),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 1800),
  notes text not null default '',
  unique (routine_day_id, position)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 172800),
  status text not null default 'active' check (status in ('active', 'completed', 'discarded')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position smallint not null check (position between 1 and 100),
  notes text not null default '',
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 1800),
  created_at timestamptz not null default now(),
  unique (workout_id, position)
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 30),
  set_type text not null default 'normal' check (set_type in ('warmup', 'normal', 'drop', 'failure', 'superset')),
  weight numeric(8,2) not null default 0 check (weight between 0 and 5000),
  reps integer not null default 0 check (reps between 0 and 10000),
  rpe numeric(3,1) check (rpe between 1 and 10),
  completed boolean not null default false,
  completed_at timestamptz,
  previous jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_exercise_id, set_number)
);

create table if not exists public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  scheduled_for date not null,
  name text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight numeric(6,2) check (weight between 1 and 1000),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists routines_user_idx on public.routines(user_id, is_active);
create index if not exists workouts_user_started_idx on public.workouts(user_id, started_at desc);
create index if not exists workouts_user_status_idx on public.workouts(user_id, status);
create index if not exists workout_exercises_workout_idx on public.workout_exercises(workout_id, position);
create index if not exists workout_sets_exercise_idx on public.workout_sets(workout_exercise_id, set_number);
create index if not exists schedule_user_date_idx on public.scheduled_workouts(user_id, scheduled_for);
create index if not exists ai_messages_user_created_idx on public.ai_messages(user_id, created_at desc);
create index if not exists exercises_owner_idx on public.exercises(owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Atleta'), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles','exercises','routine_templates','routines','workouts','workout_sets','scheduled_workouts']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routine_templates enable row level security;
alter table public.template_days enable row level security;
alter table public.template_exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.body_metrics enable row level security;
alter table public.ai_messages enable row level security;

-- Policies are intentionally recreated so this script is safe to re-run.
do $$
declare
  policy record;
begin
  for policy in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', policy.policyname, policy.schemaname, policy.tablename);
  end loop;
end;
$$;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy exercises_read on public.exercises for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy exercises_insert_own on public.exercises for insert to authenticated with check (owner_id = auth.uid());
create policy exercises_update_own on public.exercises for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy exercises_delete_own on public.exercises for delete to authenticated using (owner_id = auth.uid());

create policy templates_read_published on public.routine_templates for select to authenticated using (is_published = true);
create policy template_days_read on public.template_days for select to authenticated using (
  exists (select 1 from public.routine_templates template where template.id = template_id and template.is_published = true)
);
create policy template_exercises_read on public.template_exercises for select to authenticated using (
  exists (
    select 1 from public.template_days day
    join public.routine_templates template on template.id = day.template_id
    where day.id = template_day_id and template.is_published = true
  )
);

create policy routines_all_own on public.routines for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy routine_days_all_own on public.routine_days for all to authenticated using (
  exists (select 1 from public.routines routine where routine.id = routine_id and routine.user_id = auth.uid())
) with check (
  exists (select 1 from public.routines routine where routine.id = routine_id and routine.user_id = auth.uid())
);
create policy routine_exercises_all_own on public.routine_exercises for all to authenticated using (
  exists (
    select 1 from public.routine_days day join public.routines routine on routine.id = day.routine_id
    where day.id = routine_day_id and routine.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.routine_days day join public.routines routine on routine.id = day.routine_id
    where day.id = routine_day_id and routine.user_id = auth.uid()
  )
);

create policy workouts_all_own on public.workouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_exercises_all_own on public.workout_exercises for all to authenticated using (
  exists (select 1 from public.workouts workout where workout.id = workout_id and workout.user_id = auth.uid())
) with check (
  exists (select 1 from public.workouts workout where workout.id = workout_id and workout.user_id = auth.uid())
);
create policy workout_sets_all_own on public.workout_sets for all to authenticated using (
  exists (
    select 1 from public.workout_exercises exercise join public.workouts workout on workout.id = exercise.workout_id
    where exercise.id = workout_exercise_id and workout.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.workout_exercises exercise join public.workouts workout on workout.id = exercise.workout_id
    where exercise.id = workout_exercise_id and workout.user_id = auth.uid()
  )
);

create policy schedules_all_own on public.scheduled_workouts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy metrics_all_own on public.body_metrics for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_all_own on public.ai_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
