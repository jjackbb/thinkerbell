\set ON_ERROR_STOP on

-- Disposable Supabase PostgreSQL only. Never run this fixture on an operating DB.
create table public.ai_personas (
  id text primary key,
  "userId" uuid not null,
  "storyId" text,
  name text,
  role text,
  category text,
  "avatarIcon" text,
  description text,
  "systemInstruction" text,
  "cardColor" text,
  "sampleFirstMessage" text,
  "isPinned" boolean not null default false,
  opening text,
  ratio text,
  "chatHistory" jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default '2026-09-28 00:00:00+00',
  "updatedAt" timestamptz not null default '2026-09-28 00:00:00+00'
);
-- The operating project was read-checked: service_role can SELECT/UPDATE ai_personas.
grant select, insert, update on public.ai_personas to service_role;
create table public.stories (
  id text primary key, "authorId" text not null,
  "isBlind" boolean default false, "isAdult" boolean default false,
  "isHidden" boolean default false, visibility text default 'public'
);
grant select on public.stories to service_role;
create table public.story_hides (user_id uuid not null, story_id text not null);
grant select on public.story_hides to service_role;
create table public.ai_chat_usage (
  id uuid primary key, "userId" uuid not null, "storyId" text,
  "usedAt" timestamptz not null, "usedOn" date not null
);
grant select, insert on public.ai_chat_usage to service_role;
\ir ../docs/plan-execution/sql/ai-room-choice-unique-draft.sql
\ir ../docs/plan-execution/sql/ai-quota-reservations-draft.sql
\ir ../docs/plan-execution/sql/ai-turn-completion-draft.sql
\ir ../docs/plan-execution/sql/ai-legacy-room-open-draft.sql
\ir ../docs/plan-execution/sql/ai-feedback-draft.sql

insert into public.ai_personas (id, "userId")
select 'room-' || n, '11111111-1111-1111-1111-111111111111'::uuid
from generate_series(1, 8) as n;

do $$
declare
  u uuid := '11111111-1111-1111-1111-111111111111';
  t timestamptz := '2026-09-28 23:59:00+09';
  row_result record;
  done_status text;
  rejected boolean;
