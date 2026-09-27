\set ON_ERROR_STOP on
-- Disposable Supabase PostgreSQL only. The function must never expose
-- account existence to anon/authenticated without a delivered one-use token.
\ir ../docs/plan-execution/sql/signup-email-ownership-draft.sql

do $$
declare
  at_time timestamptz := '2026-09-28 10:00:00+09';
  id_value uuid := 'aaaa0000-0000-4000-8000-000000000001';
  email_key text := repeat('a', 64);
  token_key text := repeat('b', 64);
  rejected boolean := false;
begin
  if not public.reserve_signup_email_check(id_value, email_key, token_key, at_time) then
    raise exception 'first email check was rejected';
  end if;
  if public.consume_signup_email_check(id_value, email_key, token_key,
      'new@example.com', at_time + interval '1 minute') <> 'available' then
    raise exception 'unknown email was reported registered';
  end if;
  begin
    perform public.consume_signup_email_check(id_value, email_key, token_key,
      'new@example.com', at_time + interval '2 minutes');
  exception when others then
    rejected := sqlerrm = 'EMAIL_CHECK_LINK_UNAVAILABLE';
  end;
  if not rejected then raise exception 'one-use link was replayed'; end if;
end $$;

insert into auth.users
  (id, instance_id, aud, role, email, confirmed_at, created_at, updated_at)
values
  ('aaaa0000-0000-4000-8000-000000000099',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'registered@example.com', now(), now(), now());

do $$
declare
  at_time timestamptz := '2026-09-28 10:00:00+09';
  id_value uuid := 'aaaa0000-0000-4000-8000-000000000002';
  email_key text := repeat('c', 64);
  token_key text := repeat('d', 64);
begin
  perform public.reserve_signup_email_check(id_value, email_key, token_key, at_time);
  if public.consume_signup_email_check(id_value, email_key, token_key,
      'registered@example.com', at_time + interval '1 minute') <> 'registered' then
    raise exception 'registered mailbox was not recognized after proof';
  end if;
end $$;

insert into auth.users
  (id, instance_id, aud, role, email, created_at, updated_at)
values
  ('aaaa0000-0000-4000-8000-000000000098',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'pending@example.com', now(), now());
do $$
declare
  at_time timestamptz := '2026-09-28 10:00:00+09';
  id_value uuid := 'aaaa0000-0000-4000-8000-000000000003';
  email_key text := repeat('1', 64);
  token_key text := repeat('2', 64);
begin
  perform public.reserve_signup_email_check(id_value, email_key, token_key, at_time);
  if public.consume_signup_email_check(id_value, email_key, token_key,
      'pending@example.com', at_time + interval '1 minute') <> 'pending' then
    raise exception 'unconfirmed signup did not receive pending status';
  end if;
end $$;

do $$
declare
  at_time timestamptz := '2026-09-28 11:00:00+09';
  email_key text := repeat('e', 64);
  token_key text := repeat('f', 64);
  id_value uuid;
begin
  for n in 1..3 loop
    id_value := ('bbbb0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    if not public.reserve_signup_email_check(id_value, email_key, token_key, at_time) then
      raise exception 'email hourly allowance ended early';
    end if;
  end loop;
  if public.reserve_signup_email_check('bbbb0000-0000-4000-8000-000000000004',
      email_key, token_key, at_time) then
    raise exception 'email hourly allowance was bypassed';
  end if;
  if public.purge_signup_email_checks(at_time + interval '25 hours') < 3 then
    raise exception 'retention cleanup missed old digests';
  end if;
end $$;

do $$
begin
  if has_table_privilege('anon', 'public.signup_email_checks', 'SELECT') or
      has_table_privilege('authenticated', 'public.signup_email_checks', 'SELECT') or
      has_function_privilege('anon',
        'public.consume_signup_email_check(uuid,text,text,text,timestamptz)', 'EXECUTE') or
      has_function_privilege('authenticated',
        'public.consume_signup_email_check(uuid,text,text,text,timestamptz)', 'EXECUTE') then
    raise exception 'mailbox ownership boundary is public';
  end if;
end $$;
select 'PASS: email ownership proof, one-use, rate and grants' as result;
