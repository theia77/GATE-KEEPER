-- Rank thresholds table drives XP -> Rank lookup (Novice -> Grandmaster).
create table public.rank_thresholds (
  rank_name text primary key,
  min_xp int not null,
  sort_order int not null unique
);

insert into public.rank_thresholds (rank_name, min_xp, sort_order) values
  ('Novice', 0, 1),
  ('Cadet', 500, 2),
  ('Sergeant', 1500, 3),
  ('Captain', 3000, 4),
  ('Major', 5500, 5),
  ('Commander', 9000, 6),
  ('Grandmaster', 14000, 7);

-- One row per user: the live, server-authoritative gamification state.
create table public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp_total numeric not null default 0,
  rank_name text not null default 'Novice' references public.rank_thresholds(rank_name),
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_drill_date date,
  locked boolean not null default false,
  active_penalty_drill_id uuid,
  questions_solved int not null default 0,
  questions_correct int not null default 0,
  accuracy_pct numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- One row per user per calendar day the mandatory daily drill was completed/missed.
create table public.streak_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  drill_date date not null,
  completed boolean not null default false,
  attempt_id uuid references public.attempts(id),
  xp_earned numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, drill_date)
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  reason text not null check (reason in ('daily_drill', 'mock_submit', 'streak_bonus', 'weakness_drill_clear', 'note_upvoted', 'manual_adjustment')),
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- Targeted lockout state created when a Mock scores < 40%.
create table public.penalty_drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  triggered_by_attempt_id uuid not null references public.attempts(id),
  weak_subject_ids uuid[] not null default '{}',
  drill_mock_id uuid references public.mocks(id),
  status text not null default 'active' check (status in ('active', 'cleared')),
  created_at timestamptz not null default now(),
  cleared_at timestamptz
);

alter table public.user_progress
  add constraint user_progress_active_penalty_fk
  foreign key (active_penalty_drill_id) references public.penalty_drills(id);

create index xp_transactions_user_idx on public.xp_transactions(user_id);
create index penalty_drills_user_idx on public.penalty_drills(user_id);
create index penalty_drills_status_idx on public.penalty_drills(status);

-- Bootstrap a user_progress row whenever a profile is created.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_progress (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();
