-- REVIEW DRAFT ONLY. Do not apply until the deployed POST/PUT /api/comments
-- paths work with real signed-in accounts and the private-story guard is ready.
-- Current direct INSERT/UPDATE policies let a browser bypass Potens checks.
-- The service-role server path remains able to write after these policies go.

begin;

drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;

-- Keep comments_select_public until the author-private RLS migration replaces
-- it atomically. Keep comments_delete_own so an author can remove old content.

commit;
