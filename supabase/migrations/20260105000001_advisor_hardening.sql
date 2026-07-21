-- Fixes from Supabase security/performance advisors after the initial deploy:
-- 1. set_updated_at was missing a pinned search_path (mutable search_path on a
--    SECURITY INVOKER trigger function is still a hijack vector via session-level
--    search_path tricks).
-- 2. Trigger-only functions (handle_new_user, handle_new_profile,
--    handle_note_vote_change, enforce_penalty_lock, set_updated_at) are, by default,
--    exposed as callable RPC endpoints to anon/authenticated via PostgREST just by
--    living in the public schema. They can only ever run in a real trigger context
--    (calling them directly raises "trigger functions can only be called as
--    triggers"), but revoking EXECUTE explicitly closes the exposure rather than
--    relying on that runtime error.
-- 3. RLS policies calling auth.uid() directly get re-evaluated per row; wrapping as
--    (select auth.uid()) lets Postgres evaluate it once per statement instead.
-- 4. A handful of foreign keys had no covering index, which costs on join/cascade.

alter function public.set_updated_at() set search_path = public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_profile() from public, anon, authenticated;
revoke all on function public.handle_note_vote_change() from public, anon, authenticated;
revoke all on function public.enforce_penalty_lock() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter policy "profiles_update_own" on public.profiles using ((select auth.uid()) = id);

alter policy "questions_insert_own_community" on public.questions
  with check (source = 'community' and created_by = (select auth.uid()));

alter policy "mocks_select_published" on public.mocks
  using (status = 'published' or created_by = (select auth.uid()));
alter policy "mocks_insert_own" on public.mocks with check (created_by = (select auth.uid()));
alter policy "mocks_update_own" on public.mocks using (created_by = (select auth.uid()));

alter policy "mock_questions_select" on public.mock_questions
  using (exists (select 1 from public.mocks m where m.id = mock_id and (m.status = 'published' or m.created_by = (select auth.uid()))));

alter policy "user_uploaded_mocks_insert_own" on public.user_uploaded_mocks
  with check (uploader_id = (select auth.uid()));

alter policy "attempts_select_own" on public.attempts using (user_id = (select auth.uid()));
alter policy "attempts_insert_own" on public.attempts with check (user_id = (select auth.uid()));
alter policy "attempts_update_own" on public.attempts using (user_id = (select auth.uid()));

alter policy "attempt_answers_select_own" on public.attempt_answers
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));
alter policy "attempt_answers_insert_own" on public.attempt_answers
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));
alter policy "attempt_answers_update_own" on public.attempt_answers
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

alter policy "mock_results_select_own" on public.mock_results using (user_id = (select auth.uid()));

alter policy "user_progress_select_own" on public.user_progress using (user_id = (select auth.uid()));
alter policy "streak_log_select_own" on public.streak_log using (user_id = (select auth.uid()));
alter policy "xp_transactions_select_own" on public.xp_transactions using (user_id = (select auth.uid()));
alter policy "penalty_drills_select_own" on public.penalty_drills using (user_id = (select auth.uid()));

alter policy "notes_select_public_or_own" on public.notes using (visibility = 'public' or user_id = (select auth.uid()));
alter policy "notes_insert_own" on public.notes with check (user_id = (select auth.uid()));
alter policy "notes_update_own" on public.notes using (user_id = (select auth.uid()));
alter policy "notes_delete_own" on public.notes using (user_id = (select auth.uid()));

alter policy "note_votes_insert_own" on public.note_votes
  with check (user_id = (select auth.uid()) and not exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid())));
alter policy "note_votes_delete_own" on public.note_votes using (user_id = (select auth.uid()));

alter policy "push_tokens_select_own" on public.push_tokens using (user_id = (select auth.uid()));
alter policy "push_tokens_insert_own" on public.push_tokens with check (user_id = (select auth.uid()));
alter policy "push_tokens_delete_own" on public.push_tokens using (user_id = (select auth.uid()));

create index if not exists attempt_answers_question_idx on public.attempt_answers(question_id);
create index if not exists mock_questions_question_idx on public.mock_questions(question_id);
create index if not exists mock_results_mock_idx on public.mock_results(mock_id);
create index if not exists mocks_created_by_idx on public.mocks(created_by);
create index if not exists note_votes_user_idx on public.note_votes(user_id);
create index if not exists penalty_drills_drill_mock_idx on public.penalty_drills(drill_mock_id);
create index if not exists penalty_drills_triggered_by_idx on public.penalty_drills(triggered_by_attempt_id);
create index if not exists questions_created_by_idx on public.questions(created_by);
create index if not exists streak_log_attempt_idx on public.streak_log(attempt_id);
create index if not exists user_progress_active_penalty_idx on public.user_progress(active_penalty_drill_id);
create index if not exists user_progress_rank_name_idx on public.user_progress(rank_name);
