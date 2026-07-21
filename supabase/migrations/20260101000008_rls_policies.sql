-- Row Level Security. Baseline rule: users read their own private data + all public
-- reference/community data, and write only rows they own. Gamification state
-- (user_progress, streak_log, xp_transactions, penalty_drills) has NO client update/insert
-- policy at all — those are mutated exclusively by SECURITY DEFINER functions/triggers
-- (Phase 2) or the service role, so a user cannot edit their own streak/XP/lock by hand.

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.questions enable row level security;
alter table public.mocks enable row level security;
alter table public.mock_questions enable row level security;
alter table public.user_uploaded_mocks enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.mock_results enable row level security;
alter table public.rank_thresholds enable row level security;
alter table public.user_progress enable row level security;
alter table public.streak_log enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.penalty_drills enable row level security;
alter table public.notes enable row level security;
alter table public.note_votes enable row level security;
alter table public.push_tokens enable row level security;

-- profiles: public read (leaderboard/usernames), self write
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- subjects, rank_thresholds: public reference data
create policy "subjects_select_all" on public.subjects for select using (true);
create policy "rank_thresholds_select_all" on public.rank_thresholds for select using (true);

-- questions: everyone can read active questions; community authors can insert their own
create policy "questions_select_active" on public.questions for select using (is_active = true);
create policy "questions_insert_own_community" on public.questions for insert
  with check (source = 'community' and created_by = auth.uid());

-- mocks: published mocks readable by all; owners can read/manage their own drafts
create policy "mocks_select_published" on public.mocks for select using (status = 'published' or created_by = auth.uid());
create policy "mocks_insert_own" on public.mocks for insert with check (created_by = auth.uid());
create policy "mocks_update_own" on public.mocks for update using (created_by = auth.uid());

create policy "mock_questions_select" on public.mock_questions for select using (
  exists (select 1 from public.mocks m where m.id = mock_id and (m.status = 'published' or m.created_by = auth.uid()))
);

create policy "user_uploaded_mocks_select_all" on public.user_uploaded_mocks for select using (true);
create policy "user_uploaded_mocks_insert_own" on public.user_uploaded_mocks for insert with check (uploader_id = auth.uid());

-- attempts / answers / results: strictly own-data
create policy "attempts_select_own" on public.attempts for select using (user_id = auth.uid());
create policy "attempts_insert_own" on public.attempts for insert with check (user_id = auth.uid());
create policy "attempts_update_own" on public.attempts for update using (user_id = auth.uid());

create policy "attempt_answers_select_own" on public.attempt_answers for select using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);
create policy "attempt_answers_insert_own" on public.attempt_answers for insert with check (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);
create policy "attempt_answers_update_own" on public.attempt_answers for update using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

create policy "mock_results_select_own" on public.mock_results for select using (user_id = auth.uid());

-- gamification state: read-only for the owner, no insert/update/delete policy for anon/authenticated
create policy "user_progress_select_own" on public.user_progress for select using (user_id = auth.uid());
create policy "streak_log_select_own" on public.streak_log for select using (user_id = auth.uid());
create policy "xp_transactions_select_own" on public.xp_transactions for select using (user_id = auth.uid());
create policy "penalty_drills_select_own" on public.penalty_drills for select using (user_id = auth.uid());

-- notes: public notes readable by everyone, private notes only by owner; owner manages own notes
create policy "notes_select_public_or_own" on public.notes for select using (visibility = 'public' or user_id = auth.uid());
create policy "notes_insert_own" on public.notes for insert with check (user_id = auth.uid());
create policy "notes_update_own" on public.notes for update using (user_id = auth.uid());
create policy "notes_delete_own" on public.notes for delete using (user_id = auth.uid());

-- note_votes: readable by all (vote counts), users can vote/unvote for themselves only,
-- and never on their own note.
create policy "note_votes_select_all" on public.note_votes for select using (true);
create policy "note_votes_insert_own" on public.note_votes for insert with check (
  user_id = auth.uid()
  and not exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
);
create policy "note_votes_delete_own" on public.note_votes for delete using (user_id = auth.uid());

-- push_tokens: owner only
create policy "push_tokens_select_own" on public.push_tokens for select using (user_id = auth.uid());
create policy "push_tokens_insert_own" on public.push_tokens for insert with check (user_id = auth.uid());
create policy "push_tokens_delete_own" on public.push_tokens for delete using (user_id = auth.uid());
