# 2026-10-14 코드 점검 결과: 백엔드·DB 담당 확인 요청

## 요약

2026-10-14에 `main`(`d3f95dc` 기준) 백엔드·프론트엔드 코드를 읽기 전용으로 점검했다. 서비스가 멈추거나 비밀값이 노출되는 문제는 찾지 못했다. 다만 **AI 비용 누수, 익명성 약화, 배포 산출물 노출**처럼 백엔드·DB에서 정해야 할 항목이 남았다. 이 문서는 그 항목을 우선순위대로 넘긴다.

프론트엔드만으로 고칠 수 있는 항목은 프론트 담당이 따로 진행한다(맨 아래 표 참고).

## 확인 범위

| 확인 | 결과 |
|---|---|
| `npm run lint` (타입 검사) | 통과 |
| `npm audit --omit=dev` | 취약점 0건 |
| `tests/*.test.mjs` | 122개 중 119개 통과. 실패 3개(`public-content-boundary-rest`, `story-delete-rest`, `vote-story-rest`)는 격리 PostgREST용 환경변수가 없어 실행되지 않은 것. `tests/run-*-local.sh`(Docker) 경로는 **NOT_RUN** |
| 운영 DB RLS·grant 실제 상태 | **NOT_RUN**. 아래 DB 항목은 저장소 migrations 기준 판단 |
| Vercel 운영·Preview 환경변수, 배포 URL 응답 | **NOT_RUN** |

## 먼저 검토해 주세요: 커밋하지 않은 로컬 백엔드 변경 2건

프론트 담당이 점검 후 아래 두 건을 **로컬에서만** 수정했다. 커밋·push·배포는 하지 않았다. 백엔드 담당이 리뷰한 뒤 반영해 주세요.

### A. 화면에서 쓰지 않는 공급자 엔드포인트 제거

- **무엇을:** `backend/app.ts`에서 `POST /api/chat`(비스트리밍)과 `POST /api/sanitize-text`를 삭제했다. 테스트 `tests/ai-room-create.test.mjs`도 함께 고쳐, 두 경로가 404이고 공급자를 호출하지 않는지 확인하도록 했다.
- **왜:** 프론트엔드 어디에서도 호출하지 않는데(grep 확인) 로그인만 하면 Potens를 부를 수 있었다. `/api/sanitize-text`는 프롬프트 주입으로 범용 LLM 프록시처럼 쓸 수 있었다. `/api/chat`은 길이 제한·할당량 검사가 없었다.
- **확인:**
  - 로컬 서버에서 두 경로는 404를 반환했다.
  - `/api/chat-stream`은 비로그인 요청에 401을 반환했다.
  - 테스트는 통과했다.

### B. 스트림 도중 이용자가 연결을 끊으면 할당량 차감

- **무엇을:** `streamServerAiTurn`(`backend/app.ts`)이 `res.on("close")`로 이용자 연결 종료를 기록하고, 텍스트 청크가 실제로 전달됐는지 추적한다. 예약을 정리할 때 다음과 같이 처리한다.
  - 이용자가 연결을 끊었고, 답변이 1청크 이상 전달됐고, 공급자가 아직 완료되지 않았다면 → `finish_ai_first_reply(p_success=true)`로 차감한다.
  - 그 밖의 실패(공급자 오류, 45초 타임아웃, `complete_ai_turn` 저장 실패, 첫 청크 전 취소) → 기존대로 `p_success=false`로 반환한다.
- **왜:** 이전에는 모든 비정상 종료가 반환으로 처리됐다. 그래서 답변을 거의 다 받은 뒤 끊고 새 `requestId`로 다시 요청하면, 남의 사연 AI 하루 3회 제한을 무한히 우회할 수 있었다.
- **정책:** 사용자가 2026-10-14에 결정했다. `PLAN.md` 2절 "가입·투표·AI 이용 규칙"의 해당 문장도 같은 내용으로 고쳤다(커밋 전).
- **영향:**
  - 차감된 방은 `ai_quota_completed_rooms`에 들어간다. 그래서 같은 방에서 이어서 대화해도 추가 차감되지 않는다.
  - 끊긴 부분 답변은 대화 기록에 저장하지 않는다.
  - DB 함수는 변경하지 않았다.
