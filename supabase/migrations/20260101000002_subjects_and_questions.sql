-- The 7 GATE DA syllabus sections + General Aptitude
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null check (category in ('core', 'aptitude')),
  marks_weight numeric not null default 0,
  sort_order int not null default 0
);

insert into public.subjects (code, name, category, marks_weight, sort_order) values
  ('prob_stats', 'Probability and Statistics', 'core', 0, 1),
  ('linear_algebra', 'Linear Algebra', 'core', 0, 2),
  ('calculus_opt', 'Calculus and Optimization', 'core', 0, 3),
  ('pdsa', 'Programming, Data Structures and Algorithms', 'core', 0, 4),
  ('dbms_warehousing', 'Database Management and Warehousing', 'core', 0, 5),
  ('machine_learning', 'Machine Learning', 'core', 0, 6),
  ('ai_reasoning', 'AI (Search, Logic, Reasoning under Uncertainty)', 'core', 0, 7),
  ('general_aptitude', 'General Aptitude', 'aptitude', 15, 8);

-- 85 marks split evenly across the 7 core sections as a sane default (documented assumption).
update public.subjects set marks_weight = 85.0 / 7 where category = 'core';

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id),
  prompt text not null,
  options jsonb not null, -- [{ "key": "A", "text": "..." }, ...]
  correct_option text not null,
  question_type text not null default 'mcq' check (question_type in ('mcq', 'msq', 'nat')),
  explanation text,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  marks numeric not null default 1,
  negative_marks numeric not null default 0.33,
  source text not null default 'official' check (source in ('official', 'community')),
  created_by uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index questions_subject_idx on public.questions(subject_id);
create index questions_source_idx on public.questions(source);
