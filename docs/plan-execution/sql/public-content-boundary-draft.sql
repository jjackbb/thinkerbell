-- Applied to operating project vzhyhadjtaqbapicjrco on 2026-10-10 after approval and metadata preflight.
-- One-time historical migration: do not rerun. Original definitions and rollback snapshot retained locally.
-- Preflight current policies/grants/publication and deploy matching client RPC reads atomically.
-- Raw author IDs stay for existing ownership/badge behavior; private prompt/appeal text is owner-only.
begin;
create or replace function public.can_read_story(p_story_id text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.stories s where s.id=p_story_id and
  (s."authorId"=auth.uid()::text or (s.visibility='public' and not coalesce(s."isBlind",false)
    and not coalesce(s."isAdult",false) and not coalesce(s."isHidden",false))));
$$;
revoke all on function public.can_read_story(text) from public;
grant execute on function public.can_read_story(text) to anon,authenticated;

create or replace function public.read_visible_stories(p_story_id text default null)
returns setof jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
    'id', s."id",
    'authorId', s."authorId",
    'authorNickname', s."authorNickname",
    'title', s."title",
    'body', s."body",
    'category', s."category",
    'createdAt', s."createdAt",
    'votesA', s."votesA",
    'votesB', s."votesB",
    'commentCount', s."commentCount",
    'viewCount', s."viewCount",
    'isHot', s."isHot",
    'isWeeklyTop', s."isWeeklyTop",
    'weeklyRank', s."weeklyRank",
    'personaName', s."personaName",
    'isBlind', s."isBlind",
    'isAdult', s."isAdult",
    'isHidden', s."isHidden",
    'cardColor', s."cardColor",
    'visibility', s."visibility"
 ) || case when s."authorId"=auth.uid()::text then jsonb_build_object(
    'reportsCount',s."reportsCount",'appealStatus',s."appealStatus",'personaInstruction',s."personaInstruction",'appealText',s."appealText",'appealedAt',s."appealedAt") else '{}'::jsonb end
 from public.stories s where (p_story_id is null or s.id=p_story_id) and public.can_read_story(s.id)
 order by s."createdAt" desc;
$$;
create or replace function public.read_visible_comments(p_story_id text default null)
returns setof jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
    'id', c."id",
    'storyId', c."storyId",
    'authorId', c."authorId",
    'anonymousId', c."anonymousId",
    'content', c."content",
    'createdAt', c."createdAt",
    'likeCount', c."likeCount",
    'isBlind', c."isBlind",
    'authorVoted', c."authorVoted",
    'isEdited', c."isEdited"
 ) from public.comments c where (p_story_id is null or c."storyId"=p_story_id)
   and not coalesce(c."isBlind",false) and public.can_read_story(c."storyId")
 order by c."createdAt" asc;
$$;
revoke all on function public.read_visible_stories(text),public.read_visible_comments(text) from public;
grant execute on function public.read_visible_stories(text),public.read_visible_comments(text) to anon,authenticated;

-- Mutation RPCs also returned raw composite rows. Keep their existing guards/locks
-- and use exactly the same allowlist as read RPCs. This proposal is applied once;
-- a second application must fail rather than rename a wrapper into itself.
alter function public.vote_story(text,text) rename to vote_story_boundary_internal;
alter function public.like_comment(text,integer) rename to like_comment_boundary_internal;
alter function public.set_story_visibility(text,text) rename to set_story_visibility_boundary_internal;
create function public.vote_story(p_story_id text,p_option text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.stories; v_result jsonb; begin
 v_row:=public.vote_story_boundary_internal(p_story_id,p_option);
 select item into v_result from public.read_visible_stories(v_row.id) item;
 if v_result is null then raise exception 'STORY_NOT_FOUND'; end if;
 return v_result;
end $$;
create function public.like_comment(p_comment_id text,p_delta integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.comments; v_result jsonb; begin
 v_row:=public.like_comment_boundary_internal(p_comment_id,p_delta);
 select item into v_result from public.read_visible_comments(v_row."storyId") item where item->>'id'=v_row.id;
 if v_result is null then raise exception 'COMMENT_NOT_FOUND'; end if;
 return v_result;
end $$;
create function public.set_story_visibility(p_story_id text,p_visibility text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.stories; v_result jsonb; begin
 v_row:=public.set_story_visibility_boundary_internal(p_story_id,p_visibility);
 select item into v_result from public.read_visible_stories(v_row.id) item;
 if v_result is null then raise exception 'STORY_NOT_FOUND'; end if;
 return v_result;
end $$;
-- Close every existing public RPC returning raw story/comment composites,
-- including renamed implementations and deprecated report RPCs/overloads.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p
  where p.pronamespace='public'::regnamespace and p.prorettype in ('public.stories'::regtype,'public.comments'::regtype)
 loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); end loop;
end $$;
revoke all on function public.vote_story(text,text),public.like_comment(text,integer),public.set_story_visibility(text,text) from public,anon;
grant execute on function public.vote_story(text,text),public.like_comment(text,integer),public.set_story_visibility(text,text) to authenticated;

-- Defense beyond UI: no raw content or owner-only fields readable through direct REST.
revoke select on public.stories,public.comments from public,anon,authenticated;
-- PostgreSQL retains explicit column grants after a table-level revoke; remove every existing one.
do $$ declare t text; cols text; begin
 foreach t in array array['stories','comments'] loop
  select string_agg(quote_ident(attname),',') into cols from pg_catalog.pg_attribute
   where attrelid=('public.'||t)::regclass and attnum>0 and not attisdropped;
  execute format('revoke select (%s) on public.%I from public,anon,authenticated',cols,t);
 end loop;
end $$;
-- Minimum columns needed by existing authenticated owner DELETE + RETURNING id.
grant select(id,"authorId") on public.stories to authenticated;
grant select(id,"storyId","authorId") on public.comments to authenticated;
drop policy if exists comments_select_visible on public.comments;
create policy comments_select_visible on public.comments for select to anon,authenticated
 using(public.can_read_story("storyId") and (not coalesce("isBlind",false) or "authorId"=auth.uid()::text));

-- Base-table realtime payloads cannot carry private fields around the RPC projection.
do $$ declare t text; begin
 foreach t in array array['stories','comments'] loop
  if exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime drop table public.%I',t);
  end if;
 end loop;
end $$;
-- ID-only updates distinguish content refresh from access invalidation.
alter table public.story_access_invalidations add column if not exists access_changed boolean not null default true;
create or replace function public.notify_story_access_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_access boolean := false; v_id text; begin
 if tg_table_name='stories' then
  if tg_op='DELETE' then v_id:=old.id; v_access:=true;
  else
   v_id:=new.id;
   if tg_op='UPDATE' then v_access := old.visibility is distinct from new.visibility
    or old."isBlind" is distinct from new."isBlind" or old."isAdult" is distinct from new."isAdult"
    or old."isHidden" is distinct from new."isHidden"; end if;
  end if;
 else
  if tg_op='DELETE' then v_id:=old."storyId"; else v_id:=new."storyId"; end if;
 end if;
 insert into public.story_access_invalidations(story_id,access_changed) values(v_id,v_access);
 return null;
end;
$$;
revoke all on function public.notify_story_access_change() from public,anon,authenticated;
drop trigger if exists story_access_invalidation on public.stories;
create trigger story_access_invalidation after insert or update or delete on public.stories
 for each row execute function public.notify_story_access_change();
drop trigger if exists comment_content_invalidation on public.comments;
create trigger comment_content_invalidation after insert or update or delete on public.comments
 for each row execute function public.notify_story_access_change();
commit;
