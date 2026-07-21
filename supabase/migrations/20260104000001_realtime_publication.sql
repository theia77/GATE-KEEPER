-- Enables Supabase Realtime (Postgres logical replication) on the tables both apps
-- need to reflect cross-device, near-instantly: gamification state (so completing the
-- Daily Drill on mobile updates the Streak Armor card on a web tab already open, and
-- vice versa) and public Vault activity (live vote/download counts).
alter publication supabase_realtime add table public.user_progress;
alter publication supabase_realtime add table public.penalty_drills;
alter publication supabase_realtime add table public.notes;
