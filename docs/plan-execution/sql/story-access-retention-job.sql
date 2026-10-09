-- Schedule the already-applied ID-only invalidation cleanup. The table stores
-- story IDs and timestamps, not story or comment text. The function removes
-- rows older than 30 days; this daily job runs at 03:05 Asia/Seoul (18:05 UTC).
-- Apply once after story_author_private_access_boundary. Keep a distinct job
-- name so changing this schedule cannot overwrite the AI retention job.
select cron.schedule(
  'thinkerbell-story-access-purge-0305-kst',
  '5 18 * * *',
  $$select public.purge_story_access_invalidations(now());$$
);
