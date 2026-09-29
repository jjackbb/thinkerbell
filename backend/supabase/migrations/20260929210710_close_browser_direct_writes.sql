-- Approved public cutover: all seven policies are checked and closed atomically.
-- 니편내편 운영 DB 공개 전환: 사용자 승인 및 공개 서버 저장 검증 후 적용.
-- 기존 숨김 버튼의 직접 stories UPDATE를 사용자별 숨김 저장으로 전환하고,
-- 새 서버 버전 + SUPABASE_SECRET_KEY 배포·인증 저장 시험을 마친 뒤에만 적용한다.
-- 저장소의 과거 migrations 파일은 운영 이력과 버전이 일치하지 않으므로
-- 이 파일을 포함해 폴더 전체를 자동 적용하지 않는다.


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


-- 이 변경은 인증 이용자의 REST 직접 INSERT/UPDATE를 막는다.
-- 서버 secret key는 RLS를 우회하므로 API에서 인증·작성 권한·콘텐츠 검사를 강제한다.
-- SELECT/DELETE 정책과 SECURITY DEFINER 집계 함수는 이 SQL에서 변경하지 않는다.

-- Public POST/PUT /api/comments and private-story guards were verified
-- with the designated signed-in accounts before applying this migration.
-- Current direct INSERT/UPDATE policies let a browser bypass Potens checks.
-- The service-role server path remains able to write after these policies go.


do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments'
      and policyname = 'comments_insert_own' and cmd = 'INSERT' and roles = array['authenticated']::name[]
  ) or not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments'
      and policyname = 'comments_update_own' and cmd = 'UPDATE' and roles = array['authenticated']::name[]
  ) or exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'comments'
      and cmd in ('ALL', 'INSERT', 'UPDATE')
      and policyname not in ('comments_insert_own', 'comments_update_own')
  ) then
    raise exception 'comments write policies changed; inspect before applying';
  end if;
end;
$$;

drop policy "comments_insert_own" on public.comments;
drop policy "comments_update_own" on public.comments;

-- Keep the existing author-private SELECT policies and owner DELETE policy.


-- Server AI paths and RPCs are deployed and verified before application.
-- The promoted public app uses these checked server paths.
-- Read and owner DELETE on ai_personas stay available to the browser.


do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_personas'
      and policyname = 'ai_personas_insert_own' and cmd = 'INSERT' and roles = array['authenticated']::name[]
  ) or not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_personas'
      and policyname = 'ai_personas_update_own' and cmd = 'UPDATE' and roles = array['authenticated']::name[]
  ) or not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_chat_usage'
      and policyname = 'ai_chat_usage_insert_own' and cmd = 'INSERT' and roles = array['authenticated']::name[]
  ) or exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_personas'
      and cmd in ('ALL', 'INSERT', 'UPDATE')
      and policyname not in ('ai_personas_insert_own', 'ai_personas_update_own')
  ) or exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_chat_usage'
      and cmd in ('ALL', 'INSERT', 'UPDATE')
      and policyname <> 'ai_chat_usage_insert_own'
  ) then
    raise exception 'AI direct-write policies changed; inspect before applying';
  end if;
end;
$$;

drop policy ai_personas_insert_own on public.ai_personas;
drop policy ai_personas_update_own on public.ai_personas;
drop policy ai_chat_usage_insert_own on public.ai_chat_usage;

revoke insert, update on public.ai_personas from public, anon, authenticated;
revoke insert, update, delete on public.ai_chat_usage from public, anon, authenticated;

-- The API server uses a service-role client for its checked room and turn RPCs.
grant select, insert, update on public.ai_personas to service_role;
grant select, insert on public.ai_chat_usage to service_role;
