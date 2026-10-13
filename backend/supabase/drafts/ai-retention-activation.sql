-- DO NOT APPLY: explicit deployment + scheduler approval and metadata review needed.
-- PREP file alone is inert. This separate transaction WOULD seed legacy expiry/grace,
-- persist warnings, enable retention, and change cron commands; it is not run by the app.
-- Before the approved window, snapshot definitions, grants, RLS, triggers and cron rows.
-- Provide independently reviewed values with transaction-local settings:
-- app.approve_ai_retention_activation='yes'
-- app.approve_ai_retention_warning_schedule='yes' (new 5-minute warning/cleanup cadence)
-- app.reviewed_legacy_ai_purger_md5=md5(pg_get_functiondef('public.purge_stale_ai_personas()'::regprocedure))
-- app.reviewed_legacy_ai_cron_md5=md5(jsonb_build_object('jobid',jobid,'jobname',jobname,
--   'schedule',schedule,'command',command,'database',database,'username',username,'active',active)::text)
-- The old daily physical purge time stays 00:01 KST. Warnings are due seven days
-- before exact expiry, persisted at the next five-minute tick or inbox read; delays
-- are possible during outages. Legacy grace warnings are atomic with activation.
begin;
lock table public.ai_personas in access exclusive mode;
do $$
declare j record; v_hash text; v_existing timestamptz;
 v_purge text:='select public.purge_expired_ai_rooms();';
 v_warn text:='select public.queue_ai_expiry_warnings(); select public.purge_notification_deliveries();';
begin
 if current_setting('app.approve_ai_retention_activation',true) is distinct from 'yes'
  or current_setting('app.approve_ai_retention_warning_schedule',true) is distinct from 'yes' then
  raise exception 'EXPLICIT_ACTIVATION_AND_SCHEDULER_APPROVAL_REQUIRED';
 end if;
 if (select count(*) from cron.job where jobname='purge-stale-ai-personas')<>1 then raise exception 'LEGACY_CRON_IDENTITY_CHANGED'; end if;
 select * into j from cron.job where jobname='purge-stale-ai-personas' for update;
 select activated_at into v_existing from public.ai_retention_config where singleton;
 if v_existing is not null then
  -- Retry is read-only and may not reset the transition anchor or warning dates.
  if j.command<>v_purge or j.schedule<>'1 15 * * *' or not j.active
   or not exists(select 1 from cron.job where jobname='thinkerbell-ai-expiry-warnings' and command=v_warn and schedule='*/5 * * * *' and active) then
   raise exception 'ACTIVE_RETENTION_SCHEDULE_DRIFT';
  end if;
  return;
 end if;
 if j.username not in ('postgres','supabase_admin') or j.database<>current_database() or j.schedule<>'1 15 * * *' or not j.active
  or regexp_replace(j.command,'\s','','g')<>'selectpublic.purge_stale_ai_personas();' then raise exception 'LEGACY_CRON_CONFIG_CHANGED'; end if;
 v_hash:=md5(jsonb_build_object('jobid',j.jobid,'jobname',j.jobname,'schedule',j.schedule,
  'command',j.command,'database',j.database,'username',j.username,'active',j.active)::text);
 if current_setting('app.reviewed_legacy_ai_cron_md5',true) is distinct from v_hash then raise exception 'LEGACY_CRON_REVIEW_REQUIRED'; end if;
 if current_setting('app.reviewed_legacy_ai_purger_md5',true) is distinct from
  md5(pg_get_functiondef('public.purge_stale_ai_personas()'::regprocedure)) then raise exception 'LEGACY_PURGER_REVIEW_REQUIRED'; end if;
 if exists(select 1 from cron.job where jobname='thinkerbell-ai-expiry-warnings') then raise exception 'WARNING_JOB_ALREADY_EXISTS'; end if;
 -- Original purger definition is left intact for audit. A prequeued old command is
 -- intended to be blocked for unexpired rows by the row-deadline DELETE guard.
 -- Multi-session queued-command/snapshot behavior MUST be verified before activation.
 perform cron.alter_job(j.jobid,command:=v_purge);
 perform cron.schedule('thinkerbell-ai-expiry-warnings','*/5 * * * *',v_warn);
 perform public.activate_ai_retention();
end $$;
commit;
-- After approval/application verify config anchor, expected job identities, grants,
-- row policy, count of grace warnings, expiry generation, then enable matching app flags.
-- Do not use flags-off alone as rollback after activation: old updatedAt purging would
-- violate renewed expiry/grace. Keep new safety guards and documented rollback snapshot.
