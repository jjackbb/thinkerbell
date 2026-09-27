-- REVIEW DRAFT ONLY. The user chose a monthly, combined-mode aggregate with
-- at least five distinct respondents. Finalizing a calendar month conflicts
-- with a strict 30-day personal-record limit in 31-day months, so no aggregate
-- is created until that boundary is decided. No conversation text, story text,
-- email, or nickname is stored here.
-- A rating is optional. One finish action has one outcome, even on retry.
create table if not exists public.ai_feedback (
  episode_id uuid primary key,
  user_id uuid not null,
  persona_id text not null references public.ai_personas(id) on delete cascade,
  mode text not null check (mode in ('simulation', 'explanation', 'legacy')),
  score smallint check (score between 1 and 5),
  outcome text not null check (outcome in ('submitted', 'skipped')),
  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  -- A once-daily purge can run up to one day after expires_at. Set the deadline
  -- at day 29 to ensure actual deletion before day 30.
  expires_at timestamptz not null default (now() + interval '29 days'),
  constraint ai_feedback_score_outcome_check check (
    (outcome = 'submitted' and score is not null) or
    (outcome = 'skipped' and score is null)
  )
);
create index if not exists ai_feedback_expiry_idx on public.ai_feedback(expires_at);
create index if not exists ai_feedback_user_idx on public.ai_feedback(user_id);

alter table public.ai_feedback enable row level security;
revoke all on public.ai_feedback from public, anon, authenticated;
grant select, insert, delete on public.ai_feedback to service_role;

create or replace function public.purge_ai_feedback(p_at timestamptz default now())
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
begin
  if p_at is null then raise exception 'AI_FEEDBACK_INVALID_PURGE_TIME'; end if;
  with expired as (
    delete from public.ai_feedback where expires_at <= p_at returning 1
  )
  select count(*)::integer into v_count from expired;
  return v_count;
end;
$$;
revoke all on function public.purge_ai_feedback(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_ai_feedback(timestamptz) to service_role;
