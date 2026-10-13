# 알림·답글 구현 체크리스트 — 2026-10-13

정책 기준은 [PLAN.md](../../PLAN.md)다. 이 문서는 기본 비활성 로컬 초안의 제품 정책 승인과 운영 반영을 구분한다. 출시 완료 기록이 아니다. 기준 소스: `64ba76ebf600619fac6507df3cf8cfa0245bc217` 및 로컬 working tree(14:19 UTC 후속 승인 반영, 새 구현 검증 대기). 아래 운영 상태는 2026-10-13 05:33–05:35 UTC의 읽기 전용 브라우저 확인 결과를 반영한다. 운영 SQL 실행·운영 변경·대화 행 조회는 하지 않았다.

## 요청과 이번 범위

- 앱 내 알림: 내 사연에 달린 댓글, 내 사연 투표 총합 100 미만은 10·20·…·90, 100부터는 100·200·300·…의 100단위, 내 댓글의 답글, 내 댓글 공감. 투표 임계값은 10월 13일 사용자 수정 요청을 반영했다.
- 현재 없는 댓글 답글 기능을 함께 구현해야 한다. 사용자는 YouTube/Instagram을 참고로 들며 한 댓글에 여러 답글을 달 수 있어야 한다고 명확히 했다. 한 댓글당 답글 한 개 제한은 요구가 아니다.
- AI 방은 마지막 대화 기준 6개월 보관, 만료 7일 전 알림, 다시 대화하면 보관 기한 재계산.
- 설명 후 사용자의 진행 지시로 도입 전 댓글·공감 알림을 소급 생성하지 않는 범위까지 확인됐다. 기존 댓글·공감을 삭제하지 않는다. 부재 중 발생할 신규 알림의 30일 보관도 14:19 UTC 후속 승인에 포함됐다.
- 현재는 순수 임계값 함수 외에도 아래 백엔드·프론트엔드·SQL 초안을 작성했다. 기본 플래그가 꺼져 있고 운영에 적용하지 않아 신규 알림·답글이 출시된 상태가 아니다. 새 AI 보관·만료 알림과 30일 정리는 로컬 후속 초안 구현 중이며 운영 보관·삭제·cron은 변경하지 않았다.
- 숫자 판정은 100 미만의 양의 10배수 또는 100 이상의 100배수다. 110·190은 임계값이 아니다. 부정확한 큰 수의 오판을 막기 위해 JavaScript 안전 정수만 허용하고 문자열 등을 변환하지 않는다. 재도달·누락된 임계값 보충·중복 방지 정책을 결정하는 함수가 아니다.

## 로컬 구현 초안과 활성화 경계

- 서버 `NOTIFICATIONS_REPLIES_ENABLED`와 프론트 `VITE_NOTIFICATIONS_REPLIES_ENABLED`는 문자열 `true`일 때만 활성화하며, 미설정은 비활성이다. 검증 없이 플래그를 켜지 않는다.
- `backend/notifications.ts`, `backend/app.ts`: 인증된 알림 목록/미읽음 수/개별·모두 읽음 API, 페이지 입력 검사, 답글 대상 검증·댓글 저장 RPC 연계 초안. 꺼진 신규 API는 `FEATURE_UNAVAILABLE`을 반환한다. 클라이언트가 작성자·알림 수신자·답글 루트를 지정하지 못하게 검사한다.
- `frontend/src/components/NotificationList.tsx`, `MyPageView.tsx`, `frontend/src/lib/notifications.ts`, `notificationModel.ts`: 목록·미읽음·페이지 이동·오류/재시도·읽음·대상 이동 초안. 기능 비활성 시 기존 준비 중 화면을 유지한다. `App.tsx`는 알림 대상 접근을 다시 확인하는 연결을 포함한다.
- `StoryDetailModal.tsx`, `frontend/src/lib/commentThreads.ts`, `frontend/src/types.ts`: 한 댓글 아래 여러 답글, 답글 대상 구분·묶음·삭제 자리 표시의 초안. 묶음·삭제·수신자 동작은 아래 승인 정책 및 최종 구현 결과와 대조해야 한다.
- `backend/supabase/drafts/notifications-replies.sql`: 번호가 붙은 자동 적용 마이그레이션이 아닌 **미적용 초안**. 답글 필드·명시적 조회 투영, 알림/중복 기록·본인 전용 조회, 서버 확정 이벤트 연결, 기존 공개 wrapper 경계 사전 점검을 포함한다. DB 내부 `notification_feature_config.enabled`도 기본 false다. 기존 활동의 알림 백필·AI 테이블/함수·cron 변경을 포함하지 않는다.
- 본인 알림 제외·최초 한 번(once-ever) 중복 억제·직접 답글 대상과 사연 작성자 수신·삭제 자리 및 기존 답글 유지·모두 읽음은 14:19 UTC에 승인됐다. 삭제 자리는 작성자 ID를 지우는 완전 익명화로 설명하지 않는다. 30일 알림 정리와 AI 보관/만료 알림 후속 초안은 구현·검증 중이며 운영 적용 전이다.

