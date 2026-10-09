# 현재 반영 작업과 검증 근거 — 2026-10-09

정책은 [PLAN](../../PLAN.md), 다음 행동은 [인수인계](README.md)입니다. 과거 승인 대기·중단·재시도·배포별 세부 증거는 [정리 전 실행 원문](../../archive/2026-09-30/current-docs-before-cleanup/docs/plan-execution/2026-09-28-in-progress-release-preflight.md)으로 분리했습니다. 아래 과거 완료 기록을 현재 세션의 재검증으로 표현하지 않습니다.

## 2026-10-09 전체 이벤트 확대 — 현재 작업

- 사용자 전달한 팀회의 결정: 모든 일반 사용자 화면·버튼/링크/카드 행동과 기능 결과를 수집한다. 일반 가입·로그인을 포함하고 민감 행동은 제외한다. 신규 GA4 전용, 내부 DB 기존 9종 유지. 기존 가입 계정은 테스트·팀원 계정이므로 별도 재동의 전환을 생략한다.
- 구현 커밋 `6d45674`, 최종 표식 교정 `fbd093f`를 기존 브랜치에 푸시했다. 정적 행동 190개 중 개별 제외 54개, 민감 화면·조건부 영역 제외를 추가했다. 이벤트 스키마 v4. 원문·입력값·href·개인 ID·평가 점수는 전송하지 않는다.
- 정책/정제 테스트 6개 PASS, 상속 키 허용 목록 보강 후 해당 2개만 재검사 PASS. 최종 표식 교정 후 타입 검사 PASS. 로컬 QA 빌드 PASS, Preview 빌드는 아래에 별도 기록한다. 기존 큰 번들 경고는 남아 있다.
- 격리 로컬 브라우저에서 동의 전/거부/철회, 화면 재렌더·자식 요소·카드 클릭, 민감 화면 차단, 알 수 없는 ID, 결과 중복·소급 전송 차단을 확인했다. 외부 Google/Auth/메일/DB 요청은 가로챘다. 가상 로그인 오류·성공 재시도 및 가상 가입 성공/자동 로그인 결과를 확인했다. 실제 계정 과업·전 버튼 조건부 실행·GA4 보고서 수신 PASS로 확대하지 않는다.
- 시험 도구의 아이콘 locator와 이메일 확인 feature flag 누락은 검사 환경을 교정했다. 가로챈 WebSocket의 초기 종료 오류는 남았으며 앱/GA4 장애로 단정하지 않는다. 통과한 동작 검사는 반복하지 않았다.
- 최종 대조에서 일반 투표 버튼의 잘못된 제외를 해제하고, 사연 카드·랭킹·작성 목록·편집/상세에 민감/비공개 상태 표식을 보강했다. 정적 목록 생성과 타입 검사를 다시 수행했다. 이전 로컬 브라우저 PASS를 이 추가 교정의 전수 동작 PASS로 표현하지 않는다.
- 표식 교정 QA 후보 `https://thinkerbell-or58jjlr9-jjackbb-projects.vercel.app`는 `dpl_961qkZscNnJfHrySZMrWNbikPUAv`, READY다. 최종 코드 커밋 `fbd093f`를 배포했고 Vercel 프론트/서버/TypeScript 빌드가 완료됐다. 이 후보의 JS에서 QA 측정 ID·신규 이벤트 코드·교정 버튼 ID는 확인했지만 Supabase URL이 없었다. Vercel Preview에 VITE_SUPABASE_URL이 누락돼 브라우저가 서버용 SUPABASE_URL을 읽지 못한 것이 원인이다. 니편내편 공개 프로젝트 URL을 Preview 변수로 추가했다. 키·권한·운영 환경은 변경하지 않았다. 실제 GA4 수신은 확인하지 못했다. 먼저 배포한 `thinkerbell-34zogu3q3-jjackbb-projects.vercel.app`는 표식 교정 전 후보이므로 사용하지 않는다.
- 구성 보완 후 최종 후보: `https://thinkerbell-l5m9c6x1z-jjackbb-projects.vercel.app`, `dpl_FMPyn9awvVcu3vBhn6yq8An2Wyq2`, READY. 공개 JS는 `index-Dc9H9UU5.js`다. 배포 JS에서 QA 측정 ID 일치·운영 ID 없음·니편내편 Supabase 대상·신규 계측 코드 존재를 확인했다. 이는 코드/설정 확인이며 GA4 실시간 수신 검증은 아니다. 운영 URL은 200, 기존 `index-CC3w_CjS.js`이며 아직 새 코드를 반영하지 않았다. 운영의 VITE_SUPABASE_URL·Anon Key·GA4 ID·이메일 확인 변수 이름은 모두 존재함을 확인했다.
- 브라우저 도구는 최초 권한 대기 뒤 네이티브 연결 오류로 실패했다. 사용자 요청으로 초기화 후 재시도했으나 `Sky Computer Use native pipe startup failed`가 같았다. Chrome UI를 읽기 전 실패이므로 로그인/GA4 장애라는 증거는 아니다. 맞춤 측정기준 button_id/element_type/reason 추가와 신규 이벤트 실제 수신은 미실행이다. 운영 변경은 이 수신 확인 뒤 진행한다.

