-- REVIEW DRAFT ONLY. Do not apply: the daily small-cell aggregate below is
-- provisional until the user decides the minimum cohort/period. No conversation
-- text, story text, email, or nickname is stored in either table.
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
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint ai_feedback_score_outcome_check check (
    (outcome = 'submitted' and score is not null) or
    (outcome = 'skipped' and score is null)
  )
);
create index if not exists ai_feedback_expiry_idx on public.ai_feedback(expires_at);
create index if not exists ai_feedback_user_idx on public.ai_feedback(user_id);

-- These totals carry no direct identifier. A one-person day/mode/score cell may
-- still allow inference; it is not yet an approved anonymous aggregation rule.
create table if not exists public.ai_feedback_daily_totals (
  feedback_day date not null,
  mode text not null check (mode in ('simulation', 'explanation', 'legacy')),
  outcome text not null check (outcome in ('submitted', 'skipped')),
  score smallint not null check (score between 0 and 5),
  count integer not null default 0 check (count >= 0),
  primary key (feedback_day, mode, outcome, score),
  constraint ai_feedback_total_score_check check (
    (outcome = 'submitted' and score between 1 and 5) or
    (outcome = 'skipped' and score = 0)
  )
);

alter table public.ai_feedback enable row level security;
alter table public.ai_feedback_daily_totals enable row level security;
revoke all on public.ai_feedback, public.ai_feedback_daily_totals
  from public, anon, authenticated;
grant select, insert, delete on public.ai_feedback to service_role;
grant select, insert, update on public.ai_feedback_daily_totals to service_role;

create or replace function public.purge_ai_feedback(p_at timestamptz default now())
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
begin
  if p_at is null then raise exception 'AI_FEEDBACK_INVALID_PURGE_TIME'; end if;
  -- DELETE RETURNING claims each expiring row once, including concurrent runs.
  -- If the aggregate fails, the transaction restores those rows.
  with expired as (
    delete from public.ai_feedback where expires_at <= p_at
    returning created_at, mode, outcome, score
  ), grouped as (
    select (created_at at time zone 'Asia/Seoul')::date as feedback_day,
      mode, outcome, coalesce(score, 0)::smallint as score,
      count(*)::integer as count
    from expired group by 1, 2, 3, 4
  ), aggregated as (
    insert into public.ai_feedback_daily_totals
      (feedback_day, mode, outcome, score, count)
    select feedback_day, mode, outcome, score, count from grouped
    on conflict (feedback_day, mode, outcome, score)
    do update set count = public.ai_feedback_daily_totals.count + excluded.count
    returning 1
  )
  select (select count(*) from expired)::integer into v_count
  from (select count(*) from aggregated) as completed;
  return v_count;
end;
$$;
revoke all on function public.purge_ai_feedback(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_ai_feedback(timestamptz) to service_role;
