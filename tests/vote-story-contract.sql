\set ON_ERROR_STOP on

-- Disposable PostgreSQL database only. The draft function is loaded from this repository.
-- Supabase PostgreSQL 이미지의 auth.uid()와 anon/authenticated 역할을 사용한다.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;

create table public.stories (
  id text primary key,
  "authorId" text not null,
  "votesA" integer default 0,
  "votesB" integer default 0,
  "isBlind" boolean default false,
  "isAdult" boolean default false,
  "isHidden" boolean default false,
  visibility text default 'public'
);
create table public.votes (
  "storyId" text not null references public.stories(id),
  "userId" uuid not null,
  "option" text not null check ("option" in ('A', 'B')),
  "changeCount" integer not null default 0,
  "updatedAt" timestamptz default now(),
  primary key ("storyId", "userId")
);

\ir ../docs/plan-execution/sql/vote-story-idempotent.sql

insert into public.stories (id, "authorId") values
  ('public-story', '11111111-1111-1111-1111-111111111111'),
  ('own-story', '22222222-2222-2222-2222-222222222222'),
  ('private-story', '11111111-1111-1111-1111-111111111111');
update public.stories set visibility = 'private' where id = 'private-story';

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

do $$
declare
  result public.stories;
  vote_row public.votes;
  rejected boolean;
begin
  result := public.vote_story('public-story', 'A');
  if result."votesA" <> 1 or result."votesB" <> 0 then
    raise exception 'first vote count mismatch';
  end if;

  result := public.vote_story('public-story', 'A');
  select * into vote_row from public.votes where "storyId" = 'public-story';
  if result."votesA" <> 1 or vote_row."changeCount" <> 0 then
    raise exception 'same-option retry changed state';
  end if;

  result := public.vote_story('public-story', 'B');
  select * into vote_row from public.votes where "storyId" = 'public-story';
  if result."votesA" <> 0 or result."votesB" <> 1 or vote_row."changeCount" <> 1 then
    raise exception 'one permitted change failed';
  end if;

  rejected := false;
  begin
    perform public.vote_story('public-story', 'A');
  exception when others then
    if sqlerrm = '투표는 최대 1번만 변경할 수 있습니다.' then rejected := true;
    else raise; end if;
  end;
  if not rejected then raise exception 'second change was accepted'; end if;

  rejected := false;
  begin
    perform public.vote_story('own-story', 'A');
  exception when others then
    if sqlerrm = '본인 사연에는 투표할 수 없습니다.' then rejected := true;
    else raise; end if;
  end;
  if not rejected then raise exception 'own-story vote was accepted'; end if;

  rejected := false;
  begin
    perform public.vote_story('private-story', 'A');
  exception when others then
    if sqlerrm = '사연을 찾을 수 없습니다.' then rejected := true;
    else raise; end if;
  end;
  if not rejected then raise exception 'private-story vote was accepted'; end if;

  if has_function_privilege('anon', 'public.vote_story(text,text)', 'EXECUTE') then
    raise exception 'anon still has execute privilege';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', false);
do $$
declare rejected boolean := false;
begin
  begin
    perform public.vote_story('public-story', 'A');
  exception when others then
    if sqlerrm = '로그인이 필요합니다.' then rejected := true;
    else raise; end if;
  end;
  if not rejected then raise exception 'anonymous vote was accepted'; end if;
end $$;

select 'PASS: vote_story contract' as result;
