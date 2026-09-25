-- Supabase default privileges left UPDATE/TRUNCATE/REFERENCES/TRIGGER on
-- authenticated after create_story_hides. Keep only the actions used by the app.

revoke all privileges on table public.story_hides from anon, authenticated;
grant select, insert, delete on table public.story_hides to authenticated;