## AI 보관·30일 정리 구현 계약 — 로컬 미적용

- 준비 SQL: `backend/supabase/drafts/ai-retention-notifications.sql`. 읽기 전용 사전 검토 보조: `ai-retention-preflight.sql`. 별도 적용 승인용 템플릿: `ai-retention-activation.sql`. 모두 자동 migration 밖의 초안이며 준비 SQL만으로 운영 정리/cron을 실행하지 않는다.
- 신규 메타데이터는 `lastCompletedAt`, `expiresAt`, `retentionVersion`, `retentionBasis`(`completed_turn`/`legacy_updated_at`/`created_at`)다. 정상 답변이 DB에 저장되는 트랜잭션에서 방 잠금 후 DB `clock_timestamp()`로 기한을 정한다. 과거 요청 복구는 같은 메타데이터만 반환하고 연장하지 않는다. 실패/취소/열람/고정/관점 변경도 연장하지 않는다.
- Asia/Seoul 달력 기준 6개월을 더하고 없는 월말 날짜는 해당 월의 마지막 날로 맞춘다. 빈 새 방은 생성 시각부터 6개월(`created_at`)이며 첫 정상 저장 이후 `completed_turn`으로 바뀐다. 만료된 방의 새 턴·조회는 서버/DB의 권위 있는 기한으로 거부한다. 정확한 만료 시점에 접근을 막는 것과 이후 일일 작업의 실제 삭제 시점은 구분한다.
- 경고는 `expiresAt - 7일`부터 현재 `retentionVersion`에 대해서만 유효하다. 새 정상 저장으로 연장되면 이전 세대의 경고는 무효다. 구버전 경고 클릭으로 방을 다시 열지 않고 최신 기한을 확인한다.
- 활성화는 실제 함수/cron fingerprint 확인과 테이블 잠금을 포함하는 별도 승인 트랜잭션이다. 한 번 고정한 DB 시각을 전환 anchor로 저장하고 기존 방의 기한은 `max(대체 기준 + 달력 6개월, anchor + 7일)`로 정한다. 대체 기준은 기존 `updatedAt`, 없으면 `createdAt`이며 과거 정상 대화라고 주장하지 않는다. 유예 대상 경고는 같은 트랜잭션에서 즉시 생성한다. 재실행으로 anchor를 다시 밀지 않는다.
- 알림은 30일이 지나면 읽기 목록에서 제외하고 정리 작업에서 delivery 행을 제거한다. once-ever 중복 방지 ledger는 delivery와 별개로 유지한다. 댓글 공감 ledger만 actor UUID를 key/actor_id에 저장하므로 행위자 삭제 FK로 함께 정리한다. 댓글/milestone key에는 행위자 식별자를 넣지 않아 투표자 삭제 후에도 기존 milestone 기록을 보존한다. 모든 유형의 source/recipient 삭제 연쇄는 별개다. 원문 대화는 알림에 넣지 않는다.
- **제안된 미적용 예약:** 경고/30일 정리용 5분 간격 maintenance와 알림 목록 갱신 시 점검. 기존 일일 AI 정리는 00:01 KST를 유지한다. 5분 예약은 별도 운영 승인 후에만 활성화한다. 작업 장애/지연이 있으므로 정확한 초 단위 경고 도착을 약속하지 않는다.
- `AI_RETENTION_ENABLED`·`VITE_AI_RETENTION_ENABLED`와 AI DB 활성화 gate는 기본 비활성이다. 기존 알림의 서버/프론트/DB gate도 기본 비활성 유지. 기존 운영 `updatedAt` 정책과 00:01 예약은 변경하지 않았다.

## 기준 소스와 로컬 초안에서 확인한 제약

