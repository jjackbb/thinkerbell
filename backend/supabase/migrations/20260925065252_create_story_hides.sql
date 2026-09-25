-- Applied to the thinkerbell Supabase project as create_story_hides.
-- Personal hiding is per user; it does not change stories.isHidden.

create table public.story_hides (
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id text not null references public.stories("id") on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create index story_hides_story_id_idx on public.story_hides (story_id);

alter table public.story_hides enable row level security;

create policy "story_hides_select_own"
on public.story_hides for select to authenticated
using (user_id = auth.uid());

create policy "story_hides_insert_own"
on public.story_hides for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.stories s
    where s."id" = story_id and s."authorId" <> auth.uid()::text
  )
);

create policy "story_hides_delete_own"
on public.story_hides for delete to authenticated
using (user_id = auth.uid());

revoke all on public.story_hides from anon;
grant select, insert, delete on public.story_hides to authenticated;
