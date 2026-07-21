-- Single, server-authoritative entrypoint for finishing any attempt (daily drill,
-- standard/sectional/custom mock, or weakness drill). Grades answers from the
-- correct_option stored on `questions` (never trusts a client-submitted score),
-- then routes into Streak Armor / Penalty Drill / XP based on attempt_type. This is
-- the only RPC clients call to submit — it is granted to `authenticated` but every
-- other gamification primitive it calls (award_xp, record_daily_drill_completion,
-- trigger_penalty_lock, clear_penalty_drill) stays service_role-only.

create or replace function public.submit_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_total_marks numeric;
  v_obtained_marks numeric;
  v_percentage numeric;
  v_answered int;
  v_correct int;
  v_xp numeric := 0;
  v_penalty_id uuid;
  v_cleared boolean := false;
  v_active_penalty public.penalty_drills;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id for update;

  if v_attempt is null then
    raise exception 'Attempt % not found', p_attempt_id;
  end if;

  if v_attempt.user_id <> auth.uid() then
    raise exception 'Not your attempt' using errcode = '42501';
  end if;

  if v_attempt.status = 'submitted' then
    raise exception 'Attempt already submitted';
  end if;

  -- Grade every answered question against the stored correct_option / marks / negative_marks.
  update public.attempt_answers aa
  set is_correct = (aa.selected_option is not null and aa.selected_option = q.correct_option),
      marks_awarded = case
        when aa.selected_option is null then 0
        when aa.selected_option = q.correct_option then coalesce(mq.marks_override, q.marks)
        else -q.negative_marks
      end
  from public.questions q
  left join public.mock_questions mq on mq.mock_id = v_attempt.mock_id and mq.question_id = q.id
  where aa.attempt_id = p_attempt_id and aa.question_id = q.id;

  select
    coalesce(sum(coalesce(mq.marks_override, q.marks)), 0),
    coalesce(sum(aa.marks_awarded), 0),
    count(*) filter (where aa.selected_option is not null),
    count(*) filter (where aa.is_correct)
  into v_total_marks, v_obtained_marks, v_answered, v_correct
  from public.attempt_answers aa
  join public.questions q on q.id = aa.question_id
  left join public.mock_questions mq on mq.mock_id = v_attempt.mock_id and mq.question_id = q.id
  where aa.attempt_id = p_attempt_id;

  v_percentage := case when v_total_marks > 0 then round((v_obtained_marks / v_total_marks) * 100, 2) else 0 end;

  update public.attempts
  set status = 'submitted',
      submitted_at = now(),
      total_marks = v_total_marks,
      obtained_marks = v_obtained_marks,
      percentage = v_percentage
  where id = p_attempt_id;

  update public.user_progress
  set questions_solved = questions_solved + v_answered,
      questions_correct = questions_correct + v_correct,
      updated_at = now()
  where user_id = v_attempt.user_id;

  update public.user_progress
  set accuracy_pct = case when questions_solved > 0 then round(questions_correct * 100.0 / questions_solved, 2) else 0 end
  where user_id = v_attempt.user_id;

  if v_attempt.attempt_type = 'daily_drill' then
    v_xp := 20;
    perform public.award_xp(v_attempt.user_id, v_xp, 'daily_drill', 'attempts', p_attempt_id);
    perform public.record_daily_drill_completion(v_attempt.user_id, p_attempt_id, v_xp);

  elsif v_attempt.attempt_type in ('standard_mock', 'sectional_mock', 'custom_mock') then
    v_xp := round(v_percentage);
    perform public.award_xp(v_attempt.user_id, v_xp, 'mock_submit', 'attempts', p_attempt_id);

    if v_percentage < 40 then
      v_penalty_id := public.trigger_penalty_lock(v_attempt.user_id, p_attempt_id);
    end if;

    insert into public.mock_results (attempt_id, user_id, mock_id, score_percentage, xp_awarded, triggered_penalty)
    values (p_attempt_id, v_attempt.user_id, v_attempt.mock_id, v_percentage, v_xp, v_penalty_id is not null);

  elsif v_attempt.attempt_type = 'weakness_drill' then
    select pd.* into v_active_penalty
    from public.penalty_drills pd
    where pd.id = (select active_penalty_drill_id from public.user_progress where user_id = v_attempt.user_id)
      and pd.drill_mock_id = v_attempt.mock_id
      and pd.status = 'active';

    if v_active_penalty.id is not null then
      v_cleared := public.clear_penalty_drill(v_attempt.user_id, v_active_penalty.id, v_percentage);
    end if;

    insert into public.mock_results (attempt_id, user_id, mock_id, score_percentage, xp_awarded, triggered_penalty)
    values (p_attempt_id, v_attempt.user_id, v_attempt.mock_id, v_percentage, case when v_cleared then 150 else 0 end, false);
  end if;

  return jsonb_build_object(
    'attempt_id', p_attempt_id,
    'total_marks', v_total_marks,
    'obtained_marks', v_obtained_marks,
    'percentage', v_percentage,
    'xp_awarded', v_xp,
    'penalty_triggered', v_penalty_id is not null,
    'penalty_cleared', v_cleared
  );
end;
$$;

revoke all on function public.submit_attempt(uuid) from public, anon;
grant execute on function public.submit_attempt(uuid) to authenticated, service_role;