## 2026-09-30 사용자 결정 후 복원·운영 반영 — 과거 운영 기준

- 사용자가 첫 AI 답변을 ‘답변 완료와 저장 결과 분리’로 재확정했다. 아래의 저장 성공 뒤 집계 시험은 변경 전 배포의 기술 기록이며 현 정책으로 해석하지 않는다.
- `AIChatView`는 비어 있지 않은 답변과 `provider_done`을 확인하면 `ai_chat_turn1/turn3`을 집계한다. 완료된 스트림의 호환 경로에서도 같은 함수를 호출하되 요청 내 counted와 회차별 trackOnce로 중복을 막는다. 부분 답변에는 완료 이벤트를 보내지 않는다.
- 저장 결과는 기존 `operation_success/error`로 따로 기록한다. 저장 실패 차감 0·입력 보존·새 답변 재요청과 도움 평가의 정상 저장 조건은 변경하지 않았다.
- 타입 검사 PASS. 새 테스트 작성·이미 통과한 서버 시험 반복 없음. 이번 변경의 운영 배포·브라우저 집계·GA4 실시간 수신 확인을 아래 범위에서 완료했다. release_id로 변경 전 기록과 구분한다.



## 이번 세션에서 직접 확인한 배포·집계 결과

- 구현/정리 커밋 `fee5ea5`, 브랜치 `codex/plan-local-2026-09-28` 원격 푸시 성공. 문서 정리 전 원본 15개는 manifest의 바이트·SHA-256 일치, 변경된 현재 문서 37개의 로컬 링크 누락 0, 변경/추가 56개 파일에서 로컬 비밀값과의 일치 0을 확인했다.
- Vercel Production 빌드 READY → 후보 HTML 정상 응답 → promote 성공 → 공개 주소의 `index-CC3w_CjS.js` 일치 확인. 배포 ID `dpl_GUTu8R7iugosXTqQS6bv1az8qzXe`, release_id `thinkerbell-o48f0e8ln-jjackbb-projects.vercel.app`. 빌드의 큰 번들 경고는 남아 있으며 빌드 실패는 아니다.
- 9월 30일 07:20~07:27 KST 지정 B의 기존 로그인으로 공개 앱을 확인했다. 대화 목록과 스트림만 브라우저에서 가상 응답으로 바꾸고 REST/API 쓰기를 가로챘다. 새 사연·대화·평가 저장 및 실제 포텐스 호출은 0회다. 기술 시험은 `technical_test`로 구분한다.

| 가상 스트림 조건 | 첫 답변 | 저장 오류 | 저장 성공 | 판정 |
| --- | --- | --- | --- | --- |
| 정상 내용 + provider_done + 저장 실패 | 1 | 1 | 0 | PASS |
| 부분 내용 + 완료 전 오류 | 0 | 0 | 0 | PASS |
| 빈 내용 + 완료 신호 | 0 | 0 | 0 | PASS |
| 정상 내용 + provider_done + done/persisted | 1 | 0 | 1 | PASS, 중복 없음 |