- 기준 소스의 `frontend/src/components/MyPageView.tsx`는 ‘준비 중’이다. 로컬 초안은 플래그 뒤의 알림 목록을 연결하며 운영 화면이 바뀌었다는 뜻은 아니다.
- 기준 소스의 `Comment`에는 답글 필드가 없다. 로컬 `frontend/src/types.ts` 및 SQL 초안은 `replyRootId`·`replyToId`·`deletedAt`을 추가하므로 기존 DB와 호환 순서를 검증해야 한다.
- `backend/app.ts`의 `POST /api/comments`: 인증, 사연 댓글 가능 여부, 콘텐츠 검사, 요청 ID 재시도 처리가 있다. 답글은 부모 존재·같은 사연·접근 가능 여부까지 서버에서 검증해야 한다. 기존 ID 충돌/재시도 계약을 보존한다.
- `frontend/src/App.tsx`: 투표와 댓글 공감은 각각 `vote_story`, `like_comment` RPC를 사용한다. 클라이언트 표시 숫자를 알림 발행 근거로 신뢰하지 않는다.
- `docs/plan-execution/sql/public-content-boundary-draft.sql`: `vote_story`/`like_comment`는 내부 구현을 감싸고 허용된 필드만 반환한다. `read_visible_comments`도 명시적 필드 목록만 반환한다. 10월 10일 적용 완료는 PLAN 최신 기록의 근거이며 파일명의 `draft`를 미적용으로 해석하거나 재실행하지 않는다. 새 답글 필드가 필요하면 조회 투영까지 호환성 검토하되 원형 테이블 조회 fallback을 만들지 않는다.
- `backend/app.ts`: 고정/관점 변경도 `updatedAt`을 바꾼다. 이를 정확한 마지막 대화 시각으로 간주하면 안 된다.
- `backend/supabase/migrations/20260928063805_ai_turn_completion_atomic.sql`: 정상 턴 완료가 `updatedAt`을 갱신하지만 저장된 메시지 시각은 한국 시간 `HH24:MI`로 날짜가 없다. 과거 대화의 정확한 마지막 일시를 이 필드에서 복원할 수 없다.
- 기존 보관은 아래 운영 readback에서 `updatedAt < now() - interval '6 months'`, 매일 한국 시간 00:01 정리로 확인됐다. 전체 purge 함수 본문이 저장소 마이그레이션에 없는 문제는 남아 있으며, 실제 변경 전 권한·의존성과 최신 상태를 다시 대조해야 한다. 운영 마이그레이션은 승인·실행하지 않았다.

## 운영 읽기 전용 확인 — 2026-10-13 05:33–05:35 UTC

운영 관리 화면의 함수 정의·스키마·예약을 읽기 전용으로 확인했다. SQL 실행·저장·삭제는 하지 않았다.

- 운영 함수 정의 화면: `public.purge_stale_ai_personas()`, 인자 없음, PL/pgSQL, `SECURITY DEFINER`, 반환형 `integer`. 아래 본문에는 고정 방 제외 조건이 없다. 본문을 읽은 것이며 호출하지 않았다.

```sql
declare removed integer;
begin
  with gone as (
    delete from public.ai_personas
    where "updatedAt" < now() - interval '6 months'
    returning 1
  )
  select count(*) into removed from gone;
  return removed;
end;
```

- 운영 cron 관리 화면: `purge-stale-ai-personas`, 활성, `1 15 * * *`(UTC, 매일 한국 시간 00:01), 명령 `select public.purge_stale_ai_personas();`. 당시 최근 실행은 2026-10-12 15:01 UTC `succeeded`, 다음 표시는 2026-10-13 15:01 UTC였다. 성공 상태만으로 삭제 행 수나 전체 파기를 증명하지 않는다.
- 스키마 화면에서 `createdAt`/`updatedAt`은 `timestamptz`, `chatHistory`는 `jsonb`로 확인했다. 대화 행은 조회하지 않았다.
- 함수 목록에서 공개 `vote_story`·`like_comment` 반환형은 `jsonb`, 내부 변형은 각각 `stories`·`comments`로 확인했다. 이번 브라우저 확인에서 이 함수들의 본문·전체 ACL·의존성까지 조사한 것은 아니다.
- 실제 purge 본문 미확인이라는 이전 차단은 해소됐다. 코드 버전 관리 정합성, 승인된 새 보관 기준의 구현·격리 시험과 운영 변경 승인은 여전히 별도 조건이다.

