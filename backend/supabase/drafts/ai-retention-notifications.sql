-- APPROVED POLICY / UNAPPLIED PREPARATION DRAFT. No activation, cron edit, or data
-- deletion occurs when this file defines the functions. Requires prior notification
-- draft and the deployed quota/completion boundary, verified in isolated tests first.
-- At deployment compare an independently reviewed complete_ai_turn definition MD5:
-- set app.reviewed_ai_completion_md5='<md5(pg_get_functiondef(...))>';
-- Activation is separate: ai-retention-activation.sql. Never run folder wholesale.
begin;
do $$ begin
 if current_setting('app.reviewed_ai_retention_boundary_md5',true) is distinct from (
 select md5(string_agg(item,E'\n' order by item)) from (
 select pg_get_functiondef(p.oid) item from pg_proc p where p.oid in
 ('public.emit_notification(text,text,text,text,text,text,text,integer)'::regprocedure,
 'public.read_my_notifications(integer,timestamptz,uuid)'::regprocedure,
 'public.count_my_unread_notifications()'::regprocedure)
 union all select conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.notification_events'::regclass
 union all select policyname||':'||cmd||':'||roles::text||':'||coalesce(qual,'')||':'||coalesce(with_check,'')
 from pg_policies where schemaname='public' and tablename in ('ai_personas','notification_events')
) reviewed_boundary
 ) then raise exception 'AI_RETENTION_BOUNDARY_REVIEW_REQUIRED'; end if;
 if to_regprocedure('public.complete_ai_turn_retention_internal(uuid,text,uuid,text,text,timestamptz,timestamptz)') is not null then raise exception 'RETENTION_ALREADY_PREPARED'; end if;
 if current_setting('app.reviewed_ai_completion_md5',true) is distinct from
   (select md5(pg_get_functiondef('public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)'::regprocedure))) then
  raise exception 'AI_COMPLETION_REVIEW_REQUIRED';
 end if;
end $$;
create table public.ai_retention_config(singleton boolean primary key default true check(singleton),enabled boolean not null default false,activated_at timestamptz);
insert into public.ai_retention_config(singleton) values(true);
alter table public.ai_retention_config enable row level security;
revoke all on public.ai_retention_config from public,anon,authenticated,service_role;
create function public.ai_retention_active() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from public.ai_retention_config where singleton),false)
$$;
revoke all on function public.ai_retention_active() from public,anon;
grant execute on function public.ai_retention_active() to authenticated,service_role;
create function public.ai_six_calendar_months(p_at timestamptz) returns timestamptz
language sql immutable set search_path='' as $$ select ((p_at at time zone 'Asia/Seoul') + interval '6 months') at time zone 'Asia/Seoul' $$;
revoke all on function public.ai_six_calendar_months(timestamptz) from public,anon,authenticated;
grant execute on function public.ai_six_calendar_months(timestamptz) to service_role;

alter table public.ai_personas add column "lastCompletedAt" timestamptz,
 add column "expiresAt" timestamptz, add column "retentionVersion" bigint,
 add column "retentionBasis" text check("retentionBasis" in ('completed_turn','legacy_updated_at','created_at'));
create index ai_personas_retention_expiry_idx on public.ai_personas("expiresAt",id);
-- Existing owner-only permissive policies remain required. Restrictive policy prevents
-- cached direct SELECT from exposing expired rooms while daily physical purge is pending.
create policy ai_rooms_retained_select on public.ai_personas as restrictive for select to authenticated
 using("userId"=auth.uid() and (not public.ai_retention_active() or "expiresAt">statement_timestamp()));

-- Extend routing metadata only. AI notices never copy history, prompt, title or description.
alter table public.notification_events alter column story_id drop not null,
 add column room_id text references public.ai_personas(id) on delete cascade,
 add column expires_at timestamptz, add column retention_version bigint, add column invalidated_at timestamptz;
alter table public.notification_events drop constraint notification_events_kind_check,
 drop constraint notification_events_check;
alter table public.notification_events add constraint notification_events_kind_check
 check(kind in ('story_comment','comment_reply','comment_like','story_vote_milestone','ai_room_expiring'));
