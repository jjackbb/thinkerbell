\set ON_ERROR_STOP on
-- Synthetic disposable rows only. The DELETE policy is copied verbatim from
-- 20260817000000_tighten_rls.sql; production policy state is not inferred.
create table public.stories(id text primary key, "authorId" text, visibility text, "isHidden" boolean, "isBlind" boolean);
alter table public.stories enable row level security;
grant select, delete on public.stories to anon, authenticated;
create policy stories_select_public on public.stories for select to anon, authenticated
using ((visibility='public' and not "isHidden" and not "isBlind") or "authorId"=auth.uid()::text);
create policy "stories_delete_own"
on public.stories
for delete
to authenticated
using ("authorId" = auth.uid()::text);
insert into public.stories values
('ordinary','11111111-1111-1111-1111-111111111111','public',false,false),
('private','11111111-1111-1111-1111-111111111111','private',false,false),
('hidden','11111111-1111-1111-1111-111111111111','public',true,false),
('blind','11111111-1111-1111-1111-111111111111','public',false,true),
('missing-author',null,'public',false,false),
('empty-author','','public',false,false);