begin
  select * into row_result from public.reserve_ai_first_reply(
    u, 'room-1', '00000000-0000-0000-0000-000000000001', t, t + interval '5 minutes');
  if row_result.result <> 'reserved' or row_result.quota_day <> '2026-09-28'::date
      or row_result.occupied_count <> 1 then
    raise exception 'request-day reservation failed';
  end if;
  select * into row_result from public.reserve_ai_first_reply(
    u, 'room-1', '00000000-0000-0000-0000-000000000001', t, t + interval '5 minutes');
  if row_result.result <> 'already_reserved' or row_result.occupied_count <> 1 then
    raise exception 'same request was counted twice';
  end if;

  rejected := false;
  begin
    perform public.reserve_ai_first_reply(
      u, 'room-1', '00000000-0000-0000-0000-000000000008', t, t + interval '5 minutes');
  exception when others then
    rejected := sqlerrm = 'AI_QUOTA_PERSONA_IN_PROGRESS';
  end;
  if not rejected then raise exception 'parallel first reply was allowed'; end if;

  done_status := public.finish_ai_first_reply(
    u, '00000000-0000-0000-0000-000000000001', true, '2026-09-29 00:01:00+09');
  if done_status <> 'completed'
      or not exists (select 1 from public.ai_quota_completed_rooms where persona_id='room-1')
      or (select quota_day from public.ai_quota_reservations where persona_id='room-1') <> '2026-09-28'::date then
    raise exception 'cross-midnight completion lost request date';
  end if;
  if public.finish_ai_first_reply(u, '00000000-0000-0000-0000-000000000001', true,
      '2026-09-29 00:02:00+09') <> 'completed' then
    raise exception 'finish retry not idempotent';
  end if;
  select * into row_result from public.reserve_ai_first_reply(
    u, 'room-1', '00000000-0000-0000-0000-000000000009',
    '2026-09-29 00:02:00+09', '2026-09-29 00:07:00+09');
  if row_result.result <> 'already_completed' then
    raise exception 'continuation was charged again';
  end if;

  perform public.reserve_ai_first_reply(
    u, 'room-2', '00000000-0000-0000-0000-000000000002', t, t + interval '5 minutes');
  perform public.reserve_ai_first_reply(
    u, 'room-3', '00000000-0000-0000-0000-000000000003', t, t + interval '5 minutes');
  rejected := false;
  begin
    perform public.reserve_ai_first_reply(
      u, 'room-4', '00000000-0000-0000-0000-000000000004', t, t + interval '5 minutes');
  exception when others then
    rejected := sqlerrm = 'AI_QUOTA_REACHED';
  end;
  if not rejected then raise exception 'fourth daily slot was allowed'; end if;

  if public.finish_ai_first_reply(
      u, '00000000-0000-0000-0000-000000000003', false, t + interval '1 minute') <> 'returned' then
    raise exception 'failed answer did not return slot';
  end if;
  perform public.reserve_ai_first_reply(
    u, 'room-4', '00000000-0000-0000-0000-000000000004', t, t + interval '5 minutes');
  select * into row_result from public.reserve_ai_first_reply(
    u, 'room-5', '00000000-0000-0000-0000-000000000005',
    '2026-09-29 00:02:00+09', '2026-09-29 00:07:00+09');
  if row_result.quota_day <> '2026-09-29'::date or row_result.occupied_count <> 1 then
    raise exception 'new Korean day did not reset';
  end if;

  if public.finish_ai_first_reply(
      u, '00000000-0000-0000-0000-000000000004', true,
      '2026-09-29 00:10:00+09') <> 'expired' then
    raise exception 'late completion was accepted';
  end if;
  select * into row_result from public.reserve_ai_first_reply(
    u, 'room-5', '00000000-0000-0000-0000-000000000005',
    '2026-09-29 00:10:00+09', '2026-09-29 00:15:00+09');
  if row_result.result <> 'expired' then
    raise exception 'expired same-request replay appeared reserved';
  end if;

  if not has_function_privilege('service_role',
      'public.reserve_ai_first_reply(uuid,text,uuid,timestamptz,timestamptz)', 'EXECUTE')
      or has_function_privilege('authenticated',
      'public.reserve_ai_first_reply(uuid,text,uuid,timestamptz,timestamptz)', 'EXECUTE')
      or has_function_privilege('anon',
      'public.finish_ai_first_reply(uuid,uuid,boolean,timestamptz)', 'EXECUTE')
      or has_table_privilege('authenticated', 'public.ai_quota_completed_rooms', 'INSERT') then
    raise exception 'RPC execution grants are wrong';
  end if;

  if public.purge_ai_quota_reservations('2026-10-29 00:03:00+09') < 2 then
    raise exception '30-day terminal record purge did not run';
  end if;
  if exists (select 1 from public.ai_quota_reservations where persona_id='room-1')
      or not exists (select 1 from public.ai_quota_completed_rooms where persona_id='room-1') then
    raise exception 'log purge removed durable room continuation state';
  end if;
end $$;

insert into public.stories (id, "authorId", visibility) values
  ('legacy-foreign', '44444444-4444-4444-4444-444444444444', 'public'),
  ('legacy-own', '55555555-5555-5555-5555-555555555555', 'private'),
  ('legacy-private', '44444444-4444-4444-4444-444444444444', 'private');

do $$
declare
  u uuid := '55555555-5555-5555-5555-555555555555';
  t timestamptz := '2026-09-28 12:00:00+09';
  request_id uuid := '55555555-5555-4555-8555-555555555551';
  payload jsonb;
  answer jsonb;
  rejected boolean := false;
