-- 니편내편 운영 DB 전환안. 현재 읽기 전용 MCP에서는 실행하지 않는다.
-- 기존 숨김 버튼의 직접 stories UPDATE를 사용자별 숨김 저장으로 전환하고,
-- 새 서버 버전 + SUPABASE_SECRET_KEY 배포·인증 저장 시험을 마친 뒤에만 적용한다.
-- 저장소의 과거 migrations 파일은 운영 이력과 버전이 일치하지 않으므로
-- 이 파일을 포함해 폴더 전체를 자동 적용하지 않는다.

begin;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories'
      and policyname = 'stories_insert_own' and cmd = 'INSERT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories'
      and policyname = 'stories_update_own' and cmd = 'UPDATE'
  ) then
    raise exception 'stories write policies changed; inspect current policy before applying';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'stories'
      and cmd in ('ALL', 'INSERT', 'UPDATE')
      and policyname not in ('stories_insert_own', 'stories_update_own')
  ) then
    raise exception 'another stories write policy exists; inspect before applying';
  end if;
end;
$$;

drop policy "stories_insert_own" on public.stories;
drop policy "stories_update_own" on public.stories;

commit;

-- 이 변경은 인증 이용자의 REST 직접 INSERT/UPDATE를 막는다.
-- 서버 secret key는 RLS를 우회하므로 API에서 인증·작성 권한·콘텐츠 검사를 강제한다.
-- SELECT/DELETE 정책과 SECURITY DEFINER 집계 함수는 이 SQL에서 변경하지 않는다.
