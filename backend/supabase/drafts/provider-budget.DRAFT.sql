-- DRAFT ONLY. Never automatically migrate/enable. Review grants and real PG
-- multi-session tests before activation. This controls app usage, not provider billing.
begin;
create schema if not exists provider_budget_private;
revoke all on schema provider_budget_private from public;
create table provider_budget_private.control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  cap_nano bigint not null default 4000000000 check(cap_nano between 1 and 4000000000),
  active_attempt uuid
);
insert into provider_budget_private.control(singleton) values(true);
create table provider_budget_private.months (
  month date primary key,
  charged_nano bigint not null default 0 check(charged_nano >= 0),
  reserved_nano bigint not null default 0 check(reserved_nano >= 0)
);
create table provider_budget_private.attempts (
  id uuid primary key,
  month date not null references provider_budget_private.months(month),
  model text not null default 'gemini-3.1-flash-lite' check(model='gemini-3.1-flash-lite'),
  pricing_version text not null default 'gemini-3.1-flash-lite-text-2026-10',
  input_rate_nano bigint not null default 250 check(input_rate_nano=250),
  output_rate_nano bigint not null default 1500 check(output_rate_nano=1500),
  input_bound bigint not null,
  output_bound bigint not null,
  reserved_nano bigint not null,
  charged_nano bigint,
  settled_input_tokens bigint,
  settled_output_tokens bigint,
  state text not null check(state in ('reserved','dispatched','unknown','settled','released')),
  created_at timestamptz not null default clock_timestamp()
);
revoke all on all tables in schema provider_budget_private from public;
-- Identity, calendar allocation, price snapshot and original exposure are append-only.
-- No account/user foreign key: account deletion must never refund this ledger.
create function provider_budget_private.protect_attempt() returns trigger
language plpgsql set search_path='' as $$
begin
  if TG_OP='DELETE' then raise exception 'attempt_is_immutable'; end if;
  if row(new.id,new.month,new.model,new.pricing_version,new.input_rate_nano,new.output_rate_nano,
         new.input_bound,new.output_bound,new.reserved_nano,new.created_at)
     is distinct from
     row(old.id,old.month,old.model,old.pricing_version,old.input_rate_nano,old.output_rate_nano,
         old.input_bound,old.output_bound,old.reserved_nano,old.created_at) then
    raise exception 'attempt_is_immutable';
  end if;
  return new;
end $$;
create trigger protect_attempt before update or delete on provider_budget_private.attempts
for each row execute function provider_budget_private.protect_attempt();
revoke all on function provider_budget_private.protect_attempt() from public;

