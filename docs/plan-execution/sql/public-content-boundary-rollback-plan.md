# 공개 데이터 경계 적용·복구 계획

기준일 2026-10-10. 사용자가 함수·권한·의존성을 대조한 뒤 운영 적용·검증하고 main을 푸시하는 순서를 승인했다. 아직 운영 적용 완료를 뜻하지 않는다. 개인정보 안내는 미활성 초안이다.

운영 프로젝트는 `vzhyhadjtaqbapicjrco`, 브랜치는 main이다. 이용자 행 없이 SQL Editor에서 함수 정의, ACL, 정책, 열 타입, publication, trigger, pg_depend만 조회해 CSV를 다운로드했다. 현재 `vote_story(text,text)`, `like_comment(text,integer)`, `set_story_visibility(text,text)`, `notify_story_access_change()` 모두 postgres 소유·security definer다. 앞의 세 함수는 authenticated/service_role 실행 가능하고 anon/PUBLIC 실행 권한이 없다. 조회 RPC는 없다. 별도 열 ACL은 없으며 stories/comments에는 anon/authenticated 테이블 SELECT가 있다. 함수에 대한 DB 의존성은 기존 story_access_invalidation 트리거 하나다. 동적 SQL·외부 클라이언트 의존성이 없다는 증명은 아니다.

복구 스냅샷과 준비 파일은 해당 컴퓨터의 작업 자료 폴더에 저장했다.

- `/Users/b/Documents/Codex/2026-10-09/task/thinkerbell-checkpoint/2026-10-10/operating-boundary-preflight.json`
- 같은 폴더의 `operating-boundary-apply.sql`: 기존 함수 정의 해시와 소유자가 바뀌었거나 이미 조회 RPC가 생겼으면 중단한다. 기존 초안과 동일 변경이며 마지막에 PostgREST 스키마 재적재 알림을 보낸다.
- 같은 폴더의 `operating-boundary-verify.sql`: 원문 열 권한, 원형 반환 RPC 실행권한, publication, 댓글 정책·trigger·신호 열을 검사하고 존재하지 않는 시험 ID를 anon으로 조회해 빈 결과를 확인한다. 사용자 원문을 출력하지 않는다. 격리 환경에서 전체 검사 PASS.
- 같은 폴더의 `operating-boundary-rollback-verify.sql`: 복구 후 이전 권한·publication·조회 함수 제거와 원래 함수 4개의 정의 해시를 확인한다. 격리 환경에서 PASS.
- 같은 폴더의 `operating-boundary-rollback.sql`: 저장한 원래 정의·실행권한·댓글 정책·조회권한·publication·사연 trigger로 복구한다. 추가 access_changed 열은 보존하여 새 신호 데이터를 제거하지 않는다.

## 적용 순서

1. 승인 범위·프로젝트·현재 함수/권한/의존성을 재확인하고 복구 스냅샷을 보존한다. 빌드와 격리 적용·REST·복구 시험이 통과해야 한다.
2. 자동 배포를 일으키는 푸시보다 DB 적용이 먼저다. 동일 클라이언트가 준비돼 있어야 한다. 기존 브라우저의 raw 조회는 권한 회수 이후 실패할 수 있으므로 전환 중 영향을 기록한다.
3. 준비 SQL 전체를 하나의 트랜잭션으로 실행한다. 실패하면 commit하지 않는다. 사용자 행의 삽입·삭제 또는 정리 함수를 시험 삼아 호출하지 않는다.
4. 공개 함수 시그니처·반환형·실행권한, raw 본문 열 조회 불가, 최소 ID 열, 댓글 정책, publication의 ID 신호 유지, access_changed와 두 trigger를 메타데이터로 확인한다. 조회 RPC는 존재하지 않는 합성 ID만 대상으로 빈 결과를 확인해 원문을 노출하지 않는다.
5. main 정상 커밋·푸시, 자동 배포 Ready와 동일 commit을 확인한 뒤 새 클라이언트를 검증한다. 게스트·합성 계정 회귀와 운영 역할별 검증은 구분한다.

## 복구 조건과 순서

SQL 실행이 실패하면 트랜잭션을 rollback한다. DB 적용 뒤 새 앱이 실패하면 공개 배포를 보류하고 실패 원인을 먼저 확인한다. 이전 앱과 DB로 모두 돌아가야 하는 경우 저장된 복구 SQL로 원래 함수/권한/정책/trigger/publication을 복구하고 해당 이전 앱 commit으로 배포한다. 새 앱만 이전 버전으로 바꾸면 raw 조회 권한 차이로 실패한다.

복구는 기존 공개 열 노출과 블라인드 댓글 경계를 다시 되돌리는 조치다. 자동 실행하지 않는다. 원래 snapshot과 현재 적용 상태를 대조한 뒤 필요한 복구만 실행한다. 원본 이용자 데이터 삭제·추가 계정/자격증명·다른 테이블 권한 확장은 포함하지 않는다.

## 검증 결과

타입·빌드와 관련 자동시험 47개 재실행 성공. 운영에서 읽은 실제 함수 정의로 구성한 격리 DB에 적용 SQL을 실행하고 REST 권한 회귀도 성공했다. 복구 시험 초기에는 시험 스키마에 운영 댓글 항소 열이 없어서 실패했으며, 시험 스키마를 맞춘 뒤 최종 PASS했다. 기존 anon SELECT 복구, 새 조회 함수 제거, stories/comments publication 복구 모두 true를 확인했다. 최종 결과는 실행 인수인계의 최신 기록을 따른다. 운영 적용·GA4 등록·자동 배포는 각각 별도의 실제 완료 증거가 필요하다.

브라우저 편집은 재개 신호 전 중단한다. Chrome 자동화의 user-changed 보호 오류가 반복 관찰됐으나 원인이나 사용자 직접 조작 여부는 단정하지 않는다. 승인 범위는 유지하며 새 승인 부족으로 표현하지 않는다.
