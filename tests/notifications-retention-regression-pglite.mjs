// Disposable embedded PostgreSQL validation only. No production connection accepted.
// Optional test dependency, intentionally absent from application package.json/lock:
// npm install --prefix /tmp/thinkerbell-pglite @electric-sql/pglite@0.5.9 --ignore-scripts --cache /tmp/thinkerbell-npm-cache
// PGLITE_PACKAGE_ROOT=/tmp/thinkerbell-pglite/node_modules/@electric-sql/pglite node tests/notifications-retention-regression-pglite.mjs
// Does NOT prove multi-session locks, deployed Supabase/PostgREST, or browser behavior.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const packageRoot=process.env.PGLITE_PACKAGE_ROOT;
if(!packageRoot)throw new Error('Set PGLITE_PACKAGE_ROOT to an isolated @electric-sql/pglite@0.5.9 installation');
const version=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8')).version;
if(version!=='0.5.9')throw new Error(`Expected validated PGlite 0.5.9, got ${version}`);
const {PGlite}=await import(pathToFileURL(path.join(packageRoot,'dist/index.js')).href);
const repo=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(repo+p,'utf8');
const mig=p=>read('backend/supabase/migrations/'+p+'.sql');
const db=new PGlite();
const run=async(label,sql)=>{try{await db.exec(sql);console.log('PASS',label)}catch(e){console.error('FAIL',label,e.message);throw e}};
await run('auth fixture',`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$; grant usage on schema auth,public to anon,authenticated,service_role; grant execute on all functions in schema auth to anon,authenticated,service_role; create publication supabase_realtime;`);
console.log((await db.query('select version()')).rows);
await run('initial schema',mig('00000000000000_init_schema'));
await run('tighten RLS and counter triggers',mig('20260817000000_tighten_rls'));
await run('vote baseline',mig('20260817020000_votes_table'));
await run('anonymous ID trigger',mig('20260818000000_comment_anon_id'));
// Extract original DDL from historical migration; omit its production row-count preflight and historical destructive reset.
const likes=mig('20260925075943_comment_likes_account_scoped');
await run('account-like table and RLS',likes.slice(likes.indexOf('create table public.comment_likes'),likes.indexOf('-- Caller-supplied')));
await run('like cascade triggers and RPC',mig('20260925080558_sync_comment_like_cascades'));
await run('idempotent vote RPC',mig('20260928063258_vote_story_idempotent_first_vote_lock'));
// Extra story columns existed in deployed boundary but are absent from initial historical schema.
await run('fixture historical supplemental columns',`alter table public.stories add column "appealStatus" text, add column "appealText" text, add column "appealedAt" text; create table public.ai_personas (id text primary key,"storyId" text,"userId" uuid); create table public.reports(id serial primary key,"targetType" text,"targetId" text,"reporterId" uuid,reason text,"createdAt" timestamptz default now());`);
await run('private-story boundary and insert guards',mig('20260928063512_story_author_private_access_boundary'));
await run('closed browser write policies fixture',`drop policy stories_insert_own on public.stories; drop policy stories_update_own on public.stories; drop policy comments_insert_own on public.comments; drop policy comments_update_own on public.comments; grant select,insert,update,delete on public.stories,public.comments to authenticated;`);
await run('actual projected public boundary',read('docs/plan-execution/sql/public-content-boundary-draft.sql'));
await run('fixture assumption: existing deployed cascade FK',`alter table public.comments add constraint fixture_story_fk foreign key("storyId") references public.stories(id) on delete cascade`);
// Verify an unreviewed boundary fails before creating any notification table.
try { await db.exec(read('backend/supabase/drafts/notifications-replies.sql'));throw Error('Expected boundary fingerprint rejection'); } catch(e) { if(!/REVIEWED_BOUNDARY_FINGERPRINT_REQUIRED/.test(e.message))throw e;await db.exec('rollback');console.log('PASS missing reviewed fingerprint rejected atomically'); }
if((await db.query("select to_regclass('public.notification_events') as n")).rows[0].n!==null)throw Error('failed draft left a table');
await run('reviewed fingerprint of fixture',`select set_config('app.reviewed_notification_boundary_md5',md5(string_agg(pg_get_functiondef(p.oid), E'\n' order by p.oid::regprocedure::text)),false) from pg_proc p where p.oid in ('public.read_visible_comments(text)'::regprocedure,'public.vote_story(text,text)'::regprocedure,'public.like_comment(text,integer)'::regprocedure,'public.sync_story_comment_count()'::regprocedure);`);
const draft=read('backend/supabase/drafts/notifications-replies.sql');
const crypto=await import('node:crypto');console.log('DRAFT_SHA256',crypto.createHash('sha256').update(draft).digest('hex'));
await run('UNMODIFIED notification draft',read('backend/supabase/drafts/notifications-replies.sql'));

