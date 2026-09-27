-- REVIEW DRAFT ONLY. Apply after the updated vote_story function and the
-- server save paths are verified. This migration changes what direct REST and
-- Realtime subscribers can read; test with two real accounts before enabling
-- the author's visibility button.

alter table public.stories
  add column if not exists visibility text not null default 'public';
alter table public.stories
  add constraint stories_visibility_check
  check (visibility in ('public', 'private'));

-- Raw story/comment rows are visible to everyone only while the story is
-- public and not hidden by moderation. The author can inspect their own row,
-- including existing comments, after choosing private.
drop policy if exists stories_select_public on public.stories;
create policy stories_select_visible on public.stories
  for select to anon, authenticated
  using (
    "authorId" = (select auth.uid())::text or
    (visibility = 'public' and not coalesce("isBlind", false)
      and not coalesce("isAdult", false) and not coalesce("isHidden", false))
  );
drop policy if exists comments_select_public on public.comments;
create policy comments_select_visible on public.comments
  for select to anon, authenticated
  using (exists (
    select 1 from public.stories s where s.id = "storyId"
  ));

-- An ID-only INSERT lets a browser that already held a public story remove it
-- after the RLS-filtered UPDATE becomes invisible. No title, body, comment, or
-- author is copied into this table.
create table if not exists public.story_access_invalidations (
  id bigint generated always as identity primary key,
  story_id text not null,
  changed_at timestamptz not null default now()
);
create index if not exists story_access_invalidations_changed_at_idx
  on public.story_access_invalidations(changed_at);
alter table public.story_access_invalidations enable row level security;
revoke all on public.story_access_invalidations from public, anon, authenticated;
grant select on public.story_access_invalidations to anon, authenticated;
create policy story_access_invalidations_read on public.story_access_invalidations
  for select to anon, authenticated using (true);

create or replace function public.notify_story_access_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.story_access_invalidations(story_id)
      values (old.id);
  elsif old.visibility is distinct from new.visibility
      or old."isBlind" is distinct from new."isBlind"
      or old."isAdult" is distinct from new."isAdult"
      or old."isHidden" is distinct from new."isHidden" then
    insert into public.story_access_invalidations(story_id)
      values (old.id);
  end if;
  return null;
end;
$$;
revoke all on function public.notify_story_access_change()
  from public, anon, authenticated;
drop trigger if exists story_access_invalidation on public.stories;
create trigger story_access_invalidation
  after update of visibility, "isBlind", "isAdult", "isHidden" or delete on public.stories
  for each row execute function public.notify_story_access_change();

do $$
begin
  if not exists (select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'story_access_invalidations') then
    execute 'alter publication supabase_realtime add table public.story_access_invalidations';
  end if;
end;
$$;

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

-- A server-side pre-check and the room INSERT are separate REST calls. Lock
-- the parent row inside INSERT so a concurrent private switch cannot let a
-- different user's new room through. Existing rooms are never touched.
create or replace function public.enforce_new_ai_room_story_access()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_story public.stories;
begin
  select * into v_story from public.stories
    where id = new."storyId" for share;
  if not found or coalesce(v_story."isBlind", false)
      or coalesce(v_story."isAdult", false)
      or coalesce(v_story."isHidden", false)
      or (v_story.visibility = 'private'
        and v_story."authorId" <> new."userId"::text) then
    raise exception 'STORY_NOT_FOUND';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_new_ai_room_story_access()
  from public, anon, authenticated;
drop trigger if exists ai_room_story_access on public.ai_personas;
create trigger ai_room_story_access before insert on public.ai_personas
  for each row execute function public.enforce_new_ai_room_story_access();

create or replace function public.increment_story_view(p_story_id text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.set_config('app.counter_update', 'on', true);
  update public.stories set "viewCount" = coalesce("viewCount", 0) + 1
    where id = p_story_id and visibility = 'public'
      and not coalesce("isBlind", false)
      and not coalesce("isAdult", false)
      and not coalesce("isHidden", false);
end;
$$;

create or replace function public.submit_report(
  p_target_type text, p_target_id text, p_reason text default ''
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_today integer;
  v_unique integer;
  v_views integer;
  v_blind boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_target_type not in ('story','comment') or p_target_id is null then
    raise exception 'INVALID_REPORT_TARGET';
  end if;

  -- The definer role can see private rows. Check visibility before reading
  -- counters or returning any result; row locks serialize a concurrent change.
  if p_target_type = 'story' then
    select coalesce(s."viewCount",0) into v_views from public.stories s
      where s.id = p_target_id and s.visibility = 'public'
        and not coalesce(s."isBlind",false)
        and not coalesce(s."isAdult",false)
        and not coalesce(s."isHidden",false)
      for update;
  else
    select coalesce(s."viewCount",0) into v_views
      from public.comments c join public.stories s on s.id=c."storyId"
      where c.id = p_target_id and s.visibility = 'public'
        and not coalesce(c."isBlind",false)
        and not coalesce(s."isBlind",false)
        and not coalesce(s."isAdult",false)
        and not coalesce(s."isHidden",false)
      for update of c,s;
  end if;
  if not found then raise exception 'REPORT_TARGET_NOT_FOUND'; end if;

  select count(*) into v_today from public.reports
    where "reporterId" = v_user and "createdAt" > now() - interval '1 day';
  if v_today >= 10 then raise exception 'REPORT_DAILY_LIMIT'; end if;
  if exists (select 1 from public.reports
      where "targetType"=p_target_type and "targetId"=p_target_id
        and "reporterId"=v_user) then
    raise exception 'REPORT_ALREADY_SUBMITTED';
  end if;
  insert into public.reports("targetType","targetId","reporterId","reason")
    values(p_target_type,p_target_id,v_user,coalesce(p_reason,''));
  select count(*) into v_unique from public.reports
    where "targetType"=p_target_type and "targetId"=p_target_id;
  perform pg_catalog.set_config('app.counter_update','on',true);
  if p_target_type = 'story' then
    v_blind := (v_unique >= 5)
      or (v_unique >= 3 and v_views >= 10 and v_unique::numeric/v_views >= 0.05);
    update public.stories set "reportsCount"=v_unique, "isBlind"=v_blind
      where id=p_target_id;
  else
    v_blind := v_unique >= 3;
    update public.comments set "reportsCount"=v_unique, "isBlind"=v_blind
      where id=p_target_id;
  end if;
  return jsonb_build_object('reports',v_unique,'blinded',v_blind);
end;
$$;
revoke all on function public.submit_report(text,text,text) from public, anon;
grant execute on function public.submit_report(text,text,text) to authenticated;

-- Id-only signals do not need to live as long as the hidden story. Keep enough
-- history for a reconnect audit, then delete old rows in the daily job.
create or replace function public.purge_story_access_invalidations(
  p_now timestamptz default now()
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare v_deleted integer;
begin
  delete from public.story_access_invalidations
    where changed_at <= p_now - interval '30 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.purge_story_access_invalidations(timestamptz)
  from public, anon, authenticated;
grant execute on function public.purge_story_access_invalidations(timestamptz)
  to service_role;