alter table public.notification_events add constraint notification_events_payload_check check(
 (kind='ai_room_expiring' and room_id is not null and expires_at is not null and retention_version is not null
 and story_id is null and comment_id is null and reply_root_id is null and milestone is null)
 or (kind<>'ai_room_expiring' and room_id is null and expires_at is null and retention_version is null and story_id is not null
 and ((kind='story_vote_milestone' and milestone is not null and milestone>0 and ((milestone<100 and milestone%10=0) or (milestone>=100 and milestone%100=0)) and comment_id is null)
 or (kind<>'story_vote_milestone' and milestone is null and comment_id is not null))));
create index notification_room_generation_idx on public.notification_events(room_id,retention_version) where room_id is not null;
-- Minimal dedupe outlives 30-day delivery rows, but is removed with source/recipient.
-- Only like keys contain actor UUIDs: actor cascade applies there. Milestone keys
-- never store the crossing voter, so that voter deleting an account cannot reset them.
alter table public.notification_dedupe add column story_id text references public.stories(id) on delete cascade,
 add column room_id text references public.ai_personas(id) on delete cascade,
 add column actor_id uuid references auth.users(id) on delete cascade;
update public.notification_dedupe d set story_id=n.story_id from public.notification_events n
 where n.recipient_id=d.recipient_id and n.event_key=d.event_key;
-- This is metadata-only association of the unactivated prior draft, not alert backfill.
-- Fail rather than silently retain orphan ledger rows from an unknown active installation.
do $$ begin if exists(select 1 from public.notification_dedupe where story_id is null) then raise exception 'UNSCOPED_DEDUPE_REVIEW_REQUIRED'; end if; end $$;
-- Prior draft like keys contain an opaque actor UUID. Associate only existing auth
-- accounts without casting arbitrary text; unknown prior history must be reviewed.
update public.notification_dedupe d set actor_id=u.id from auth.users u
 where d.event_key like 'like:%' and right(d.event_key,36)=u.id::text;
do $$ begin if exists(select 1 from public.notification_dedupe where event_key like 'like:%' and actor_id is null)
 then raise exception 'LEGACY_LIKE_ACTOR_REVIEW_REQUIRED'; end if; end $$;
alter table public.notification_events add constraint notification_delivery_dedupe_fk
 foreign key(recipient_id,event_key) references public.notification_dedupe(recipient_id,event_key) on delete cascade;
