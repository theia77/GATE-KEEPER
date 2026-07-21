-- Streak Armor: mandatory daily 10-question drill. Internal primitive, called only
-- from submit_attempt() below when attempt_type = 'daily_drill'. Not exposed to clients.

create or replace function public.record_daily_drill_completion(
  p_user_id uuid,
  p_attempt_id uuid,
  p_xp_earned numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_last_drill_date date;
  v_current_streak int;
  v_best_streak int;
begin
  select last_drill_date, current_streak, best_streak
  into v_last_drill_date, v_current_streak, v_best_streak
  from public.user_progress
  where user_id = p_user_id
  for update;

  -- Idempotent: re-submitting the same day's drill (shouldn't normally happen) doesn't
  -- double-count the streak.
  if v_last_drill_date = v_today then
    return;
  end if;

  if v_last_drill_date = v_today - 1 then
    v_current_streak := v_current_streak + 1;
  else
    -- Gap of >= 2 days (or first-ever drill): streak resets and restarts at 1 today.
    v_current_streak := 1;
  end if;

  v_best_streak := greatest(v_best_streak, v_current_streak);

  update public.user_progress
  set current_streak = v_current_streak,
      best_streak = v_best_streak,
      last_drill_date = v_today,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.streak_log (user_id, drill_date, completed, attempt_id, xp_earned)
  values (p_user_id, v_today, true, p_attempt_id, p_xp_earned)
  on conflict (user_id, drill_date)
  do update set completed = true, attempt_id = excluded.attempt_id, xp_earned = excluded.xp_earned;

  -- Milestone streak bonus every 7 days, on top of the per-drill XP already awarded by submit_attempt.
  if v_current_streak > 0 and v_current_streak % 7 = 0 then
    perform public.award_xp(p_user_id, 100, 'streak_bonus', 'streak_log', p_attempt_id);
  end if;
end;
$$;

revoke all on function public.record_daily_drill_completion(uuid, uuid, numeric) from public, authenticated, anon;
grant execute on function public.record_daily_drill_completion(uuid, uuid, numeric) to service_role;

-- Nightly authoritative reset: a user's DB state must reflect a broken streak even if
-- they never open the app again (client-side-only reset logic could be bypassed by a
-- user who simply never syncs). Grace period: this runs 4 hours after UTC midnight, so
-- a drill completed any time on `drill_date` remains valid; only users whose
-- last_drill_date is more than one full day stale get reset. Schedule via pg_cron
-- (enabled below) at 04:00 UTC daily.
create or replace function public.reset_missed_streaks()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset_count int;
begin
  with reset_rows as (
    update public.user_progress
    set current_streak = 0, updated_at = now()
    where current_streak > 0
      and (last_drill_date is null or last_drill_date < current_date - 1)
    returning user_id
  )
  select count(*) into v_reset_count from reset_rows;

  return v_reset_count;
end;
$$;

revoke all on function public.reset_missed_streaks() from public, authenticated, anon;
grant execute on function public.reset_missed_streaks() to service_role;

-- pg_cron is only available on managed Supabase (and must be enabled per-project via
-- the dashboard/API before this can succeed there too) — not in a bare local Postgres.
-- Failing to install/schedule must not block the rest of the migration.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception when others then
  raise notice 'pg_cron unavailable in this environment, skipping schedule: %', sqlerrm;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'gate-force-reset-missed-streaks',
      '0 4 * * *',
      $cron$select public.reset_missed_streaks();$cron$
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end;
$$;
