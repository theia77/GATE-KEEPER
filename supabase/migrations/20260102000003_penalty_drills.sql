-- Penalty Drill lock: a Mock scoring below PENALTY_THRESHOLD_PERCENT (40%, see
-- packages/shared/src/constants.ts) locks standard features and forces a targeted
-- Weakness Drill assembled from the user's worst-performing subjects in that attempt.

create or replace function public.trigger_penalty_lock(
  p_user_id uuid,
  p_attempt_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_weak_subject_ids uuid[];
  v_drill_mock_id uuid;
  v_penalty_id uuid;
  v_subject record;
begin
  -- Worst 3 subjects (by accuracy) touched by this attempt.
  select array_agg(subject_id order by accuracy asc)
  into v_weak_subject_ids
  from (
    select q.subject_id,
           avg(case when aa.is_correct then 1 else 0 end) as accuracy
    from public.attempt_answers aa
    join public.questions q on q.id = aa.question_id
    where aa.attempt_id = p_attempt_id
    group by q.subject_id
    order by accuracy asc
    limit 3
  ) worst;

  if v_weak_subject_ids is null or array_length(v_weak_subject_ids, 1) is null then
    -- Attempt had no gradable subject breakdown (e.g. empty custom mock) — nothing to target.
    return null;
  end if;

  insert into public.mocks (title, description, mock_type, source, marks_total, duration_minutes, status)
  values (
    'Weakness Drill — Targeted Correction',
    'Auto-generated from your worst-performing subjects. Clear this to unlock the Arena.',
    'weakness_drill', 'official', 0, 30, 'published'
  )
  returning id into v_drill_mock_id;

  -- Pull up to 5 active questions per weak subject into the drill.
  for v_subject in select unnest(v_weak_subject_ids) as subject_id loop
    insert into public.mock_questions (mock_id, question_id, order_index)
    select v_drill_mock_id, q.id, row_number() over ()
    from public.questions q
    where q.subject_id = v_subject.subject_id and q.is_active = true
    order by random()
    limit 5;
  end loop;

  update public.mocks m
  set marks_total = coalesce((select sum(coalesce(mq.marks_override, q.marks))
                               from public.mock_questions mq
                               join public.questions q on q.id = mq.question_id
                               where mq.mock_id = m.id), 0)
  where m.id = v_drill_mock_id;

  insert into public.penalty_drills (user_id, triggered_by_attempt_id, weak_subject_ids, drill_mock_id, status)
  values (p_user_id, p_attempt_id, v_weak_subject_ids, v_drill_mock_id, 'active')
  returning id into v_penalty_id;

  update public.user_progress
  set locked = true, active_penalty_drill_id = v_penalty_id, updated_at = now()
  where user_id = p_user_id;

  return v_penalty_id;
end;
$$;

-- Clearing threshold: score >= 60% on the assigned Weakness Drill lifts the lock.
create or replace function public.clear_penalty_drill(
  p_user_id uuid,
  p_penalty_drill_id uuid,
  p_score_percentage numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cleared boolean := false;
begin
  if p_score_percentage < 60 then
    return false;
  end if;

  update public.penalty_drills
  set status = 'cleared', cleared_at = now()
  where id = p_penalty_drill_id and user_id = p_user_id and status = 'active'
  returning true into v_cleared;

  if v_cleared then
    update public.user_progress
    set locked = false, active_penalty_drill_id = null, updated_at = now()
    where user_id = p_user_id and active_penalty_drill_id = p_penalty_drill_id;

    perform public.award_xp(p_user_id, 150, 'weakness_drill_clear', 'penalty_drills', p_penalty_drill_id);
  end if;

  return coalesce(v_cleared, false);
end;
$$;

revoke all on function public.trigger_penalty_lock(uuid, uuid) from public, authenticated, anon;
revoke all on function public.clear_penalty_drill(uuid, uuid, numeric) from public, authenticated, anon;
grant execute on function public.trigger_penalty_lock(uuid, uuid) to service_role;
grant execute on function public.clear_penalty_drill(uuid, uuid, numeric) to service_role;

-- Server-side enforcement: a locked user cannot start a standard/sectional/custom mock
-- attempt, even by calling the API/RPC directly — only the daily drill (still mandatory)
-- and their own assigned weakness drill are allowed through. This is belt-and-suspenders
-- alongside RLS and the web/mobile UI, per the "no client-only lock logic" constraint.
create or replace function public.enforce_penalty_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locked boolean;
  v_active_penalty_drill_id uuid;
begin
  select locked, active_penalty_drill_id into v_locked, v_active_penalty_drill_id
  from public.user_progress
  where user_id = new.user_id;

  if v_locked and new.attempt_type not in ('daily_drill', 'weakness_drill') then
    raise exception 'ARENA_LOCKED: standard features are locked by an active Penalty Drill (%). Clear it first.', v_active_penalty_drill_id
      using errcode = '42501';
  end if;

  if v_locked and new.attempt_type = 'weakness_drill' then
    if new.mock_id is null or new.mock_id != (select drill_mock_id from public.penalty_drills where id = v_active_penalty_drill_id) then
      raise exception 'ARENA_LOCKED: you may only attempt your assigned Weakness Drill (mock %).', v_active_penalty_drill_id
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger attempts_enforce_penalty_lock
  before insert on public.attempts
  for each row execute function public.enforce_penalty_lock();
