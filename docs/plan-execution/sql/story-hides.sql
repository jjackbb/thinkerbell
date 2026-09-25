-- 초기 검토용 초안. 운영 DB에는 아래 이력 파일 2개를 순서대로 적용했다.
-- backend/supabase/migrations/20260925065252_create_story_hides.sql
-- backend/supabase/migrations/20260925065347_restrict_story_hides_grants.sql
-- 이 초안을 다시 실행하지 않는다. 기존 isHidden 데이터는 이관하지 않았다.

begin;

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

revoke all on public.story_hides from anon, authenticated;
grant select, insert, delete on public.story_hides to authenticated;

commit;
