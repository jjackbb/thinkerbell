-- Keep likeCount equal to account-scoped rows even when auth.users deletion
-- cascades to comment_likes outside the like_comment RPC.

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comment_id text := case when tg_op = 'DELETE' then old.comment_id else new.comment_id end;
begin
  perform set_config('app.counter_update', 'on', true);
  update public.comments c
     set "likeCount" = (
       select count(*)::integer from public.comment_likes cl
        where cl.comment_id = v_comment_id
     )
   where c.id = v_comment_id;
  return null;
end;
$$;

revoke all on function public.sync_comment_like_count() from public, anon, authenticated;

create trigger trg_sync_comment_like_count
after insert or delete on public.comment_likes
for each row execute function public.sync_comment_like_count();

-- The trigger updates the count when a row changes. Idempotent requests
-- leave the count as-is and still return the saved row to the caller.
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

  select * into v_comment from public.comments where id = p_comment_id;
  return v_comment;
end;
$$;

revoke all on function public.like_comment(text, integer) from public, anon, authenticated;
grant execute on function public.like_comment(text, integer) to authenticated;
