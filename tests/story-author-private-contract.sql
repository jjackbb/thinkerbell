\set ON_ERROR_STOP on
-- Disposable Supabase PostgreSQL only. No operating data or user accounts.
create table public.stories (
  id text primary key, "authorId" text not null, "createdAt" text not null,
  "isBlind" boolean default false, "isAdult" boolean default false,
  "isHidden" boolean default false, "viewCount" integer default 0,
  "reportsCount" integer default 0
);
create table public.comments (
  id text primary key, "storyId" text not null references public.stories(id),
  content text not null, "isBlind" boolean default false,
  "reportsCount" integer default 0
);
create table public.reports (
  id bigint generated always as identity primary key,
  "targetType" text not null, "targetId" text not null,
  "reporterId" uuid not null, "reason" text not null default '',
  "createdAt" timestamptz not null default now()
);
create table public.ai_personas (
  id text primary key, "storyId" text not null,
  "userId" uuid not null
);
grant select on public.stories, public.comments to anon, authenticated;
alter table public.stories enable row level security;
alter table public.comments enable row level security;
create policy stories_select_public on public.stories for select to anon, authenticated using (true);
create policy comments_select_public on public.comments for select to anon, authenticated using (true);
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

insert into public.stories(id,"authorId","createdAt") values
  ('story-1','11111111-1111-4111-8111-111111111111','2026-09-01T00:00:00Z'),
  ('story-2','22222222-2222-4222-8222-222222222222','2026-09-02T00:00:00Z');
insert into public.comments(id,"storyId",content) values
  ('comment-1','story-1','synthetic test'),
  ('comment-2','story-2','synthetic test');

\ir ../docs/plan-execution/sql/story-author-private-draft.sql

do $$
begin
  if (select count(*) from public.stories where visibility='public') <> 2 then
    raise exception 'migration did not preserve existing public stories';
  end if;
  if not exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and tablename='story_access_invalidations') then
    raise exception 'ID-only realtime invalidation is not published';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.set_story_visibility('story-1','private');
do $$
begin
  if (select count(*) from public.stories where id='story-1') <> 1
      or (select count(*) from public.comments where "storyId"='story-1') <> 1
      or (select "createdAt" from public.stories where id='story-1') <> '2026-09-01T00:00:00Z' then
    raise exception 'author cannot access private story/comments or original date changed';
  end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','',false);
set role anon;
do $$
begin
  if (select count(*) from public.stories where id='story-1') <> 0
      or (select count(*) from public.comments where "storyId"='story-1') <> 0
      or (select count(*) from public.story_access_invalidations where story_id='story-1') <> 1 then
    raise exception 'anonymous raw access or invalidation failed';
  end if;
  perform public.increment_story_view('story-1');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
declare rejected boolean := false;
begin
  if (select count(*) from public.stories where id='story-1') <> 0
      or (select count(*) from public.comments where "storyId"='story-1') <> 0 then
    raise exception 'other user read private content';
  end if;
  begin
    perform public.set_story_visibility('story-1','public');
  exception when others then
    rejected := sqlerrm = 'STORY_NOT_FOUND';
  end;
  if not rejected then raise exception 'other user changed visibility'; end if;
  rejected := false;
  begin
    perform public.submit_report('story','story-1','');
  exception when others then
    rejected := sqlerrm = 'REPORT_TARGET_NOT_FOUND';
  end;
  if not rejected then raise exception 'other user reported private story'; end if;
  rejected := false;
  begin
    perform public.submit_report('comment','comment-1','');
  exception when others then
    rejected := sqlerrm = 'REPORT_TARGET_NOT_FOUND';
  end;
  if not rejected then raise exception 'other user reported private comment'; end if;
end $$;
reset role;

do $$
declare rejected boolean := false;
begin
  begin
    insert into public.ai_personas(id,"storyId","userId")
      values('other-private-room','story-1','22222222-2222-4222-8222-222222222222');
  exception when others then
    rejected := sqlerrm = 'STORY_NOT_FOUND';
  end;
  if not rejected then raise exception 'other user created room after private switch'; end if;
  insert into public.ai_personas(id,"storyId","userId")
    values('author-private-room','story-1','11111111-1111-4111-8111-111111111111');
end $$;

do $$
declare rejected boolean := false;
begin
  begin
    insert into public.comments(id,"storyId",content)
      values('author-private-comment','story-1','synthetic blocked');
  exception when others then
    rejected := sqlerrm = 'STORY_NOT_FOUND';
  end;
  if not rejected then raise exception 'author created a private comment'; end if;
  rejected := false;
  begin
    insert into public.comments(id,"storyId",content)
      values('other-private-comment','story-1','synthetic blocked');
  exception when others then
    rejected := sqlerrm = 'STORY_NOT_FOUND';
  end;
  if not rejected then raise exception 'other user created a private comment'; end if;
end $$;

do $$
begin
  if (select "viewCount" from public.stories where id='story-1') <> 0 then
    raise exception 'private story view was counted';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.set_story_visibility('story-1','public');
reset role;
insert into public.ai_personas(id,"storyId","userId")
  values('other-republic-room','story-1','22222222-2222-4222-8222-222222222222');
insert into public.comments(id,"storyId",content)
  values('comment-after-republic','story-1','synthetic allowed');
select set_config('request.jwt.claim.sub','',false);
set role anon;
do $$
begin
  if (select count(*) from public.stories where id='story-1') <> 1
      or (select count(*) from public.comments where "storyId"='story-1') <> 2
      or (select count(*) from public.story_access_invalidations where story_id='story-1') <> 2 then
    raise exception 'republication did not restore original rows and notify';
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
begin
  if (public.submit_report('story','story-1','')->>'reports') <> '1' then
    raise exception 'republic story cannot be reported';
  end if;
end $$;
reset role;

update public.stories set "isBlind"=true where id='story-1';
select set_config('request.jwt.claim.sub','',false);
set role anon;
do $$
begin
  if (select count(*) from public.stories where id='story-1') <> 0
      or (select count(*) from public.story_access_invalidations
          where story_id='story-1') <> 3 then
    raise exception 'moderation change did not invalidate stale public story';
  end if;
end $$;
reset role;

select 'PASS: author/private/other/anonymous REST and invalidation contract' as result;
