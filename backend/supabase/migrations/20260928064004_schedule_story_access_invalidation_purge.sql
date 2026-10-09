-- Applied to thinkerbell Supabase project vzhyhadjtaqbapicjrco on 2026-09-28.
-- Source review draft: docs/plan-execution/sql/story-access-retention-job.sql.
select cron.schedule(
  'thinkerbell-story-access-purge-0305-kst',
  '5 18 * * *',
  $$select public.purge_story_access_invalidations(now());$$
);