// Extend the synthetic baseline to the actual deployed AI completion schema.
await run('AI room baseline columns',`alter table public.ai_personas add column name text,add column role text,add column category text,add column "avatarIcon" text,add column description text,add column "systemInstruction" text,add column "cardColor" text,add column "sampleFirstMessage" text,add column "isPinned" boolean not null default false,add column opening text,add column ratio text,add column "chatHistory" jsonb not null default '[]',add column "createdAt" timestamptz not null default now(),add column "updatedAt" timestamptz not null default now();alter table public.ai_personas enable row level security;grant select,insert,update on public.ai_personas to service_role;create policy ai_personas_select_own on public.ai_personas for select to authenticated using("userId"=auth.uid());create policy ai_personas_delete_own on public.ai_personas for delete to authenticated using("userId"=auth.uid());grant select,delete on public.ai_personas to authenticated;grant select on public.stories to service_role;create table public.story_hides(user_id uuid not null,story_id text not null);grant select on public.story_hides to service_role;create table public.ai_chat_usage(id uuid primary key,"userId" uuid not null,"storyId" text,"usedAt" timestamptz not null,"usedOn" date not null);grant select,insert on public.ai_chat_usage to service_role;`);
await run('actual AI room uniqueness',mig('20260928063627_ai_room_choice_unique'));
await run('actual quota reservations',mig('20260928063643_ai_quota_reservations_and_completion_state'));
await run('actual quota preservation',mig('20260929203532_preserve_ai_quota_after_room_delete'));
await run('actual AI completion',mig('20260928063805_ai_turn_completion_atomic'));
await run('actual AI feedback',mig('20260928063823_ai_feedback_private_monthly_totals'));

