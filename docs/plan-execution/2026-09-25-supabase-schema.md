# 니편내편 운영 Supabase 구조 확인 — 2026-09-25

이 문서는 [PLAN.md](../../PLAN.md) 4절의 환경 확인을 위한 **적용 전 시점의 읽기 전용 구조 조사**입니다. 조회 대상은 `supabase_thinkerbell` MCP에 고정된 프로젝트 `vzhyhadjtaqbapicjrco`입니다. 연결 URL에는 `read_only=true`와 `features=database,docs`가 설정돼 있습니다. 이 조사에서는 운영 데이터의 본문·이메일·대화 원문을 반환받거나 기록하지 않았고, SQL 쓰기·마이그레이션 적용도 하지 않았습니다. 이후 숨김 사연 삭제와 개인 숨김 테이블 적용 결과는 [후속 기록](2026-09-25-story-hides-applied.md)에 있습니다.

## 확인된 운영 구조

| 항목 | 실제 확인 | 판정 범위 |
|---|---|---|
| 연결 | 니편내편 전용 MCP의 테이블·마이그레이션·SQL 메타데이터 조회 성공 | 프로젝트 ref가 고정된 연결의 읽기 성공. 앱의 사용자 인증 성공은 아님 |
| `public` 테이블 | `stories`, `comments`, `votes`, `reports`, `ai_chat_usage`, `ai_personas`, `inquiries`, `admins`, `balance_votes`, `events`의 10개 | 현재 구조 목록. 데이터 내용은 읽지 않음 |
| RLS | 10개 테이블 모두 활성화 | 정책이 PLAN의 권한 계약을 모두 만족한다는 뜻은 아님 |
| 마이그레이션 이력 | 운영 DB에 16개 기록 | 저장소의 파일명·내용과 별도 대조 필요 |
| 앱이 쓰는 RPC | `vote_story`, `like_comment`, `submit_report`, `submit_appeal`, `increment_story_view`, `is_admin`, `balance_game_state`, `vote_balance_game`, `delete_my_account` 존재 | 함수 존재·정의 조회. 익명·작성자·타인 역할의 실제 API 동작 시험은 NOT_RUN |

운영 마이그레이션 ID와 이름은 다음과 같습니다. 저장소의 [SQL 폴더](../../backend/supabase/migrations/)에는 8개 파일이 있으나 **정확히 일치하는 버전 ID가 0개**입니다. 파일이 없다는 이유로 이미 운영에 있는 구조를 새로 만들거나, 로컬 파일을 운영 이력과 동일한 것으로 간주하면 안 됩니다.

| 운영 버전 | 이름 |
|---|---|
| `20260817120214` | `tighten_rls` |
| `20260817133311` | `votes_table` |
| `20260817154552` | `comment_anon_id` |
| `20260817155316` | `backfill_comment_anon_id` |
| `20260817161241` | `report_policy` |
| `20260817164732` | `issue_summary` |
| `20260819163208` | `create_ai_chat_usage` |
| `20260820133526` | `create_ai_personas` |
| `20260820140409` | `purge_stale_ai_personas` |
| `20260820142527` | `delete_my_account` |
| `20260820142541` | `create_inquiries` |
| `20260820144233` | `inquiry_replies_and_admins` |
| `20260824044747` | `link_story_children_with_foreign_keys` |
| `20260824061002` | `drop_issue_summary_columns` |
| `20260825101832` | `balance_game_votes` |
| `20260901184418` | `events` |

## PLAN과 대조해 확인한 차이