## 승인된 제품 정책 — 2026-10-13 14:19 UTC

2026-10-13 14:19 UTC에 제품 담당자가 세 정책 묶음을 승인했다. 앞서 승인된 투표 10·20·…·90/100·200·…·여러 답글·과거 댓글/공감 알림 소급 미생성과 함께 다음 세 묶음을 적용한다.

1. 부재 중에도 앱 내 알림을 저장하고 30일 보관한다. 개별/모두 읽음을 지원한다. 본인 행동은 제외하고 공감은 행위자·댓글 조합 최초 한 번, 사연 투표는 임계값 최초 한 번만 알린다. 취소·재공감/임계값 재도달은 반복 발행하지 않는다.
2. 한 댓글의 여러 답글을 지원한다. 부모 삭제 시 삭제 자리와 기존 답글을 보존한다. 실제 답글 대상 작성자와 사연 작성자에게 알리되 동일 수신자에게 중복 발행하지 않는다. 기존 공개·비공개·블라인드 접근 경계는 유지한다.
3. AI는 마지막 정상 AI 답변이 DB에 저장된 시각부터 달력 기준 6개월이다. 만료 7일 전 안내하며 새 정상 저장으로 연장되면 이전 경고를 무효화한다. 실패·취소·저장 실패·고정/설정/평가 변경은 연장 기준이 아니다. 기존 방은 `updatedAt`을 전환용 대체 기준으로 사용하고 전환일부터 최소 7일 유예한다.

`chatHistory`의 시각만으로 과거 날짜를 복원하거나 `updatedAt`을 정확한 마지막 대화 시각으로 위장하지 않는다. 승인 정책을 운영 적용 사실로 표현하지 않는다. 공개 개인정보 안내의 시행 문구는 실제 rollout·보관/삭제 검증을 기다린다. 이 승인은 운영 보안 마이그레이션·실제 데이터 전환/삭제·배포·commit/push 승인이 아니다.

## 승인 후 구현·검증 순서

- [ ] 14:19 UTC 승인 정책과 초안의 본인 제외·중복 억제·삭제 자리·수신자·읽음/보관 동작을 대조한다. 구현만으로 운영 승인을 대체하지 않는다.
- [ ] 결정 내용을 PLAN에 반영하고 위 운영 함수/cron 근거를 출발점으로, 실제 변경 직전 최신 본문·권한·의존성·예약과 저장소 정합성을 다시 확인한다.
- [ ] SQL 적용 전 현재 `read_visible_comments`·`vote_story`·`like_comment` 본문/서명/권한을 독립 검토하고, 초안이 요구하는 검토 fingerprint와 실제 공개 wrapper 경계가 일치함을 확인한다. 파일명이나 이전 실행 기록만으로 적용하지 않는다.
- [ ] 호환 스키마·API·조회 투영·UI 순서와 롤백을 설계한다. 기존 데이터 삭제나 RLS 완화로 호환성을 해결하지 않는다.
- [ ] 댓글/답글/공감/투표의 서버 확정 상태와 알림 저장을 원자적으로 연결하고 재시도·동시 요청의 중복을 방지한다. 수신자는 서버에서 결정한다.
- [ ] 알림 조회·읽음 변경은 본인만 가능하게 하고 사연/댓글 접근 제한을 목록·미리보기·이동·실시간 신호에 모두 반영한다. 본문/개인 식별자를 GA4에 추가하지 않는다.
- [ ] 승인된 대화 기준을 저장하는 필드와 보관/만료 알림을 함께 설계한다. 동시 대화 완료와 만료 작업이 충돌할 때 오래된 기한으로 삭제·알림하지 않게 검증한다.
- [ ] 격리 시험: 작성자/타인/제3자/비로그인, ID 변조, 교차 사연 부모, 부모 삭제/블라인드/비공개, 알림 무단 읽기·수정, 계정 교체와 늦은 응답.
- [ ] 격리 시험: 댓글 요청 재시도, 공감 취소/재공감, 투표 변경·동시 도달·재도달, 임계값 직전/정확히/직후, 승인된 도입 전 데이터 정책.
- [ ] 시간 시험: 월말·윤년·시간대, 정확한 만료 경계, 7일 전 경계, 00:01 정리와의 관계, 새 대화로 연장, 설정/고정/평가만 변경, 실패·취소·저장 실패, 이전 방 전환, 작업 재실행.
- [ ] 타입·빌드·관련 회귀와 모바일/키보드/뒤로가기·알림 이동 후 접근 재검증. 운영 변경·배포는 승인된 범위에서 별도 검증한다.
- [ ] 본인/타인/비로그인의 알림 RLS·RPC 직접 호출과 소유권 경계, 기존 공개 콘텐츠 경계의 격리 통합 시험을 통과한 뒤 적용 승인·DB/앱 배포 순서·플래그 활성화 승인을 확인한다. 초안 SQL 자동 배포 금지.

