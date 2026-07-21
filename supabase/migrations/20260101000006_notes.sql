create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id),
  title text not null,
  content text,
  file_url text,
  file_type text check (file_type in ('pdf', 'image', null)),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  upvotes_count int not null default 0,
  downloads_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_votes (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

create index notes_user_idx on public.notes(user_id);
create index notes_visibility_idx on public.notes(visibility);
create index notes_subject_idx on public.notes(subject_id);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- Keep notes.upvotes_count in sync with note_votes (avoids N+1 counts on every Vault read).
create or replace function public.handle_note_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.notes set upvotes_count = upvotes_count + 1 where id = new.note_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.notes set upvotes_count = greatest(upvotes_count - 1, 0) where id = old.note_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger note_votes_after_change
  after insert or delete on public.note_votes
  for each row execute function public.handle_note_vote_change();