| 영역 | 운영 DB에서 확인한 사실 | PLAN에 따른 후속 작업 |
|---|---|---|
| 로컬 정의 누락으로 분류됐던 구조 | `ai_chat_usage`, `ai_personas`, `inquiries`와 `balance_game_state`, `vote_balance_game`, `delete_my_account`, `is_admin`는 운영 DB에 존재 | [기존 감사](../release-improvement/audit-evidence.json)의 `remote existence is UNKNOWN`은 이번 조회로 해소. 새 생성 SQL을 추측하지 않고 현재 컬럼·정책에 맞춰 변경 설계 |
| 비공개·개인 숨김 | `stories`에 `public/private` 상태 컬럼이 없고, 사용자별 숨김 관계 테이블도 없음. `isHidden`은 사연 행의 단일 불리언 컬럼. 현재 앱의 `handleHideStory`는 이 공용 값을 먼저 바꾸고 서버 오류를 확인하지 않음 | 사용자 확정: 개인 숨김은 숨긴 이용자에게만 적용, 작성자 비공개는 다른 모든 이용자에게 게시글을 숨기고 작성자 전용 공간으로 이동. 기존 `isHidden` 데이터의 뜻과 이관 방식은 여전히 결정·검증 필요 |
| 공개 조회 정책 | `stories`·`comments`에 익명 역할의 `SELECT` 권한이 있고 RLS 조회 정책 조건은 모두 `true` | 비공개 원문·댓글, 성인 판정 사연의 직접 API 조회 차단은 현재 정책만으로 보장되지 않음. 새 상태·정책·RPC를 함께 설계하고 역할별로 검증 |
| 기존 데이터 영향 | 구조 조회 시 `stories` 10건 중 `isAdult=true`는 0건, `isHidden=true`는 1건이라는 **집계만** 확인 | 이 1건의 뜻과 이관은 추측하지 않음. 본문이나 작성자 정보는 조회하지 않음 |
| 자식 행 관계 | 현재 `comments.storyId → stories.id`는 `ON DELETE CASCADE`. `ai_chat_usage.storyId`와 `ai_personas.storyId`는 `ON DELETE SET NULL` | [초기 스키마 파일](../../backend/supabase/migrations/00000000000000_init_schema.sql)의 “운영 FK 없음” 설명은 2026-08-17 시점 기록으로만 읽기. 운영 삭제·복원 계약에 현재 FK 반영 |
| AI 횟수 | `ai_chat_usage`는 `id`, `userId`, `storyId`, `usedAt`, `usedOn` 컬럼을 가짐. 예약·성공·취소·중복 방지 상태 컬럼은 없음 | 첫 정상 답변 뒤 차감, 실패 예약 반환, 동시 요청 방지 계약을 설계해야 함 |
| AI 대화 저장 | `ai_personas`에 `chatHistory` JSONB가 있음. 별도 대화방·메시지 테이블은 없음 | 소유권·응답 완료·부분 실패·복원을 PLAN 계약과 대조한 뒤 호환 가능한 변경 설계 |
| 이벤트 | `events.event_name`의 DB 체크 제약은 기존 9개 이벤트만 허용 | PLAN의 새 버튼·작업 결과·도움 평가 이벤트를 쓰기 전에 앱 코드와 DB 제약을 함께 수정 |
| 댓글 공감 RPC | `like_comment`는 로그인과 증감값 `+1/-1`은 검사하지만, 함수 정의에는 사용자별 공감 이력이나 중복 방지 조회가 없음 | 사용자 확정: 계정당 댓글별 1회, 재클릭 취소. 서버 이력·중복 방지·복원 기능을 설계하고 검증 |
| 동일 선택 투표 | `vote_story` RPC는 같은 선택의 재요청을 오류로 거절. 현재 화면의 `handleVote`는 이미 같은 선택이면 RPC 호출 전에 반환 | 일반 화면의 재클릭은 무시하지만 직접 호출·재시도는 오류가 남. 계획의 동일 선택 무시 계약을 서버 응답까지 어떻게 맞출지 구현·시험 필요 |

`vote_story` 함수 정의에는 로그인, 자기 사연 투표 금지, 같은 선택 재시도 거부, 변경 최대 1회 검사가 있습니다. `submit_report`·`submit_appeal`도 함수 내부에서 로그인 또는 작성자 권한을 확인합니다. 이들은 **정적 정의 확인**이며 실제 익명·타인·동시 요청 시험 결과가 아닙니다. 일부 함수가 익명 역할에 `EXECUTE` 권한을 갖는다는 사실만으로 호출 성공이나 우회를 단정하지 않습니다.

