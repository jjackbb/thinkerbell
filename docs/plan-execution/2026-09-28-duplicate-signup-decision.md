# 기존 이메일 재가입 — 소유 확인 후 안내

2026-09-28 사용자 관찰: 이미 가입한 이메일로 다시 가입하면 새 메일은 오지 않지만 공개 화면은 발송된 듯 안내했다. Supabase는 기존 계정 존재를 숨기는 가입 응답을 줄 수 있으므로 `signUp()` 결과만으로 발송·중복을 확정하지 않는다. 로컬 화면의 중립 안내 수정은 아직 공개 미배포다. [Supabase 문서](https://supabase.com/docs/reference/javascript/auth-signup)

사용자는 **이메일 소유권을 먼저 확인한 뒤에만 가입 여부를 알려주는 방식**을 선택했다. 임의의 이메일 주소만 입력해서 다른 사람의 가입 상태를 조회할 수 없도록 한다. 기존 Supabase 가입·비밀번호 로그인은 유지한다.

## 로컬 구현 초안

1. 가입 화면에서 이메일 소유 확인을 요청한다. 서버는 별도 Resend **Sending access** 키로 10분 유효 링크를 보낸다. 요청 API는 계정 존재 여부를 응답하지 않는다.
2. 링크를 연 브라우저가 서버에 토큰을 제출한다. DB는 토큰 해시를 1회만 소비하고 나서 `auth.users`를 조회한다. 결과는 **가입 가능 / 가입 확인 미완료 / 가입 확인 완료**로 구분한다. 미완료는 기존 가입 확인 메일 재요청, 완료는 로그인으로 안내한다.
3. 사용자는 **새 가입에 메일 한 통**을 선택했다. 가입 가능이면 링크를 받은 브라우저에만 별도 1회 가입 증명을 발급한다. 이용자가 비밀번호·닉네임을 입력하면 서버가 그 증명을 소비하고 `auth.admin.createUser({ email_confirm: true })`로 계정을 만든 뒤 비밀번호 로그인을 시도한다. 기존 `signUp()`의 두 번째 확인 메일을 보내지 않는다. 계정 생성 관리자 키는 서버에만 있다. [Supabase 관리자 생성 API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
4. 기존 계정이 비밀번호를 잊은 경우 Supabase `resetPasswordForEmail()`로 재설정 메일을 요청하고, 링크로 돌아온 세션에서 `updateUser({ password })`를 호출한다. 계정이 없는 주소에도 같은 접수 안내를 보여준다. [Supabase 비밀번호 안내](https://supabase.com/docs/guides/auth/passwords)

[SQL 초안](sql/signup-email-ownership-draft.sql)은 주소·원문 토큰을 저장하지 않고 서로 다른 키로 만든 해시와 만료 시각만 보관한다. 사용자는 **주소당 시간당 3회, 전체 24시간에 50회, 링크 10분, 기록 약 24시간 뒤 삭제**를 선택했다. [15분 간격 정리 작업 초안](sql/signup-email-ownership-retention-job-draft.sql)이 정상 실행되면 해시는 생성 뒤 약 24시간 15분 이내에 삭제된다. 메일 확인 링크와 가입 증명은 각각 1회 사용이다. 전체 상한에 닿으면 다른 이용자의 요청도 막히므로 운영 발송 로그를 보고 조정할 수 있다.

서버 플래그 `EMAIL_CHECK_ENABLED`와 화면 플래그 `VITE_EMAIL_CHECK_ENABLED`는 기본적으로 꺼져 있다. 사용자는 기존 SMTP 키와 분리된 `auth.jjackbb.com` 범위의 **Sending access** 키를 선택했다. 활성화에는 운영 DB SQL, 새 Resend 키를 서버 전용 `RESEND_EMAIL_CHECK_API_KEY`에 설정, 정확한 `APP_URL`, 32바이트 암호화 키, 시험용 메일함의 실제 링크 확인이 필요하다. 기존 SMTP 키를 자동 재사용하지 않는다. 비밀번호 재설정의 복귀 URL `https://thinkerbell-eight.vercel.app/?auth=recovery`는 Supabase Auth Redirect URLs에 허용해야 한다. 한국어 제목 `니편내편 비밀번호 재설정`과 [본문 초안](../email-templates/reset-password.ko.html)은 사용자가 Supabase Email Templates → Reset Password에 저장한 뒤 실제 메일로 확인해야 한다. 로컬 코드·격리 시험 결과와 실제 서비스 결과는 구분한다.

로컬 `.env`에는 무작위 32바이트 `EMAIL_CHECK_SECRET`을 생성했고 파일 권한을 소유자만 읽도록 바꿨다. Resend API에서 인증 완료된 `auth.jjackbb.com` 도메인을 확인하고, `thinkerbell-email-check`라는 별도 `sending_access` 키를 이 도메인 ID 범위로 생성해 로컬 `.env`에 저장했다. 이 키로 도메인 관리 API를 읽으면 `restricted_api_key`가 반환돼 발송 외 관리 권한이 없음을 확인했다. 키 값은 출력·문서화·Git 추가하지 않았다. Vercel Preview·Production 비밀값은 아직 설정되지 않았다. 최종 로컬 TypeScript 검사·빌드는 통과했다. 모의 HTTP 2건은 상태 비노출·1회 링크·확인 후 관리자 계정 생성 1회만 호출을 통과했고, 격리 PostgreSQL은 1회 가입 증명·시간/전체 발송 상한·역할 제한을 통과했다. 이 검사는 실제 Supabase Auth 관리자 API·Resend 발송·복귀 링크가 동작한다는 증거가 아니다.

운영 DB에는 처음 테이블과 함수가 없음을 읽기 조회로 확인했다. 쓰기 MCP OAuth 승인 페이지 열기는 최초 자동 승인 검토에서 거절됐지만, 사용자가 다시 인증을 요청한 뒤 MCP 로그인과 읽기 조회가 성공했다. 사용자는 SQL Editor 직접 실행 경로를 선택해 [안내](2026-09-28-signup-email-sql-editor.md)를 준비했다. 이후 사용자 요청에 따라 AI가 니편내편 쓰기 MCP로 [두 마이그레이션을 적용하고 구조·권한·정리 작업을 조회](2026-09-28-signup-email-ownership-applied.md)했다. 실제 메일·가입 화면은 아직 미검증이다.

새 가입 경로에서 관리자 API의 확인 완료는 **Resend 링크 사용으로 메일함 소유를 증명했다는 전제**에 의존한다. 링크를 잃거나 가입 생성 결과가 불확실하면 같은 증명으로 재시도하지 않고 로그인 또는 새 소유 확인부터 진행한다. 기존에 생성된 미확인 계정은 삭제·자동 확인하지 않고 원래 가입 확인 메일 재요청으로 처리한다. 직접 Supabase `signUp()`을 서버 권한 없이 막는 보안 장치는 아직 없으므로 `Confirm Email`은 계속 켜 둔다. 운영 SQL·실제 발송·브라우저·배포 검증 전까지 새 경로는 켜지 않는다.

## 활성화 전 설정 순서

1. 니편내편 Supabase의 **Authentication → URL Configuration → Redirect URLs**에 `https://thinkerbell-eight.vercel.app/?auth=recovery`를 허용한다. Preview에서 시험할 정확한 URL도 별도로 허용한다. **Authentication → Email Templates → Reset Password**에는 제목 `니편내편 비밀번호 재설정`과 [한국어 본문 초안](../email-templates/reset-password.ko.html)을 검토해 저장한다. 현재 저장·발송 여부는 확인되지 않았다.
2. [가입 소유 확인 DB 적용 기록](2026-09-28-signup-email-ownership-applied.md)에 따라 테이블·함수·권한과 15분 정리 작업 등록까지 완료했다. 첫 정리 작업의 실제 실행 결과는 아직 확인되지 않았다.
3. Vercel `thinkerbell`의 **Preview** 서버 변수에 `EMAIL_CHECK_SECRET`, `RESEND_EMAIL_CHECK_API_KEY`, `APP_URL`을 설정한다. `APP_URL`은 시험할 Preview 원점 주소와 끝의 `/`까지 일치해야 한다. 키 값은 로컬 `.env`에서 관리 화면으로 직접 옮기고 채팅·문서에 보내지 않는다. SQL 준비 전에는 두 기능 플래그를 계속 꺼 둔다.
4. Preview에서 `EMAIL_CHECK_ENABLED=true`와 빌드 변수 `VITE_EMAIL_CHECK_ENABLED=true`로 새 배포를 만든 뒤, 두 실제 메일함으로 가입 가능·기존 계정·미확인 계정·중복 요청·재설정·만료·복귀를 확인한다. 정상 메일 한 통·DB 생성·로그인까지 확인하기 전에는 **Production** 변수를 켜지 않는다. 운영 SQL이 적용됐어도 화면 플래그가 꺼져 있으면 기존 가입 경로가 유지된다.