await db.exec(`select set_config('app.reviewed_ai_completion_md5',md5(pg_get_functiondef('public.complete_ai_turn(uuid,text,uuid,text,text,timestamptz,timestamptz)'::regprocedure)),false)`);
const boundaryHash=(await db.query(read('backend/supabase/drafts/ai-retention-preflight.sql').split(';')[0])).rows[0].md5;await db.query("select set_config('app.reviewed_ai_retention_boundary_md5',$1,false)",[boundaryHash]);
await run('AI retention draft before notification regression',read('backend/supabase/drafts/ai-retention-notifications.sql'));
const A='11111111-1111-1111-1111-111111111111',B='22222222-2222-2222-2222-222222222222',C='33333333-3333-3333-3333-333333333333';
const cid=n=>'comment-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
let passed=0;
const check=async(label,sql)=>{const r=await db.query(sql);if(r.rows[0].ok!==true)throw Error(label+' '+JSON.stringify(r.rows));console.log('PASS',label);passed++};
const rejects=async(label,sql,pattern)=>{let err;try{await db.exec(sql)}catch(e){err=e}if(!err||!pattern.test(err.message))throw Error(label+' expected '+pattern+' got '+err?.message);console.log('PASS',label,err.message);passed++};
const as=async(role,id='')=>db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false),set_config('request.jwt.claim.role','${role}',false); set role ${role};`);
const save=(n,actor,reply=null,story='s')=>`select public.save_comment_with_reply('${cid(n)}','${story}','${actor}','synthetic text',${reply?"'"+cid(reply)+"'":'null'});`;
await run('synthetic users/stories',`insert into auth.users values('${A}'),('${B}'),('${C}');insert into public.stories(id,"authorId","authorNickname",title,body,category,"createdAt") values('s','${A}','fixture','fixture','fixture','fixture','2026-10-13'),('other','${C}','fixture','fixture','fixture','fixture','2026-10-13');`);
await as('service_role');
await rejects('disabled create gated',save(1,B),/FEATURE_UNAVAILABLE/);
await as('authenticated',A);
await rejects('disabled inbox gated','select * from public.read_my_notifications()',/FEATURE_UNAVAILABLE/);
await rejects('raw events inaccessible','select * from public.notification_events',/permission denied/);
await rejects('raw dedupe inaccessible','select * from public.notification_dedupe',/permission denied/);
await rejects('authenticated cannot service create',save(1,B),/permission denied/);
await rejects('internal like inaccessible',`select public.like_comment_boundary_internal('x',1)`,/permission denied/);
await as('postgres');
await run('disabled legacy insert',`insert into public.comments(id,"storyId","authorId","anonymousId",content,"createdAt") values('legacy','s','${B}','ignored','legacy','2026-10-13');`);
await check('disabled emits nothing',`select count(*)=0 ok from public.notification_events`);
await run('enable disposable feature only','update public.notification_feature_config set enabled=true');
await as('service_role');await run('root create',save(1,B));await run('idempotent root retry',save(1,B));
await as('postgres');await check('retry exact comment count',`select "commentCount"=2 ok from public.stories where id='s'`);await check('retry one delivery',`select count(*)=1 ok from public.notification_events`);
await as('service_role');await run('reply by third user',save(2,C,1));await run('reply to reply flattened',save(3,A,2));await run('owner target reply deduped',save(4,B,3));
await rejects('cross-story reply refused',save(5,B,1,'other'),/REPLY_TARGET_NOT_FOUND/);
await rejects('id collision refused',save(1,C),/COMMENT_ID_CONFLICT/);
await as('postgres');await check('flattened root',`select "replyRootId"='${cid(1)}' and "replyToId"='${cid(2)}' ok from public.comments where id='${cid(3)}'`);
await check('direct reply + owner recipients',`select count(*)=2 and bool_and(recipient_id in ('${A}','${B}')) ok from public.notification_events where comment_id='${cid(2)}'`);
await check('owner actor suppression',`select count(*)=1 and bool_and(recipient_id='${C}') ok from public.notification_events where comment_id='${cid(3)}'`);
await check('owner same target only reply',`select count(*)=1 and bool_and(kind='comment_reply') ok from public.notification_events where comment_id='${cid(4)}'`);
await as('authenticated',C);await run('like wrapper JSONB',`select public.like_comment('${cid(1)}',1)`);await run('like retry',`select public.like_comment('${cid(1)}',1)`);await run('unlike',`select public.like_comment('${cid(1)}',-1)`);await run('relike',`select public.like_comment('${cid(1)}',1)`);
await as('postgres');await check('once ever like delivery',`select count(*)=1 ok from public.notification_events where kind='comment_like'`);await check('exact like count',`select "likeCount"=1 ok from public.comments where id='${cid(1)}'`);
await as('authenticated',B);await run('self like suppressed',`select public.like_comment('${cid(1)}',1)`);
await as('postgres');await check('self like no event',`select count(*)=1 ok from public.notification_events where kind='comment_like'`);
await as('authenticated',A);await check('own inbox only',`select count(*)=3 ok from public.read_my_notifications()`);await check('own count',`select public.count_my_unread_notifications()=3 ok`);
await as('postgres');const otherId=(await db.query(`select id from public.notification_events where recipient_id='${B}' limit 1`)).rows[0].id;
await as('authenticated',A);await run('mark foreign id harmless',`select public.mark_my_notifications_read('${otherId}')`);
await as('postgres');await check('foreign read state intact',`select read_at is null ok from public.notification_events where id='${otherId}'`);
await as('authenticated',A);await run('mark own all',`select public.mark_my_notifications_read()`);await check('own unread cleared',`select public.count_my_unread_notifications()=0 ok`);
await rejects('cursor pairing enforced',`select * from public.read_my_notifications(21,now(),null)`,/INVALID_NOTIFICATION_PAGE/);
await rejects('page limits enforced',`select * from public.read_my_notifications(52)`,/INVALID_NOTIFICATION_PAGE/);
await as('authenticated',B);await rejects('browser hard delete blocked',`delete from public.comments where id='${cid(1)}'`,/USE_COMMENT_DELETE_API/);
await as('service_role');await run('soft delete root',`select public.delete_comment_with_replies('${cid(1)}','s','${B}')`);await run('delete retry',`select public.delete_comment_with_replies('${cid(1)}','s','${B}')`);await rejects('reply to tombstone blocked',save(6,C,1),/REPLY_TARGET_NOT_FOUND/);await run('reply to live child under tombstone allowed',save(7,C,2));
await as('authenticated',C);await rejects('tombstone already-liked call blocked',`select public.like_comment('${cid(1)}',1)`,/COMMENT_NOT_FOUND/);
await as('anon');await check('anonymous tombstone projection',`select (item->>'content')='' and (item->>'anonymousId')='삭제된 댓글' and (item->>'likeCount')='0' ok from public.read_visible_comments('s') item where item->>'id'='${cid(1)}'`);
await rejects('anonymous inbox denied','select * from public.read_my_notifications()',/permission denied/);
await as('postgres');await check('live comment count exact after retry delete',`select s."commentCount"=(select count(*) from public.comments c where c."storyId"=s.id and c."deletedAt" is null) ok from public.stories s where s.id='s'`);
await as('authenticated',B);await check('deleted target omitted from inbox',`select not exists(select 1 from public.read_my_notifications() item where item->>'commentId'='${cid(1)}') ok`);
await as('postgres');await run('blind live comment',`select set_config('app.counter_update','on',false);update public.comments set "isBlind"=true where id='${cid(2)}'`);
await as('authenticated',A);await check('blind target omitted',`select not exists(select 1 from public.read_my_notifications() item where item->>'commentId'='${cid(2)}') ok`);
await as('postgres');await run('unblind live comment',`update public.comments set "isBlind"=false where id='${cid(2)}'`);
await as('anon');await check('projection excludes raw private fields',`select bool_and(not (item ? 'reportsCount') and not (item ? 'future_secret')) ok from public.read_visible_comments('s') item`);
await as('postgres');
await run('set private story',`update public.stories set visibility='private' where id='s'`);
await as('authenticated',B);await check('private other-user notifications hidden',`select count(*)=0 ok from public.read_my_notifications()`);await check('private other unread hidden',`select public.count_my_unread_notifications()=0 ok`);
await as('postgres');await run('restore public',`update public.stories set visibility='public' where id='s'`);
// Actual vote RPC thresholds, retries and side changes. Synthetic vote actors are real fixture auth users.
for(let i=4;i<=203;i++){const id='00000000-0000-4000-8000-'+String(i).padStart(12,'0');await as('postgres');await db.exec(`insert into auth.users values('${id}')`);await as('authenticated',id);await db.exec(`select public.vote_story('s','A')`);if(i===13){await db.exec(`select public.vote_story('s','A');select public.vote_story('s','B')`);}}
await as('postgres');await check('milestones 10 through 90 then 100/200',`select array_agg(milestone order by milestone)=array[10,20,30,40,50,60,70,80,90,100,200] ok from public.notification_events where kind='story_vote_milestone'`);await check('vote retry and change exact',`select "votesA"=199 and "votesB"=1 ok from public.stories where id='s'`);
await run('drop milestone below threshold then recross',`begin;select set_config('app.counter_update','on',true);select set_config('request.jwt.claim.sub','${C}',true);update public.stories set "votesA"=198 where id='s';update public.stories set "votesA"=199 where id='s';commit;`);
await check('recross threshold still once-ever',`select count(*)=1 ok from public.notification_events where kind='story_vote_milestone' and milestone=200`);
await as('authenticated',A);const page1=(await db.query('select * from public.read_my_notifications(2)')).rows.map(r=>r.read_my_notifications);const page2=(await db.query('select * from public.read_my_notifications(2,$1,$2)',[page1.at(-1).createdAt,page1.at(-1).id])).rows.map(r=>r.read_my_notifications);if(page1.length!==2||page2.length!==2||page2.some(n=>page1.some(p=>p.id===n.id)))throw Error('pagination failed');console.log('PASS stable cursor pagination without duplicates');passed++;
await as('postgres');await run('simulate delivery retention only in disposable fixture',`delete from public.notification_events where kind='comment_like';`);await as('authenticated',C);await run('new live like',`select public.like_comment('${cid(2)}',1);select public.like_comment('${cid(2)}',-1)`);await as('postgres');await db.exec(`delete from public.notification_events where kind='comment_like'`);await as('authenticated',C);await run('relike after retained delivery removal',`select public.like_comment('${cid(2)}',1)`);await as('postgres');await check('ledger dedupe survives delivery removal',`select count(*)=0 ok from public.notification_events where kind='comment_like'`);
// Table RLS tested with a temporary SELECT grant inside a rolled-back transaction, never changing durable fixture grants.
await db.exec('begin; grant select on public.notification_events to authenticated;');await as('authenticated',B);await check('RLS ownership with temporary table privilege',`select bool_and(recipient_id='${B}') ok from public.notification_events`);await as('postgres');await db.exec('rollback');

await as('authenticated',A);await run('owner story delete cascades reply group',`delete from public.stories where id='s'`);
await as('postgres');await check('cascade removes comment tree and events',`select not exists(select 1 from public.comments where "storyId"='s') and not exists(select 1 from public.notification_events where story_id='s') ok`);
console.log('BEHAVIOR ASSERTIONS',passed);await db.close();
