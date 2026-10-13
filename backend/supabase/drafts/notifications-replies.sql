-- DRAFT ONLY. Not a numbered migration; NEVER apply the migrations folder wholesale.
-- Requires approved policy choices + isolated PostgreSQL integration/concurrency tests.
-- No historic notification backfill, no cleanup, no cron, no AI tables/functions touched.
-- User-approved choices represented here: self-action suppression; once-ever like/threshold
-- dedupe; direct reply target + story owner with one event per recipient; tombstones.
-- Before approved application, independently snapshot/review current function definitions,
-- policies, grants and triggers. Set app.reviewed_notification_boundary_md5 to md5 of:
-- select string_agg(pg_get_functiondef(p.oid), E'\n' order by p.oid::regprocedure::text)
-- from pg_proc p where p.oid in ('public.read_visible_comments(text)'::regprocedure,
-- 'public.vote_story(text,text)'::regprocedure,'public.like_comment(text,integer)'::regprocedure,
-- 'public.sync_story_comment_count()'::regprocedure);
-- This explicit reviewed fingerprint prevents a silent overwrite of an unknown boundary.
-- Apply in one transaction. Tables/emitters stay DISABLED until a separately approved
-- activation sets notification_feature_config.enabled=true and both app flags are on.
begin;
do $$ declare v_hash text; begin
 if to_regprocedure('public.vote_story_boundary_internal(text,text)') is null
    or to_regprocedure('public.like_comment_boundary_internal(text,integer)') is null
    or to_regprocedure('public.can_read_story(text)') is null then
  raise exception 'PUBLIC_BOUNDARY_PREFLIGHT_REQUIRED';
 end if;
 if (select prorettype from pg_proc where oid='public.vote_story(text,text)'::regprocedure) <> 'jsonb'::regtype
    or (select prorettype from pg_proc where oid='public.like_comment(text,integer)'::regprocedure) <> 'jsonb'::regtype then
  raise exception 'PUBLIC_BOUNDARY_SIGNATURE_CHANGED';
 end if;
 select md5(string_agg(pg_get_functiondef(p.oid), E'\n' order by p.oid::regprocedure::text)) into v_hash
 from pg_proc p where p.oid in ('public.read_visible_comments(text)'::regprocedure,
 'public.vote_story(text,text)'::regprocedure,'public.like_comment(text,integer)'::regprocedure,
 'public.sync_story_comment_count()'::regprocedure);
 if current_setting('app.reviewed_notification_boundary_md5',true) is distinct from v_hash then
  raise exception 'REVIEWED_BOUNDARY_FINGERPRINT_REQUIRED';
 end if;
 -- Sep 25 schema evidence records this cascade; never assume the Aug 17 dump has it.
 if not exists(select 1 from pg_constraint k where k.contype='f'
  and k.conrelid='public.comments'::regclass and k.confrelid='public.stories'::regclass and k.confdeltype='c'
  and k.conkey=array[(select attnum from pg_attribute where attrelid='public.comments'::regclass and attname='storyId')]
  and k.confkey=array[(select attnum from pg_attribute where attrelid='public.stories'::regclass and attname='id')]) then
  raise exception 'COMMENT_STORY_CASCADE_PREFLIGHT_REQUIRED';
 end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='comments' and cmd in ('ALL','INSERT','UPDATE'))
    or has_table_privilege('authenticated','public.comments','SELECT')
    or has_function_privilege('authenticated','public.like_comment_boundary_internal(text,integer)','EXECUTE')
    or has_function_privilege('authenticated','public.vote_story_boundary_internal(text,text)','EXECUTE') then
  raise exception 'PUBLIC_BOUNDARY_GRANTS_CHANGED';
 end if;
end $$;

create table public.notification_feature_config (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.notification_feature_config(singleton) values(true);
alter table public.notification_feature_config enable row level security;
revoke all on public.notification_feature_config from public,anon,authenticated;
create function public.notifications_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from public.notification_feature_config where singleton),false)
$$;
revoke all on function public.notifications_enabled() from public,anon,authenticated;