## 이전 검증 — 2026-10-13 06:04 UTC 초안 인계

아래 해시·시험 결과는 14:19 UTC 후속 승인 전 코드의 기록이다. 새 AI/30일 정리 초안의 현재 해시나 최종 시험 결과로 재사용하지 않는다.

- 검증 대상 SQL: `backend/supabase/drafts/notifications-replies.sql`, SHA-256 `c4d510e24ee95edaac206d3068804449685c23b1cfcce59bbc8886a7228238d7`. 문서 갱신 시 실제 파일 해시를 대조했다. 이번 문서 갱신은 FK나 코드 변경을 포함하지 않는다.
- PASS: 최종 로컬 `npm run lint`(TypeScript), `npm run build`. 구현 및 통합 검증 결과이며 운영 배포 검증은 아니다.
- PASS: 비REST 회귀 **82/82**. 백엔드 18·프론트 6·임계값 4는 이 합계의 부분집합이므로 더하지 않는다. 임계값은 9/10/11, 29/30/31, 89/90/91, 99/100/101, 109/110/111(비임계값), 199/200/201과 잘못된 입력을 포함한다.
- PASS: 격리 PGlite 0.5.9의 PostgreSQL 18.6 합성 fixture에서 실제 초안 SQL 계약 **42/42**, 검토 fingerprint 미설정 시 적용이 원자적으로 거부되는 시험. 실제 Supabase/PostgREST나 다중 세션 잠금·동시성을 입증하지 않는다.
- 재현 파일: `tests/notifications-replies-pglite.mjs`. 공식 `@electric-sql/pglite@0.5.9`를 격리 설치하고 `PGLITE_PACKAGE_ROOT`를 해당 패키지 경로로 지정해 `node tests/notifications-replies-pglite.mjs`로 실행한다. 앱의 package/lock에 새 런타임 의존성을 넣지 않았다. 계약 원문은 `tests/notifications-replies-contract.sql`이다.
- NOT_RUN: `tests/run-notifications-replies-local.sh`의 Docker 기반 실제 PostgreSQL 경로. 이 환경에는 Docker가 없다. 다중 세션 동시성·실제 Supabase 연동은 후속 게이트다.
- FAIL(시험 시작 조건): 초기 전체 glob 실행에서 REST 시험 진입점 3개가 URL/JWT 환경값 부재로 시작하지 못했다. 앱 assertion에 도달하지 않았으므로 제품 동작 실패로 분류하지 않으며, 전체 glob PASS라고 주장하지 않는다.
- BLOCKED: 렌더된 UI QA. 로컬 Chromium은 소켓 제한, 기존 클라우드 브라우저는 localhost `ERR_CONNECTION_REFUSED` 후 URL 정책 거부로 중단했다. 거부 이후 우회하지 않았다. 화면/스크린샷 PASS는 없으며 실제 렌더·접근성·모바일·계정 교체 검증은 남아 있다.
- PASS: 이번 두 문서의 whitespace 검사. 최종 코드 전체 검사는 위 담당 결과와 별도로 범위를 구분한다.
- NOT_RUN: 운영 적용·실서비스 통합·커밋·push·배포. 서버/프론트/DB 3개 장치는 모두 기본 비활성이다. 운영 DB·Auth·삭제·백필·예약 변경은 없다.

## 당시 릴리스 감사 — 2026-10-13 14:19 UTC 승인 이후, 14:41 UTC 기록

