-- REVIEW DRAFT ONLY. Apply after both AI quota and feedback tables/functions.
-- Supabase project inspection found pg_cron installed. This named job should be
-- checked against cron.job before scheduling; do not overwrite another job.
-- 18:00 UTC is 03:00 the following day in Asia/Seoul.
select cron.schedule(
  'thinkerbell-ai-retention-0300-kst',
  '0 18 * * *',
  $$select public.purge_ai_quota_reservations(now());
    select public.purge_ai_feedback(now());$$
);