alter table public.comments add column "replyRootId" text,
 add column "replyToId" text, add column "deletedAt" timestamptz;
alter table public.comments add constraint comment_reply_shape check (
 ("replyRootId" is null and "replyToId" is null) or
 ("replyRootId" is not null and "replyToId" is not null and "replyRootId"<>id and "replyToId"<>id));
-- Composite keys make cross-story groups impossible even for accidental service writes.
alter table public.comments add constraint comments_id_story_unique unique(id,"storyId");
alter table public.comments add constraint comments_reply_root_fk foreign key("replyRootId","storyId") references public.comments(id,"storyId") deferrable initially deferred,
 add constraint comments_reply_target_fk foreign key("replyToId","storyId") references public.comments(id,"storyId") deferrable initially deferred;
create index comments_reply_root_idx on public.comments("storyId","replyRootId","createdAt",id);

create function public.project_reply_comment(c public.comments) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('id',c.id,'storyId',c."storyId",'authorId',c."authorId",
 'anonymousId',case when c."deletedAt" is null then c."anonymousId" else '삭제된 댓글' end,'content',case when c."deletedAt" is null then c.content else '' end,
 'createdAt',c."createdAt",'likeCount',case when c."deletedAt" is null then c."likeCount" else 0 end,
 'isBlind',c."isBlind",'authorVoted',case when c."deletedAt" is null then c."authorVoted" else null end,'isEdited',c."isEdited",
 'replyRootId',c."replyRootId",'replyToId',c."replyToId",'deletedAt',c."deletedAt")
$$;
revoke all on function public.project_reply_comment(public.comments) from public,anon,authenticated;
create or replace function public.read_visible_comments(p_story_id text default null)
returns setof jsonb language sql stable security definer set search_path='' as $$
 select public.project_reply_comment(c) from public.comments c
 where (p_story_id is null or c."storyId"=p_story_id)
 and not coalesce(c."isBlind",false) and public.can_read_story(c."storyId")
 order by c."createdAt",c.id
