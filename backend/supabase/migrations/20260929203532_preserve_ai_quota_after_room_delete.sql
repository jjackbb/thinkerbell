-- Quota accounting outlives a deleted chat: PLAN retains finished records for 30 days.
-- Keep the opaque room ID for request replay checks; no story/chat content is stored here.
-- Server-only reservation RPCs validate and lock the room before creating a record.
-- Completion markers and feedback still cascade with the room as before.
alter table public.ai_quota_reservations
  drop constraint ai_quota_reservations_persona_id_fkey;
