-- =============================================================================
-- RLS 강화 (2026-08-17)
-- =============================================================================
-- 기존 상태: stories / comments 모두 "public 역할에 ALL 허용(using true)" 정책
-- 하나뿐이라, 브라우저에 노출되는 anon 키만 있으면 누구나 남의 사연을 수정·삭제
-- 하거나 투표 수를 임의의 값으로 덮어쓸 수 있었습니다.
--
-- 이 마이그레이션이 바꾸는 것:
--   1. 읽기는 계속 전체 공개 (익명 커뮤니티 + 비로그인 둘러보기 기능 유지)
--   2. 쓰기(INSERT/UPDATE/DELETE)는 로그인한 본인 글에만 허용
--   3. 남의 글을 건드려야 하는 동작(투표·공감·신고)은 직접 UPDATE 대신
--      SECURITY DEFINER 함수로만 가능하게 하여, 증감 폭과 규칙을 서버가 강제
--   4. 댓글 수(commentCount)는 클라이언트가 쓰지 않고 트리거가 자동 동기화
--
-- 주의: 기존 시드 사연들의 "authorId"는 auth 사용자 UUID가 아니므로, 이 정책
--       적용 후 아무도 수정·삭제할 수 없습니다(읽기는 정상). 의도된 동작입니다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 기존의 전체 허용 정책 제거
-- -----------------------------------------------------------------------------
drop policy if exists "Enable all access" on public.stories;
drop policy if exists "Enable all access comments" on public.comments;

alter table public.stories enable row level security;
alter table public.comments enable row level security;

-- -----------------------------------------------------------------------------
-- 2. stories 정책
-- -----------------------------------------------------------------------------
-- 읽기: 비로그인 포함 전체 공개
create policy "stories_select_public"
on public.stories
for select
to anon, authenticated
using (true);

-- 작성: 로그인 사용자만, 그리고 authorId를 자기 것으로만 넣을 수 있음
create policy "stories_insert_own"
on public.stories
for insert
to authenticated
with check ("authorId" = auth.uid()::text);

-- 수정: 본인 사연만. 카운터 컬럼은 아래 함수들이 대신 처리한다.
create policy "stories_update_own"
on public.stories
for update
to authenticated
using ("authorId" = auth.uid()::text)
with check ("authorId" = auth.uid()::text);

