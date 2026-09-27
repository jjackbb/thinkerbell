-- REVIEW DRAFT ONLY. The browser never receives account existence until it
-- presents a one-use token delivered to the mailbox. No email or raw token is
-- stored here. Apply only after the matching server code and role test pass.
create table if not exists public.signup_email_checks (
  id uuid primary key,
  email_digest text not null check (email_digest ~ '^[0-9a-f]{64}$'),
  token_digest text not null check (token_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint signup_email_checks_expiry check (expires_at > created_at)
);
create index if not exists signup_email_checks_email_time_idx
  on public.signup_email_checks(email_digest, created_at desc);
create index if not exists signup_email_checks_created_idx
  on public.signup_email_checks(created_at);
alter table public.signup_email_checks enable row level security;
revoke all on public.signup_email_checks from public, anon, authenticated;
grant select, insert, delete on public.signup_email_checks to service_role;

-- The global advisory lock makes the send ceiling effective across concurrent
-- Vercel instances. The server returns a generic rate-limit error for false.
create or replace function public.reserve_signup_email_check(
  p_id uuid, p_email_digest text, p_token_digest text,
  p_at timestamptz default now()
) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if p_id is null or p_email_digest !~ '^[0-9a-f]{64}$' or
      p_token_digest !~ '^[0-9a-f]{64}$' or p_at is null then
    raise exception 'EMAIL_CHECK_INVALID_REQUEST';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(1755299);
  if (select count(*) from public.signup_email_checks
      where created_at > p_at - interval '1 hour'
        and email_digest = p_email_digest) >= 3 or
     (select count(*) from public.signup_email_checks
      where created_at > p_at - interval '24 hours') >= 50 then
    return false;
  end if;
  insert into public.signup_email_checks
    (id, email_digest, token_digest, created_at, expires_at)
    values (p_id, p_email_digest, p_token_digest,
      p_at, p_at + interval '10 minutes');
  return true;
end;
$$;

-- Only this function can inspect auth.users. The server decrypts the email
-- from the authenticated token and sends it here with its matching digest.
create or replace function public.consume_signup_email_check(
  p_id uuid, p_email_digest text, p_token_digest text, p_email text,
  p_at timestamptz default now()
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if p_id is null or p_email_digest !~ '^[0-9a-f]{64}$' or
      p_token_digest !~ '^[0-9a-f]{64}$' or p_email is null or
      p_email <> pg_catalog.lower(pg_catalog.btrim(p_email)) or
      pg_catalog.length(p_email) > 254 or p_at is null then
    raise exception 'EMAIL_CHECK_INVALID_REQUEST';
  end if;
  update public.signup_email_checks set consumed_at = p_at
    where id = p_id and email_digest = p_email_digest
      and token_digest = p_token_digest and consumed_at is null
      and expires_at > p_at;
  if not found then raise exception 'EMAIL_CHECK_LINK_UNAVAILABLE'; end if;
  select case
    when exists(select 1 from auth.users as u
      where pg_catalog.lower(u.email) = p_email and
        case when pg_catalog.to_jsonb(u) ? 'email_confirmed_at'
          then pg_catalog.to_jsonb(u)->>'email_confirmed_at' is not null
          else pg_catalog.to_jsonb(u)->>'confirmed_at' is not null
        end)
      then 'registered'
    when exists(select 1 from auth.users
      where pg_catalog.lower(email) = p_email) then 'pending'
    else 'available'
  end into v_status;
  return v_status;
end;
$$;

create or replace function public.purge_signup_email_checks(p_at timestamptz default now())
returns integer
language plpgsql security invoker set search_path = '' as $$
declare v_deleted integer;
begin
  if p_at is null then raise exception 'EMAIL_CHECK_INVALID_PURGE_TIME'; end if;
  delete from public.signup_email_checks
    where created_at <= p_at - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.reserve_signup_email_check(uuid,text,text,timestamptz),
  public.consume_signup_email_check(uuid,text,text,text,timestamptz),
  public.purge_signup_email_checks(timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_signup_email_check(uuid,text,text,timestamptz),
  public.consume_signup_email_check(uuid,text,text,text,timestamptz),
  public.purge_signup_email_checks(timestamptz) to service_role;