begin
  payload := jsonb_build_object('id', 'persona-' || request_id::text,
    'storyId', 'legacy-foreign', 'opening', 'apology',
    'name', '상대', 'role', '상황', 'systemInstruction', '합성 지시문');
  answer := public.open_legacy_ai_room(u, request_id, payload, t);
  if answer->>'recovered' <> 'false' or answer->>'quotaUsed' <> '1'
      or (select count(*) from public.ai_chat_usage where "userId"=u) <> 1 then
    raise exception 'legacy room and charge were not atomic';
  end if;
  answer := public.open_legacy_ai_room(u, request_id, payload, t);
  if answer->>'recovered' <> 'true'
      or (select count(*) from public.ai_chat_usage where "userId"=u) <> 1 then
    raise exception 'legacy retry charged twice';
  end if;
  answer := public.open_legacy_ai_room(u,
    '55555555-5555-4555-8555-555555555552',
    jsonb_set(payload, '{id}', '"persona-55555555-5555-4555-8555-555555555552"'), t);
  if answer->>'recovered' <> 'true' then
    raise exception 'same legacy room choice did not reuse original';
  end if;

  perform public.open_legacy_ai_room(u,
    '55555555-5555-4555-8555-555555555553',
    payload || jsonb_build_object('id', 'persona-55555555-5555-4555-8555-555555555553',
      'opening', 'oblivious'), t);
  perform public.open_legacy_ai_room(u,
    '55555555-5555-4555-8555-555555555554',
    payload || jsonb_build_object('id', 'persona-55555555-5555-4555-8555-555555555554',
      'opening', 'meFirst'), t);
  if (select count(*) from public.ai_chat_usage where "userId"=u) <> 3 then
    raise exception 'legacy count mismatch';
  end if;

  begin
    perform public.open_legacy_ai_room(u,
      '55555555-5555-4555-8555-555555555555',
      payload || jsonb_build_object('id', 'persona-55555555-5555-4555-8555-555555555555',
        'opening', null, 'ratio', 'High'), t);
  exception when others then
    rejected := sqlerrm = 'AI_QUOTA_REACHED';
  end;
  if not rejected or exists (select 1 from public.ai_personas
      where id='persona-55555555-5555-4555-8555-555555555555') then
    raise exception 'fourth legacy room persisted';
  end if;

  answer := public.open_legacy_ai_room(u,
    '55555555-5555-4555-8555-555555555556',
    payload || jsonb_build_object('id', 'persona-55555555-5555-4555-8555-555555555556',
      'storyId', 'legacy-own'), t);
  if answer->>'quotaUsed' <> '3' then raise exception 'own legacy room charged'; end if;

  rejected := false;
  begin
    perform public.open_legacy_ai_room(u,
      '55555555-5555-4555-8555-555555555557',
      payload || jsonb_build_object('id', 'persona-55555555-5555-4555-8555-555555555557',
        'storyId', 'legacy-private'), t);
  exception when others then
    rejected := sqlerrm = 'AI_ROOM_STORY_NOT_FOUND';
  end;
  if not rejected then raise exception 'private legacy room created'; end if;

  if has_function_privilege('authenticated',
      'public.open_legacy_ai_room(uuid,uuid,jsonb,timestamptz)', 'EXECUTE') then
    raise exception 'legacy room RPC exposed to browser';
  end if;
end $$;

insert into public.stories (id, "authorId") values
  ('foreign-story', '44444444-4444-4444-4444-444444444444'),
  ('own-story', '33333333-3333-3333-3333-333333333333');
insert into public.ai_personas
  (id, "userId", "storyId", "createdAt") values
  ('new-foreign', '33333333-3333-3333-3333-333333333333', 'foreign-story', '2026-09-29 00:00:00+09'),
  ('new-own', '33333333-3333-3333-3333-333333333333', 'own-story', '2026-09-29 00:00:00+09'),
  ('old-empty', '33333333-3333-3333-3333-333333333333', null, '2026-09-27 00:00:00+09'),
  ('no-reservation', '33333333-3333-3333-3333-333333333333', 'foreign-story', '2026-09-29 00:00:00+09');

do $$
declare
  u uuid := '33333333-3333-3333-3333-333333333333';
  request_id uuid := '33333333-3333-4333-8333-333333333333';
  activated timestamptz := '2026-09-28 00:00:00+09';
  started timestamptz := '2026-09-29 09:00:00+09';
  reply jsonb;
  rejected boolean := false;