create function public.provider_budget_reserve(p_attempt_id uuid, p_input_bound bigint, p_output_bound bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c provider_budget_private.control%rowtype; m date; cost bigint; used bigint;
begin
  select * into strict c from provider_budget_private.control where singleton for update;
  if p_attempt_id is null or p_input_bound is null or p_output_bound is null
    or p_input_bound not between 1 and 1048576 or p_output_bound not between 1 and 65536 then
    raise exception 'invalid_bound';
  end if;
  if exists(select 1 from provider_budget_private.attempts where id=p_attempt_id) then
    return jsonb_build_object('allowed',false,'reason','duplicate_attempt');
  end if;
  if not c.enabled then return jsonb_build_object('allowed',false,'reason','disabled'); end if;
  if c.active_attempt is not null then return jsonb_build_object('allowed',false,'reason','global_busy'); end if;
  m := date_trunc('month',clock_timestamp() at time zone 'Asia/Seoul')::date;
  cost := p_input_bound*250 + p_output_bound*1500;
  insert into provider_budget_private.months(month) values(m) on conflict do nothing;
  select charged_nano+reserved_nano into strict used from provider_budget_private.months where month=m;
  if used+cost > c.cap_nano then return jsonb_build_object('allowed',false,'reason','budget_exhausted'); end if;
  insert into provider_budget_private.attempts(id,month,input_bound,output_bound,reserved_nano,state)
    values(p_attempt_id,m,p_input_bound,p_output_bound,cost,'reserved');
  update provider_budget_private.months set reserved_nano=reserved_nano+cost where month=m;
  update provider_budget_private.control set active_attempt=p_attempt_id where singleton;
  return jsonb_build_object('allowed',true,'reason','reserved');
end $$;

create function public.provider_budget_dispatch(p_attempt_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare c provider_budget_private.control%rowtype; a provider_budget_private.attempts%rowtype;
begin
  select * into strict c from provider_budget_private.control where singleton for update;
  select * into strict a from provider_budget_private.attempts where id=p_attempt_id;
  if not c.enabled or c.active_attempt is distinct from p_attempt_id or a.state <> 'reserved' then return false; end if;
  update provider_budget_private.attempts set state='dispatched' where id=p_attempt_id;
  return true;
end $$;

-- No TTL/automatic unlock. Unknown outcomes retain their full reserve and global slot.
create function public.provider_budget_unknown(p_attempt_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a provider_budget_private.attempts%rowtype;
begin
  perform 1 from provider_budget_private.control where singleton for update;
  select * into strict a from provider_budget_private.attempts where id=p_attempt_id;
  if a.state in ('settled','released') then raise exception 'terminal_attempt'; end if;
  update provider_budget_private.attempts set state='unknown' where id=p_attempt_id;
end $$;

create function public.provider_budget_release(p_attempt_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a provider_budget_private.attempts%rowtype;
begin
  perform 1 from provider_budget_private.control where singleton for update;
  select * into strict a from provider_budget_private.attempts where id=p_attempt_id;
  if a.state='released' then return; end if;
  if a.state<>'reserved' then raise exception 'cannot_release_after_dispatch'; end if;
  update provider_budget_private.months set reserved_nano=reserved_nano-a.reserved_nano where month=a.month;
  update provider_budget_private.attempts set state='released',charged_nano=0 where id=p_attempt_id;
  update provider_budget_private.control set active_attempt=null where singleton and active_attempt=p_attempt_id;
end $$;

create function public.provider_budget_settle(p_attempt_id uuid,p_input_tokens bigint,p_output_tokens bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a provider_budget_private.attempts%rowtype; cost bigint;
begin
  perform 1 from provider_budget_private.control where singleton for update;
  select * into strict a from provider_budget_private.attempts where id=p_attempt_id;
  if p_input_tokens is null or p_output_tokens is null or p_input_tokens not between 0 and 1000000000
    or p_output_tokens not between 0 and 1000000000 then raise exception 'invalid_usage'; end if;
  cost:=p_input_tokens*a.input_rate_nano+p_output_tokens*a.output_rate_nano;
  if a.state='settled' then
    if a.charged_nano <> cost or a.settled_input_tokens is distinct from p_input_tokens
      or a.settled_output_tokens is distinct from p_output_tokens then raise exception 'conflicting_settlement'; end if;
    return jsonb_build_object('settled',true);
  end if;
  if a.state not in ('dispatched','unknown') then raise exception 'not_dispatched'; end if;
  if a.charged_nano is not null then raise exception 'manual_reconciliation_required'; end if;
  if p_input_tokens>a.input_bound or p_output_tokens>a.output_bound then
    -- Unexpected bill can exceed the reservation. Record conservative maximum,
    -- disable all future spending and retain global lock for human investigation.
    update provider_budget_private.months set reserved_nano=reserved_nano-a.reserved_nano,
      charged_nano=charged_nano+greatest(cost,a.reserved_nano) where month=a.month;
    update provider_budget_private.attempts set state='unknown',
      charged_nano=coalesce(charged_nano,0)+greatest(cost,a.reserved_nano) where id=p_attempt_id;
    update provider_budget_private.control set enabled=false where singleton;
    return jsonb_build_object('settled',false,'reason','bound_exceeded');
  end if;
  if a.charged_nano is not null then raise exception 'manual_reconciliation_required'; end if;
  update provider_budget_private.months set reserved_nano=reserved_nano-a.reserved_nano,charged_nano=charged_nano+cost where month=a.month;
  update provider_budget_private.attempts set state='settled',charged_nano=cost,
    settled_input_tokens=p_input_tokens,settled_output_tokens=p_output_tokens where id=p_attempt_id;
  update provider_budget_private.control set active_attempt=null where singleton and active_attempt=p_attempt_id;
  return jsonb_build_object('settled',true);
end $$;

revoke all on function public.provider_budget_reserve(uuid,bigint,bigint) from public;
revoke all on function public.provider_budget_dispatch(uuid) from public;
revoke all on function public.provider_budget_unknown(uuid) from public;
revoke all on function public.provider_budget_release(uuid) from public;
revoke all on function public.provider_budget_settle(uuid,bigint,bigint) from public;
-- Hosted databases may have default privileges for named API roles, independent
-- of PUBLIC. Explicitly remove those inherited creation-time grants too.
do $$
declare r text; signature text;
begin
  foreach r in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke all on schema provider_budget_private from %I',r);
      execute format('revoke all on all tables in schema provider_budget_private from %I',r);
      execute format('revoke all on all functions in schema provider_budget_private from %I',r);
      foreach signature in array array[
        'public.provider_budget_reserve(uuid,bigint,bigint)',
        'public.provider_budget_dispatch(uuid)', 'public.provider_budget_unknown(uuid)',
        'public.provider_budget_release(uuid)', 'public.provider_budget_settle(uuid,bigint,bigint)'
      ] loop
        execute format('revoke all on function %s from %I',signature,r);
      end loop;
    end if;
  end loop;
end $$;
-- Deployment review must explicitly grant only backend service_role EXECUTE.
-- No client/anon/authenticated grants, and no enable statement in this draft.
commit;
