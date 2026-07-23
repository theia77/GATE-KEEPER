-- Learning Arena: short lesson content per subject/chapter, distinct from questions.
-- Public reference data (like subjects/questions) — readable by everyone, no client
-- insert/update policy since content is authored by us, not users.
create table public.learning_notes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  sub_topic text not null,
  title text not null,
  content text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index learning_notes_subject_subtopic_idx on public.learning_notes(subject_id, sub_topic, order_index);

alter table public.learning_notes enable row level security;
create policy "learning_notes_select_all" on public.learning_notes for select using (true);
