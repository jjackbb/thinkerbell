-- =============================================================================
-- 댓글 익명 표기를 서버가 확정 (2026-08-18)
-- =============================================================================
-- 기존 문제 두 가지:
--
-- 1) 번호를 "현재 댓글 수 + 1"로 계산해서 엉망이 됐다.
--    실제 데이터: story-love-1 은 댓글 11개에 "익명 2 | 익명 1 | 익명 3 x9",
--    story-etc-1 은 "익명 1 x4 | 익명 5". 앞 댓글이 지워지면 번호가 겹치고,
--    같은 사람이 여러 번 달아도 매번 다른 번호를 받았다.
--
-- 2) 댓글 작성 시 '익명 표시' 체크를 끄면 계정 닉네임이 그대로 저장됐다.
--    실제로 '아이고', '변종현', '나 재욱' 같은 실명성 닉네임이 남아 있다.
--    사연에서 닉네임을 감춰도 댓글로 새면 의미가 없다.
--
-- 해결: 클라이언트가 보낸 anonymousId 를 무시하고 트리거가 확정한다.
--   - 사연 작성자가 달면        → '글쓴이'
--   - 그 외 사람이 처음 달면    → 그 사연의 최대 번호 + 1
--   - 이미 단 적 있으면         → 이전에 받은 번호를 그대로 재사용
--     (에브리타임 방식. 대화 맥락을 따라가려면 같은 사람은 같은 번호여야 한다)
--
-- 동시에 두 명이 첫 댓글을 달아도 번호가 겹치지 않도록 사연 단위 advisory lock 을 건다.
-- =============================================================================

create or replace function public.assign_comment_anon_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_story_author text;
  v_existing     text;
  v_next         integer;
begin
  select s."authorId" into v_story_author
    from public.stories s
   where s."id" = new."storyId";

  -- 사연 작성자 본인
  if v_story_author is not null and v_story_author = new."authorId" then
    new."anonymousId" := '글쓴이';
    return new;
  end if;

  -- 같은 사연에 이미 단 적이 있으면 그때 받은 번호를 유지
  select c."anonymousId" into v_existing
    from public.comments c
   where c."storyId" = new."storyId"
     and c."authorId" = new."authorId"
     and c."anonymousId" ~ '^익명 [0-9]+$'
   order by c."createdAt"
   limit 1;

  if v_existing is not null then
    new."anonymousId" := v_existing;
    return new;
  end if;

  -- 첫 댓글이면 새 번호를 발급. 동시 삽입 시 번호 충돌을 막는다.
  perform pg_advisory_xact_lock(hashtext(new."storyId"));

  select coalesce(max((regexp_match(c."anonymousId", '^익명 ([0-9]+)$'))[1]::integer), 0) + 1
    into v_next
    from public.comments c
   where c."storyId" = new."storyId"
     and c."anonymousId" ~ '^익명 [0-9]+$';

  new."anonymousId" := '익명 ' || v_next;
  return new;
end;
$$;

drop trigger if exists trg_assign_comment_anon_id on public.comments;

create trigger trg_assign_comment_anon_id
before insert on public.comments
for each row execute function public.assign_comment_anon_id();

revoke all on function public.assign_comment_anon_id() from public;
