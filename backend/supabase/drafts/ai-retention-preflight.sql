-- Read-only operator review aid. No settings are automatically trusted or changed.
-- Compare these with a reviewed snapshot before separately setting the expected hashes.
-- Also inspect current table/column grants, AI owner RLS, trigger bodies and cron metadata.
select md5(string_agg(item,E'\n' order by item)) from (
 select pg_get_functiondef(p.oid) item from pg_proc p where p.oid in
 ('public.emit_notification(text,text,text,text,text,text,text,integer)'::regprocedure,
 'public.read_my_notifications(integer,timestamptz,uuid)'::regprocedure,
 'public.count_my_unread_notifications()'::regprocedure)
 union all select conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid='public.notification_events'::regclass
 union all select policyname||':'||cmd||':'||roles::text||':'||coalesce(qual,'')||':'||coalesce(with_check,'')
 from pg_policies where schemaname='public' and tablename in ('ai_personas','notification_events')
) reviewed_boundary;
select md5(pg_get_functiondef('public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)'::regprocedure)) as completion_md5;
select pg_get_functiondef(p.oid) from pg_proc p where p.oid in (
'public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)'::regprocedure,
'public.emit_notification(text,text,text,text,text,text,text,integer)'::regprocedure,
'public.read_my_notifications(integer,timestamptz,uuid)'::regprocedure,
'public.count_my_unread_notifications()'::regprocedure);
select * from pg_policies where schemaname='public' and tablename in ('ai_personas','notification_events');
select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name in ('ai_personas','notification_events');