- **확인:**
  - `tests/ai-chat-server-turn.test.mjs`에 시험 2개를 추가했다.
    - 텍스트를 받은 뒤 끊으면 `completed`가 된다.
    - 텍스트 전에 끊으면 `returned`가 된다.
  - 변경 전 코드에서는 앞의 시험이 실패하고, 변경 후 통과하는 것을 확인했다.
  - 실제 계정·운영 DB로 연결을 끊는 시험은 **NOT_RUN**이다.
- **리뷰 포인트:**
  - Vercel 서버리스 환경에서 클라이언트 연결 종료가 `res.on("close")`로 전달되는지 확인이 필요하다. 전달되지 않으면 기존 동작(반환)과 같아질 뿐 더 나빠지지는 않는다.
  - 프록시 버퍼링으로 "전달됨" 판정이 실제 화면 표시보다 앞설 수 있다.

## 백엔드·DB 확인 요청 (우선순위순)

### 1. Potens 호출 엔드포인트에 계정·IP별 호출 제한이 없음 — 높음

- **위치:** `POST /api/stories`(`backend/app.ts:875`), `POST /api/comments`(`:965`), `PUT /api/comments/:id`(`:1032`)
- **문제:** 요청마다 Potens 검사를 호출하는데 호출 횟수 제한이 없다. 로그인 계정 하나로 반복 호출하면 그만큼 공급자 비용과 일일 한도가 소모된다.
- **방향:** 계정 기준(예: 1분 N회, 1일 M회)으로 제한하고, 초과하면 429를 반환한다. 프론트는 이미 오류 코드별 입력 보존을 하므로 안내 문구만 추가하면 된다.
- **결정 필요:** 제한 값. 저장 위치(DB 테이블·함수 vs 메모리)도 정해야 한다. Vercel 서버리스는 인스턴스 간에 메모리를 공유하지 않는다.

### 2. 사연 검사 모델 하드코딩, 공급자 호출 타임아웃 없음 — 중간

- **위치:** `checkStoryContent`(`backend/app.ts:352`, 모델 `:377`), `sanitizeCommentText`(`:817`)
- **문제:**
  - 사연 검사는 `POTENS_MODEL`을 무시하고 `"claude-4-6-sonnet"`를 고정해서 쓴다.
  - 검사·댓글 호출에는 AbortController 타임아웃이 없다. 공급자가 응답하지 않으면 함수 최대 실행 시간까지 붙잡힌다.
- **방향:** `POTENS_MODEL`을 사용하고(검사 전용 모델이 필요하면 별도 env), 스트림처럼 타임아웃을 둔 뒤 503 `CONTENT_CHECK_UNAVAILABLE` 계열로 실패를 처리한다.

### 3. 공개 조회에 `authorId` 노출 → 익명성 약화 — 높음(운영 DB 확인 필요)

- **근거(저장소 기준):**
  - `stories_select_visible`, `comments_select_visible` 정책(`20260928063512_story_author_private_access_boundary.sql`)은 행만 거르고 컬럼은 제한하지 않는다.
  - `projectComment`(`backend/notifications.ts:32`)가 `authorId`를 그대로 반환한다.
  - `like_comment`도 댓글 행 전체를 반환한다.
- **시나리오:** 비로그인 방문자가 REST로 사연·댓글을 조회해 같은 UUID를 묶으면, 한 계정이 쓴 글을 모두 연결할 수 있다. 화면의 "익명 N" 표시가 무의미해진다.
- **방향:**
  1. 운영 DB에서 anon 역할로 `stories`·`comments` 조회 시 `authorId`가 오는지 읽기 전용으로 확인한다.
  2. 노출된다면 공개 조회를 `authorId`를 뺀 뷰나 서버 API로 옮기고, 본인 여부는 서버가 `isMine` 같은 불리언으로 내려준다.