현재 `stories_update_own` 정책은 작성자만 사연 행을 수정하도록 제한합니다. 따라서 타인의 사연을 숨길 때 `isHidden` 갱신이 영구 저장될 가능성은 낮지만, 실제 사용자 역할의 API 결과는 아직 시험하지 않았습니다. 반면 작성자가 같은 동작을 실행하면 공용 값을 변경할 수 있는 구조입니다. 화면의 성공 표시와 서버 저장 성공을 구분해 고쳐야 합니다.

## 기존 숨김 사연 1건의 삭제 준비

사용자는 2026-09-25에 의미를 알 수 없는 기존 `isHidden=true` 사연 1건을 **구현할 때 삭제**하라고 요청했습니다. 새 개인 숨김이나 작성자 비공개로 이관하지 않습니다. 읽기 전용 조회로 확인한 대상 ID는 `story-1785136061664`이며 생성 시각은 `2026-07-27T07:07:41.664Z`입니다. 제목·본문·작성자 정보는 읽지 않았습니다.

| 연결 대상 | 현재 건수 | 삭제 시 DB 동작 |
|---|---:|---|
| 댓글 | 0 | FK `ON DELETE CASCADE` |
| 투표 | 0 | FK `ON DELETE CASCADE` |
| AI 사용 기록 | 0 | FK `ON DELETE SET NULL` |
| AI 대화 페르소나 | 0 | FK `ON DELETE SET NULL` |
| 사연 신고 | 0 | 별도 FK 없음 |
| `events.props`의 어느 필드든 대상 ID를 포함한 이벤트 | 0 | 별도 FK 없음 |

추가로 `ai_personas.chatHistory`와 `inquiries.content`의 대상 ID 문자열 포함 건수도 각각 0건이었습니다. 이는 ID 문자와 일치하는 참조 확인이며, 제목·본문을 인용한 간접 참조까지 없다는 뜻은 아닙니다. `stories`에는 사용자 정의 `DELETE` 트리거가 없고, 확인된 사용자 정의 트리거는 `UPDATE`용 카운터 보호 1개입니다. 이 집계는 **조회 시점의 영향 조사**이지 삭제 성공이나 데이터 복구 보장이 아닙니다. 실제 삭제 직전에는 같은 ID가 여전히 `isHidden=true`인지, 대상이 정확히 1건인지, 연결 행이 생기지 않았는지 다시 확인합니다. 조건이 달라졌다면 삭제를 중단하고 재평가합니다. `WHERE "isHidden" = true`처럼 미래의 다른 행까지 포함하는 삭제는 사용하지 않습니다. 현재 MCP는 읽기 전용이므로 삭제는 아직 실행하지 않았습니다.

## 검증 범위와 다음 기준

이번 확인은 `list_tables(public, verbose)`·`list_migrations`와 PostgreSQL 시스템 카탈로그의 테이블 제약·RLS 정책·함수 정의·권한·집계 조회에 한정됩니다. 인증 사용자별 RLS 결과, 직접 API 호출, 기존 데이터의 의미, Supabase 실제 요금제·사용량, 이메일 설정은 확인하지 않았습니다. **원격 구조 존재는 PASS, PLAN의 권한·사용성 계약은 아직 NOT_RUN/미구현**으로 구분합니다.

다음 작업에서는 현재 운영 구조를 기준으로 비공개·개인 숨김·성인 차단·댓글 공감과 AI 횟수·대화 저장의 변경안을 만들고, 기존 행을 보존하는 이관 경로와 역할별 시험을 제시해야 합니다. 새 개인 숨김·작성자 비공개·댓글 공감의 동작은 사용자 답변으로 확정됐고 기존 `isHidden` 1건은 삭제 대상으로 확정됐습니다. 기존 AI 대화의 보존·호환 방식은 변경안에서 별도로 검토합니다. 운영 마이그레이션 적용과 해당 행 삭제는 이 문서의 범위가 아닙니다.
