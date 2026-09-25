# 사연 저장·콘텐츠 검사 첫 수정 기록

2026-09-25 [PLAN.md](../../PLAN.md) §2의 **저장·등록 결과**와 **성인 콘텐츠 보류** 중 처음에는 사연 등록·수정 경로를 다뤘다. 이후 댓글·닉네임·신고·AI 경로의 [후속 변경](2026-09-25-save-results-and-ai-provider.md)과 개인 숨김 DB의 [운영 적용](2026-09-25-story-hides-applied.md)을 별도로 기록했다. 이 문서는 완료 보고가 아니라 구현과 시험 범위를 구분한다.

## 고친 동작

- 기존 `CreateStoryModal`은 콘텐츠 검사 직후 저장을 기다리지 않고 입력을 지우고 닫았다. `App.tsx`도 DB 응답 전에 사연을 화면에 넣고 성공 안내를 띄웠다. 이제 모달이 저장 완료를 기다리고, 검사 또는 DB 저장 실패 시 입력과 모달을 유지해 같은 내용으로 재시도할 수 있다. 진행 중에는 제출 버튼을 비활성화한다.
- 브라우저의 사연 등록·수정 경로를 `POST/PUT /api/stories`로 바꿨다. 서버가 로그인 토큰을 검증하고 포텐스로 검사한 뒤 서버 전용 Supabase 클라이언트로 DB에 저장한다. 브라우저가 보낸 검사 결과·작성자 ID·카운터는 받지 않는다. 성공한 DB 행이 반환될 때만 화면과 성공 안내를 갱신한다. 수정 시 화면의 투표 참여 상태 등 서버 행에 없는 임시 필드를 보존한다. 새 사연의 AI 페르소나 생성이 실패하면 사연 저장 성공과 구분해 알린다.
- 첫 공개에서는 성인 콘텐츠를 등록하지 않으므로 19금 체크박스와 ‘체크하면 등록 가능’ 안내를 제거했다. 검사에서 성인 판정이 나오면 내용을 유지하고 수정을 안내한다.
- 서버 내부 콘텐츠 검사는 포텐스 키 없음, 응답 오류, 형식 오류를 `503/502`로 구분한다. 이전처럼 검사 실패를 `isAdult=false`로 바꾸거나 Gemini로 자동 전환하지 않는다. 검사 결과의 핵심 필드와 제목·본문 길이를 확인한다. 브라우저가 쓰던 비로그인 공개 검사 API는 저장 API로 합친 뒤 제거했다.

## 검증 범위

| 대상 | 상태 | 증거와 한계 |
|---|---|---|
| 타입 검사·빌드 | PASS | `npm run lint`, `npm run build` 통과. 기존 500 kB 초과 청크 경고는 남음 |
| 포텐스 검사 응답 | PASS / 검사 함수 한 건 | 합성 사연 1건으로 당시 로컬 검사 경로 HTTP 200, `isAdult=false`, `hasProfanity=false`, 정제 제목·본문 문자열 존재를 확인. 이후 공개 검사 경로는 제거했고 최종 인증 저장 경로의 실제 응답은 NOT_RUN |
| 포텐스 키 누락 | PASS / 당시 검사 경로 | 키 없는 서버에서 HTTP 503 `CONTENT_CHECK_UNAVAILABLE`, 안전 판정 필드 없음. 최종 인증 저장 경로의 키 누락 시험은 NOT_RUN |
| 생성·수정 API 인증 | PASS / 비로그인 | 빌드된 서버의 `POST /api/stories`, `PUT /api/stories/:id`가 인증 토큰 없이 HTTP 401 `AUTH_REQUIRED`를 반환했고 저장 행을 반환하지 않음 |
| 기존 공개 검사 경로 | PASS / 제거 확인 | 최종 빌드에서 비로그인 `POST /api/check-adult-content`는 HTTP 404, `POST /api/stories`는 HTTP 401 |
| 사연 실제 저장·수정 | NOT_RUN | 로그인된 시험 계정과 운영 DB 쓰기 시험을 하지 않음. DB 오류/연타/재시도/다른 기기 복원은 브라우저에서 확인해야 함 |
| 공개 배포 | NOT_RUN | 현재 Vercel 코드는 이전 배포 상태이며 이 변경은 로컬에만 있음 |

## 공개 전 남은 계약