alter table public.notification_dedupe add constraint notification_dedupe_source_check check((story_id is null)<>(room_id is null));
create or replace function public.emit_notification(p_recipient text,p_actor text,p_key text,p_kind text,p_story text,p_comment text default null,p_root text default null,p_milestone integer default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid; v_actor uuid; v_inserted integer; begin
 if not public.notifications_enabled() or p_recipient is null or p_actor is null or p_recipient=p_actor then return; end if;
 select id into v_user from auth.users where id::text=p_recipient;
 select id into v_actor from auth.users where id::text=p_actor;
 if v_user is null or v_actor is null then return; end if;
 insert into public.notification_dedupe(recipient_id,event_key,story_id,actor_id) values(v_user,p_key,p_story,case when p_kind='comment_like' then v_actor else null end) on conflict do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return; end if;
 insert into public.notification_events(recipient_id,event_key,kind,story_id,comment_id,reply_root_id,milestone)
 values(v_user,p_key,p_kind,p_story,p_comment,p_root,p_milestone);
end $$;
revoke all on function public.emit_notification(text,text,text,text,text,text,text,integer) from public,anon,authenticated;

create function public.guard_ai_retention() returns trigger language plpgsql security definer set search_path='' as $$
declare v_now timestamptz:=clock_timestamp(); begin
 if tg_op='DELETE' then
  -- Use the locked row's initialized deadline, NOT a possibly old statement snapshot
  -- of the feature config. Queued-old-cron races still require multi-session testing.
  -- Protect initialized live/grace rows even if feature flags are later disabled. Owner deletions and auth-user cascades
  -- remain valid; an untrusted browser cannot bypass ownership/RLS with a GUC.
  if old."expiresAt">v_now and exists(select 1 from auth.users where id=old."userId")
   and coalesce(auth.role(),'') not in ('authenticated','service_role') then return null; end if;
  return old;
 end if;
 if not public.ai_retention_active() then return new; end if;
 if tg_op='INSERT' then
  new."createdAt":=v_now; new."lastCompletedAt":=null; new."retentionVersion":=1;
  new."expiresAt":=public.ai_six_calendar_months(v_now); new."retentionBasis":='created_at'; return new;
 end if;
 if old."expiresAt"<=v_now and not (
  coalesce(current_setting('app.ai_retention_completing',true),'off')='on'
  and (coalesce(auth.role(),'')='service_role' or session_user in ('postgres','supabase_admin'))
 ) then raise exception 'AI_ROOM_EXPIRED'; end if;
 if new."chatHistory" is distinct from old."chatHistory"
  and current_setting('app.ai_retention_completing',true) is distinct from 'on' then raise exception 'AI_RETENTION_COMPLETION_REQUIRED'; end if;
 if current_setting('app.ai_retention_completing',true) is distinct from 'on'
  and (new."lastCompletedAt" is distinct from old."lastCompletedAt" or new."expiresAt" is distinct from old."expiresAt"
   or new."retentionVersion" is distinct from old."retentionVersion" or new."retentionBasis" is distinct from old."retentionBasis") then
  raise exception 'AI_RETENTION_METADATA_IMMUTABLE'; end if;
 return new;
end $$;
revoke all on function public.guard_ai_retention() from public,anon,authenticated,service_role;
create trigger ai_retention_guard before insert or update or delete on public.ai_personas for each row execute function public.guard_ai_retention();

alter function public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz) rename to complete_ai_turn_retention_internal;
create function public.complete_ai_turn(p_user_id uuid,p_persona_id text,p_request_id uuid,p_prompt text,p_answer text,p_finished_at timestamptz,p_activated_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.ai_personas; v_now timestamptz; v_result jsonb; begin
 if not public.ai_retention_active() then
  return public.complete_ai_turn_retention_internal(p_user_id,p_persona_id,p_request_id,p_prompt,p_answer,p_finished_at,p_activated_at);
 end if;
 -- Same account -> room ordering as existing reservation/completion RPCs.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select * into v_room from public.ai_personas where id=p_persona_id for update;
 if not found or v_room."userId"<>p_user_id or p_user_id is null then raise exception 'AI_TURN_ROOM_NOT_FOUND'; end if;
 v_now:=clock_timestamp();
 -- Recovery can return a committed prior result without a new write/renewal.
 if exists(select 1 from jsonb_array_elements(v_room."chatHistory") m where m->>'sender'='ai' and m->>'requestId'=p_request_id::text) then
  return jsonb_build_object('result','recovered','charged',false,'retention',jsonb_build_object('lastCompletedAt',v_room."lastCompletedAt",'expiresAt',v_room."expiresAt",'retentionVersion',v_room."retentionVersion",'retentionBasis',v_room."retentionBasis"));
 end if;
 if v_room."expiresAt" is null then raise exception 'AI_RETENTION_NOT_READY'; end if;
 if v_room."expiresAt"<=v_now then raise exception 'AI_ROOM_EXPIRED'; end if;
 perform set_config('app.ai_retention_completing','on',true);
 v_result:=public.complete_ai_turn_retention_internal(p_user_id,p_persona_id,p_request_id,p_prompt,p_answer,v_now,p_activated_at);
 if v_result->>'result'='saved' then
  update public.ai_personas set "lastCompletedAt"=v_now,"expiresAt"=public.ai_six_calendar_months(v_now),
   "retentionVersion"=coalesce("retentionVersion",0)+1,"retentionBasis"='completed_turn' where id=p_persona_id returning * into v_room;
  update public.notification_events set invalidated_at=v_now where room_id=p_persona_id and invalidated_at is null;
 end if;
 perform set_config('app.ai_retention_completing','off',true);
 return v_result || jsonb_build_object('retention',jsonb_build_object('lastCompletedAt',v_room."lastCompletedAt",'expiresAt',v_room."expiresAt",'retentionVersion',v_room."retentionVersion",'retentionBasis',v_room."retentionBasis"));
end $$;
revoke all on function public.complete_ai_turn_retention_internal(uuid,text,uuid,text,text,timestamptz,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz) to service_role;

create function public.read_ai_room_for_user(p_user_id uuid,p_persona_id text,p_request_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_room public.ai_personas; begin
 if not public.ai_retention_active() then raise exception 'AI_RETENTION_NOT_READY'; end if;
 select * into v_room from public.ai_personas where id=p_persona_id and "userId"=p_user_id;
 if not found then raise exception 'CHAT_ROOM_NOT_FOUND'; end if;
 if v_room."expiresAt" is null then raise exception 'AI_RETENTION_NOT_READY'; end if;
 if v_room."expiresAt"<=clock_timestamp() and not exists(select 1 from jsonb_array_elements(v_room."chatHistory") m
  where m->>'sender'='ai' and m->>'requestId'=p_request_id::text) then raise exception 'AI_ROOM_EXPIRED'; end if;
 return to_jsonb(v_room);
end $$;
revoke all on function public.read_ai_room_for_user(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.read_ai_room_for_user(uuid,text,uuid) to service_role;

create function public.queue_ai_expiry_warnings(p_user_id uuid default null) returns integer
language plpgsql security definer set search_path='' as $$
declare r public.ai_personas; v_now timestamptz:=clock_timestamp(); v_key text; v_added integer; v_total integer:=0; begin
 if not public.ai_retention_active() or not public.notifications_enabled() then return 0; end if;
 -- Lock room before ledger/events, same order as completion; skip busy rooms and
 -- retry on next 5-minute warning tick or inbox read. No AI content leaves the room.
 for r in select a.* from public.ai_personas a where (p_user_id is null or a."userId"=p_user_id)
  and a."expiresAt">v_now and a."expiresAt"<=v_now+interval '7 days'
  and exists(select 1 from auth.users u where u.id=a."userId") for update skip locked loop
  v_key:='ai-expiry:'||r.id||':'||r."retentionVersion"::text;
  insert into public.notification_dedupe(recipient_id,event_key,room_id) values(r."userId",v_key,r.id) on conflict do nothing;
  get diagnostics v_added=row_count;
  if v_added>0 then
   insert into public.notification_events(recipient_id,event_key,kind,room_id,expires_at,retention_version)
    values(r."userId",v_key,'ai_room_expiring',r.id,r."expiresAt",r."retentionVersion");
   v_total:=v_total+1;
  end if;
 end loop;
 return v_total;
end $$;
revoke all on function public.queue_ai_expiry_warnings(uuid) from public,anon,authenticated;
grant execute on function public.queue_ai_expiry_warnings(uuid) to service_role;

create function public.ai_notification_visible(n public.notification_events) returns boolean
language sql stable security definer set search_path='' as $$
 select n.invalidated_at is null and n.created_at>statement_timestamp()-interval '30 days' and
 case when n.kind='ai_room_expiring' then public.ai_retention_active() and exists(select 1 from public.ai_personas a
 where a.id=n.room_id and a."userId"=auth.uid() and a."retentionVersion"=n.retention_version
 and a."expiresAt"=n.expires_at and a."expiresAt">statement_timestamp())
 else public.notification_target_visible(n.story_id,n.comment_id) end
$$;
revoke all on function public.ai_notification_visible(public.notification_events) from public,anon,authenticated;
create or replace function public.read_my_notifications(p_limit integer default 21,p_before_created_at timestamptz default null,p_before_id uuid default null)
returns setof jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 if p_limit is null or p_limit not between 1 and 51 or (p_before_created_at is null)<>(p_before_id is null) then raise exception 'INVALID_NOTIFICATION_PAGE'; end if;
 perform public.queue_ai_expiry_warnings(auth.uid());
 return query select jsonb_build_object('id',n.id,'kind',n.kind,'storyId',n.story_id,'commentId',n.comment_id,'replyRootId',n.reply_root_id,
 'milestone',n.milestone,'createdAt',n.created_at,'readAt',n.read_at,'roomId',n.room_id,'expiresAt',n.expires_at,'retentionVersion',n.retention_version)
 from public.notification_events n where n.recipient_id=auth.uid() and public.ai_notification_visible(n)
 and (p_before_created_at is null or (n.created_at,n.id)<(p_before_created_at,p_before_id)) order by n.created_at desc,n.id desc limit p_limit;
end $$;
create or replace function public.count_my_unread_notifications() returns integer
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.notifications_enabled() then raise exception 'FEATURE_UNAVAILABLE'; end if;
 perform public.queue_ai_expiry_warnings(auth.uid());
 return (select count(*)::integer from public.notification_events n where recipient_id=auth.uid() and read_at is null and public.ai_notification_visible(n));
end $$;
create function public.read_my_ai_notification_target(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_room public.ai_personas; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.notifications_enabled() or not public.ai_retention_active() then return null; end if;
 select a.* into v_room from public.notification_events n join public.ai_personas a on a.id=n.room_id
 where n.id=p_id and n.recipient_id=auth.uid() and n.kind='ai_room_expiring' and public.ai_notification_visible(n) and a."userId"=auth.uid();
 return case when found then to_jsonb(v_room) else null end;
end $$;
revoke all on function public.read_my_ai_notification_target(uuid) from public,anon;
grant execute on function public.read_my_ai_notification_target(uuid) to authenticated;

create function public.purge_notification_deliveries() returns integer
language plpgsql security definer set search_path='' as $$
declare v_count integer; begin
 if not public.notifications_enabled() then return 0; end if;
 delete from public.notification_events where created_at<=clock_timestamp()-interval '30 days';
 get diagnostics v_count=row_count;
 return v_count; -- Dedupe ledger is intentionally retained until source/recipient deletion.
end $$;
revoke all on function public.purge_notification_deliveries() from public,anon,authenticated;
grant execute on function public.purge_notification_deliveries() to service_role;
create function public.purge_expired_ai_rooms() returns integer
language plpgsql security definer set search_path='' as $$
declare r record; v_count integer:=0; v_changed integer; begin
 if not public.ai_retention_active() then return 0; end if;
 -- No account advisory locks: lock each room with SKIP LOCKED, recheck DB time.
 -- Completion always takes account then room; this worker never waits on account.
 for r in select id from public.ai_personas where "expiresAt"<=clock_timestamp() for update skip locked loop
  delete from public.ai_personas where id=r.id and "expiresAt"<=clock_timestamp();
  get diagnostics v_changed=row_count; v_count:=v_count+v_changed;
 end loop;
 return v_count;
end $$;
revoke all on function public.purge_expired_ai_rooms() from public,anon,authenticated;
grant execute on function public.purge_expired_ai_rooms() to service_role;

-- Operator-only activation; immutable anchor on retries. The separate activation
-- script must first verify/switch the old cron atomically under the same table lock.
create function public.activate_ai_retention() returns timestamptz
language plpgsql security definer set search_path='' as $$
declare v_anchor timestamptz; begin
 lock table public.ai_personas in access exclusive mode;
 select activated_at into v_anchor from public.ai_retention_config where singleton for update;
 if v_anchor is not null then return v_anchor; end if;
 if not public.notifications_enabled() then raise exception 'NOTIFICATIONS_MUST_BE_ACTIVE'; end if;
 v_anchor:=clock_timestamp();
 -- Keep flag false during initialization: preexisting rows are not new completions.
 update public.ai_personas set "lastCompletedAt"=null,"retentionVersion"=1,"retentionBasis"='legacy_updated_at',
  "expiresAt"=greatest(public.ai_six_calendar_months(coalesce("updatedAt","createdAt",v_anchor)),v_anchor+interval '7 days');
 update public.ai_retention_config set enabled=true,activated_at=v_anchor where singleton;
 -- Grace warnings are persisted in this SAME transaction, including offline owners.
 perform public.queue_ai_expiry_warnings(null);
 return v_anchor;
end $$;
revoke all on function public.activate_ai_retention() from public,anon,authenticated,service_role;
commit;
