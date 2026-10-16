# Meta 광고 성과 코드와 GA4 테스트 계정 제외 후보

기준: main `814c69bc178b3e9716cf3b6c74aa6bc11bd8b1ad`. 2026-10-16 클라우드 코드 후보. 원격 push, 배포, 운영 환경변수, GA4 속성 설정은 변경하지 않았다.

## 반영 조건과 중요한 제한

- **배포 전** 서버 전용 `GA4_EXCLUDED_TEST_EMAILS`에 사용자가 승인한 테스트 주소 3개를 쉼표로 구분해 비공개 설정하고, 대상 환경의 readback으로 적용 여부를 확인해야 한다. 이메일이나 해시는 저장소, 프론트 환경변수, GA4, 로그에 목록으로 넣지 않는다. 예시는 `.env.example`의 빈 항목뿐이다.
- **변수가 없거나 비어 있거나 잘못되면 로그인한 모든 계정의 GA4가 차단된다.** 운영 설정 완료 전 이 후보를 배포하지 않는다. 분석 오류가 서비스 이용을 막지는 않는다.
- 서버가 기존 Supabase 인증으로 확인한 현재 계정의 이메일만 비교한다. 브라우저가 보낸 이메일/계정 ID, 쿼리, 수정 가능한 user_metadata는 판정에 쓰지 않는다. 인증 실패·확인되지 않은 이메일·네트워크/판정 오류도 차단한다.
- 초기 로그인 복원과 계정 판정이 끝나기 전에는 GA4 태그/이벤트를 시작하지 않는다. 이전 계정의 늦은 응답은 새 계정 판정을 덮어쓰지 못한다. 로그인, 계정 교체, 토큰 갱신 때 이미 로드한 Google 태그도 먼저 차단한다. 판정 중 이벤트는 버리며 나중에 재생하지 않는다.
- 로그아웃 후에는 계정을 알 수 없으므로 **익명 방문으로 동의 조건에 따라 다시 집계**한다. 로그인 전에 이미 발생한 테스트 사용자의 익명 행동은 이 방식으로 식별하거나 완전히 제외할 수 없다. 다른 탭/브라우저에서 로그아웃한 방문도 같은 한계가 있다.
- 이미 GA4에 도착한 과거 데이터는 삭제하거나 소급 제외하지 않는다. `source=qa`는 기존 `technical_test` 분류일 뿐, 테스트 계정 제외 대신 쓰는 수집 중단 스위치가 아니다.
- 제외 대상은 GA4다. 기존 내부 DB 9종 행동 로그, 업무용 데이터, 인증/보안 로그 삭제나 변경은 이번 범위가 아니다.
- 기존 선택 동의/거부와 민감 화면 제외 정책을 유지한다. 새 쿠키, 별도 사용자 ID, 광고 픽셀, 지문 인식, 재마케팅, 광고계정 연결을 추가하지 않는다. 공개 캠페인 코드만 기존 탭 세션 출처 저장 영역에 함께 보관하며 거부/철회 때 지운다.

## 고정 링크 규약

기존 `source=community`, `source=sns`, `source=qa`를 보존한다. 유료 Meta 광고는 `source=meta`로 구분한다. Instagram만의 트래픽으로 단정하지 않는다.

| URL 항목 | 허용 값 | GA4 이벤트 속성 |
|---|---|---|
| source | meta | recruitment_source=meta |
| campaign | launch_202610, source=meta일 때만 | campaign_code=launch_202610 |
| creative | a 또는 b, 위 캠페인이 유효할 때만 | creative_code=a 또는 b |

등록되지 않은 값은 전송하지 않는다. 소재 코드는 운영자가 광고 관리자에서 A/B 소재에 붙인 내부 대조표로 관리한다. 자유 입력 플랫폼명·광고 ID·사람 이름·메일·UTM 원문·토큰을 코드로 쓰지 않는다.

- 소재 A: `/landing?source=meta&campaign=launch_202610&creative=a`
- 소재 B: `/landing?source=meta&campaign=launch_202610&creative=b`

랜딩의 둘러보기/작성 CTA와 가입 후 소개 링크는 위 고정 코드만 이어 전달한다. 쿼리에 이메일, 토큰, 임의 UTM이 섞여 있어도 앱 링크/이벤트에는 옮기지 않는다. GA4 page_location은 고정 `/` 또는 `/landing`이고 query/hash/임의 경로는 제외한다. 이벤트 직접 호출도 최종 송신 함수에서 허용 속성을 다시 정제한다.