begin
  perform public.reserve_ai_first_reply(
    u, 'new-foreign', request_id, started, started + interval '2 minutes');
  reply := public.complete_ai_turn(u, 'new-foreign', request_id,
    '첫 말', '정상 답변', started + interval '1 minute', activated);
  if reply->>'result' <> 'saved' or reply->>'charged' <> 'true'
      or (select jsonb_array_length("chatHistory") from public.ai_personas where id='new-foreign') <> 2
      or not exists (select 1 from public.ai_quota_completed_rooms where persona_id='new-foreign') then
    raise exception 'atomic first reply save and charge failed';
  end if;
  reply := public.complete_ai_turn(u, 'new-foreign', request_id,
    '첫 말', '정상 답변', started + interval '1 minute', activated);
  if reply->>'result' <> 'recovered'
      or (select jsonb_array_length("chatHistory") from public.ai_personas where id='new-foreign') <> 2 then
    raise exception 'turn retry duplicated history';
  end if;

  begin
    perform public.complete_ai_turn(u, 'no-reservation',
      '33333333-3333-4333-8333-333333333334', '첫 말', '정상 답변',
      started + interval '1 minute', activated);
  exception when others then
    rejected := sqlerrm = 'AI_TURN_RESERVATION_MISSING';
  end;
  if not rejected or (select jsonb_array_length("chatHistory") from public.ai_personas where id='no-reservation') <> 0 then
    raise exception 'unreserved first reply was saved';
  end if;

  reply := public.complete_ai_turn(u, 'new-own',
    '33333333-3333-4333-8333-333333333335', '내 글', '정상 답변',
    started + interval '1 minute', activated);
  if reply->>'charged' <> 'false' then raise exception 'own story charged'; end if;

  reply := public.complete_ai_turn(u, 'old-empty',
    '33333333-3333-4333-8333-333333333336', '오래된 방', '정상 답변',
    started + interval '1 minute', activated);
  if reply->>'charged' <> 'false' then raise exception 'old empty room charged'; end if;

  if not has_function_privilege('service_role',
      'public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)', 'EXECUTE')
      or has_function_privilege('authenticated',
      'public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)', 'EXECUTE') then
    raise exception 'turn completion grant mismatch';
  end if;
end $$;

insert into public.ai_feedback
  (episode_id, user_id, persona_id, mode, score, outcome, created_at, expires_at)
values
  ('aaaa1111-aaaa-4111-8111-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333',
   'new-foreign', 'simulation', 5, 'submitted',
   '2026-09-28 12:00:00+09', '2026-10-28 12:00:00+09'),
  ('bbbb1111-bbbb-4111-8111-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333',
   'new-own', 'explanation', null, 'skipped',
   '2026-09-28 12:00:00+09', '2026-10-28 12:00:00+09');
do $$
declare
  removed integer;
  removed_again integer;
begin
  removed := public.purge_ai_feedback('2026-10-29 00:00:00+09');
  removed_again := public.purge_ai_feedback('2026-10-29 00:00:00+09');
  if removed <> 2 or removed_again <> 0 then
    raise exception 'feedback purge count failed: %, %', removed, removed_again;
  end if;
  if (select count(*) from public.ai_feedback) <> 0 then
    raise exception 'expired feedback remains';
  end if;
  if to_regclass('public.ai_feedback_daily_totals') is not null then
    raise exception 'disallowed daily small-cell aggregate exists';
  end if;
  if has_table_privilege('authenticated', 'public.ai_feedback', 'SELECT')
      or has_function_privilege('authenticated',
        'public.purge_ai_feedback(timestamptz)', 'EXECUTE') then
    raise exception 'feedback permissions failed';
  end if;
end $$;

insert into public.ai_feedback
  (episode_id, user_id, persona_id, mode, score, outcome)
values
  ('cccc1111-cccc-4111-8111-cccccccccccc',
   '11111111-1111-1111-1111-111111111111',
   'room-8', 'simulation', 4, 'submitted');
