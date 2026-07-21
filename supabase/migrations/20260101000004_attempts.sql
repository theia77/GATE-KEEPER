create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mock_id uuid references public.mocks(id),
  attempt_type text not null check (attempt_type in ('daily_drill', 'standard_mock', 'sectional_mock', 'custom_mock', 'weakness_drill')),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'abandoned')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  total_marks numeric not null default 0,
  obtained_marks numeric not null default 0,
  percentage numeric,
  created_at timestamptz not null default now()
);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option text,
  is_correct boolean,
  marks_awarded numeric not null default 0,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- Denormalized per-mock result summary (leaderboard/percentile friendly), 1:1 with a submitted attempt.
create table public.mock_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mock_id uuid references public.mocks(id),
  score_percentage numeric not null,
  percentile numeric,
  xp_awarded numeric not null default 0,
  triggered_penalty boolean not null default false,
  created_at timestamptz not null default now()
);

create index attempts_user_idx on public.attempts(user_id);
create index attempts_mock_idx on public.attempts(mock_id);
create index attempt_answers_attempt_idx on public.attempt_answers(attempt_id);
create index mock_results_user_idx on public.mock_results(user_id);
