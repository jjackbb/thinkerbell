-- Account-scoped comment likes. The user chose to reset the 31 legacy counts
-- because those counts have no recoverable account history.
-- The old like_comment(text, integer) signature remains compatible with
-- previously deployed clients: +1 means ensure liked, -1 ensure unliked.

do $$
declare
  v_total bigint;
  v_positive bigint;
  v_sum bigint;
  v_max bigint;
begin
  if to_regclass('public.comment_likes') is not null then
    raise exception 'comment_likes already exists; inspect before applying';
  end if;
  select count(*),
         count(*) filter (where coalesce("likeCount", 0) > 0),
         coalesce(sum("likeCount"), 0),
         coalesce(max("likeCount"), 0)
    into v_total, v_positive, v_sum, v_max
    from public.comments;
  if (v_total, v_positive, v_sum, v_max) is distinct from (21::bigint, 3::bigint, 31::bigint, 16::bigint) then
    raise exception 'legacy comment-like counts changed; inspect before resetting';
  end if;
end;
$$;

create table public.comment_likes (
  comment_id text not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_likes_pkey primary key (comment_id, user_id)
);

create index comment_likes_user_idx on public.comment_likes (user_id);
alter table public.comment_likes enable row level security;

revoke all on table public.comment_likes from public, anon, authenticated;
grant select on table public.comment_likes to authenticated;

create policy comment_likes_select_own on public.comment_likes
  for select to authenticated using (user_id = (select auth.uid()));

-- Caller-supplied p_delta expresses the desired state, never an arithmetic
-- increment. The comment lock serializes concurrent toggles and count sync.
create or replace function public.like_comment(p_comment_id text, p_delta integer)
returns public.comments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_comment public.comments;
begin
  if v_user is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_delta not in (1, -1) then
    raise exception '공감 상태가 올바르지 않습니다.';
  end if;

  -- Lock both rows so a future private-state update cannot race this write.
  -- to_jsonb keeps the check compatible until stories.visibility is added.
  select c.* into v_comment
    from public.comments c
    join public.stories s on s.id = c."storyId"
   where c.id = p_comment_id
     and not coalesce(c."isBlind", false)
     and not coalesce(s."isBlind", false)
     and not coalesce(s."isAdult", false)
     and not coalesce(s."isHidden", false)
     and coalesce(to_jsonb(s)->>'visibility', 'public') = 'public'
   for update of c, s;
  if not found then
    raise exception '댓글을 찾을 수 없습니다.';
  end if;

  if p_delta = 1 then
    insert into public.comment_likes (comment_id, user_id)
    values (p_comment_id, v_user)
    on conflict (comment_id, user_id) do nothing;
  else
    delete from public.comment_likes
     where comment_id = p_comment_id and user_id = v_user;
  end if;

  perform set_config('app.counter_update', 'on', true);
  update public.comments c
     set "likeCount" = (
       select count(*)::integer from public.comment_likes cl
        where cl.comment_id = p_comment_id
     )
   where c.id = p_comment_id
  returning c.* into v_comment;

  return v_comment;
end;
$$;

revoke all on function public.like_comment(text, integer) from public, anon, authenticated;
grant execute on function public.like_comment(text, integer) to authenticated;

-- Old counters did not correspond to any account. No comment content changes.
do $$
begin
  perform set_config('app.counter_update', 'on', true);
  update public.comments set "likeCount" = 0 where coalesce("likeCount", 0) <> 0;
end;
$$;
