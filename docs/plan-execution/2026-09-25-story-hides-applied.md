# 기존 숨김 사연 삭제와 개인별 숨김 DB 적용

2026-09-25, 니편내편 Supabase 프로젝트 `vzhyhadjtaqbapicjrco`의 쓰기 MCP로 실행했다. 사용자 요청에 따라 의미를 확인할 수 없던 기존 `isHidden=true` 사연 **1건만** 삭제하고, 사용자별 숨김 관계를 추가했다. 제목·본문·작성자 정보와 비밀키는 조회하거나 이 문서에 저장하지 않았다.

## 기존 행 삭제

- 삭제 직전 `story-1785136061664`의 ID·생성 시각·`isHidden=true`를 다시 확인했다. 전체 `isHidden=true` 행은 1건이었다.
- 댓글·투표·AI 사용 기록·AI 페르소나·신고·이벤트 속성·AI 대화 JSON·문의 본문에서 이 ID를 참조하는 행이 각각 0건임을 확인했다. 다른 간접 참조를 모두 배제한다는 뜻은 아니다.
- `DELETE`는 이 **고정 ID**, `isHidden=true`, 전체 숨김 행 1건, 위 연결 기록 0건을 모두 조건으로 요구했다. 반환 결과는 삭제 1건, 해당 ID였다.
- 독립 재조회에서 해당 ID 0건, `isHidden=true` 0건, 전체 사연 9건이었다. 복구용 사본은 만들지 않았다.

## 개인별 숨김 테이블

- [운영 마이그레이션 20260925065252](../../backend/supabase/migrations/20260925065252_create_story_hides.sql) `create_story_hides`: `public.story_hides(user_id, story_id, created_at)`와 기본키·FK·인덱스·RLS 정책을 추가했다. 기존 사연이나 숨김 값을 이관하지 않았다.
- [운영 마이그레이션 20260925065347](../../backend/supabase/migrations/20260925065347_restrict_story_hides_grants.sql) `restrict_story_hides_grants`: 첫 적용 뒤 Supabase 기본 권한 때문에 `authenticated`에 UPDATE·TRUNCATE 등 불필요한 권한이 남은 것을 발견했다. 두 번째 마이그레이션으로 이를 제거하고 SELECT·INSERT·DELETE만 남겼다. `anon`에는 테이블 권한이 없다.
- 재조회에서 `story_hides`의 RLS 활성화, 정책 3개, 저장 행 0건, 위 권한 구성을 확인했다. `service_role`의 기존 전체 권한은 유지됐다.

## DB 역할 시험

기존 인증 이용자 ID와 사연을 SQL 내부에서 선택해 `authenticated` 역할과 JWT의 `sub`를 흉내 냈다. 시험 INSERT·DELETE는 명시적 트랜잭션에서 실행한 뒤 `ROLLBACK`했으며 실제 사용자 JWT나 브라우저 요청을 이용한 시험은 아니다.

| 조건 | 관찰 |
|---|---|
| `anon` 조회 | 테이블 권한 오류로 거부 |
| 남의 사연을 자기 계정으로 숨김 | INSERT 성공, 숨긴 본인에게 1건 보임 |
| 사연 작성자의 숨김 목록 | 다른 이용자가 숨긴 행 0건 보임 |
| 작성자가 남의 숨김 행 삭제 시도 | 상대 계정의 행 유지 |
| 자기 사연 숨김 / 다른 계정 명의 INSERT | 각각 RLS 오류로 거부 |
| 숨긴 본인의 복원 | DELETE 후 본인 목록 0건 |

시험 뒤 `postgres` 역할 재조회에서 `story_hides`는 0건이고 사연은 9건이었다. 실제 로그인 계정의 Supabase REST 요청, 화면 숨김·복원, 계정 전환·재시도는 별도 검증이 필요하다.

## 후속 경계

작성자 비공개는 사용자별 숨김과 별도 기능이며 아직 DB·화면에 구현되지 않았다. 공개 `stories`의 직접 INSERT/UPDATE를 막는 [정책 변경 초안](sql/story-write-boundary.sql)도 아직 적용하지 않았다. 새 서버 코드의 인증 저장이 배포 환경에서 검증되기 전에 이 직접 쓰기 정책을 제거하면 기존 저장 경로가 막힐 수 있다.

후속 확인(같은 날): 로컬에 설정된 니편내편 공개키로 `story_hides`의 `limit=0` 익명 REST 조회를 실행했을 때 HTTP 401, DB 오류 코드 `42501`을 받았다. 이는 실제 익명 API 거부의 증거이며, 로그인한 본인/타인의 실제 HTTP 조회·숨김·복원 성공은 아직 검증하지 않았다.