새 이벤트 이름 없이 기존 이벤트에 캠페인/소재 속성을 붙인다. 새 속성 2개(`campaign_code`, `creative_code`)는 필요 시 GA4의 이벤트 범위 맞춤 측정기준으로 등록해야 보고서에서 편리하게 나눠 볼 수 있다. 이번 작업은 실제 등록을 하지 않았다. 기존 `recruitment_source` 등록 여부도 실제 속성에서 대조한다.

## 측정 방법: 갈라지는 경로를 각각 본다

분석 단위는 같은 관찰 기간의 동의한 유효 세션이다. 광고 관리자 비용/노출/링크 클릭과 GA4 동의 세션은 서로 다른 모집단이므로 일치한다고 가정하지 않는다. 광고 차단, 동의 거부, 테스트 제외, 인증 판정 중 유실을 별도로 표시한다.

1. 광고 유입: 광고 관리자에서 소재별 비용·노출·링크 클릭. GA4에서 `page_view` + `screen=landing`의 유효 세션 수를 대조한다. 클릭→랜딩 비율은 참고 수치로 표시한다.
2. 랜딩 진입: `ui_click` + `landing-a-07/09`(둘러보기), `landing-a-06/08/10`(작성)을 분리한다. 랜딩 예시 투표/댓글은 UI 데모이며 실제 참여 완료로 세지 않는다.
3. 탐색 경로: 랜딩 → feed 페이지뷰 또는 `story_view`. 작성 CTA는 이 경로를 거치지 않을 수 있다.
4. 참여 경로: `vote_submit`, `comment_create_success`, `story_publish_success`를 각각 보고, 이 중 하나 이상 발생한 세션 수도 별도로 낸다. 이벤트 수 합계는 여러 행동을 한 같은 세션을 중복 계산하므로 참여 세션 수로 사용하지 않는다.
5. AI 경로: `ai_entry_click` → `ai_chat_turn1`을 모드/진입 위치/신규·이어하기별로 본다. 투표나 댓글을 선행 필수 단계로 강제하지 않는다. `ai_chat_turn3`, `ai_chat_finish`, `ai_feedback_submit`은 후속 깊이 지표다. 피드백 점수/내용은 GA4에 보내지 않는다.

대표 비교값은 소재별 유효 랜딩 세션, 랜딩 CTA 세션 비율, 참여 완료 세션 비율, 첫 정상 AI 답변 도달 세션 비율이다. 각 비율의 분자·분모·관찰 기간·원자료 개수를 함께 제시한다. 소재 A/B의 캠페인 기간과 광고 관리자 비용을 별도로 맞춰야 비용 대비 성과를 계산할 수 있다.

가입·로그인 성공은 `operation_success`의 작업 종류로 기존 수집하지만, 이번 계정 가드는 인증 상태가 바뀌는 동안 시작/완료 이벤트를 재생하지 않는다. 계정 전환으로 늦어진 작업 결과는 버린다. 따라서 GA4 로그인 완료 횟수를 계정 DB의 신규 가입/인증 성공 수와 같다고 보거나, 엄격한 가입→로그인 필수 순차 퍼널의 분모로 쓰지 않는다. `app_open`·`login_success`는 기존 내부 DB 전용이며 새로 GA4로 보내지 않는다.

## 검증

- PASS: TypeScript `npm run lint`.
- PASS: `npm run build`.
- PASS: 전체 로컬 단위/API 계약 254개. 지정 형식 3계정 비교, 대소문자/공백, 설정 누락/형식 오류, 인증된 신원만 사용, API no-store, 로그인 초기 경합, 계정 교체의 늦은 응답, 로그아웃/재로그인, API 실패, 캠페인 정제·세션 유지·링크 전달 포함.
- PASS: 브라우저 fixture TypeScript 검사.
- BLOCKED: 신규 실제 Chromium 12개 시나리오. 기본 샌드박스가 Chromium 로컬 소켓 생성을 차단했고, 승인된 실행 재시도는 컨테이너 bwrap 설정 오류로 브라우저 시작 전에 실패했다. 테스트 자체 통과로 기록하지 않는다.
- NOT_RUN: 실제 승인 계정 로그인 후 운영 Google 수신 0건 확인, 비제외 대조군 수신, GA4 맞춤 측정기준 등록, 운영 환경변수 적용·배포.

재개 명령: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node node_modules/@playwright/test/cli.js test --config tests/analytics.playwright.config.ts`. 합성 테스트는 Google 로더를 로컬 stub으로 대체하고 외부 요청을 막는다. 실제 GA4 수신 증명이 아니다.

## 근거

- Google 공식 차단 플래그: https://developers.google.com/tag-platform/security/guides/privacy
- Google 이벤트/페이지 설정: https://developers.google.com/analytics/devguides/collection/ga4/reference/config
- 원래 수집·동의 정책: `PLAN.md` 3절과 기존 계측 목록.