do $$
begin
  if (select expires_at - created_at from public.ai_feedback
      where episode_id='cccc1111-cccc-4111-8111-cccccccccccc') <> interval '29 days' then
    raise exception 'feedback default expiry does not fit daily purge';
  end if;
end $$;
delete from public.ai_personas where id='room-8';
do $$
begin
  if exists (select 1 from public.ai_feedback
      where episode_id='cccc1111-cccc-4111-8111-cccccccccccc') then
    raise exception 'deleted room retained personal feedback';
  end if;
end $$;

-- Leave two of three slots occupied for the separate-process race in the runner.
insert into public.ai_personas (id, "userId")
select 'race-room-' || n, '22222222-2222-2222-2222-222222222222'::uuid
from generate_series(1, 4) as n;
select public.reserve_ai_first_reply(
  '22222222-2222-2222-2222-222222222222', 'race-room-1',
  '00000000-0000-0000-0000-000000000011',
  '2026-09-28 12:00:00+09', '2026-09-28 12:10:00+09');
select public.reserve_ai_first_reply(
  '22222222-2222-2222-2222-222222222222', 'race-room-2',
  '00000000-0000-0000-0000-000000000012',
  '2026-09-28 12:00:00+09', '2026-09-28 12:10:00+09');

insert into public.ai_personas (id, "userId")
values ('service-room', '33333333-3333-3333-3333-333333333333');
set role service_role;
do $$
declare v_result record;
begin
  select * into v_result from public.reserve_ai_first_reply(
    '33333333-3333-3333-3333-333333333333', 'service-room',
    '00000000-0000-0000-0000-000000000031',
    '2026-09-28 12:00:00+09', '2026-09-28 12:10:00+09');
  if v_result.result <> 'reserved' then raise exception 'service role cannot reserve'; end if;
end $$;
reset role;

insert into public.ai_personas (id, "userId", "storyId", opening, ratio) values
  ('choice-sim', '44444444-4444-4444-4444-444444444444', 'story-1', 'oblivious', null),
  ('choice-empathy', '44444444-4444-4444-4444-444444444444', 'story-1', null, 'High');
do $$
declare rejected boolean;
begin
  rejected := false;
  begin
    insert into public.ai_personas (id, "userId", "storyId", opening)
    values ('duplicate-sim', '44444444-4444-4444-4444-444444444444', 'story-1', 'oblivious');
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'duplicate simulation room was accepted'; end if;
  rejected := false;
  begin
    insert into public.ai_personas (id, "userId", "storyId", ratio)
    values ('duplicate-empathy', '44444444-4444-4444-4444-444444444444', 'story-1', 'High');
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'duplicate empathy room was accepted'; end if;
end $$;

-- Reproduce the operating project's permissive browser grants/policies,
-- then prove the cutover removes direct AI writes but keeps owner cleanup.
grant select, insert, update, delete on public.ai_personas, public.ai_chat_usage to authenticated;
alter table public.ai_personas enable row level security;
alter table public.ai_chat_usage enable row level security;
create policy ai_personas_insert_own on public.ai_personas for insert to authenticated with check (true);
create policy ai_personas_update_own on public.ai_personas for update to authenticated using (true);
create policy ai_chat_usage_insert_own on public.ai_chat_usage for insert to authenticated with check (true);
\ir ../docs/plan-execution/sql/ai-direct-write-boundary-draft.sql
do $$
begin
  if has_table_privilege('authenticated', 'public.ai_personas', 'INSERT')
      or has_table_privilege('authenticated', 'public.ai_personas', 'UPDATE')
      or has_table_privilege('authenticated', 'public.ai_chat_usage', 'INSERT')
      or not has_table_privilege('authenticated', 'public.ai_personas', 'DELETE')
      or not has_table_privilege('service_role', 'public.ai_personas', 'UPDATE') then
    raise exception 'AI browser-write boundary failed';
  end if;
end $$;

select 'PASS: AI quota, feedback retention, direct-write boundary, concurrency fixture' as result;
