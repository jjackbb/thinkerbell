-- 2026-09-30: combined migration 20260929210710 applied after public server verification.
-- Historical recipe below; do not reapply it independently.
-- REVIEW DRAFT ONLY. Apply after the server AI paths and their RPCs are
-- deployed and verified. Until then the existing public app still writes
-- ai_personas and ai_chat_usage directly from the browser.
-- Read and owner DELETE on ai_personas stay available to the browser.

begin;

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

commit;