$$;
revoke all on function public.read_visible_comments(text) from public;
grant execute on function public.read_visible_comments(text) to anon,authenticated;
-- Preserve the JSONB boundary and existing internal like implementation. Add an
-- outer tombstone guard before calling it, including already-liked idempotent calls.
create or replace function public.like_comment(p_comment_id text,p_delta integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_story_id text; v_row public.comments; v_result jsonb; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select "storyId" into v_story_id from public.comments where id=p_comment_id;
 perform 1 from public.stories where id=v_story_id for update;
 perform 1 from public.comments where id=p_comment_id and "deletedAt" is null for update;
 if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
 v_row:=public.like_comment_boundary_internal(p_comment_id,p_delta);
 select item into v_result from public.read_visible_comments(v_row."storyId") item where item->>'id'=v_row.id;
 if v_result is null then raise exception 'COMMENT_NOT_FOUND'; end if;
 return v_result;
end $$;
revoke all on function public.like_comment(text,integer) from public,anon;
grant execute on function public.like_comment(text,integer) to authenticated;
-- vote_story and all composite internal RPCs are unchanged.

-- Keep live comment counts exact across soft deletes, retries, and hard cascades.
create or replace function public.sync_story_comment_count() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_delta integer:=0; v_story text; begin
 if tg_op='INSERT' then v_story:=new."storyId"; v_delta:=case when new."deletedAt" is null then 1 else 0 end;
 elsif tg_op='DELETE' then v_story:=old."storyId"; v_delta:=case when old."deletedAt" is null then -1 else 0 end;
 else v_story:=new."storyId"; v_delta:=(case when new."deletedAt" is null then 1 else 0 end)-(case when old."deletedAt" is null then 1 else 0 end);
 end if;
 if v_delta<>0 then
  perform set_config('app.counter_update','on',true);
  update public.stories set "commentCount"=greatest(0,coalesce("commentCount",0)+v_delta) where id=v_story;
 end if;
 return null;
end $$;
revoke all on function public.sync_story_comment_count() from public,anon,authenticated;
drop trigger trg_sync_story_comment_count on public.comments;
create trigger trg_sync_story_comment_count after insert or delete or update of "deletedAt" on public.comments
 for each row execute function public.sync_story_comment_count();

create function public.guard_comment_reply() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_target public.comments; v_root public.comments; begin
 if tg_op='DELETE' then
  if public.notifications_enabled() and auth.role()='authenticated'
    and exists(select 1 from public.stories where id=old."storyId") then raise exception 'USE_COMMENT_DELETE_API'; end if;
  return old;
 end if;
 if tg_op='UPDATE' then
  if new."replyToId" is distinct from old."replyToId" or new."replyRootId" is distinct from old."replyRootId"
     or new."storyId"<>old."storyId" or new."authorId"<>old."authorId" then raise exception 'COMMENT_TARGET_IMMUTABLE'; end if;
  if old."deletedAt" is not null and (new.content<>old.content or new."deletedAt" is distinct from old."deletedAt") then
   raise exception 'COMMENT_DELETED';
  end if;
  return new;
 end if;
 if new."replyToId" is not null then
  if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
  select * into v_target from public.comments where id=new."replyToId" and "storyId"=new."storyId" for share;
  if not found or v_target."deletedAt" is not null or coalesce(v_target."isBlind",false) then raise exception 'REPLY_TARGET_NOT_FOUND'; end if;
  new."replyRootId":=coalesce(v_target."replyRootId",v_target.id);
  select * into v_root from public.comments where id=new."replyRootId" and "storyId"=new."storyId" for share;
  if not found or v_root."replyRootId" is not null or coalesce(v_root."isBlind",false) then raise exception 'REPLY_TARGET_NOT_FOUND'; end if;
  -- A deleted root remains a tombstone; a live reply in that group may receive replies.
 elsif new."replyRootId" is not null then raise exception 'INVALID_COMMENT_TARGET'; end if;
 return new;
end $$;
revoke all on function public.guard_comment_reply() from public,anon,authenticated;
create trigger comment_reply_guard before insert or update or delete on public.comments for each row execute function public.guard_comment_reply();

create function public.save_comment_with_reply(p_id text,p_story_id text,p_actor uuid,p_content text,p_reply_to_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_story public.stories; v_comment public.comments; begin
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 if p_actor is null or not exists(select 1 from auth.users where id=p_actor)
  or p_content is null or length(btrim(p_content)) not between 1 and 200
  or p_id is null or p_id !~* '^comment-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'INVALID_COMMENT_TARGET'; end if;
 -- All comment creates/deletes lock story first, serializing retries and parent races.
 select * into v_story from public.stories where id=p_story_id for update;
 if not found or v_story.visibility<>'public' or coalesce(v_story."isBlind",false)
  or coalesce(v_story."isAdult",false) or coalesce(v_story."isHidden",false) then raise exception 'STORY_NOT_FOUND'; end if;
 select * into v_comment from public.comments where id=p_id;
 if found then
  if v_comment."authorId"<>p_actor::text or v_comment."storyId"<>p_story_id
   or v_comment."replyToId" is distinct from p_reply_to_id or v_comment."deletedAt" is not null then raise exception 'COMMENT_ID_CONFLICT'; end if;
  return public.project_reply_comment(v_comment);
 end if;
 insert into public.comments(id,"storyId","authorId","anonymousId",content,"createdAt","likeCount","reportsCount","isBlind","isEdited","replyToId")
 values(p_id,p_story_id,p_actor::text,'익명 0',p_content,to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),0,0,false,false,p_reply_to_id)
 returning * into v_comment;
 return public.project_reply_comment(v_comment);
end $$;
revoke all on function public.save_comment_with_reply(text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.save_comment_with_reply(text,text,uuid,text,text) to service_role;

create function public.delete_comment_with_replies(p_id text,p_story_id text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 perform 1 from public.stories where id=p_story_id for update;
 if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
 perform 1 from public.comments where id=p_id and "storyId"=p_story_id and "authorId"=p_actor::text for update;
 if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
 update public.comments set "deletedAt"=now(),content='' where id=p_id and "deletedAt" is null;
end $$;
revoke all on function public.delete_comment_with_replies(text,text,uuid) from public,anon,authenticated;
grant execute on function public.delete_comment_with_replies(text,text,uuid) to service_role;

-- Persistent delivery to current accounts, including offline accounts. Payload has
-- only routing IDs/counts; no copied story text, comment text, nickname, or AI content.
create table public.notification_events (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, kind text not null check(kind in ('story_comment','comment_reply','comment_like','story_vote_milestone')),
 story_id text not null references public.stories(id) on delete cascade,
 comment_id text references public.comments(id) on delete cascade,
 reply_root_id text, milestone integer,
 created_at timestamptz not null default clock_timestamp(), read_at timestamptz,
 unique(recipient_id,event_key),
 check((kind='story_vote_milestone' and milestone is not null and milestone>0 and
   ((milestone<100 and milestone%10=0) or (milestone>=100 and milestone%100=0)) and comment_id is null)
  or (kind<>'story_vote_milestone' and milestone is null and comment_id is not null))
);
create index notification_recipient_page_idx on public.notification_events(recipient_id,created_at desc,id desc);
create index notification_recipient_unread_idx on public.notification_events(recipient_id) where read_at is null;
-- Separate minimal ledger preserves once-ever dedupe if a future, approved retention
-- job removes delivery rows. No deletion job/function is created in this draft.
create table public.notification_dedupe (
 recipient_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null, primary key(recipient_id,event_key)
);
alter table public.notification_events enable row level security;
alter table public.notification_dedupe enable row level security;
revoke all on public.notification_events,public.notification_dedupe from public,anon,authenticated;
-- No raw table grants or realtime publication: only own-user projected RPCs below.
create policy notifications_select_own on public.notification_events for select to authenticated using(recipient_id=auth.uid());

create function public.emit_notification(p_recipient text,p_actor text,p_key text,p_kind text,p_story text,p_comment text default null,p_root text default null,p_milestone integer default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_inserted integer; begin
 if not public.notifications_enabled() or p_recipient is null or p_actor is null or p_recipient=p_actor then return; end if;
 select id into v_user from auth.users where id::text=p_recipient;
 if v_user is null then return; end if;
 insert into public.notification_dedupe(recipient_id,event_key) values(v_user,p_key) on conflict do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return; end if;
 insert into public.notification_events(recipient_id,event_key,kind,story_id,comment_id,reply_root_id,milestone)
 values(v_user,p_key,p_kind,p_story,p_comment,p_root,p_milestone);
end $$;
revoke all on function public.emit_notification(text,text,text,text,text,text,text,integer) from public,anon,authenticated;

create function public.notify_new_comment() returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner text; v_target text; begin
 if not public.notifications_enabled() then return null; end if;
 select "authorId" into v_owner from public.stories where id=new."storyId";
 if new."replyToId" is not null then
  select "authorId" into v_target from public.comments where id=new."replyToId";
  perform public.emit_notification(v_target,new."authorId",'comment:'||new.id,'comment_reply',new."storyId",new.id,new."replyRootId");
 end if;
 -- Same event key makes owner=direct-target produce a single reply notification.
 perform public.emit_notification(v_owner,new."authorId",'comment:'||new.id,'story_comment',new."storyId",new.id,new."replyRootId");
 return null;
end $$;
revoke all on function public.notify_new_comment() from public,anon,authenticated;
create trigger notification_new_comment after insert on public.comments for each row execute function public.notify_new_comment();

create function public.notify_comment_like() returns trigger language plpgsql security definer set search_path='' as $$
declare v_comment public.comments; begin
 select * into v_comment from public.comments where id=new.comment_id;
 if v_comment."deletedAt" is not null then raise exception 'COMMENT_NOT_FOUND'; end if;
 if public.notifications_enabled() then
  perform public.emit_notification(v_comment."authorId",new.user_id::text,'like:'||new.comment_id||':'||new.user_id::text,
   'comment_like',v_comment."storyId",v_comment.id,v_comment."replyRootId");
 end if;
 return null;
end $$;
revoke all on function public.notify_comment_like() from public,anon,authenticated;
create trigger notification_comment_like after insert on public.comment_likes for each row execute function public.notify_comment_like();

create function public.notify_story_vote_milestone() returns trigger language plpgsql security definer set search_path='' as $$
declare v_total integer:=coalesce(new."votesA",0)+coalesce(new."votesB",0); begin
 if v_total>coalesce(old."votesA",0)+coalesce(old."votesB",0)
 and v_total>0 and ((v_total<100 and v_total%10=0) or (v_total>=100 and v_total%100=0)) then
  perform public.emit_notification(new."authorId",auth.uid()::text,'vote:'||new.id||':'||v_total::text,
   'story_vote_milestone',new.id,null,null,v_total);
 end if;
 return null;
end $$;
revoke all on function public.notify_story_vote_milestone() from public,anon,authenticated;
create trigger notification_story_votes after update of "votesA","votesB" on public.stories for each row execute function public.notify_story_vote_milestone();

create function public.notification_target_visible(p_story text,p_comment text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.can_read_story(p_story) and exists(select 1 from public.stories s where s.id=p_story
 and not coalesce(s."isBlind",false) and not coalesce(s."isAdult",false) and not coalesce(s."isHidden",false)) and (p_comment is null or exists(select 1 from public.comments c
 where c.id=p_comment and c."storyId"=p_story and c."deletedAt" is null and not coalesce(c."isBlind",false)))
$$;
revoke all on function public.notification_target_visible(text,text) from public,anon,authenticated;
create function public.read_my_notifications(p_limit integer default 21,p_before_created_at timestamptz default null,p_before_id uuid default null)
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 if p_limit is null or p_limit not between 1 and 51 or (p_before_created_at is null)<>(p_before_id is null) then raise exception 'INVALID_NOTIFICATION_PAGE'; end if;
 return query select jsonb_build_object('id',n.id,'kind',n.kind,'storyId',n.story_id,'commentId',n.comment_id,
 'replyRootId',n.reply_root_id,'milestone',n.milestone,'createdAt',n.created_at,'readAt',n.read_at)
 from public.notification_events n where n.recipient_id=auth.uid()
 and public.notification_target_visible(n.story_id,n.comment_id)
 and (p_before_created_at is null or (n.created_at,n.id)<(p_before_created_at,p_before_id))
 order by n.created_at desc,n.id desc limit p_limit;
end $$;
create function public.count_my_unread_notifications() returns integer
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 return (select count(*)::integer from public.notification_events n where recipient_id=auth.uid()
 and read_at is null and public.notification_target_visible(n.story_id,n.comment_id));
end $$;
create function public.mark_my_notifications_read(p_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 -- One statement snapshot; events committed after this statement remain unread.
 update public.notification_events set read_at=statement_timestamp()
 where recipient_id=auth.uid() and read_at is null and (p_id is null or id=p_id)
 and created_at<=statement_timestamp();
end $$;
revoke all on function public.read_my_notifications(integer,timestamptz,uuid),public.count_my_unread_notifications(),public.mark_my_notifications_read(uuid) from public,anon;
grant execute on function public.read_my_notifications(integer,timestamptz,uuid),public.count_my_unread_notifications(),public.mark_my_notifications_read(uuid) to authenticated;
commit;
