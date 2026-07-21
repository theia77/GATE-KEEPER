-- XP / Rank engine. This is the ONLY way xp_total / rank_name may change — it is
-- SECURITY DEFINER so it can write to user_progress/xp_transactions despite RLS
-- giving clients select-only access to those tables. Callers are other server-side
-- functions (submit_attempt, clear_penalty_drill) and the API layer via RPC, never
-- a raw client update.

create or replace function public.award_xp(
  p_user_id uuid,
  p_amount numeric,
  p_reason text,
  p_ref_type text default null,
  p_ref_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_total numeric;
  v_new_rank text;
begin
  insert into public.xp_transactions (user_id, amount, reason, ref_type, ref_id)
  values (p_user_id, p_amount, p_reason, p_ref_type, p_ref_id);

  update public.user_progress
  set xp_total = greatest(xp_total + p_amount, 0)
  where user_id = p_user_id
  returning xp_total into v_new_total;

  select rank_name into v_new_rank
  from public.rank_thresholds
  where min_xp <= v_new_total
  order by min_xp desc
  limit 1;

  update public.user_progress
  set rank_name = v_new_rank, updated_at = now()
  where user_id = p_user_id;

  return v_new_total;
end;
$$;

-- Deliberately NOT granted to `authenticated`: this is an internal primitive called
-- only from other SECURITY DEFINER functions (submit_attempt, clear_penalty_drill) and
-- the service role. Granting it to clients would let a user self-award arbitrary XP
-- via RPC, defeating the whole point of locking user_progress/xp_transactions behind RLS.
revoke all on function public.award_xp(uuid, numeric, text, text, uuid) from public, authenticated, anon;
grant execute on function public.award_xp(uuid, numeric, text, text, uuid) to service_role;
