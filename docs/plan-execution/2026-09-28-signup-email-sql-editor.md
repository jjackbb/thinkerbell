# 가입 이메일 소유 확인 SQL Editor 사전 안내 — 2026-09-28

> **시점별 근거 문서:** 아래 상태·결정·SQL 안내는 제목 날짜와 후속 기록 당시의 이력입니다. 현재 작업 지시는 [최신 인수인계](README.md)와 [PLAN](../../PLAN.md)을 따릅니다. 과거 미적용·미실행 표시만 보고 재실행하지 않습니다.


**현재 재실행하지 않는다.** 사용자 선택에 따라 SQL Editor 직접 실행용으로 준비한 안내였으나, 이후 사용자가 AI에게 성공 확인과 쿼리 결과를 맡겨 [쓰기 MCP 적용·조회](2026-09-28-signup-email-ownership-applied.md)까지 완료했다. 아래는 당시 준비한 절차의 기록이다. 현재 상태는 적용 기록을 기준으로 한다.

## 실행 전 확인

- 브라우저에서 [니편내편 프로젝트 `vzhyhadjtaqbapicjrco`](https://supabase.com/dashboard/project/vzhyhadjtaqbapicjrco)를 열고, 왼쪽 **SQL Editor**의 새 쿼리를 사용한다. 다른 Supabase 계정의 유미당 프로젝트와 혼동하지 않는다.
- 2026-09-28 MCP 읽기 조회 결과: `public.signup_email_checks`와 네 함수 모두 없음, 정리 작업 0개, `pg_cron` 설치됨. 실행 직전 아래 쿼리에서도 테이블·함수는 `null`, `purge_jobs`는 `0`, `pg_cron_installed`는 `true`여야 한다. 결과가 다르면 아래 SQL을 실행하지 않고 차이를 확인한다.

```sql
select
  to_regclass('public.signup_email_checks')::text as checks_table,
  to_regprocedure('public.reserve_signup_email_check(uuid,text,text,timestamptz)')::text as reserve_fn,
  to_regprocedure('public.consume_signup_email_check(uuid,text,text,text,text,timestamptz)')::text as consume_fn,
  to_regprocedure('public.claim_signup_email_check(text,text,text,timestamptz)')::text as claim_fn,
  to_regprocedure('public.purge_signup_email_checks(timestamptz)')::text as purge_fn,
  exists(select 1 from pg_extension where extname = 'pg_cron') as pg_cron_installed,
  (select count(*) from cron.job where jobname = 'thinkerbell-signup-email-check-purge') as purge_jobs;
```

## 적용 순서

1. [가입 소유 확인 SQL 원문](sql/signup-email-ownership-draft.sql)을 **전체 복사**해 새 쿼리에서 한 번 실행한다. 테이블·인덱스, 1회 링크/가입 증명 함수, 서비스 역할 권한을 만든다. 오류가 나오면 다음 단계로 넘어가지 않고 오류 메시지와 실행 여부를 기록한다. `draft`는 당시 준비 파일명이며, 적용된 SQL 문장은 [마이그레이션 이력](2026-09-28-signup-email-ownership-applied.md)에 남겼다.
2. 첫 쿼리가 성공한 경우에만 [15분 간격 정리 작업 SQL 원문](sql/signup-email-ownership-retention-job-draft.sql)을 별도 새 쿼리에서 한 번 실행한다. 24시간이 지난 해시 기록을 지우는 작업이다. 이미 같은 이름의 작업이 있으면 다시 실행하지 않는다.
3. 아래 확인 쿼리를 실행한다. 함수 네 개의 `anon_execute`와 `authenticated_execute`는 모두 `false`, `service_execute`는 모두 `true`여야 한다. 테이블은 RLS가 켜져 있고 익명·로그인 계정의 직접 조회 권한이 없어야 한다. 정리 작업은 `active=true`, 주기 `*/15 * * * *`인 행이 하나여야 한다. 예상과 다르면 기능 플래그를 켜지 않는다.

```sql
select p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'reserve_signup_email_check', 'consume_signup_email_check',
    'claim_signup_email_check', 'purge_signup_email_checks'
  )
order by p.proname;

select c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
  has_table_privilege('service_role', c.oid, 'SELECT') as service_select
from pg_class c
where c.oid = 'public.signup_email_checks'::regclass;

select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'thinkerbell-signup-email-check-purge';
```

테이블·함수가 있어도 기능은 바로 켜지 않는다. [가입 설계·검증 상태](2026-09-28-duplicate-signup-decision.md)의 Redirect URL·한국어 비밀번호 재설정 메일·Vercel Preview 변수와 실제 두 메일함 시험을 먼저 끝내야 한다. 토큰·이메일 주소·비밀키는 기록하지 않는다. 실제 적용은 SQL Editor가 아닌 쓰기 MCP로 수행됐고, 버전과 결과는 [적용 기록](2026-09-28-signup-email-ownership-applied.md)에 남겼다.
