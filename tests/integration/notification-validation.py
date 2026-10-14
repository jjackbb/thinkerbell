#!/usr/bin/env python3
"""Disposable Docker/PostgREST and genuinely separate PostgreSQL sessions. No remote DB input."""
import base64, concurrent.futures, hashlib, hmac, ipaddress, json, os, pathlib, re, secrets, shutil, subprocess, sys, time, urllib.request, urllib.error
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'validation-results' / 'database'
OUT.mkdir(parents=True, exist_ok=True)
PREFIX = 'thinkerbell-validation-' + secrets.token_hex(6)
DB, API, NET = PREFIX+'-db', PREFIX+'-api', PREFIX+'-net'
PASSWORD, JWT = secrets.token_hex(24), secrets.token_hex(32)
OWNER='11111111-1111-1111-1111-111111111111'
OTHER='22222222-2222-2222-2222-222222222222'
THIRD='33333333-3333-3333-3333-333333333333'
PG_IMAGE='public.ecr.aws/supabase/postgres:17.6.1.171'
REST_IMAGE='public.ecr.aws/supabase/postgrest:v16.3'
HTTP=urllib.request.build_opener(urllib.request.ProxyHandler({}))
results=[]
pool=concurrent.futures.ThreadPoolExecutor(max_workers=4)
# Ignore inherited remote Docker settings. Never read .env or accept a database URL.
ENV={k:v for k,v in os.environ.items() if not k.startswith(('DOCKER_','PG','PGRST_','SUPABASE_'))}
ENV['DOCKER_HOST']='unix:///var/run/docker.sock'
def cmd(*args, **kw):
    return subprocess.run(args, env=ENV, text=True, capture_output=True, check=True, timeout=180, **kw).stdout.strip()