- 정책 승인: PASS. 위 승인 날짜와 범위에 따라 세 묶음 확정. 운영 적용 승인은 별개다.
- 로컬 변경: 구현 초안 작성, 기본 비활성·미적용. 위 AI/알림 계약을 코드에 반영했으며 최종 SQL 해시/격리 계약·타입·빌드·비REST 회귀를 아래에서 확인했다.
- 최종 통합 확인(14:41:43 UTC): `npm run lint`·`npm run build`·`git diff --check` PASS, SQL 해시가 독립 검증본과 일치. 최종 비REST 합계 **103/103 PASS**. 기본 비활성 빌드와 `VITE_AI_RETENTION_ENABLED=true VITE_NOTIFICATIONS_REPLIES_ENABLED=true` 빌드 모두 PASS다. 프론트 22개(React SSR 3개 포함)는 부분집합으로 별도 합산하지 않는다.
- 최종 격리 DB 계약: PASS. 독립 검증에서 AI 89 assertions·알림 42 및 기존 quota/completion/feedback 계약 통과. 실제 10표 도달 후 투표자 삭제·재도달에도 이벤트 한 번 유지, 활성화 승인 거부 gate를 포함한다. 실제 cron 활성화·Supabase REST·다중 세션 동시성은 NOT_RUN이다. 전환 시 이미 대기 중인 구형 cron과의 경쟁은 방어 설계만 있으며 다중 세션 안전성이 입증된 것은 아니다.
- 최종 검증 SQL SHA-256: AI `09f8b83e02c90bcf6f1d8fd022f7a8afbb369c245a280f13dde56598bff647e3`, 알림 `c7c02f7d62577a6f399f819098685c468f6453442c862c03c1938094660af15e`. 현재 파일과 일치함을 대조했다. 당시 활성화 템플릿 SHA-256 `3b5c89b9530fad03c271ff7f04564420ff45f6502f1a028d87392817a06a48fb`(아래 cron 권한 수정 전), preflight `952358522d883a2db66a273560812b0e6a7a1bfdbdb7cfa47aff7ac36ec2c9c7`도 최종 검증 값이다. 앞선 06:04 UTC 해시와 구분한다.
- 후속 계약 파일: `tests/ai-retention-contract.sql`, `tests/notifications-replies-contract.sql`. 재현 하네스 `tests/ai-retention-pglite.mjs`, `tests/notifications-retention-regression-pglite.mjs`가 추가됐다. 실제 Docker 경로 `tests/run-ai-retention-local.sh`는 shell syntax PASS지만 Docker 부재로 실행 NOT_RUN이며 실제 PostgreSQL 다중 세션 검증으로 확대하지 않는다.
- 브라우저·모바일·상호작용 접근성·계정 전환·만료 안내 및 알림 이동: BLOCKED/NOT_RUN. React SSR 검사는 HTML 생성 확인이며 실제 브라우저 상호작용 검증이 아니다. 앞선 렌더 환경 차단은 해소되지 않았다.
- 실제 운영 wrapper/AI 완료 함수/purge/ACL/의존성/cron 재대조: PENDING. 기존 운영 purge 근거는 05:33–05:35 UTC 기록이며 변경 전 재확인이 필요하다.
- 운영 적용·백필/기존 방 전환·실제 삭제·배포·플래그 활성화·commit/push: NOT_RUN / 별도 승인 필요. 기본 비활성을 유지한다.
- 당시 검증용 브랜치/CI: 준비 중이었다. 이후 실행·통과 결과는 아래 16:55 UTC 최종 격리 CI 항목을 따른다.
- 공개 개인정보 안내 게시/시행 상태 전환: NOT_RUN. 실제 rollout·처리 사실 확인 후 진행한다.

### 남은 출시 조건

승인 정책에 맞춘 후속 구현의 실제 파일·해시·검증 결과를 확정하고 기본 비활성을 확인한다. 실제 운영 함수 본문·권한·fingerprint 일치, 본인/타인/비로그인 RLS·RPC 경계, 다중 세션 동시성, 시간 경계/기존 방 유예, 실제 브라우저와 전체 검사를 확인한 뒤(별도 검증 환경/CI 사용 승인이 필요한 경우 먼저 확보), 5분 maintenance 예약을 포함해 운영 적용·기존 데이터 전환/삭제·배포·활성화 승인을 별도로 받는다. 이전 합성 시험 통과를 이 게이트의 완료로 확대하지 않는다.


## 격리 CI cron 권한 수정 — 2026-10-13 16:49 UTC

