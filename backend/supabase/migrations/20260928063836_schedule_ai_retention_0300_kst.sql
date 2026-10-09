-- Applied to thinkerbell Supabase project vzhyhadjtaqbapicjrco on 2026-09-28.
-- Source review draft: docs/plan-execution/sql/ai-retention-job-draft.sql.
select cron.schedule(
  'thinkerbell-ai-retention-0300-kst',
  '0 18 * * *',
  $$select public.purge_ai_quota_reservations(now());
    select public.purge_ai_feedback(now());$$
);
