# 가입 이메일 소유 확인 DB 적용·조회 결과 — 2026-09-28

**2026-09-28 후속 조회:** 가입 정리 작업은 조회 시점 35회 모두 성공했다. Preview에만 가입 소유 확인 기능과 발송 설정을 올리고 잘못된 주소의 400 응답을 확인했다. 실제 메일·링크·두 계정 브라우저 시험과 Production 설정은 미완료다. 아래 0건·플래그 꺼짐은 적용 직후 시점의 기록이다.

[PLAN.md](../../PLAN.md)의 기존 이메일 재가입 안내를 위한 DB 구조를 니편내편 Supabase 프로젝트 `vzhyhadjtaqbapicjrco`에 적용했다. 처음에는 사용자가 SQL Editor에서 직접 실행하는 경로를 선택해 [실행 안내](2026-09-28-signup-email-sql-editor.md)를 준비했다. 이후 사용자가 성공 확인과 쿼리 결과를 **AI가 직접 진행**해 달라고 요청했고, 재연결된 니편내편 쓰기 MCP로 적용·조회했다. 유미당 프로젝트에는 적용하지 않았다.

## 적용 전과 마이그레이션

적용 직전 읽기 조회에서 `public.signup_email_checks`와 함수 4개는 모두 없었고, 같은 이름의 `cron.job`은 0개였다. `pg_cron`은 설치돼 있었다. 기존 가입 계정이나 사연의 내용을 조회하거나 바꾸지 않았다.

| Supabase 마이그레이션 | 내용 | MCP 응답 |
| --- | --- | --- |
| [`20260927214704_signup_email_ownership_mailbox_proof`](../../backend/supabase/migrations/20260927214704_signup_email_ownership_mailbox_proof.sql) | 소유 확인 기록 테이블·인덱스, 1회 링크/가입 증명·정리 함수, 역할 권한 | `success: true` |
| [`20260927214725_schedule_signup_email_check_purge`](../../backend/supabase/migrations/20260927214725_schedule_signup_email_check_purge.sql) | 15분 간격 24시간 초과 기록 정리 일정 | `success: true` |

두 버전과 이름은 적용 후 니편내편 MCP `list_migrations`에서 다시 확인했다. 저장소 마이그레이션 파일의 **SQL 문장**은 적용할 때 읽은 [첫 SQL](sql/signup-email-ownership-draft.sql)·[둘째 SQL](sql/signup-email-ownership-retention-job-draft.sql)과 같으며, 머리말만 적용 이력에 맞춰 표시했다. 초안 파일은 재적용 대상이 아니다.

## 적용 직후 읽기 조회

| 확인 | 결과 |
| --- | --- |
| 테이블·함수 | `signup_email_checks`와 `reserve`, `consume`, `claim`, `purge` 함수 4개 존재 |
| 함수 실행 권한 | 4개 모두 `anon=false`, `authenticated=false`, `service_role=true` |
| 테이블 접근 | RLS 켜짐, `anon`·`authenticated` 직접 `SELECT=false`, `service_role SELECT=true` |
| 새 테이블 행 수 | `0` |
| 정리 작업 | `jobid=2`, `thinkerbell-signup-email-check-purge`, `*/15 * * * *`, `active=true`, 실행 계정 `postgres` |
| 정리 작업 실행 이력 | 조회 시점 `0`건. **등록 확인**이며 실제 첫 실행 성공의 증거는 아직 아님 |

이 결과는 운영 DB 구조·권한·일정 등록의 확인이다. 로컬 기능 플래그 `EMAIL_CHECK_ENABLED`, `VITE_EMAIL_CHECK_ENABLED`는 계속 꺼져 있고 새 가입 경로를 배포하지 않았다. 실제 Resend 발송, Supabase Auth 관리자 계정 생성, 비밀번호 재설정 링크, 두 계정 브라우저 과업은 검증하지 않았다. 정리 작업의 첫 실행 이력과 Preview 환경 설정·실제 메일 시험을 확인하기 전에는 Production 기능을 켜지 않는다. 운영 적용을 로컬 빌드나 사용자 경험 성공으로 해석하지 않는다.
