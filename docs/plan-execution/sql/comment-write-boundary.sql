-- 2026-09-30: combined migration 20260929210710 applied after public server verification.
-- Historical recipe below; do not reapply it independently.
-- REVIEW DRAFT ONLY. Do not apply until the deployed POST/PUT /api/comments
-- paths work with real signed-in accounts and the private-story guard is ready.
-- Current direct INSERT/UPDATE policies let a browser bypass Potens checks.
-- The service-role server path remains able to write after these policies go.

begin;

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

-- Keep comments_select_public until the author-private RLS migration replaces
-- it atomically. Keep comments_delete_own so an author can remove old content.

commit;
