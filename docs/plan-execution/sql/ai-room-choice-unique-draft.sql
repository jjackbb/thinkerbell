-- DRAFT ONLY. Check existing duplicates again immediately before operating apply.
-- Browser room creation must move to the server before old direct INSERT is revoked.
create unique index if not exists ai_personas_simulation_choice_unique
  on public.ai_personas ("userId", "storyId", opening)
  where "storyId" is not null and opening is not null and ratio is null;

create unique index if not exists ai_personas_explanation_choice_unique
  on public.ai_personas ("userId", "storyId", ratio)
  where "storyId" is not null and ratio is not null and opening is null;
