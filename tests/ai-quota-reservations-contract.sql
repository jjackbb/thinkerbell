\set ON_ERROR_STOP on

-- Disposable Supabase PostgreSQL only. Never run this fixture on an operating DB.
create table public.ai_personas (
  id text primary key,
  "userId" uuid not null
);
-- The operating project was read-checked: service_role can SELECT/UPDATE ai_personas.
grant select on public.ai_personas to service_role;
\ir ../docs/plan-execution/sql/ai-quota-reservations-draft.sql

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
  if row_result.result <> 'reserved' or row_result.occupied_count <> 1 then
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

select 'PASS: ai quota request-day, idempotency, return, expiry, retention, grants' as result;