- **영향:** 프론트의 "내 글" 판정, 실시간 구독, 신고·숨김 경로가 `authorId`에 기대고 있을 수 있다. 변경 범위가 가장 크다.

### 4. 빌드 산출물에 서버 번들·sourcemap이 공개 정적 파일로 섞임 — 중간

- **근거:**
  - `npm run build`는 `vite build`가 `dist/`를 비운 뒤, esbuild가 `dist/server.cjs`와 `dist/server.cjs.map`을 만든다.
  - `vercel.json`의 `outputDirectory`가 `dist`다.
  - 로컬 빌드에서 두 파일이 `dist/`에 있는 것을 확인했다.
- **시나리오:** `https://<도메인>/server.cjs.map`으로 백엔드 원본(검사 프롬프트, 이메일 검증 흐름 등)을 내려받을 수 있다. 비밀값은 런타임 env라 포함되지 않는다.
- **방향:**
  1. 운영 URL에서 실제로 받아지는지 먼저 확인한다.
  2. 서버 번들 출력 경로를 `dist/` 밖(예: `build/server.cjs`)으로 옮기고 `start` 스크립트를 맞춘다. Vercel은 `api/index.ts`를 쓰므로 `server.cjs`가 필요 없을 수 있다.

### 5. 공감 비율 변경 시 고유 인덱스 충돌이 500으로 응답됨 — 중간

- **위치:** `PATCH /api/ai/rooms/:id/ratio`(`backend/app.ts:625`, 오류 처리 `:650`)
- **문제:** 같은 사연에 High 방과 Middle 방이 이미 있을 때 High를 Middle로 바꾸면 `ai_personas_explanation_choice_unique`(23505) 위반이 난다. 이것이 `CHAT_ROOM_SAVE_FAILED` 500으로 내려가 이용자에게는 서버 오류로 보인다. 점검 중 코드로 확인했고, 실제 재현은 **NOT_RUN**이다.
- **방향:** 23505는 409 `AI_ROOM_CHOICE_EXISTS`로 바꾸고, 기존 방 ID를 함께 내려준다. 프론트는 이 코드를 받으면 "이미 있는 대화로 이동" 안내를 붙인다(프론트 담당).

### 6. LLM 검사 출력을 저장 본문으로 그대로 사용 — 중간

- **위치:** `checkStoryContent`의 `sanitizedText`, `sanitizeCommentText`의 반환값
- **문제:**
  - 모델 출력이 그대로 사연·댓글 본문이 된다. 그래서 본문에 프롬프트 주입을 넣어 `isAdult:false`를 유도하거나 내용을 바꿔치기할 수 있다.
  - 모델이 설명 문장을 덧붙이면 그 문장이 그대로 저장된다.
- **방향:** 원문과 비교해 검증한다(길이 차이 상한, 바뀐 부분이 마스킹 문자뿐인지). 어긋나면 검사 실패로 처리한다(안전 판정으로 넘기지 않는 기존 원칙 유지).

### 7. `increment_story_view` 무제한 호출 — 낮음

- **위치:** `20260818020000_report_policy.sql:53`, anon에게 실행 권한(`:205`)
- **문제:** 호출 제한이나 공개 여부 검사가 없다. 그래서 조회수를 임의로 부풀릴 수 있다. 랭킹이 조회수를 쓴다면 영향이 있다.
- **방향:** 세션·계정별 중복 제한, 비공개·블라인드 사연 거부.

### 8. 자체 서버 프로덕션에서 없는 `/api/*` GET이 200 HTML — 낮음

- **위치:** `backend/server.ts:22` `app.get("*")`
- **문제:** 존재하지 않는 API가 404 JSON 대신 `index.html`을 반환한다. Vercel은 `/api/(.*)` rewrite로 Express 404가 나므로 해당되지 않는다. `NODE_ENV=production npm start` 경로에만 해당한다.
- **방향:** catch-all 앞에 `/api` 404 처리를 둔다.

