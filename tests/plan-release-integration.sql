\set ON_ERROR_STOP on

-- Disposable Supabase PostgreSQL only. This fixture contains synthetic rows,
-- not operating story, account, or conversation data. It exercises migration
-- ordering and the intersections between privacy, voting, rooms, and quota.
create table public.stories (
  id text primary key, "authorId" text not null, "createdAt" text not null,
  "isBlind" boolean default false, "isAdult" boolean default false,
  "isHidden" boolean default false, "viewCount" integer default 0,
  "reportsCount" integer default 0, "votesA" integer default 0,
  "votesB" integer default 0
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
create table public.votes (
  "storyId" text not null, "userId" uuid not null,
  option text not null, "changeCount" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key ("storyId", "userId")
);
create table public.ai_personas (
  id text primary key, "userId" uuid not null, "storyId" text,
  name text, role text, category text, "avatarIcon" text,
  description text, "systemInstruction" text, "cardColor" text,
  "sampleFirstMessage" text, "isPinned" boolean not null default false,
  opening text, ratio text,
  "chatHistory" jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table public.story_hides (user_id uuid not null, story_id text not null);
create table public.ai_chat_usage (
  id uuid primary key, "userId" uuid not null, "storyId" text,
  "usedAt" timestamptz not null, "usedOn" date not null
);
grant select on public.stories, public.comments to anon, authenticated;
grant select on public.stories, public.story_hides to service_role;
grant select, insert, update on public.ai_personas to service_role;
grant select, insert on public.ai_chat_usage to service_role;
alter table public.stories enable row level security;
alter table public.comments enable row level security;
create policy stories_select_public on public.stories
  for select to anon, authenticated using (true);
create policy comments_select_public on public.comments
  for select to anon, authenticated using (true);
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

\ir ../docs/plan-execution/sql/vote-story-idempotent.sql
\ir ../docs/plan-execution/sql/story-author-private-draft.sql
\ir ../docs/plan-execution/sql/ai-room-choice-unique-draft.sql
\ir ../docs/plan-execution/sql/ai-quota-reservations-draft.sql
\ir ../docs/plan-execution/sql/ai-legacy-room-open-draft.sql
\ir ../docs/plan-execution/sql/ai-turn-completion-draft.sql
\ir ../docs/plan-execution/sql/ai-feedback-draft.sql

insert into public.stories(id,"authorId","createdAt") values
  ('integration-public','11111111-1111-4111-8111-111111111111','2026-09-28T00:00:00Z'),
  ('integration-private','11111111-1111-4111-8111-111111111111','2026-09-28T00:00:00Z');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.set_story_visibility('integration-private','private');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.vote_story('integration-public','A');
do $$
declare blocked boolean := false;
begin
  begin
    perform public.vote_story('integration-private','A');
  exception when others then
    blocked := sqlerrm = '사연을 찾을 수 없습니다.';
  end;
  if not blocked then raise exception 'private vote was accepted'; end if;
end $$;
reset role;

set role service_role;
do $$
declare
  v_user uuid := '22222222-2222-4222-8222-222222222222';
  v_old uuid := '22222222-2222-4222-8222-222222222221';
  v_new uuid := '22222222-2222-4222-8222-222222222223';
  v_result jsonb;
  v_reservation record;
  blocked boolean := false;
begin
  v_result := public.open_legacy_ai_room(v_user, v_old,
    jsonb_build_object('id','persona-' || v_old::text,
      'storyId','integration-public','opening','apology',
      'systemInstruction','synthetic prompt'),
    '2026-09-28 12:00:00+09');
  if v_result->>'quotaUsed' <> '1' then
    raise exception 'legacy room and charge did not integrate';
  end if;
  begin
    perform public.open_legacy_ai_room(v_user,
      '22222222-2222-4222-8222-222222222222',
      jsonb_build_object('id','persona-22222222-2222-4222-8222-222222222222',
        'storyId','integration-private','opening','apology',
        'systemInstruction','synthetic prompt'),
      '2026-09-28 12:00:00+09');
  exception when others then
    blocked := sqlerrm = 'AI_ROOM_STORY_NOT_FOUND';
  end;
  if not blocked then raise exception 'private room was accepted'; end if;
  insert into public.ai_personas
    (id,"userId","storyId",opening,"createdAt")
    values ('persona-' || v_new::text, v_user, 'integration-public',
      'different-opening', '2026-09-29 01:00:00+09');
  select * into v_reservation from public.reserve_ai_first_reply(
    v_user, 'persona-' || v_new::text, v_new,
    '2026-09-29 01:01:00+09','2026-09-29 01:06:00+09');
  if v_reservation.result <> 'reserved' then
    raise exception 'new first reply was not reserved';
  end if;
  v_result := public.complete_ai_turn(v_user, 'persona-' || v_new::text,
    v_new, 'synthetic user message', 'synthetic AI answer',
    '2026-09-29 01:02:00+09','2026-09-29 00:00:00+09');
  if v_result->>'result' <> 'saved' or v_result->>'charged' <> 'true'
      or (select "chatHistory" from public.ai_personas
        where id='persona-' || v_new::text) <> jsonb_build_array(
          jsonb_build_object('id','msg-' || v_new::text,
            'requestId',v_new::text,'sender','user',
            'text','synthetic user message','timestamp','01:02'),
          jsonb_build_object('id','ai-' || v_new::text,
            'requestId',v_new::text,'sender','ai',
            'text','synthetic AI answer','timestamp','01:02')) then
    raise exception 'new turn was not saved and charged together';
  end if;
  insert into public.ai_feedback
    (episode_id,user_id,persona_id,mode,score,outcome)
    values (v_new,v_user,'persona-' || v_new::text,
      'simulation',5,'submitted');
end $$;
reset role;

select 'PASS: privacy, vote, legacy room, first reply and feedback coexist'
  as result;
