\set ON_ERROR_STOP on
create table public.stories(id text primary key, "authorId" text, "authorNickname" text default 'fixture',title text default '합성 사연',body text default '합성 본문',category text default '친구',"createdAt" text default '2026-10-10T00:00:00Z',"votesA" int default 0,"votesB" int default 0,"commentCount" int default 0,"viewCount" int default 0,"isHot" boolean default false,"isWeeklyTop" boolean default false,"weeklyRank" int,"personaName" text,"personaInstruction" text default 'owner-secret',"reportsCount" int default 0,"isBlind" boolean default false,"isAdult" boolean default false,"isHidden" boolean default false,"cardColor" text,"appealStatus" text,"appealText" text default 'appeal-secret',"appealedAt" text,visibility text default 'public', future_secret text default 'future-secret');
create table public.comments(id text primary key,"storyId" text references public.stories(id) on delete cascade,"authorId" text,"anonymousId" text default '합성 익명',content text default '합성 댓글',"createdAt" text default '2026-10-10T00:00:00Z',"likeCount" int default 0,"reportsCount" int default 0,"isBlind" boolean default false,"authorVoted" text,"isEdited" boolean default false,future_secret text default 'future-secret');
create table public.story_access_invalidations(id bigint generated always as identity primary key,story_id text not null,changed_at timestamptz not null default now());
alter table public.stories enable row level security;
alter table public.comments enable row level security;
alter table public.story_access_invalidations enable row level security;
grant select,delete on public.stories,public.comments to anon,authenticated;
grant select on public.story_access_invalidations to anon,authenticated;
-- Deliberate old column grant: the proposal must remove this too.
grant select("personaInstruction") on public.stories to authenticated;
create policy stories_select_public on public.stories for select to anon,authenticated using("authorId"=auth.uid()::text or (visibility='public' and not "isBlind" and not "isAdult" and not "isHidden"));
create policy stories_delete_own on public.stories for delete to authenticated using("authorId"=auth.uid()::text);
create policy comments_select_visible on public.comments for select to anon,authenticated using(true);
create policy comments_delete_own on public.comments for delete to authenticated using("authorId"=auth.uid()::text);
create policy invalidations_read on public.story_access_invalidations for select to anon,authenticated using(true);
insert into public.stories(id,"authorId",visibility,"isHidden","isBlind","isAdult") values
('ordinary','11111111-1111-1111-1111-111111111111','public',false,false,false),
('private','11111111-1111-1111-1111-111111111111','private',false,false,false),
('hidden','11111111-1111-1111-1111-111111111111','public',true,false,false),
('blind','11111111-1111-1111-1111-111111111111','public',false,true,false),
('adult','11111111-1111-1111-1111-111111111111','public',false,false,true),
('foreign','22222222-2222-2222-2222-222222222222','public',false,false,false),
('missing-author',null,'public',false,false,false);
insert into public.comments(id,"storyId","authorId","isBlind") values
('normal','ordinary','11111111-1111-1111-1111-111111111111',false),
('blind-comment','ordinary','11111111-1111-1111-1111-111111111111',true),
('private-comment','private','11111111-1111-1111-1111-111111111111',false);
alter publication supabase_realtime add table public.stories,public.comments,public.story_access_invalidations;
create table public.votes("storyId" text references public.stories(id) on delete cascade,"userId" uuid,"option" text,"changeCount" int default 0,"createdAt" timestamptz default now(),"updatedAt" timestamptz default now(),primary key("storyId","userId"));
create table public.comment_likes(comment_id text references public.comments(id) on delete cascade,user_id uuid,primary key(comment_id,user_id));
\ir ../backend/supabase/migrations/20260928063258_vote_story_idempotent_first_vote_lock.sql
\ir ../backend/supabase/migrations/20260925080558_sync_comment_like_cascades.sql
create or replace function public.set_story_visibility(
  p_story_id text, p_visibility text
)
returns public.stories
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_story public.stories;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_visibility not in ('public', 'private') or p_visibility is null then
    raise exception 'INVALID_VISIBILITY';
  end if;
  select * into v_story from public.stories where id = p_story_id for update;
  if not found or v_story."authorId" <> v_user::text then
    raise exception 'STORY_NOT_FOUND';
  end if;
  if p_visibility = 'public' and
      (coalesce(v_story."isBlind", false) or coalesce(v_story."isAdult", false)
       or coalesce(v_story."isHidden", false)) then
    raise exception 'STORY_NOT_PUBLICABLE';
  end if;
  if v_story.visibility = p_visibility then return v_story; end if;
  update public.stories set visibility = p_visibility where id = p_story_id
    returning * into v_story;
  return v_story;
end;
$$;
revoke all on function public.set_story_visibility(text,text)
  from public, anon;
grant execute on function public.set_story_visibility(text,text)
  to authenticated;

create function public.leaky_legacy_row(p_story_id text) returns public.stories language sql security definer as $$ select * from public.stories where id=p_story_id $$;
\ir ../docs/plan-execution/sql/public-content-boundary-draft.sql
-- Non-sensitive INSERT must emit only an ID signal.
insert into public.comments(id,"storyId","authorId") values('signal-comment','ordinary','22222222-2222-2222-2222-222222222222');
do $$ begin
 if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename in ('stories','comments')) then raise exception 'raw realtime leak'; end if;
 if (select access_changed from public.story_access_invalidations order by id desc limit 1) is distinct from false then raise exception 'content signal wrongly clears context'; end if;
end $$;
