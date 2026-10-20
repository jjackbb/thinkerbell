-- 니 편·내 편 역할 이름(선택) 칸 추가.
-- 상태: 미적용(NOT_RUN). 운영 DB 관리자가 검토한 뒤 적용한다.
-- 적용 순서·조회 함수 수정·확인 방법은
-- docs/plan-execution/2026-10-20-story-side-labels.md 를 따른다.
--
-- 추가만 한다. 기존 행·칸·정책·함수는 바꾸지 않는다.
-- "sideLabelA" = 내 편(votesA) 역할, "sideLabelB" = 니 편(votesB) 역할.
-- 서버(/api/stories)가 공백 정리·10자 제한·비속어 검사를 마친 값만 쓴다.

alter table public.stories
  add column if not exists "sideLabelA" text,
  add column if not exists "sideLabelB" text;

do $$
begin
  if not exists (select 1 from pg_constraint
      where conname = 'stories_side_label_a_length' and conrelid = 'public.stories'::regclass) then
    alter table public.stories add constraint stories_side_label_a_length
      check ("sideLabelA" is null or char_length("sideLabelA") between 1 and 10);
  end if;
  if not exists (select 1 from pg_constraint
      where conname = 'stories_side_label_b_length' and conrelid = 'public.stories'::regclass) then
    alter table public.stories add constraint stories_side_label_b_length
      check ("sideLabelB" is null or char_length("sideLabelB") between 1 and 10);
  end if;
end;
$$;

-- 확인
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'stories'
--    and column_name in ('sideLabelA', 'sideLabelB');