- 실제 Supabase 이미지 검증에서 `postgres`는 `cron.job` SELECT만 허용되어, 활성화 초안의 `SELECT FOR UPDATE`가 실패했다. 이는 테스트용 권한 부족을 임의로 풀 문제가 아니라 운영자 권한 경계를 잘못 가정한 초안 결함이다.
- 활성화 트랜잭션을 SERIALIZABLE로 명시하고 일반 SELECT 및 기존 `cron.alter_job` API를 사용한다. 이미 쿼리를 실행한 낮은 격리 수준의 트랜잭션은 PostgreSQL이 격리 수준 변경 단계에서 거부하며, 본문에서도 SERIALIZABLE 여부를 검사한다. 동시 cron 변경은 SQLSTATE 40001로 전체 활성화를 중단해야 하며, 운영자는 변경된 메타데이터를 재검토한 뒤 재시도를 판단한다. 테이블 권한 추가·역할 상승·운영 실행은 없다.
- 초안 SHA-256: `f56d726e50781f48bd887cd9294b8dbf664f5ca9e8d54bf6cad12fb23bc10140`. 기존 알림/AI 준비 SQL 및 preflight 내용은 바뀌지 않았다.
- 로컬 PGlite 89개 계약 및 기존 READ COMMITTED 트랜잭션 거부 검사 통과. 별도 연결의 `cron.alter_job` 변경 커밋과 활성화의 직렬화 실패·전체 롤백을 검사하는 회귀를 추가했으며, 실제 다중 연결 결과는 다음 격리 CI에서 확인해야 한다.
- 근거: [공식 이미지 권한 초기화](https://github.com/supabase/postgres/blob/17.6.1.171/migrations/schema-15.sql), [pg_cron 변경 API 구현](https://github.com/citusdata/pg_cron/blob/v1.6.4/src/job_metadata.c).

## 최종 격리 CI 확인 — 2026-10-13 16:55 UTC

- 검증 코드: `e063de3e96d53f737db9d29afa438cb6045f8502`, 브랜치 `codex/notifications-validation-20261013`. [GitHub Actions 실행 38434219844](https://github.com/jjackbb/thinkerbell/actions/runs/38434219844)의 모든 단계가 success로 완료됐다. 이 문서 갱신은 해당 코드 검증 결과를 기록하며 코드 변경을 포함하지 않는다.
- PASS: 앱 TypeScript, 비REST 단위 회귀 **103/103**, 브라우저 fixture TypeScript, 실제 Chromium 데스크톱/모바일 **26/26**. 알림 읽음·페이지 재시도·계정 교체·실제 App의 오래된 이동 차단·접근/댓글 변경·AI 만료/소유권/세대 확인·여러 답글·중복 제출·게스트·기본 키보드/가로 넘침의 작성된 시험 범위다. 전 제품 UX·실물 모바일·Safari·모든 접근성의 전수 통과를 뜻하지 않는다.
- PASS: 실제 Supabase PostgreSQL 17.6 이미지의 기존 알림/AI SQL 계약, PostgREST 본인/타인 조회·읽음 변경·테이블 ACL·실제 RLS·서비스 전용 RPC 차단, 독립 세션의 동일 ID 답글·투표 임계값·대화 완료 재시도·잠긴 만료 행·삭제/완료 경쟁. DB 하네스 **26개 체크포인트**에는 준비 상태·기존 SQL 계약 묶음도 포함되므로 개별 SQL assertion 수와 합산하지 않는다.
- PASS: cron 운영자 SELECT·지원 API 권한과 직접 UPDATE 권한 부재, 동시 cron 변경 시 SQLSTATE 40001, 활성화 설정/방/알림/예약 전체 롤백, 합성 cron 전환, 먼저 대기하던 구형 purge의 유예 방 보존, 유예 알림 1회 저장. 이 cron 변경은 매 실행 새로 만든 합성 DB에만 적용했다.
- 이전 실패는 이력으로 유지한다. `de86f766`은 DB 초기화 경합과 브라우저 중복 선택자, `bc5f097`은 내부 네트워크 포트 게시 가정, `17277099`는 cron 직접 행 잠금 권한 가정 때문에 실패했다. 각각을 보완하고 최종 코드에서 전체 실행을 재통과했다.
- 출시 게이트: 운영 함수/ACL/의존성/cron 최신 readback·실제 운영 데이터 전환/삭제·배포·플래그 활성화·공개 개인정보 안내 시행은 여전히 별도 승인/검증 대기다. 기본 비활성과 검증 브랜치의 Vercel 자동 배포 차단을 유지한다. 격리 CI 통과를 운영 적용 완료로 해석하지 않는다.
