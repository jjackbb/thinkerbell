-- 적용 전 초안: PLAN의 '같은 선택 재클릭 무시, 반대쪽으로 한 번 변경' 계약.
-- 운영 vote_story 정의와 2026-09-28 읽기 전용 MCP 조회 결과를 기준으로 작성했다.
-- 운영 DB에 아직 적용하지 않았다. 시험 DB에서 역할별·동시 요청 검증 후 적용한다.

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
  v_story public.stories;
  v_prev text;
  v_changes integer;
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_option is null or p_option not in ('A', 'B') then
    raise exception '투표 항목은 A 또는 B만 가능합니다.';
  end if;

  -- 사연 행을 먼저 잠가 같은 사연의 최초 투표 두 요청도 직렬화한다.
  -- 기존 votes 행만 FOR UPDATE 하면 아직 행이 없는 최초 요청은 잠글 수 없다.
  select * into v_story from public.stories
    where "id" = p_story_id for update;
  if not found then
    raise exception '사연을 찾을 수 없습니다.';
  end if;

  -- 운영에는 아직 visibility 컬럼이 없다. 추가되면 함수 재배포 없이 private을
  -- 거부하도록 JSON 표현을 사용한다. 비공개 원문은 반환하지 않는다.
  if coalesce(v_story."isBlind", false)
     or coalesce(v_story."isAdult", false)
     or coalesce(v_story."isHidden", false)
     or coalesce(to_jsonb(v_story)->>'visibility', 'public') <> 'public' then
    raise exception '사연을 찾을 수 없습니다.';
  end if;
  if v_story."authorId" = v_user_id::text then
    raise exception '본인 사연에는 투표할 수 없습니다.';
  end if;

  select "option", "changeCount" into v_prev, v_changes
    from public.votes
   where "storyId" = p_story_id and "userId" = v_user_id
   for update;
  v_exists := found;

  if v_exists and v_prev = p_option then
    -- 재시도·같은 선택 재클릭은 성공으로 돌려주되 투표 행과 집계를 건드리지 않는다.
    return v_story;
  end if;

  perform set_config('app.counter_update', 'on', true);
  if not v_exists then
    insert into public.votes ("storyId", "userId", "option")
    values (p_story_id, v_user_id, p_option);

    update public.stories
       set "votesA" = coalesce("votesA", 0) + case when p_option = 'A' then 1 else 0 end,
           "votesB" = coalesce("votesB", 0) + case when p_option = 'B' then 1 else 0 end
     where "id" = p_story_id
     returning * into v_story;
  else
    if v_changes >= 1 then
      raise exception '투표는 최대 1번만 변경할 수 있습니다.';
    end if;

    update public.votes
       set "option" = p_option,
           "changeCount" = "changeCount" + 1,
           "updatedAt" = now()
     where "storyId" = p_story_id and "userId" = v_user_id;

    update public.stories
       set "votesA" = greatest(0, coalesce("votesA", 0)
           + case when p_option = 'A' then 1 else 0 end
           - case when v_prev = 'A' then 1 else 0 end),
           "votesB" = greatest(0, coalesce("votesB", 0)
           + case when p_option = 'B' then 1 else 0 end
           - case when v_prev = 'B' then 1 else 0 end)
     where "id" = p_story_id
     returning * into v_story;
  end if;

  return v_story;
end;
$$;

-- 운영 함수에는 anon 직접 EXECUTE가 남아 있었다. 함수 내부 인증과 별도로 차단한다.
revoke all on function public.vote_story(text, text) from public, anon;
grant execute on function public.vote_story(text, text) to authenticated;
