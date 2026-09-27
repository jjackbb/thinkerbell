-- REVIEW DRAFT ONLY. Apply after the server AI paths and their RPCs are
-- deployed and verified. Until then the existing public app still writes
-- ai_personas and ai_chat_usage directly from the browser.
-- Read and owner DELETE on ai_personas stay available to the browser.

drop policy if exists ai_personas_insert_own on public.ai_personas;
drop policy if exists ai_personas_update_own on public.ai_personas;
drop policy if exists ai_chat_usage_insert_own on public.ai_chat_usage;

revoke insert, update on public.ai_personas from public, anon, authenticated;
revoke insert, update, delete on public.ai_chat_usage from public, anon, authenticated;

-- The API server uses a service-role client for its checked room and turn RPCs.
grant select, insert, update on public.ai_personas to service_role;
grant select, insert on public.ai_chat_usage to service_role;
