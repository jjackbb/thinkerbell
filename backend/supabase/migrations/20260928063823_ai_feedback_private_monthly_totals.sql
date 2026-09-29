-- Applied to thinkerbell Supabase project vzhyhadjtaqbapicjrco on 2026-09-28.
-- Source review draft: docs/plan-execution/sql/ai-feedback-draft.sql.
create table if not exists public.ai_feedback (
  episode_id uuid primary key,
  user_id uuid not null,
  persona_id text not null references public.ai_personas(id) on delete cascade,
  mode text not null check (mode in ('simulation', 'explanation')),
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
create index if not exists ai_feedback_created_idx on public.ai_feedback(created_at);

-- Restricted processing state exists only until the month can be finalized.
-- It has no identifier, mode, or per-score cell, and is deleted for months
-- whose minimum five distinct scored respondents cannot be verified.
create table if not exists public.ai_feedback_month_pending (
  month_start date primary key,
  rated_count integer not null default 0 check (rated_count >= 0),
  positive_count integer not null default 0 check (
    positive_count >= 0 and positive_count <= rated_count
  )
);
create table if not exists public.ai_feedback_monthly_totals (
  month_start date primary key,
  rated_count integer not null check (rated_count >= 5),
  positive_count integer not null check (
    positive_count >= 0 and positive_count <= rated_count
  ),
  finalized_at timestamptz not null default now()
);

alter table public.ai_feedback enable row level security;
alter table public.ai_feedback_month_pending enable row level security;
alter table public.ai_feedback_monthly_totals enable row level security;
revoke all on public.ai_feedback, public.ai_feedback_month_pending,
  public.ai_feedback_monthly_totals from public, anon, authenticated;
grant select, insert, delete on public.ai_feedback to service_role;
grant select, insert, update, delete on public.ai_feedback_month_pending
  to service_role;
grant select, insert on public.ai_feedback_monthly_totals to service_role;

create or replace function public.purge_ai_feedback(p_at timestamptz default now())
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
  v_month date;
  v_current_month date;
  v_eligible integer;
  v_rated integer;
  v_positive integer;
begin
  if p_at is null then raise exception 'AI_FEEDBACK_INVALID_PURGE_TIME'; end if;
  -- Serialize cleanup/finalization, including a manual retry of the cron job.
  perform pg_catalog.pg_advisory_xact_lock(1735449442, 1);
  v_current_month :=
    pg_catalog.date_trunc('month', p_at at time zone 'Asia/Seoul')::date;
  with expired as (
    delete from public.ai_feedback where expires_at <= p_at
      returning created_at, score
  ), grouped as (
    select pg_catalog.date_trunc('month',
        created_at at time zone 'Asia/Seoul')::date as month_start,
      count(*)::integer as rated_count,
      count(*) filter (where score >= 4)::integer as positive_count
    from expired where score is not null group by 1
  ), merged as (
    insert into public.ai_feedback_month_pending
      (month_start, rated_count, positive_count)
    select month_start, rated_count, positive_count from grouped
    on conflict (month_start) do update set
      rated_count = public.ai_feedback_month_pending.rated_count
        + excluded.rated_count,
      positive_count = public.ai_feedback_month_pending.positive_count
        + excluded.positive_count
    returning 1
  )
  select (select count(*) from expired)::integer into v_count
    from (select count(*) from merged) as completed;

  for v_month in
    select month_start from public.ai_feedback_month_pending
      where month_start < v_current_month
    union
    select distinct pg_catalog.date_trunc('month',
        created_at at time zone 'Asia/Seoul')::date
      from public.ai_feedback
      where (created_at at time zone 'Asia/Seoul')::date < v_current_month
  loop
    select count(distinct user_id)::integer into v_eligible
      from public.ai_feedback
      where score is not null and
        pg_catalog.date_trunc('month',
          created_at at time zone 'Asia/Seoul')::date = v_month;
    if v_eligible >= 5 then
      select coalesce(rated_count, 0), coalesce(positive_count, 0)
        into v_rated, v_positive
        from public.ai_feedback_month_pending where month_start = v_month;
      v_rated := coalesce(v_rated, 0);
      v_positive := coalesce(v_positive, 0);
      select v_rated + count(*)::integer,
          v_positive + count(*) filter (where score >= 4)::integer
        into v_rated, v_positive from public.ai_feedback
        where score is not null and
          pg_catalog.date_trunc('month',
            created_at at time zone 'Asia/Seoul')::date = v_month;
      insert into public.ai_feedback_monthly_totals
        (month_start, rated_count, positive_count)
        values (v_month, v_rated, v_positive)
        on conflict (month_start) do nothing;
    end if;
    delete from public.ai_feedback_month_pending where month_start = v_month;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.purge_ai_feedback(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_ai_feedback(timestamptz) to service_role;