def docker(*args, **kw): return cmd('docker', *args, **kw)
def sql(statement, app='validation'):
    return docker('exec','-i','-e','PGAPPNAME='+app, DB,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1', input=statement)
def sanitized(text):
    text=text.replace(PASSWORD,'[redacted]').replace(JWT,'[redacted]')
    return re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[redacted JWT]',text)
def report_container_diagnostics():
    # Never inspect Config.Env. Keep exited API containers until finally cleanup so
    # startup failures retain their state and logs, rather than hiding their cause.
    for name in [DB,API]:
        try:
            state=docker('inspect','--format','{{json .State}}',name)
            ports=docker('inspect','--format','{{json .NetworkSettings.Ports}}',name)
            log=subprocess.run(['docker','logs','--tail','40',name],env=ENV,text=True,
                               capture_output=True,timeout=10)
            print(sanitized('DIAGNOSTIC '+name+' state='+state+' ports='+ports+'\n'+log.stdout+log.stderr),file=sys.stderr)
        except Exception:
            pass  # A missing container adds no information; the original error remains fatal.
def internal_rest_url():
    # Docker deliberately skips published-port programming on internal-only
    # networks (moby v28.5.1 libnetwork/endpoint.go, !n.internal guard).
    # Linux hosts can reach their internal bridge directly. Accept only the exact
    # new container's inspected address on our one fresh internal bridge; no URL input.
    if sys.platform!='linux': raise RuntimeError('Direct internal-bridge validation requires Linux')
    meta=json.loads('['+docker('inspect','--format',
        '{{json .Id}},{{json .Name}},{{json .State.Running}},{{json .NetworkSettings.Networks}},{{json .HostConfig.PortBindings}}',API)+']')
    container_id,name,running,networks,bindings=meta
    if not container_id or name!='/'+API or not running: raise RuntimeError('PostgREST container is not running')
    if bindings or set(networks)!={NET}: raise RuntimeError('PostgREST must have no host port bindings and exactly the fresh internal network')
    net=json.loads(docker('network','inspect',NET))[0]
    endpoint=networks[NET]
    if not net.get('Id') or net.get('Name')!=NET or net.get('Internal') is not True or net.get('Driver')!='bridge' or endpoint.get('NetworkID')!=net.get('Id'):
        raise RuntimeError('PostgREST network identity/isolation mismatch')
    if (net.get('Options') or {}).get('com.docker.network.bridge.gateway_mode_ipv4')=='isolated':
        raise RuntimeError('Internal bridge has no host gateway; direct access unsupported')
    member=net.get('Containers',{}).get(container_id,{})
    address=ipaddress.IPv4Address(endpoint.get('IPAddress',''))
    allowed=[ipaddress.IPv4Network(cidr) for cidr in ['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16']]
    subnets=[ipaddress.ip_network(c['Subnet']) for c in net.get('IPAM',{}).get('Config',[]) if c.get('Subnet')]
    if not any(address in subnet for subnet in allowed) or not any(address in subnet for subnet in subnets if subnet.version==4):
        raise RuntimeError('PostgREST address is outside the fresh private network')
    if member.get('Name')!=API or ipaddress.ip_interface(member.get('IPv4Address','')).ip!=address:
        raise RuntimeError('PostgREST address is not assigned to the exact fresh container')
    return 'http://'+str(address)+':3000'
def wait_for_final_postgres():
    # This image uses docker-library's temporary socket-only server while running
    # /docker-entrypoint-initdb.d. Socket SELECT 1 can race those migrations.
    # Require final-server TCP readiness AND a successful authenticated TCP query.
    # Source: supabase/postgres tag 17.6.1.171 Dockerfile-17, entrypoint pinned to
    # docker-library/postgres 6edb0a8c4def40c371514b34aef9037ec82d9110
    # (17/alpine3.23/docker-entrypoint.sh: listen_addresses='' during bootstrap).
    deadline=time.monotonic()+120
    while time.monotonic()<deadline:
        try:
            docker('exec',DB,'pg_isready','-h','127.0.0.1','-p','5432',
                   '-U','postgres','-d','postgres','-t','2')
            ready=docker('exec','-e','PGPASSWORD='+PASSWORD,'-e','PGCONNECT_TIMEOUT=2',
                         DB,'psql','-X','-w','-qAt','-h','127.0.0.1','-p','5432',
                         '-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1',
                         '-c','select 1')
            if ready=='1': return
        except subprocess.CalledProcessError:
            pass  # Only readiness probes retry; fixture SQL errors remain fatal.
        time.sleep(.5)
    raise RuntimeError('PostgreSQL final TCP server readiness timeout')
def check(name, condition):
    if not condition: raise AssertionError(name)
    results.append('PASS: '+name); print(results[-1], flush=True)
def scalar(statement): return sql(statement).splitlines()[-1]
def session(statement):
    p=subprocess.Popen(['docker','exec','-i',DB,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],env=ENV,text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    p.stdin.write("begin; set local statement_timeout='20s'; "+statement+"; select 'LOCK_READY';\n"); p.stdin.flush()
    # OS-level process watchdog prevents a malformed fixture hanging CI indefinitely.
    import select
    deadline=time.monotonic()+20
    buffer=b''
    while time.monotonic()<deadline:
        if select.select([p.stdout],[],[],1)[0]:
            buffer += os.read(p.stdout.fileno(),65536)
            if b'LOCK_READY' in buffer: return p
        if p.poll() is not None: raise RuntimeError('lock holder exited: '+p.stderr.read())
    p.kill(); raise TimeoutError('lock holder not ready')
def release(p, statement='commit'):
    p.stdin.write(statement+';\n'); p.stdin.close(); p.wait(timeout=30)
    if p.returncode: raise RuntimeError(p.stderr.read())
def blocked(app):
    for _ in range(100):
        if scalar("select exists(select 1 from pg_stat_activity where application_name='"+app+"' and wait_event_type='Lock')")=='t': return
        time.sleep(.05)
    raise AssertionError('separate session did not block: '+app)
def token(user):
    enc=lambda v:base64.urlsafe_b64encode(json.dumps(v,separators=(',',':')).encode()).rstrip(b'=')
    payload=enc({'alg':'HS256','typ':'JWT'})+b'.'+enc({'role':'authenticated','sub':user,'exp':int(time.time())+600})
    return (payload+b'.'+base64.urlsafe_b64encode(hmac.new(JWT.encode(),payload,hashlib.sha256).digest()).rstrip(b'=')).decode()
def rest(path,user=OWNER,data=None,method=None,timeout=15):
    req=urllib.request.Request(URL+path, data=None if data is None else json.dumps(data).encode(), headers={'Authorization':'Bearer '+token(user),'Content-Type':'application/json'},method=method)
    try:
        with HTTP.open(req,timeout=timeout) as r: return r.status,json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e: return e.code,json.loads(e.read() or b'null')
def complete(room,request='aaaaaaaa-1234-4234-8234-123456789abc'):
    return f"select public.complete_ai_turn('{OWNER}','{room}','{request}','synthetic prompt','synthetic answer',now(),'2099-01-01 00:00+09');"
try:
    if not shutil.which('docker') or not pathlib.Path('/var/run/docker.sock').exists():
        raise RuntimeError('NOT_RUN: local Docker engine unavailable')
    docker('info','--format','{{.ServerVersion}}')
    # Explicit tags are official mirrors already used by repository fixtures. Record resolved digests, never invent pins.
    docker('pull',PG_IMAGE); docker('pull',REST_IMAGE)
    (OUT/'images.json').write_text(json.dumps({i:json.loads(docker('image','inspect',i,'--format','{{json .RepoDigests}}')) for i in [PG_IMAGE,REST_IMAGE]},indent=2))
    docker('network','create','--internal',NET)
    docker('run','--rm','-d','--name',DB,'--network',NET,'-e','POSTGRES_PASSWORD='+PASSWORD,'-v',str(ROOT)+':/work:ro',PG_IMAGE)
    wait_for_final_postgres()
    check('final PostgreSQL server accepts authenticated loopback TCP connections',True)
    contract=docker('exec',DB,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-f','/work/tests/ai-retention-contract.sql')
    (OUT/'single-session.txt').write_text(contract)
    check('existing notification and AI SQL contracts on real PostgreSQL', True)
    from provider_budget_validation import validate_provider_budget
    validate_provider_budget(ROOT, sql, scalar, session, release, blocked, pool, check)
    sql(f"""insert into public.stories(id,"authorId") values('validation-story','{OWNER}');
    select public.save_comment_with_reply('comment-12345678-1234-4234-8234-123456789abc','validation-story','{OTHER}','root');
    grant anon,authenticated to authenticator;
    create or replace function public.set_validation_claims() returns void language plpgsql as $$ begin
      perform set_config('request.jwt.claim.sub',coalesce(current_setting('request.jwt.claims',true)::jsonb->>'sub',''),true);
      perform set_config('request.jwt.claim.role',coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role',''),true);
    end $$; grant execute on function public.set_validation_claims() to anon,authenticated;
    """)
    docker('exec',DB,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',f"alter role authenticator password '{PASSWORD}';")
    docker('run','-d','--name',API,'--network',NET,'-e','PGRST_SERVER_HOST=0.0.0.0','-e','PGRST_SERVER_PORT=3000','-e',f'PGRST_DB_URI=postgres://authenticator:{PASSWORD}@{DB}:5432/postgres','-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET='+JWT,'-e','PGRST_DB_PRE_REQUEST=public.set_validation_claims',REST_IMAGE)
    URL=internal_rest_url()
    rest_deadline=time.monotonic()+30
    readiness_status='not reached'
    while time.monotonic()<rest_deadline:
        if docker('inspect','--format','{{.State.Running}}',API)!='true':
            raise RuntimeError('PostgREST exited before REST readiness')
        try:
            readiness_status=rest('/rpc/count_my_unread_notifications',data={},timeout=2)[0]
            if readiness_status==200: break
        except (OSError,urllib.error.URLError) as exc:
            readiness_status=type(exc).__name__
        time.sleep(.5)
    else: raise RuntimeError('PostgREST readiness timeout on verified private container address; last status='+str(readiness_status))
    status,rows=rest('/rpc/read_my_notifications',data={})
    check('owner reads actual PostgREST inbox',status==200 and len(rows)==1)
    event=rows[0]['id']
    check('other owner cannot read first owner inbox',rest('/rpc/read_my_notifications',OTHER,{})==(200,[]))
    check('other owner marking event does not mutate owner read state',rest('/rpc/mark_my_notifications_read',OTHER,{'p_id':event})[0]==204 and scalar(f"select read_at is null from public.notification_events where id='{event}'")=='t')
    check('owner marks own event through PostgREST',rest('/rpc/mark_my_notifications_read',OWNER,{'p_id':event})[0]==204 and scalar(f"select read_at is not null from public.notification_events where id='{event}'")=='t')
    check('direct notification table is denied',rest('/notification_events')[0] in (401,403))
    check('browser cannot invoke service reply RPC',rest('/rpc/save_comment_with_reply',OWNER,{'p_id':'comment-00000000-0000-4000-8000-000000000001','p_story_id':'validation-story','p_actor':OWNER,'p_content':'forbidden'})[0] in (401,403,404))
    check('reply function exists but browser execution grant is absent',scalar("select to_regprocedure('public.save_comment_with_reply(text,text,uuid,text,text)') is not null and not has_function_privilege('authenticated','public.save_comment_with_reply(text,text,uuid,text,text)','EXECUTE')")=='t')
    # Actual RLS independently of the deliberately revoked browser table grant.
    sql('grant select on public.notification_events to authenticated;')
    check('real table RLS hides another recipient',rest('/notification_events',OTHER)==(200,[]))
    sql('revoke select on public.notification_events from authenticated;')
    holder=session("select id from public.stories where id='validation-story' for update")
    reply=f"select public.save_comment_with_reply('comment-87654321-1234-4234-8234-123456789abc','validation-story','{THIRD}','reply','comment-12345678-1234-4234-8234-123456789abc');"
    futures=[pool.submit(sql,reply,'reply-race-'+str(i)) for i in range(2)]
    for i in range(2): blocked('reply-race-'+str(i))
    release(holder)
    for f in futures: f.result(timeout=30)
    check('simultaneous same-ID replies emit one event per intended recipient',scalar("select count(*)=2 and count(distinct recipient_id)=2 from public.notification_events where comment_id='comment-87654321-1234-4234-8234-123456789abc'")=='t')
    sql("begin; select set_config('app.counter_update','on',true); update public.stories set \"votesA\"=9 where id='validation-story'; commit;")
    check('threshold baseline is nine votes',scalar("select \"votesA\"=9 and \"votesB\"=0 from public.stories where id='validation-story'")=='t')
    holder=session("select id from public.stories where id='validation-story' for update")
    futures=[pool.submit(sql,f"select set_config('request.jwt.claim.sub','{u}',false); set role authenticated; select public.vote_story('validation-story','A');",'vote-race-'+str(i)) for i,u in enumerate([OTHER,THIRD])]
    for i in range(2): blocked('vote-race-'+str(i))
    release(holder)
    for f in futures: f.result(timeout=30)
    check('simultaneous threshold votes emit exactly one milestone',scalar("select count(*)=1 from public.notification_events where story_id='validation-story' and milestone=10")=='t')
    sql(f"insert into public.ai_personas(id,\"userId\") values('completion-race','{OWNER}');")
    sql("alter table public.ai_personas disable trigger ai_retention_guard; update public.ai_personas set \"expiresAt\"=clock_timestamp()+interval '5 seconds' where id='completion-race'; alter table public.ai_personas enable trigger ai_retention_guard;")
    holder=session(complete('completion-race'))
    time.sleep(5.2)
    check('other connection sees due pre-renewal version while completion is uncommitted',scalar("select \"expiresAt\"<=clock_timestamp() from public.ai_personas where id='completion-race'")=='t')
    # While completion owns the row, purge uses its own connection and does not deadlock.
    check('purge skips concurrent completion row',scalar('select public.purge_expired_ai_rooms()')=='0')
    retry=pool.submit(sql,complete('completion-race'),'completion-retry')
    blocked('completion-retry'); release(holder); retry.result(timeout=30)
    check('concurrent completion retry increments generation once',scalar("select \"retentionVersion\"=2 and jsonb_array_length(\"chatHistory\")=2 from public.ai_personas where id='completion-race'")=='t')
    # Expired candidate locked by another session must be skipped, then purged after release.
    sql('alter table public.ai_personas disable trigger ai_retention_guard; update public.ai_personas set "expiresAt"=now()-interval \'1 second\' where id=\'completion-race\'; alter table public.ai_personas enable trigger ai_retention_guard;')
    holder=session("select id from public.ai_personas where id='completion-race' for update")
    check('purge skips genuinely expired locked row',scalar('select public.purge_expired_ai_rooms()')=='0')
    release(holder)
    holder=session('select public.purge_expired_ai_rooms()')
    losing_completion=pool.submit(sql,complete('completion-race','bbbbbbbb-1234-4234-8234-123456789abc'),'purge-wins-completion')
    blocked('purge-wins-completion'); release(holder)
    try:
        losing_completion.result(timeout=30)
        raise AssertionError('completion resurrected purged room')
    except subprocess.CalledProcessError as exc:
        check('purge wins concurrent completion without resurrection','AI_TURN_ROOM_NOT_FOUND' in exc.stderr)
    check('purge removes expired row after lock release',scalar("select count(*)=0 from public.ai_personas where id='completion-race'")=='t')
    # Reinitialize only this disposable fixture and reconstruct the read-reviewed legacy body from repository evidence.
    doc=(ROOT/'docs/plan-execution/2026-10-13-notifications-foundation.md').read_text()
    body=re.search(r'```sql\s*(declare removed integer;.*?end;)\s*```',doc,re.S)
    if not body: raise RuntimeError('reviewed legacy purger source missing; do not guess')
    sql("update public.ai_retention_config set enabled=false,activated_at=null;"+f"insert into public.ai_personas(id,\"userId\",\"createdAt\",\"updatedAt\") values('queued-legacy','{OWNER}','2019-01-01','2019-01-01');"+"create function public.purge_stale_ai_personas() returns integer language plpgsql security definer as $legacy$"+body[1]+"$legacy$;")
    sql("create extension if not exists pg_cron; select cron.schedule('purge-stale-ai-personas','1 15 * * *','select public.purge_stale_ai_personas();');")
    check('cron operator has SELECT and supported API but no direct UPDATE grant',scalar("select has_table_privilege(current_user,'cron.job','SELECT') and not has_table_privilege(current_user,'cron.job','UPDATE') and has_function_privilege(current_user,'cron.alter_job(bigint,text,text,text,text,boolean)','EXECUTE')")=='t')
    activation_sql = '\\set VERBOSITY verbose\n' + """select set_config('app.approve_ai_retention_activation','yes',false);
    select set_config('app.approve_ai_retention_warning_schedule','yes',false);
    select set_config('app.reviewed_legacy_ai_purger_md5',md5(pg_get_functiondef('public.purge_stale_ai_personas()'::regprocedure)),false);
    select set_config('app.reviewed_legacy_ai_cron_md5',md5(jsonb_build_object('jobid',jobid,'jobname',jobname,'schedule',schedule,'command',command,'database',database,'username',username,'active',active)::text),false) from cron.job where jobname='purge-stale-ai-personas';
    """ + (ROOT/'backend/supabase/drafts/ai-retention-activation.sql').read_text()
    # A real second transaction changes the reviewed cron row through the supported
    # pg_cron API. Its uncommitted row is invisible to activation's serializable
    # snapshot, but activation must wait for it before attempting its own update.
    drift=session("select cron.alter_job((select jobid from cron.job where jobname='purge-stale-ai-personas'),schedule:='2 15 * * *')")
    drift_activation=pool.submit(sql,activation_sql,'activation-cron-drift')
    blocked('activation-cron-drift'); release(drift)
    try:
        drift_activation.result(timeout=30)
        raise AssertionError('activation overwrote concurrently changed cron metadata')
    except subprocess.CalledProcessError as exc:
        check('concurrent cron drift aborts activation with serialization failure','40001' in exc.stderr)
    check('cron drift rollback preserves inactive config and uninitialized room',scalar("select (select not enabled and activated_at is null from public.ai_retention_config) and (select \"expiresAt\" is null and \"retentionVersion\" is null from public.ai_personas where id='queued-legacy') and not exists(select 1 from public.notification_events where room_id='queued-legacy')")=='t')
    check('concurrent cron edit commits while activation changes all roll back',scalar("select (select schedule='2 15 * * *' and command='select public.purge_stale_ai_personas();' from cron.job where jobname='purge-stale-ai-personas') and not exists(select 1 from cron.job where jobname='thinkerbell-ai-expiry-warnings')")=='t')
    # Restore only the synthetic review baseline through the same supported API.
    sql("select cron.alter_job((select jobid from cron.job where jobname='purge-stale-ai-personas'),schedule:='1 15 * * *')")
    holder=session('lock table public.ai_personas in access exclusive mode')
    activation=pool.submit(sql,activation_sql,'activation-race')
    blocked('activation-race')
    queued=pool.submit(sql,'select public.purge_stale_ai_personas();','queued-old-cron')
    blocked('queued-old-cron'); release(holder); activation.result(timeout=30); queued.result(timeout=30)
    check('activation changes only synthetic cron to new purge and warnings',scalar("select count(*)=2 from cron.job where (jobname='purge-stale-ai-personas' and command='select public.purge_expired_ai_rooms();' and schedule='1 15 * * *') or (jobname='thinkerbell-ai-expiry-warnings' and schedule='*/5 * * * *')")=='t')
    check('prequeued legacy cron cannot delete activation grace room',scalar("select count(*)=1 from public.ai_personas where id='queued-legacy' and \"expiresAt\">now()")=='t')
    check('activation produces one persisted grace warning',scalar("select count(*)=1 from public.notification_events where room_id='queued-legacy'")=='t')
except Exception as exc:
    # Never dump subprocess arguments or environment: they can contain temporary JWT secrets.
    message=str(exc) if not isinstance(exc,subprocess.CalledProcessError) else 'subprocess failed: '+(exc.stderr or '')[-2000:]
    message=sanitized(message)
    report_container_diagnostics()
    results.append(message if message.startswith('NOT_RUN:') else 'FAIL: '+message); print(results[-1],file=sys.stderr)
    sys.exit(2 if 'NOT_RUN:' in message else 1)
finally:
    for name in [API,DB]:
        try: docker('rm','-f',name)
        except Exception: pass
    try: docker('network','rm',NET)
    except Exception: pass
    (OUT/'summary.txt').write_text('\n'.join(results)+'\n')
    pool.shutdown(wait=False,cancel_futures=True)
