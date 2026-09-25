# 니편내편 인증 메일 선배포 인수인계

이 문서는 [PLAN](../../PLAN.md)의 신규 가입 이메일 확인을 먼저 배포하기 위한 작업 범위와 검증 상태를 기록한다. 팀원은 이 문서의 설정 보고와 실제 동작 검증을 구분해야 한다.

**2026-09-26 후속:** 아래 2026-09-25 배포 당시의 미검증 표기는 당시 기록이다. 이후 사용자가 `Confirm Email`을 켜고 새 가입부터 앱 복귀까지 시험했으며, 새 계정 1명의 확인 완료를 니편내편 Auth 집계에서 확인했다. 합성 만료 링크 오류 화면도 사용자 확인이다. 복귀 후 로그인 세션과 실제 만료 링크·재발송은 아직 별도 확인이 필요하다. [후속 검증 기록](../plan-execution/2026-09-26-auth-email-verified.md)

## 결정과 담당

- 사용자는 `jjackbb.com`을 구매하고 Resend의 발송용 `auth.jjackbb.com`을 연결했다. Resend `Verified`, Enforced TLS, 열람·클릭 추적 끄기, Supabase Site URL `https://thinkerbell-eight.vercel.app/`, Custom SMTP 설정 저장은 **사용자 대시보드 확인**이다. 키 값은 저장소나 채팅에 기록하지 않았다.
- 기존 Auth 계정 45개는 그대로 이용하게 두고 **신규 가입부터** 이메일 확인을 적용하기로 사용자가 결정했다. 읽기 전용 DB 집계에서 45개 모두 `email_confirmed_at`이 있으나, 가입 당시 실제 메일 소유권 확인 여부는 알 수 없다.
- 다른 PLAN 변경과 섞지 않고 인증 화면만 먼저 배포하기로 사용자가 선택했다. AI는 클라이언트 변경·로컬 검사·기록을 맡았다.

## 이번 커밋의 범위

- `WelcomeModal`: 새 가입 응답에 세션이 없으면 확인 메일 안내를 보여준다. 같은 주소 재발송, 다른 주소로 재시도, 확인 전 로그인 오류 안내를 제공한다.
- `App`과 `WelcomeModal`: Supabase 확인 링크가 `otp_expired`로 돌아오면 게스트에게도 재발송 화면을 열고 이메일을 다시 입력받는다.
- 인증 정보나 SMTP 비밀번호는 앱 코드에 추가하지 않았다. 기존 `frontend/src/lib/supabase.ts`의 환경변수 연결을 이용한다.

Supabase Custom SMTP 입력값은 발신 주소 `accounts@auth.jjackbb.com`, 발신 이름 `니편내편`, 호스트 `smtp.resend.com`, 포트 `465`, 사용자 이름 `resend`다. 비밀번호는 Resend의 `auth.jjackbb.com` 범위 Sending access 키이며 **값은 이 문서에 없다**.

## 검증과 남은 단계

기존 `main` 기준의 깨끗한 체크아웃에 **이 커밋의 세 파일만** 올려 `npm ci --offline --ignore-scripts`, `npm run lint`, `npm run build`, `git diff --check`를 통과했다. 빌드의 기존 500 kB 초과 청크 경고는 남아 있다. 실제 SMTP 발송, 외부 메일 도착, 링크 확인, 만료·재발송은 각각 별도로 확인해야 한다. 로컬 빌드가 통과해도 가입 경로가 완료된 것은 아니다.

2026-09-25 인증 화면 커밋 `7b688e2`를 GitHub `main`에 푸시했다. 공개 `https://thinkerbell-eight.vercel.app/`의 HTML과 JS가 HTTP 200이며, 배포된 JS에 새 재발송 문구와 `otp_expired` 처리 문자열이 있는 것을 직접 확인했다. **배포 파일 반영은 확인했지만 클릭 동작은 확인하지 못했다.** 헤드리스 Chrome 화면 검사는 30초 제한 시간에 걸려 판정 불가다. `Confirm Email` 켜기와 실제 외부 가입·수신·링크 복귀는 아직 진행하지 않았다.

배포 순서는 **이 커밋 푸시 → Vercel 공개 버전 반영 확인 → Supabase `Confirm Email` 켜기 → 본인이 관리하는 새 외부 주소로 가입·수신·링크 복귀·로그인 시험**이다. 현재 `Confirm Email`은 마지막 사용자 확인에서 꺼져 있다. 테스트 전에 기존 45개 계정의 확인 상태를 일괄 변경하지 않는다.

DNS 값 대조 등 상세 근거는 [가입 인증 메일 준비 기록](../plan-execution/2026-09-25-auth-mail-setup.md)에 있다. 팀원은 이 배포 기록만으로 실제 메일 전달 성공을 주장하지 말고 운영 대시보드와 시험 결과를 대조해야 한다.
