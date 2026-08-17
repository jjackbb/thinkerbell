-- =============================================================================
-- 신고 정책 보정 + 소명 경로 (2026-08-18)
-- =============================================================================
-- 기존 문제:
--   1) 같은 사람이 5번 신고하면 글이 가려졌다. 중복 신고를 막는 장치가 없었다.
--   2) 절대 횟수(5회)만 봤다. 조회 20에 신고 5와 조회 2,000에 신고 5는
--      전혀 다른 사건인데 똑같이 처리됐다.
--   3) 가려진 글의 작성자가 이의를 제기할 경로가 없었다.
--   4) viewCount 가 실제로 증가하지 않아 비율 판정의 분모가 없었다.
--
-- 판정 기준 (블라인드 앱이 공개한 실제 기준을 참고):
--   · 고유 신고자 3명 이상  AND  조회 10회 이상  AND  신고/조회 >= 5%
--   · 또는 고유 신고자 5명 이상 (압도적이면 비율과 무관)
--   · 조회 10회 미만이면 판정 보류 — 갓 올라온 글이 소수에게 죽지 않도록
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. reports 테이블 — 중복 신고를 구조적으로 차단
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  "targetType" text        not null,
  "targetId"   text        not null,
  "reporterId" uuid        not null,
  "reason"     text        not null default '',
  "createdAt"  timestamptz not null default now(),
  constraint reports_pkey primary key ("targetType", "targetId", "reporterId"),
  constraint reports_type_check check ("targetType" in ('story', 'comment'))
);

create index if not exists reports_reporter_idx on public.reports ("reporterId", "createdAt");

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
on public.reports for select to authenticated
using ("reporterId" = auth.uid());
-- 쓰기 정책은 두지 않는다. 아래 함수로만 기록된다.

-- -----------------------------------------------------------------------------
-- 2. 소명(이의 제기) 컬럼
-- -----------------------------------------------------------------------------
alter table public.stories  add column if not exists "appealStatus" text not null default 'none';
alter table public.stories  add column if not exists "appealText"   text;
alter table public.stories  add column if not exists "appealedAt"   timestamptz;
alter table public.comments add column if not exists "appealStatus" text not null default 'none';
alter table public.comments add column if not exists "appealText"   text;
alter table public.comments add column if not exists "appealedAt"   timestamptz;

-- -----------------------------------------------------------------------------
-- 3. 조회수 증가 (비율 판정의 분모)
-- -----------------------------------------------------------------------------
create or replace function public.increment_story_view(p_story_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.counter_update', 'on', true);
  update public.stories
     set "viewCount" = coalesce("viewCount", 0) + 1
   where "id" = p_story_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. 신고 처리 — 중복 차단 + 1일 한도 + 비율 기반 판정
-- -----------------------------------------------------------------------------
create or replace function public.submit_report(
  p_target_type text,
  p_target_id   text,
  p_reason      text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user      uuid := auth.uid();
  v_today     integer;
  v_unique    integer;
  v_views     integer;
  v_blind     boolean;
begin
  if v_user is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_target_type not in ('story', 'comment') then
    raise exception '잘못된 신고 대상입니다.';
  end if;

  -- 악의적 대량 신고 방지: 하루 10건까지
  select count(*) into v_today
    from public.reports
   where "reporterId" = v_user
     and "createdAt" > now() - interval '1 day';

  if v_today >= 10 then
    raise exception '하루에 신고할 수 있는 횟수를 넘었습니다.';
  end if;

  -- 같은 대상에 두 번 신고할 수 없다 (기본키가 막지만 메시지를 위해 먼저 확인)
  if exists (
    select 1 from public.reports
     where "targetType" = p_target_type and "targetId" = p_target_id and "reporterId" = v_user
  ) then
    raise exception '이미 신고한 대상입니다.';
  end if;

  insert into public.reports ("targetType", "targetId", "reporterId", "reason")
  values (p_target_type, p_target_id, v_user, coalesce(p_reason, ''));

  select count(*) into v_unique
    from public.reports
   where "targetType" = p_target_type and "targetId" = p_target_id;

  perform set_config('app.counter_update', 'on', true);

  if p_target_type = 'story' then
    select coalesce("viewCount", 0) into v_views from public.stories where "id" = p_target_id;

    -- 조회가 너무 적으면 판정을 미룬다. 갓 올라온 글이 소수에게 죽지 않도록.
    -- 절대 임계(5명)를 남겨둔다. 조회수는 누구나 올릴 수 있어서, 비율만 쓰면
    -- 조회수를 부풀려 신고를 무력화하는 우회가 가능하다.
    v_blind := (v_unique >= 5)
            or (v_unique >= 3 and v_views >= 10 and v_unique::numeric / v_views >= 0.05);

    update public.stories
       set "reportsCount" = v_unique,
           "isBlind"      = v_blind
     where "id" = p_target_id;
  else
    -- 댓글은 조회수가 없으므로 고유 신고자 수만 본다
    v_blind := v_unique >= 3;

    update public.comments
       set "reportsCount" = v_unique,
           "isBlind"      = v_blind
     where "id" = p_target_id;
  end if;

  return jsonb_build_object('reports', v_unique, 'blinded', v_blind);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. 이의 제기
-- -----------------------------------------------------------------------------
create or replace function public.submit_appeal(
  p_target_type text,
  p_target_id   text,
  p_text        text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user   uuid := auth.uid();
  v_author text;
begin
  if v_user is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_target_type = 'story' then
    select "authorId" into v_author from public.stories where "id" = p_target_id;
  else
    select "authorId" into v_author from public.comments where "id" = p_target_id;
  end if;

  if v_author is null or v_author <> v_user::text then
    raise exception '본인이 작성한 글만 이의 제기할 수 있습니다.';
  end if;

  perform set_config('app.counter_update', 'on', true);

  if p_target_type = 'story' then
    update public.stories
       set "appealStatus" = 'pending', "appealText" = p_text, "appealedAt" = now()
     where "id" = p_target_id;
  else
    update public.comments
       set "appealStatus" = 'pending', "appealText" = p_text, "appealedAt" = now()
     where "id" = p_target_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. 권한
-- -----------------------------------------------------------------------------
-- 옛 신고 함수는 더 이상 쓰지 않는다
drop function if exists public.report_story(text);
drop function if exists public.report_comment(text);

revoke all on function public.increment_story_view(text)        from public;
revoke all on function public.submit_report(text, text, text)   from public;
revoke all on function public.submit_appeal(text, text, text)   from public;

grant execute on function public.increment_story_view(text)      to anon, authenticated;
grant execute on function public.submit_report(text, text, text) to authenticated;
grant execute on function public.submit_appeal(text, text, text) to authenticated;
