-- Registered device tokens for the backend-triggered Streak Alert push (Phase 5/6).
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens(user_id);
