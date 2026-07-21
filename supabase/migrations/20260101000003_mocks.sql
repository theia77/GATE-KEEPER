create table public.mocks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  mock_type text not null check (mock_type in ('standard', 'sectional', 'custom', 'daily_drill', 'weakness_drill')),
  source text not null default 'official' check (source in ('official', 'community')),
  marks_total numeric not null default 100,
  duration_minutes int not null default 180,
  created_by uuid references public.profiles(id),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table public.mock_questions (
  mock_id uuid not null references public.mocks(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index int not null default 0,
  marks_override numeric,
  primary key (mock_id, question_id)
);

-- Custom mocks uploaded by users (CSV/JSON) — extends `mocks` with upload provenance.
create table public.user_uploaded_mocks (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null unique references public.mocks(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id),
  original_filename text not null,
  file_format text not null check (file_format in ('csv', 'json')),
  storage_path text not null,
  parsed_question_count int not null default 0,
  upvotes_count int not null default 0,
  created_at timestamptz not null default now()
);

create index mocks_type_idx on public.mocks(mock_type);
create index mocks_source_idx on public.mocks(source);
create index user_uploaded_mocks_uploader_idx on public.user_uploaded_mocks(uploader_id);