- Google 수집 HTTP 204와 운영 측정 ID를 확인했다. 운영 GA4 속성 `555751929` 실시간 화면에서 `ai_chat_turn1` 2, `operation_error` 1, `operation_success` 1을 확인했다. 첫 답변 이벤트의 `release_id` 값에 이번 배포가 표시된 것도 확인했다. 브라우저 속성은 `chat_list`/`continuation`/`explanation`/`technical_test`이며 관찰 요청에서 가상 원문·방 ID 노출은 없었다.
- 기술 확인을 마친 후 B의 분석 동의를 원래 `refused`로 복원하고 임시 앱 탭을 닫았다. 계정·권한·기존 문의·사용량·운영 설정은 변경하지 않았다.
- 브라우저에 탭이 없어 CDP 연결이 실패한 경우와 이미 동의한 버튼을 다시 누르려던 자동 조작 오류를 해결했다. 제품 결함으로 세지 않으며 통과한 첫 사례는 반복하지 않았다. 저장 결과의 실제 DB 반영은 이번 가상 시험의 검증 범위가 아니며 앞선 서버 시험 근거와 구분한다.
- 새 단위 테스트는 작성하지 않았다. 이번 변경에 대해 이미 통과한 타입 검사는 반복하지 않았고, 배포에 필요한 운영 빌드와 변경 경로의 브라우저 확인만 수행했다.

## 앞선 배포에서 확인한 범위

| 대상 | 근거 | 상태 |
| --- | --- | --- |
| 공개 앱 | `dpl_AR7TgDnaQB6AMMj3JbfMaUkFMtSd`, release_id `thinkerbell-nx19qq1ds-jjackbb-projects.vercel.app` | 9월 30일 공개 반영·건강 200 기록 |
| 운영 DB | 호환 확장 9건, 삭제 후 횟수 보관 `20260929203532`, 직접 쓰기 7개 차단 `20260929210710` | 적용·역할별 기술 확인 |
| 인증·메일 | A/B 소유 확인·가입/로그인, 공개 APP_URL localhost 결함 교정 후 실제 메일 복귀 200/registered | 기록된 범위 PASS |
| 실제 기능 | 사연/댓글 서버 저장, 포텐스 답변·복원·고정/삭제, 타인 거부, 문의 답변·닉네임·탈퇴 | 지정 계정·가상 데이터 기술 PASS |
| 오류 복구 | 브라우저 주입 실패 뒤 실제 서버/포텐스 재시도 | 실제 운영 장애를 재현한 것은 아님 |
| GA4 | 운영 Realtime 첫 답변·저장 결과, release_id/진입/신규·이어하기/technical_test 확인, 맞춤 측정기준 9개 | 변경 전 정의 수신 PASS |
| 동의·개인정보 | 동의 전·거부·철회 후 Google 요청 0, 허용 범주만 전송 | 관찰한 요청에 원문·내부 ID 없음 |
| 정리 작업 | AI 보관·접근 무효화 cron 9월 29/30일 각각 성공 | 실제 평가 월말 집계는 미검증 |

## 유지할 제한과 후속

- 자정 전환 확인은 이번 범위 제외, 실제 기기/Safari·174개 전 상태·일반 이용자 만족도는 PASS가 아니다.
- 기존 Supabase security advisor의 mutable search_path·공개 definer RPC·유출 비밀번호 보호 경고는 앞선 기록에 남아 있다. 전면 무경고 판정을 하지 않으며 이번 문서/계측 변경에서 정책을 임의 변경하지 않는다.
- 운영 기술 시험 `?source=qa`와 source가 없던 9월 30일 06:04~06:17 시험 구간은 실제 이용자 성과에서 제외한다. 06:31~06:39 기술 확인도 같은 원칙이다.
- 커뮤니티 링크는 `https://thinkerbell-eight.vercel.app/?source=community`, SNS는 `?source=sns`. 실제 게시·효과 측정은 아직 하지 않았다.
- 원래 계측 정의로 복원한 새 배포는 변경 전 데이터와 release_id로 구분한다. 과거 값에 새 속성·새 기준을 소급 적용하지 않는다.
