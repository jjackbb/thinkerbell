-- =============================================================================
-- 투표 중복 방지 테이블 (2026-08-17)
-- =============================================================================
-- 기존 문제: 누가 무엇에 투표했는지가 브라우저 localStorage 에만 남아 있어서,
-- 브라우저 데이터를 지우거나 다른 기기로 접속하면 같은 사람이 같은 사연에
-- 몇 번이든 다시 투표할 수 있었다. 투표 수 자체는 서버가 관리하지만
-- "누가 이미 투표했는지"를 서버가 모르기 때문에 막을 방법이 없었다.
--
-- 해결: 투표 1건을 실제 행으로 남기는 votes 테이블을 만들고,
-- (사연, 사용자) 조합을 기본키로 삼아 DB가 중복을 구조적으로 차단한다.
-- 투표 변경 1회 제한도 changeCount 컬럼으로 서버가 강제한다.
-- =============================================================================

create table if not exists public.votes (
  "storyId"     text        not null,
  "userId"      uuid        not null,
  "option"      text        not null,
  "changeCount" integer     not null default 0,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now(),
  constraint votes_pkey primary key ("storyId", "userId"),
  constraint votes_option_check check ("option" in ('A', 'B'))
);

-- 내 투표 목록을 불러올 때 쓰는 인덱스 (PK는 storyId 선행이라 별도 필요)
create index if not exists votes_user_idx on public.votes ("userId");

-- -----------------------------------------------------------------------------
-- RLS: 본인 투표만 조회 가능. 쓰기는 아래 vote_story 함수로만.
-- -----------------------------------------------------------------------------
alter table public.votes enable row level security;

drop policy if exists "votes_select_own" on public.votes;
create policy "votes_select_own"
on public.votes
for select
to authenticated
using ("userId" = auth.uid());

-- INSERT/UPDATE/DELETE 정책을 만들지 않는다 → 클라이언트는 직접 쓸 수 없고
-- SECURITY DEFINER 함수인 vote_story 를 통해서만 기록된다.

-- -----------------------------------------------------------------------------
-- vote_story 재작성
-- -----------------------------------------------------------------------------
-- 이전 선택을 클라이언트가 넘기던 p_previous 파라미터를 없앤다.
-- 서버가 votes 테이블에서 직접 읽으므로 위조할 수 없다.
drop function if exists public.vote_story(text, text, text);

create or replace function public.vote_story(
  p_story_id text,
  p_option text
)
returns public.stories
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_story   public.stories;
  v_prev    text;
  v_changes integer;
  v_exists  boolean;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_option not in ('A', 'B') then
    raise exception '투표 항목은 A 또는 B만 가능합니다.';
  end if;

  select * into v_story from public.stories where "id" = p_story_id;
  if not found then
    raise exception '사연을 찾을 수 없습니다.';
  end if;

  if v_story."authorId" = v_user_id::text then
    raise exception '본인 사연에는 투표할 수 없습니다.';
  end if;

  -- 동시 요청이 겹쳐도 한 번만 반영되도록 해당 행을 잠근다
  select "option", "changeCount" into v_prev, v_changes
    from public.votes
   where "storyId" = p_story_id and "userId" = v_user_id
     for update;
  v_exists := found;

  perform set_config('app.counter_update', 'on', true);

  if not v_exists then
    -- 최초 투표
    insert into public.votes ("storyId", "userId", "option")
    values (p_story_id, v_user_id, p_option);

    update public.stories
       set "votesA" = coalesce("votesA", 0) + (case when p_option = 'A' then 1 else 0 end),
           "votesB" = coalesce("votesB", 0) + (case when p_option = 'B' then 1 else 0 end)
     where "id" = p_story_id
    returning * into v_story;

  elsif v_prev = p_option then
    raise exception '이미 같은 항목에 투표했습니다.';

  else
    -- 투표 변경: 1회까지만 허용
    if v_changes >= 1 then
      raise exception '투표는 최대 1번만 변경할 수 있습니다.';
    end if;

    update public.votes
       set "option"      = p_option,
           "changeCount" = "changeCount" + 1,
           "updatedAt"   = now()
     where "storyId" = p_story_id and "userId" = v_user_id;

    update public.stories
       set "votesA" = greatest(0, coalesce("votesA", 0)
             + (case when p_option = 'A' then 1 else 0 end)
             - (case when v_prev   = 'A' then 1 else 0 end)),
           "votesB" = greatest(0, coalesce("votesB", 0)
             + (case when p_option = 'B' then 1 else 0 end)
             - (case when v_prev   = 'B' then 1 else 0 end))
     where "id" = p_story_id
    returning * into v_story;
  end if;

  return v_story;
end;
$$;

revoke all on function public.vote_story(text, text) from public;
grant execute on function public.vote_story(text, text) to authenticated;
