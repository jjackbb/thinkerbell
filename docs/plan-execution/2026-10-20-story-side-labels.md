# 2026-10-20 니 편·내 편 역할 이름: 백엔드·DB 적용 요청

## 요약

사연 작성 화면에 **니 편·내 편 역할 이름**을 적는 칸을 추가했다. 두 칸 모두 선택 사항이고 최대 10자다. 적으면 투표 버튼 '니 편/내 편' 아래 작은 글씨로 보인다(예: 니 편 / 직장동료, 내 편 / 신입사원).

프론트 담당이 화면·서버 코드와 DB 추가 SQL을 **로컬에서만** 준비했다. 운영 DB 적용, 조회 함수 수정, 커밋·배포는 하지 않았다.

## 먼저 결정해 주세요: 10/16 결정과 충돌

[2026-10-16-vote-bar-only-scope.md](2026-10-16-vote-bar-only-scope.md)에서 "피드·상세의 니 편/내 편 버튼 문구를 원래대로 되돌리고 작성자/상대방 보조 설명을 뺀다"고 정했다.

이번 기능은 버튼에 보조 글씨를 다시 붙인다. 차이는 아래와 같다.

- **역할이 없는 사연:** 버튼 마크업이 이전과 똑같다. 기존 테스트 `feed and detail keep the original vote button wording…`이 그대로 통과한다.
- **역할이 있는 사연:** 고정 문구("작성자/상대방")가 아니라 작성자가 적은 역할만 보인다.

당시 리뷰에서 보조 설명을 뺀 이유와 맞는지 확인이 필요하다.

## 변경 내용 (로컬, 미커밋)

| 영역 | 파일 | 내용 |
|---|---|---|
| DB | `backend/supabase/migrations/20261020120000_story_side_labels.sql` | `stories."sideLabelA"`(내 편), `"sideLabelB"`(니 편) text 칸과 1~10자 제약 추가. **미적용** |
| 서버 | `backend/app.ts` | 아래 4가지 동작을 추가했다. 표 아래에 정리했다 |
| 화면 | `CreateStoryModal.tsx`, `App.tsx`, `types.ts` | 선택 입력 2칸, 요청에 포함. 역할이 빠진 채 저장되면 그 사실을 안내 |
| 화면 | `SideVoteLabel.tsx`, `StoryCard.tsx`, `StoryDetailModal.tsx` | 역할이 있을 때만 버튼에 두 번째 줄 표시 |
| 테스트 | `tests/story-save-idempotency.test.mjs`, `tests/ui-clarity-render.test.mjs` | 저장·검사·10자 제한·칸 없음 대비, 버튼 표시 |

**서버(`backend/app.ts`) 동작**

- **입력 검사:** `POST/PUT /api/stories`가 `sideLabelA/B`를 받는다. 공백을 정리하고, 10자를 넘으면 400 `INVALID_STORY_CONTENT`로 거절한다.
- **비속어 검사:** 입력한 칸만 기존 댓글 비속어 검사(`sanitizeCommentText`)를 거친다. 검사에 실패하거나 결과가 10자를 넘으면 `CONTENT_CHECK_FAILED`로 처리한다(안전 판정으로 넘기지 않음).
- **저장:** 역할을 입력했을 때만 insert에 넣는다. 수정(PUT)은 빈 칸을 null로 저장한다.
- **칸 없음 대비:** DB에 칸이 없으면(`PGRST204`/`42703`이고 메시지에 `sideLabel` 포함) 역할만 빼고 다시 저장한다. 그래서 마이그레이션 전에 배포돼도 사연 등록은 실패하지 않는다.

## 적용 순서 (백엔드·DB 담당)

1. 마이그레이션 SQL을 검토하고 운영 DB에 적용한다. 추가만 하며 기존 행은 바뀌지 않는다.
2. **조회 함수 수정이 필요하다.** `public.read_visible_stories`는 반환 칸을 하나씩 나열(`jsonb_build_object`)하므로, 칸을 추가해도 다른 이용자에게는 역할이 보이지 않는다.
   - 운영 DB의 **현재 정의**를 기준으로 다음 두 항목을 추가해 다시 만든다.
     ```sql
     'sideLabelA', s."sideLabelA",
     'sideLabelB', s."sideLabelB",
     ```
   - 저장소의 `docs/plan-execution/sql/public-content-boundary-draft.sql`은 초안이라 운영 정의와 다를 수 있다. 추측으로 덮어쓰지 않도록 수정 SQL은 넣지 않았다.
   - `vote_story`, `like_comment`, `set_story_visibility` 래퍼도 이 함수 결과를 반환하므로 함께 반영된다.
3. 서버·화면 코드를 리뷰하고 배포한다. 1·2 전에 배포해도 등록은 정상이고, 역할만 저장·표시되지 않는다.
4. 실제 계정으로 확인한다.
   - 역할을 넣은 사연을 등록·수정한다.
   - 다른 계정에서 피드·상세 버튼에 역할이 보이는지 본다.
   - 역할을 비우면 버튼이 '니 편/내 편'만 남는지 본다.

## 확인 범위

| 확인 | 결과 |
|---|---|
| `npm run lint` | 통과 |
| `tests/story-save-idempotency.test.mjs` | 8/8 통과 (역할 저장, 빈 칸 미전송, 10자 초과 거절, 칸 없는 DB 대비) |
| `tests/ui-clarity-render.test.mjs` | 11/11 통과 (역할 표시, 역할 없을 때 기존 문구 유지) |
| 전체 `tests/*.test.mjs` | 289개 중 279개 통과. 실패 10개는 변경 전부터 실패하던 테스트다(격리 PostgREST 환경 필요 3개, `gemini-routes` 7개) |
| 운영 DB 마이그레이션·조회 함수 수정 | **NOT_RUN** (이 환경에 관리자 키 없음) |
| 실제 계정 등록·표시, 브라우저 e2e | **NOT_RUN** |

## 한계·비용

- 역할 비속어 검사는 칸마다 공급자를 한 번 더 부른다. 두 칸을 모두 쓰면 등록 한 번에 최대 3회 호출된다. 사연 검사 프롬프트에 역할을 합치면 1회로 줄일 수 있지만, Potens·Gemini 검사 스키마를 함께 바꿔야 해서 이번에는 하지 않았다.
- 결과 공유 이미지(`shareCard.ts`)와 랭킹 카드에는 역할을 넣지 않았다.
