-- Applied to thinkerbell via Supabase MCP migration 20260927214725 after
-- the ownership migration. Every 15 minutes, remove hashed rate and
-- one-use token records created more than 24 hours earlier.
select cron.schedule(
  'thinkerbell-signup-email-check-purge',
  '*/15 * * * *',
  $$select public.purge_signup_email_checks(now());$$
);