2026-09-25 후속 작업에서 사용자가 서버 전용 키와 DB 정책 변경 방향을 승인했다. 서버의 `POST/PUT /api/stories`는 이용자 토큰을 공개 키 클라이언트로 검증하고, 별도의 `SUPABASE_SECRET_KEY` 클라이언트로 저장하도록 바꿨다. 두 클라이언트의 권한을 섞지 않는다. 수정은 기존 행의 `authorId`가 요청 계정과 같은지 검사한 뒤 포텐스 검사와 저장을 진행하며, 실제 UPDATE 조건에도 ID·작성자 ID를 함께 건다. 서버 URL과 브라우저 URL이 둘 다 설정됐는데 서로 다르면 저장을 중단한다. 서버 전용 키가 없으면 로그인 요청은 저장 대신 503을 반환한다. 이후 로컬 `.env`에서 키 존재와 `sb_secret_` 형식, 니편내편 URL 일치를 확인했다. 키를 이용한 니편내편 `stories` **0행 읽기** 요청은 HTTP 200이었다. 값이나 행 데이터는 출력하거나 저장소 추적 파일·문서·채팅에 넣지 않았다. 사용자는 Vercel Preview·Production 설정을 확인했으나, 실제 배포 환경의 키 읽기와 사연 저장 성공은 미확인이다. [Supabase 공식 키 안내](https://supabase.com/docs/guides/getting-started/api-keys)

같은 날 운영 DB의 `pg_policies`를 다시 읽어 `stories_insert_own`, `stories_update_own`, `stories_select_public`, `stories_delete_own`을 확인했다. `vote_story`·`increment_story_view` 등 사연 집계에 쓰이는 주요 함수는 현재 `postgres` 소유의 `SECURITY DEFINER`로 확인했다. 직접 쓰기 정책 제거용 [SQL 초안](sql/story-write-boundary.sql)을 작성했지만 **운영 DB에는 적용하지 않았다.** 기존 `supabase_thinkerbell`은 읽기 전용으로 유지했다. 별도 `supabase_thinkerbell_write`를 니편내편 프로젝트 ref에 고정해 등록하고, 도구별 확인 모드와 `projects:read,database:read,database:write` OAuth 로그인을 마쳤다. 새 세션에서 이 연결로 운영 `public` 테이블 10개·마이그레이션 16개와 정책을 조회했다. DB 역할은 `postgres`이며 `public` 스키마 CREATE, `stories` INSERT·UPDATE·DELETE 권한 검사가 모두 참이었다. 이는 권한 메타데이터 확인이며 실제 변경 성공 시험은 아니다.

그 조회 이후 사용자의 재요청에 따라 기존 `isHidden=true` 사연 1건을 대상 ID·연결 기록 재검증 후 조건부 삭제했다. `story_hides`는 운영 마이그레이션 2개로 추가하고 기본 권한을 좁혔다. [삭제·적용·DB 역할 시험 기록](2026-09-25-story-hides-applied.md)에 실제 결과를 남겼다. 위 네 `stories` 정책은 변경하지 않았다.

기존 `handleHideStory`는 공용 `stories.isHidden`을 직접 UPDATE했다. 이를 `story_hides(user_id, story_id)` 관계로 옮기는 [DB 초안](sql/story-hides.sql)과 앱 코드를 작성했다. 새 코드에서는 남의 사연만 개인별로 숨기고, DB 저장 성공 후 목록에서 제외한다. 마이페이지 숨긴 목록·다시 보기와 즉시 되돌리기를 추가했다. 숨김 목록을 불러오지 못한 로그인 계정에는 피드를 표시하지 않고 재시도 버튼을 보여준다. **DB는 적용됐지만 새 화면의 실제 로그인·브라우저 동작은 아직 시험하지 않았다.** `story_hides`는 개인 취향 기록이며 작성자 비공개를 대신하지 않는다. 내 사연의 기존 공용 숨김 버튼은 제거했고, 작성자 비공개·직접 조회 차단은 별도 DB 권한 변경이 필요하다.

적용 순서는 다음과 같다.

1. 개인 숨김 DB 적용과 기존 숨김 사연 1건의 조건부 삭제는 완료했다. DB에서 `authenticated`·`anon` 역할을 흉내 낸 트랜잭션 시험도 통과했으며 전부 롤백했다. 실제 계정의 REST·브라우저 시험, 작성자 비공개 경로와 직접 조회 권한 설계·시험은 남아 있다. [결과](2026-09-25-story-hides-applied.md)
2. 로컬 `SUPABASE_SECRET_KEY`의 존재·형식과 0행 읽기 성공을 확인했다. 사용자는 Vercel Preview·Production에도 같은 이름의 **서버 전용** 환경변수를 설정했다고 확인했다. `VITE_` 접두사, 저장소 추적 파일, 채팅에는 키 값을 넣지 않는다. 배포 후 서버에서 실제로 적용됐는지 별도 시험한다.
3. 서버 버전을 배포해 로그인된 시험 계정의 생성·수정 성공, 타인 수정 거부, 검사 실패 시 미저장, 새로고침 후 복원 등을 확인한다. 이어 운영 DB의 정책 차이를 다시 조회한 뒤 초안 SQL을 쓰기 가능한 **니편내편** 연결로 적용한다.
4. 익명·작성자·타인 각각의 직접 Supabase REST `INSERT/UPDATE` 거부와 서버 저장 성공을 확인한다. 투표·신고·조회수 RPC 및 사연 DELETE도 회귀 시험한다. 실패하면 정책·서버 버전을 함께 복구한다.

코드 검사 `npm run lint`, `npm run build`, `git diff --check`는 후속 변경까지 통과했다. 초기 로컬 서버 재시험은 샌드박스의 `listen EPERM`으로 실행되지 않았으나, 이후 임시 서버에서 AI·댓글 검사 API의 비로그인 요청 HTTP 401을 확인했다. 개인 숨김 DB 적용과 DB 역할 모의 시험도 PASS다. 새로운 secret 키를 사용한 **인증 사연 저장**, 직접 REST 차단, 개인 숨김·복원의 실제 브라우저 동작은 여전히 NOT_RUN이다. 실제 포텐스 채팅·대화 저장과 댓글·닉네임·신고의 로그인 저장 결과는 [후속 구현 기록](2026-09-25-save-results-and-ai-provider.md)에 검증 대상을 남겼다.
