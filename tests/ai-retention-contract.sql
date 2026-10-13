\set ON_ERROR_STOP on
-- Disposable Supabase PostgreSQL only. Run after NOT beside the other fixtures.
-- The inherited notification contract creates synthetic users/story boundary data.
\ir notifications-replies-contract.sql
-- Prior contract intentionally deletes sources; reset ONLY disposable synthetic ledgers
-- before testing the jointly prepared (not previously deployed) AI extension.
truncate public.notification_events,public.notification_dedupe;
create table public.ai_personas (
  id text primary key,
  "userId" uuid not null,
  "storyId" text,
  name text,
  role text,
  category text,
  "avatarIcon" text,
  description text,
  "systemInstruction" text,
  "cardColor" text,
  "sampleFirstMessage" text,
  "isPinned" boolean not null default false,
  opening text,
  ratio text,
  "chatHistory" jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default '2026-09-28 00:00:00+00',
  "updatedAt" timestamptz not null default '2026-09-28 00:00:00+00'
);
-- The operating project was read-checked: service_role can SELECT/UPDATE ai_personas.
grant select, insert, update on public.ai_personas to service_role;

alter table public.ai_personas enable row level security;
grant select,delete on public.ai_personas to authenticated;
create policy ai_personas_owner_read on public.ai_personas for select to authenticated using("userId"=auth.uid());
create policy ai_personas_owner_delete on public.ai_personas for delete to authenticated using("userId"=auth.uid());
create table public.story_hides(user_id uuid,story_id text);
create table public.ai_chat_usage(id uuid primary key,"userId" uuid,"storyId" text,"usedAt" timestamptz,"usedOn" date);
grant select on public.story_hides to service_role;
grant select,insert on public.ai_chat_usage to service_role;
\ir ../backend/supabase/migrations/20260928063627_ai_room_choice_unique.sql
\ir ../backend/supabase/migrations/20260928063643_ai_quota_reservations_and_completion_state.sql
\ir ../backend/supabase/migrations/20260929203532_preserve_ai_quota_after_room_delete.sql
\ir ../backend/supabase/migrations/20260928063805_ai_turn_completion_atomic.sql
select set_config('app.reviewed_ai_completion_md5',md5(pg_get_functiondef('public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)'::regprocedure)),false);
select set_config('app.reviewed_ai_retention_boundary_md5',(select md5(string_agg(item,E'\n' order by item)) from (
 select pg_get_functiondef(p.oid) item from pg_proc p where p.oid in
 ('public.emit_notification(text,text,text,text,text,text,text,integer)'::regprocedure,
 'public.read_my_notifications(integer,timestamptz,uuid)'::regprocedure,
 'public.count_my_unread_notifications()'::regprocedure)
 union all select conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.notification_events'::regclass
 union all select policyname||':'||cmd||':'||roles::text||':'||coalesce(qual,'')||':'||coalesce(with_check,'')
 from pg_policies where schemaname='public' and tablename in ('ai_personas','notification_events')
) reviewed_boundary),false);
\ir ../backend/supabase/drafts/ai-retention-notifications.sql

insert into public.ai_personas(id,"userId","createdAt","updatedAt") values
('retention-legacy','11111111-1111-1111-1111-111111111111','2019-01-01','2019-01-01');
do $$ begin
 if public.ai_retention_active() then raise exception 'unexpected default activation'; end if;
 if public.ai_six_calendar_months('2023-08-31 12:00+09')<>'2024-02-29 12:00+09'::timestamptz
 or public.ai_six_calendar_months('2026-08-31 01:30+09')<>'2027-02-28 01:30+09'::timestamptz then raise exception 'calendar clamp failed'; end if;
end $$;
select public.activate_ai_retention();
do $$ declare v_anchor timestamptz; begin
 select activated_at into v_anchor from public.ai_retention_config;
 if public.activate_ai_retention()<>v_anchor then raise exception 'activation retry moved anchor'; end if;
 if (select "expiresAt" from public.ai_personas where id='retention-legacy')<>v_anchor+interval '7 days' then raise exception 'legacy grace wrong'; end if;
 if (select count(*) from public.notification_events where room_id='retention-legacy')<>1 then raise exception 'offline grace warning missing'; end if;
end $$;
-- Owner setting edits do not renew even though updatedAt changes.
update public.ai_personas set "isPinned"=true,ratio='High',"updatedAt"=now() where id='retention-legacy';
do $$ begin
 if (select "retentionVersion" from public.ai_personas where id='retention-legacy')<>1 then raise exception 'setting renewed retention'; end if;
end $$;
select public.complete_ai_turn('11111111-1111-1111-1111-111111111111','retention-legacy','99999999-9999-4999-8999-999999999999','synthetic prompt','synthetic answer','2099-01-01','2020-01-01 00:00+09');
do $$ declare r public.ai_personas; begin
 select * into r from public.ai_personas where id='retention-legacy';
 if r."retentionVersion"<>2 or r."lastCompletedAt">clock_timestamp() or r."lastCompletedAt"<clock_timestamp()-interval '1 minute'
 or r."expiresAt"<>public.ai_six_calendar_months(r."lastCompletedAt") then raise exception 'completion clock/deadline wrong'; end if;
 if exists(select 1 from public.notification_events where room_id=r.id and invalidated_at is null) then raise exception 'warning not invalidated'; end if;
 perform public.complete_ai_turn(r."userId",r.id,'99999999-9999-4999-8999-999999999999','changed retry','ignored','2100-01-01','2020-01-01 00:00+09');
 if (select "lastCompletedAt" from public.ai_personas where id=r.id)<>r."lastCompletedAt" then raise exception 'replay renewed expiry'; end if;
end $$;
-- Fixture clock seeding only: tests execute the unchanged enabled guard afterwards.
alter table public.ai_personas disable trigger ai_retention_guard;
update public.ai_personas set "expiresAt"=now()-interval '1 second' where id='retention-legacy';
alter table public.ai_personas enable trigger ai_retention_guard;
reset app.ai_retention_completing;
do $$ begin
 begin update public.ai_personas set "isPinned"=false where id='retention-legacy'; raise exception 'expired pin accepted';
 exception when others then if sqlerrm<>'AI_ROOM_EXPIRED' then raise; end if; end;
 begin perform public.read_ai_room_for_user('11111111-1111-1111-1111-111111111111','retention-legacy',null);raise exception 'expired room read accepted';
 exception when others then if sqlerrm<>'AI_ROOM_EXPIRED' then raise; end if; end;
end $$;
select public.purge_expired_ai_rooms();
do $$ begin if exists(select 1 from public.ai_personas where id='retention-legacy')
 or exists(select 1 from public.notification_dedupe where room_id='retention-legacy') then raise exception 'expired pinned room cascade failed'; end if; end $$;
-- NOT covered here: queued legacy cron snapshot races and concurrent completion/purge;
-- these require distinct real PostgreSQL sessions before rollout.