-- 삭제: 본인 사연만
create policy "stories_delete_own"
on public.stories
for delete
to authenticated
using ("authorId" = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- 3. comments 정책
-- -----------------------------------------------------------------------------
create policy "comments_select_public"
on public.comments
for select
to anon, authenticated
using (true);

create policy "comments_insert_own"
on public.comments
for insert
to authenticated
with check ("authorId" = auth.uid()::text);

create policy "comments_update_own"
on public.comments
for update
to authenticated
using ("authorId" = auth.uid()::text)
with check ("authorId" = auth.uid()::text);

create policy "comments_delete_own"
on public.comments
for delete
to authenticated
using ("authorId" = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- 3-1. 카운터 컬럼 보호 트리거
-- -----------------------------------------------------------------------------
-- 위 정책만으로는 "본인 사연 수정" 권한을 이용해 작성자가 자기 글의 투표 수나
-- 신고 수를 임의의 값으로 바꿀 수 있다. 아래 트리거는 일반 UPDATE에서 집계
-- 컬럼이 바뀌면 무조건 이전 값으로 되돌린다. 아래 6~7번의 서버 함수들만
-- app.counter_update 플래그를 켜고 들어오므로, 그때만 변경이 허용된다.
create or replace function public.guard_story_counters()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.counter_update', true), 'off') <> 'on' then
    new."votesA"       := old."votesA";
    new."votesB"       := old."votesB";
    new."commentCount" := old."commentCount";
    new."reportsCount" := old."reportsCount";
    new."isBlind"      := old."isBlind";
  end if;
  return new;
end;
$$;

create or replace function public.guard_comment_counters()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.counter_update', true), 'off') <> 'on' then
    new."likeCount"    := old."likeCount";
    new."reportsCount" := old."reportsCount";
    new."isBlind"      := old."isBlind";
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_story_counters on public.stories;
create trigger trg_guard_story_counters
before update on public.stories
for each row execute function public.guard_story_counters();

drop trigger if exists trg_guard_comment_counters on public.comments;
create trigger trg_guard_comment_counters
before update on public.comments
for each row execute function public.guard_comment_counters();

-- -----------------------------------------------------------------------------
-- 4. 투표 (남의 사연을 건드리므로 함수로만 허용)
-- -----------------------------------------------------------------------------
-- p_previous: 이전에 선택했던 값('A'/'B'). 투표 변경 시 이전 표를 회수한다.
create or replace function public.vote_story(
  p_story_id text,
  p_option text,
  p_previous text default null
)
returns public.stories
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_story public.stories;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_option not in ('A', 'B') then
    raise exception '투표 항목은 A 또는 B만 가능합니다.';
  end if;

  if p_previous is not null and p_previous not in ('A', 'B') then
    raise exception '이전 투표 항목이 올바르지 않습니다.';
  end if;

  if p_previous = p_option then
    raise exception '이미 같은 항목에 투표했습니다.';
  end if;

  perform set_config('app.counter_update', 'on', true);

  update public.stories s
     set "votesA" = greatest(0, coalesce(s."votesA", 0)
           + (case when p_option   = 'A' then 1 else 0 end)
           - (case when p_previous = 'A' then 1 else 0 end)),
         "votesB" = greatest(0, coalesce(s."votesB", 0)
           + (case when p_option   = 'B' then 1 else 0 end)
           - (case when p_previous = 'B' then 1 else 0 end))
   where s."id" = p_story_id
     and s."authorId" <> auth.uid()::text
  returning s.* into v_story;

  if not found then
    raise exception '사연을 찾을 수 없거나 본인 사연에는 투표할 수 없습니다.';
  end if;

  return v_story;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. 댓글 공감 (좋아요)
-- -----------------------------------------------------------------------------
-- p_delta 는 +1 또는 -1 만 허용
create or replace function public.like_comment(
  p_comment_id text,
  p_delta integer
)
returns public.comments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comment public.comments;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_delta not in (1, -1) then
    raise exception '공감은 한 번에 1만큼만 변경할 수 있습니다.';
  end if;

  perform set_config('app.counter_update', 'on', true);

  update public.comments c
     set "likeCount" = greatest(0, coalesce(c."likeCount", 0) + p_delta)
   where c."id" = p_comment_id
  returning c.* into v_comment;

  if not found then
    raise exception '댓글을 찾을 수 없습니다.';
  end if;

  return v_comment;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. 신고 (5회 누적 시 자동 블라인드)
-- -----------------------------------------------------------------------------
create or replace function public.report_story(p_story_id text)
returns public.stories
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_story public.stories;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  perform set_config('app.counter_update', 'on', true);

  update public.stories s
     set "reportsCount" = coalesce(s."reportsCount", 0) + 1,
         "isBlind"      = (coalesce(s."reportsCount", 0) + 1) >= 5
   where s."id" = p_story_id
  returning s.* into v_story;

  if not found then
    raise exception '사연을 찾을 수 없습니다.';
  end if;

  return v_story;
end;
$$;

create or replace function public.report_comment(p_comment_id text)
returns public.comments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comment public.comments;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  perform set_config('app.counter_update', 'on', true);

  update public.comments c
     set "reportsCount" = coalesce(c."reportsCount", 0) + 1,
         "isBlind"      = (coalesce(c."reportsCount", 0) + 1) >= 5
   where c."id" = p_comment_id
  returning c.* into v_comment;

  if not found then
    raise exception '댓글을 찾을 수 없습니다.';
  end if;

  return v_comment;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. 댓글 수 자동 동기화 트리거
-- -----------------------------------------------------------------------------
-- 클라이언트가 stories."commentCount" 를 직접 쓰지 않아도 되도록 DB가 관리한다.
create or replace function public.sync_story_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 아래 UPDATE는 카운터 보호 트리거를 통과해야 하므로 플래그를 켠다
  perform set_config('app.counter_update', 'on', true);

  if tg_op = 'INSERT' then
    update public.stories
       set "commentCount" = coalesce("commentCount", 0) + 1
     where "id" = new."storyId";
    return new;
  elsif tg_op = 'DELETE' then
    update public.stories
       set "commentCount" = greatest(0, coalesce("commentCount", 0) - 1)
     where "id" = old."storyId";
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_story_comment_count on public.comments;

create trigger trg_sync_story_comment_count
after insert or delete on public.comments
for each row execute function public.sync_story_comment_count();

-- -----------------------------------------------------------------------------
-- 8. 함수 실행 권한
-- -----------------------------------------------------------------------------
-- 기본으로 붙는 public 실행 권한을 걷어내고 로그인 사용자에게만 부여한다.
revoke all on function public.vote_story(text, text, text)   from public;
revoke all on function public.like_comment(text, integer)    from public;
revoke all on function public.report_story(text)             from public;
revoke all on function public.report_comment(text)           from public;
revoke all on function public.sync_story_comment_count()     from public;

grant execute on function public.vote_story(text, text, text) to authenticated;
grant execute on function public.like_comment(text, integer)  to authenticated;
grant execute on function public.report_story(text)           to authenticated;
grant execute on function public.report_comment(text)         to authenticated;
