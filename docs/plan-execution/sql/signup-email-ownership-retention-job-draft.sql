-- REVIEW DRAFT ONLY. Inspect cron.job before scheduling, and apply only after
-- signup-email-ownership-draft.sql. Every 15 minutes, remove hashed rate and
-- one-use token records created more than 24 hours earlier.
select cron.schedule(
  'thinkerbell-signup-email-check-purge',
  '*/15 * * * *',
  $$select public.purge_signup_email_checks(now());$$
);
