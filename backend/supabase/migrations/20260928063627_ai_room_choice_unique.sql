-- Applied to thinkerbell Supabase project vzhyhadjtaqbapicjrco on 2026-09-28.
-- Source review draft: docs/plan-execution/sql/ai-room-choice-unique-draft.sql.
create unique index if not exists ai_personas_simulation_choice_unique
  on public.ai_personas ("userId", "storyId", opening)
  where "storyId" is not null and opening is not null and ratio is null;

create unique index if not exists ai_personas_explanation_choice_unique
  on public.ai_personas ("userId", "storyId", ratio)
  where "storyId" is not null and ratio is not null and opening is null;
