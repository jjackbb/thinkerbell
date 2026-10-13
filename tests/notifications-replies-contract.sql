\set ON_ERROR_STOP on
-- Synthetic disposable Supabase PostgreSQL only; never execute against a user DB.
-- Reuses the applied public boundary fixture and real vote/like implementations.
\ir public-content-boundary-fixture.sql
create or replace function public.sync_story_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 아래 UPDATE는 카운터 보호 트리거를 통과해야 하므로 플래그를 켠다
  perform set_config('app.counter_update', 'on', true);

  if tg_op = 'INSERT' then
    update public.stories
       set "commentCount" = coalesce("commentCount", 0) + 1
     where "id" = new."storyId";
    return new;
  elsif tg_op = 'DELETE' then
    update public.stories
       set "commentCount" = greatest(0, coalesce("commentCount", 0) - 1)
     where "id" = old."storyId";
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_story_comment_count on public.comments;

create trigger trg_sync_story_comment_count
after insert or delete on public.comments
for each row execute function public.sync_story_comment_count();


insert into auth.users(id,aud,role,email) values
('11111111-1111-1111-1111-111111111111','authenticated','authenticated','fixture-owner@example.invalid'),
('22222222-2222-2222-2222-222222222222','authenticated','authenticated','fixture-commenter@example.invalid'),
('33333333-3333-3333-3333-333333333333','authenticated','authenticated','fixture-replier@example.invalid');
update public.stories s set "commentCount"=(select count(*) from public.comments c where c."storyId"=s.id);
select set_config('app.reviewed_notification_boundary_md5',md5(string_agg(pg_get_functiondef(p.oid), E'\n' order by p.oid::regprocedure::text)),false)
from pg_proc p where p.oid in ('public.read_visible_comments(text)'::regprocedure,
'public.vote_story(text,text)'::regprocedure,'public.like_comment(text,integer)'::regprocedure,
'public.sync_story_comment_count()'::regprocedure);
\ir ../backend/supabase/drafts/notifications-replies.sql

-- Deployment alone emits nothing, including historical/current-account rows.
insert into public.comments(id,"storyId","authorId") values('before-activation','ordinary','22222222-2222-2222-2222-222222222222');
do $$ begin
 if exists(select 1 from public.notification_events) then raise exception 'disabled or historical notification emitted'; end if;
 if public.notifications_enabled() then raise exception 'draft default enabled'; end if;
 if has_table_privilege('authenticated','public.notification_events','SELECT')
 or has_table_privilege('authenticated','public.notification_events','UPDATE')
 or has_function_privilege('authenticated','public.emit_notification(text,text,text,text,text,text,text,integer)','EXECUTE')
 or has_function_privilege('authenticated','public.save_comment_with_reply(text,text,uuid,text,text)','EXECUTE') then raise exception 'browser grant leak'; end if;
end $$;
update public.notification_feature_config set enabled=true;
select public.save_comment_with_reply('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ordinary','22222222-2222-2222-2222-222222222222','root');
select public.save_comment_with_reply('comment-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','ordinary','11111111-1111-1111-1111-111111111111','reply','comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select public.save_comment_with_reply('comment-cccccccc-cccc-cccc-cccc-cccccccccccc','ordinary','33333333-3333-3333-3333-333333333333','nested reply','comment-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
-- Identical ID/direct-parent retry must not create another event.
select public.save_comment_with_reply('comment-cccccccc-cccc-cccc-cccc-cccccccccccc','ordinary','33333333-3333-3333-3333-333333333333','retry ignored','comment-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$ begin
 if (select count(*) from public.notification_events)<>3 then raise exception 'recipient/self/retry dedupe failed'; end if;
 if (select "replyRootId" from public.comments where id='comment-cccccccc-cccc-cccc-cccc-cccccccccccc')<>'comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then raise exception 'nested reply root wrong'; end if;
 begin
  perform public.save_comment_with_reply('comment-cccccccc-cccc-cccc-cccc-cccccccccccc','ordinary','33333333-3333-3333-3333-333333333333','bad retry','comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  raise exception 'different parent accepted';
 exception when others then if sqlerrm<>'COMMENT_ID_CONFLICT' then raise; end if; end;
 begin
  perform public.save_comment_with_reply('comment-dddddddd-dddd-dddd-dddd-dddddddddddd','ordinary','33333333-3333-3333-3333-333333333333','wrong story','private-comment');
  raise exception 'cross story accepted';
 exception when others then if sqlerrm<>'REPLY_TARGET_NOT_FOUND' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
select public.like_comment('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1);
select public.like_comment('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',-1);
select public.like_comment('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1);
reset role;
do $$ begin
 if (select count(*) from public.notification_events where kind='comment_like')<>1 then raise exception 'relike dedupe failed'; end if;
end $$;
update public.stories set "votesA"=9 where id='ordinary';
set role authenticated;
select public.vote_story('ordinary','A');
select public.vote_story('ordinary','B');
reset role;
do $$ begin
 if (select count(*) from public.notification_events where kind='story_vote_milestone' and milestone=10)<>1 then raise exception 'vote milestone failed'; end if;
end $$;

-- Cross-owner read and update checks run with real authenticated role + claims.
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
set role authenticated;
do $$ begin
 if public.count_my_unread_notifications()<>3 then raise exception 'owner unread count wrong'; end if;
 if (select count(*) from public.read_my_notifications(1,null,null))<>1 then raise exception 'pagination limit wrong'; end if;
end $$;
select public.mark_my_notifications_read(null);
reset role;
do $$ begin
 if exists(select 1 from public.notification_events where recipient_id='11111111-1111-1111-1111-111111111111' and read_at is null) then raise exception 'own mark all failed'; end if;
 if exists(select 1 from public.notification_events where recipient_id='22222222-2222-2222-2222-222222222222' and read_at is not null) then raise exception 'cross owner mark leak'; end if;
end $$;

-- Soft delete erases body once and retains the reply group.
select public.delete_comment_with_replies('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ordinary','22222222-2222-2222-2222-222222222222');
select public.delete_comment_with_replies('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ordinary','22222222-2222-2222-2222-222222222222');
do $$ begin
 if (select content from public.comments where id='comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')<>'' then raise exception 'tombstone body retained'; end if;
 if (select "commentCount" from public.stories where id='ordinary')<>(select count(*) from public.comments where "storyId"='ordinary' and "deletedAt" is null) then raise exception 'soft-delete count mismatch'; end if;
 begin perform public.like_comment('comment-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',1); raise exception 'tombstone like allowed';
 exception when others then if sqlerrm<>'COMMENT_NOT_FOUND' then raise; end if; end;
end $$;
select public.save_comment_with_reply('comment-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','ordinary','33333333-3333-3333-3333-333333333333','live reply under tombstone','comment-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Existing authorized story DELETE still cascades all roots/replies/events.
set role authenticated;
delete from public.stories where id='ordinary' and "authorId"='11111111-1111-1111-1111-111111111111';
reset role;
do $$ begin
 if exists(select 1 from public.comments where "storyId"='ordinary') or exists(select 1 from public.notification_events where story_id='ordinary') then raise exception 'story cascade failed'; end if;
end $$;
-- Also run separate concurrent-session checks before rollout: simultaneous first
-- votes at thresholds, same-ID creates, delete/reply race, private-switch/reply race,
-- reads/mark-all vs new event commit. This single-session fixture cannot prove them.