### 9. 남은 레거시 경로 정리 — 낮음

- **문제:**
  - `POST /api/comments`의 고정 값 `anonymousId: "익명 0"`(`backend/app.ts:1000`)
  - 브라우저 직접 쓰기가 닫힌 `ai_chat_usage` 기반 레거시 할당량 경로
- **방향:** 운영 플래그(`AI_QUOTA_ACTIVATES_AT` 등)가 서버 모드로 넘어간 것을 확인한 뒤 삭제한다.

## 팀 결정·운영 확인이 필요한 항목

| 항목 | 내용 |
|---|---|
| migrations 원본 여부 | `CLAUDE.md`는 `backend/supabase/migrations/`를 DB 원본이라 하지만, `20260929210710_close_browser_direct_writes.sql` 머리말은 "과거 migrations 파일은 운영 이력과 버전이 일치하지 않으므로 폴더 전체를 자동 적용하지 않는다"고 적고 있다. 어느 쪽을 기준으로 할지 정하고 문서를 맞춰야 한다 |
| `inquiries` 테이블 정책 | migrations에 없다. 그래서 1:1 문의의 RLS(본인만 조회, 운영자 답변 권한)를 저장소에서 확인할 수 없다 |
| `ai_personas` 삭제 정책 | 프론트의 "AI 대화를 모두 지웠습니다"가 실제 삭제를 보장하는지는 운영 DB의 DELETE 정책에 달려 있다 |
| 운영 env 값 | `AI_QUOTA_ACTIVATES_AT`, `AI_QUOTA_SERVER_READY`, `AI_RETENTION_ENABLED`의 Production·Preview 값 |
| Preview 배포 | `vercel.json`은 브랜치 1개만 배포를 끈다. 다른 브랜치 push가 Preview로 배포될 때 운영 Supabase secret key를 공유하는지 확인이 필요하다 |
| 함수 실행 시간 | `maxDuration` 미설정. AI 스트림은 공급자 45초에 저장 시간까지 더해진다 |

## 프론트 담당이 진행하는 항목 (참고)

아래는 백엔드·DB 변경 없이 프론트에서 고친다. 서버 응답 형식이나 정책에 기대는 부분이 있으면 따로 공유한다.

| 항목 | 위치 |
|---|---|
| 밸런스 게임: 서버 확인 전 "확정" 알림, 중복 요청, 원문 오류 노출 | `frontend/src/components/BalanceGameSection.tsx` |
| AI 대화·문의 답변 삭제·저장 후 실제 반영 행 수 확인 | `frontend/src/lib/aiPersonas.ts`, `frontend/src/lib/inquiries.ts` |
| 레거시 AI 횟수 표시(직접 insert 실패 → localStorage 숫자) 정리 | `frontend/src/lib/aiQuota.ts`, `frontend/src/App.tsx` |
| 브라우저 기본 `alert`/`confirm`을 앱 확인 창으로 교체 | `MyPageView.tsx`, `App.tsx`, `StoryDetailModal.tsx` |
| 토스트 타이머 겹침 | `frontend/src/App.tsx` |
| 운영자 "내 문의"에 전체 문의가 보이는 조회 조건 | `frontend/src/lib/inquiries.ts` (`fetchMyInquiries`) |
| 분석 이벤트의 `user_id`·투표 방향 저장 vs 동의 문구 | `frontend/src/lib/events.ts`. DB 정책상 `user_id` null 허용. 분석 담당과 합의 후 진행 |
| 탈퇴 사유 입력값 미사용 | `MyPageView.tsx`. 저장하려면 DB 변경이 필요하므로, 입력 칸 제거 여부를 먼저 결정 |
| 미사용 코드(`mockData` import, `AdultVerificationModal`, 닫힌 직접 저장 예비 경로) 정리 | `App.tsx`, `AIChatView.tsx`, `aiPersonas.ts` |
