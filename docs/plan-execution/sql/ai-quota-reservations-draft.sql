-- DRAFT ONLY. Run in an isolated database before any operating migration.
-- The caller must be the server's service_role; do not expose these RPCs to clients.
-- The server must save a nonempty completed answer before calling finish(..., true).
-- This draft does not activate the new rule, revoke legacy ai_chat_usage writes,
-- configure reservation expiry, or schedule the 30-day purge.

-- Minimal room state must outlive the 30-day processing log so an existing
-- conversation never spends a second slot. It is deleted with the room.
create table if not exists public.ai_quota_completed_rooms (
  persona_id text primary key references public.ai_personas(id) on delete cascade,
  user_id uuid not null
);
alter table public.ai_quota_completed_rooms enable row level security;
revoke all on public.ai_quota_completed_rooms from public, anon, authenticated;
grant select, insert, delete on public.ai_quota_completed_rooms to service_role;

create table if not exists public.ai_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  persona_id text not null references public.ai_personas(id) on delete cascade,
  request_id uuid not null,
  quota_day date not null,
  status text not null check (status in ('reserved', 'completed', 'returned', 'expired')),
  reserved_at timestamptz not null,
  expires_at timestamptz not null,
  finished_at timestamptz,
  unique (user_id, request_id),
  check (expires_at > reserved_at),
  check ((status = 'reserved') = (finished_at is null))
);

create unique index if not exists ai_quota_one_open_or_completed_per_persona
  on public.ai_quota_reservations (persona_id)
  where status in ('reserved', 'completed');
create index if not exists ai_quota_user_day_status
  on public.ai_quota_reservations (user_id, quota_day, status);
create index if not exists ai_quota_finished_at
  on public.ai_quota_reservations (finished_at)
  where finished_at is not null;

alter table public.ai_quota_reservations enable row level security;
revoke all on public.ai_quota_reservations from public, anon, authenticated;
grant select, insert, update, delete on public.ai_quota_reservations to service_role;

create or replace function public.reserve_ai_first_reply(
  p_user_id uuid, p_persona_id text, p_request_id uuid,
  p_received_at timestamptz, p_expires_at timestamptz
)
returns table (result text, quota_day date, occupied_count integer)
language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid;
  v_existing public.ai_quota_reservations%rowtype;
  v_day date;
  v_count integer;
begin
  if p_user_id is null or p_persona_id is null or p_request_id is null
      or p_received_at is null or p_expires_at is null
      or p_expires_at <= p_received_at then
    raise exception 'AI_QUOTA_INVALID_REQUEST';
  end if;

  -- Serialize all requests from this account, including a request crossing midnight.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select "userId"
    into v_owner
    from public.ai_personas where id = p_persona_id for update;
  if not found or v_owner <> p_user_id then
    raise exception 'AI_QUOTA_PERSONA_NOT_FOUND';
  end if;

  v_day := (p_received_at at time zone 'Asia/Seoul')::date;
  update public.ai_quota_reservations
    set status = 'expired', finished_at = p_received_at
    where user_id = p_user_id and status = 'reserved'
      and expires_at <= p_received_at;

  select * into v_existing from public.ai_quota_reservations
    where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_existing.persona_id <> p_persona_id then
      raise exception 'AI_QUOTA_REQUEST_CONFLICT';
    end if;
    -- A replay of an active request must not start a second provider call.
    return query select case when v_existing.status = 'reserved'
        then 'already_reserved' else v_existing.status end,
      v_existing.quota_day,
      (select count(*)::integer from public.ai_quota_reservations as q
       where q.user_id = p_user_id and q.quota_day = v_existing.quota_day
         and q.status in ('reserved', 'completed'));
    return;
  end if;

  if exists (select 1 from public.ai_quota_completed_rooms
      where persona_id = p_persona_id and user_id = p_user_id) then
    return query select 'already_completed'::text, v_day,
      (select count(*)::integer from public.ai_quota_reservations as q
       where q.user_id = p_user_id and q.quota_day = v_day
         and q.status in ('reserved', 'completed'));
    return;
  end if;

  if exists (select 1 from public.ai_quota_reservations
      where persona_id = p_persona_id and status in ('reserved', 'completed')) then
    raise exception 'AI_QUOTA_PERSONA_IN_PROGRESS';
  end if;

  select count(*)::integer into v_count from public.ai_quota_reservations as q
    where q.user_id = p_user_id and q.quota_day = v_day
      and q.status in ('reserved', 'completed');
  if v_count >= 3 then
    raise exception 'AI_QUOTA_REACHED';
  end if;

  insert into public.ai_quota_reservations
    (user_id, persona_id, request_id, quota_day, status, reserved_at, expires_at)
    values (p_user_id, p_persona_id, p_request_id, v_day, 'reserved',
      p_received_at, p_expires_at);
  return query select 'reserved'::text, v_day, v_count + 1;
end;
$$;

create or replace function public.finish_ai_first_reply(
  p_user_id uuid, p_request_id uuid, p_success boolean, p_finished_at timestamptz
)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_row public.ai_quota_reservations%rowtype;
begin
  if p_user_id is null or p_request_id is null or p_success is null
      or p_finished_at is null then
    raise exception 'AI_QUOTA_INVALID_REQUEST';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into v_row from public.ai_quota_reservations
    where user_id = p_user_id and request_id = p_request_id for update;
  if not found then raise exception 'AI_QUOTA_RESERVATION_NOT_FOUND'; end if;
  if v_row.status <> 'reserved' then return v_row.status; end if;

  if v_row.expires_at <= p_finished_at then
    update public.ai_quota_reservations set status = 'expired', finished_at = p_finished_at
      where id = v_row.id;
    return 'expired';
  end if;
  if p_success then
    insert into public.ai_quota_completed_rooms (persona_id, user_id)
      values (v_row.persona_id, p_user_id)
      on conflict (persona_id) do nothing;
    update public.ai_quota_reservations set status = 'completed', finished_at = p_finished_at
      where id = v_row.id;
    return 'completed';
  end if;
  update public.ai_quota_reservations set status = 'returned', finished_at = p_finished_at
    where id = v_row.id;
  return 'returned';
end;
$$;

create or replace function public.purge_ai_quota_reservations(p_now timestamptz)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_deleted integer;
begin
  if p_now is null then raise exception 'AI_QUOTA_INVALID_REQUEST'; end if;
  update public.ai_quota_reservations
    set status = 'expired', finished_at = p_now
    where status = 'reserved' and expires_at <= p_now;
  delete from public.ai_quota_reservations
    where status <> 'reserved' and finished_at <= p_now - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.reserve_ai_first_reply(uuid,text,uuid,timestamptz,timestamptz)
  from public, anon, authenticated;
revoke all on function public.finish_ai_first_reply(uuid,uuid,boolean,timestamptz)
  from public, anon, authenticated;
revoke all on function public.purge_ai_quota_reservations(timestamptz)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_first_reply(uuid,text,uuid,timestamptz,timestamptz)
  to service_role;
grant execute on function public.finish_ai_first_reply(uuid,uuid,boolean,timestamptz)
  to service_role;
grant execute on function public.purge_ai_quota_reservations(timestamptz)
  to service_role;
