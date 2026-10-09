# 버튼·이벤트 현재 계약

정책은 [PLAN](../../PLAN.md) §3, 실제 전송 허용 목록은 [ga4EventPolicy.ts](../../frontend/src/lib/ga4EventPolicy.ts), 속성 정제는 [analyticsContext.ts](../../frontend/src/lib/analyticsContext.ts)입니다. [이전 후보 명세·ID](../../archive/2026-09-30/current-docs-before-cleanup/docs/release-improvement/02-events-and-buttons.md)는 이력이며 추가 계측 지시가 아닙니다.

## 첫 공개에서 전송하는 것

| 구분 | 이벤트 | 기준 |
| --- | --- | --- |
| 사연·참여 | story_view, story_publish_success, vote_submit, vote_change_success, comment_create_success | 실제 상세 표시 또는 서버의 확정 저장 |
| AI 진입 | ai_entry_click, ai_mode_select, ai_start_select, ai_settings_confirm, ai_chat_open | 해당 사용자 행동·실제 대화 진입 |
| AI 답변 | ai_chat_turn1, ai_chat_turn3 | 열린 이용 구간에서 정상 완료된 첫/세 번째 응답. 저장 결과와 분리 |
| 저장 결과 | operation_success, operation_error | operation=고정 작업 목록만 허용 |
| 마무리·평가 | ai_chat_finish, ai_feedback_view, ai_feedback_submit | 실제 마무리·노출·평가 저장. 평가값 제외 |

답변이 정상 완료된 뒤 저장에 실패하면 첫 답변 1과 저장 오류 1을 기록합니다. 부분 응답·빈 응답·명시적 완료 없는 종료는 첫 답변 0입니다. 정상 완료 신호가 두 번 와도 같은 요청/이용 구간의 대표 이벤트는 중복하지 않습니다. 저장 실패 시 새 답변 재요청은 새 정상 응답이며 첫 답변 이벤트를 다시 보내지는 않습니다. 차감과 도움 평가 자격은 정상 저장 기준입니다.

2026-10-09 확정: 일반 사용자 화면·행동·기능 결과 전체를 GA4로 확대합니다. 신고/문의·위기 지원·숨김/비공개 변경·탈퇴/개인 기록 삭제·평가 점수·관리자 화면은 제외합니다. 민감 화면이 열린 동안 배경의 일반 이벤트도 차단합니다. 일반 가입·로그인·계정 설정 결과는 입력값 없이 수집합니다. 기존 핵심 이벤트는 유지하고 신규 이벤트를 내부 DB에 추가하지 않습니다.

| 추가 이벤트 | 발생 기준 | 허용 속성 |
| --- | --- | --- |
| page_view | 동의 후 현재 노출된 최상위 화면/모달이 바뀐 때. 재렌더 중복 방지 | screen |
| ui_click | 등록된 실제 버튼·링크·카드 클릭 1회. 입력값·문구·href 미수집 | screen, button_id, element_type |
| operation_start | 일반 기능의 실제 실행 시작 | screen, operation |
| operation_success/error | 화면에서 확인한 기능 결과. HTTP 200만으로 저장 성공으로 세지 않음 | screen, operation, 고정 error_code |
| operation_cancelled | 공유 시트 취소 등 명시적 취소 | screen, operation |
| action_blocked | 로그인·유효성·횟수·준비 상태로 요청을 실행하지 못함 | screen, operation, 고정 reason |

`event_schema_version=4`로 구분합니다. 화면 목록은 analyticsSurface, 작업 목록은 analyticsOperations, 행동 목록은 analyticsControls의 고정 허용값입니다. 단순 전파 제어 컨테이너는 클릭으로 세지 않습니다. 최초 동의/거부/철회 버튼은 계측에서 제외합니다. 동의 전 시작한 작업이나 철회·재동의 사이에 끝난 작업 결과를 소급 전송하지 않습니다.

작업 결과 연결 범위: 사연 등록/수정, 댓글 작성/수정/공감, 사연·밸런스 투표, AI 방 생성·고정·관점·응답·저장·평가, 소유 확인 요청/검증·가입·로그인·재발송·비밀번호 재설정/변경, 닉네임 수정/생성·로그아웃, 공유·카드 다운로드·미리보기·횟수 확인·밸런스 재조회. 화면 이동·필터·닫기는 클릭/화면으로 기록하며 자동 백그라운드 재조회나 실시간 갱신을 사용자 성공으로 만들지 않습니다.

## 현재 속성

| 속성 | 값·출처 |
| --- | --- |
| event_schema_version | 현재 코드 4. 정의 변경 시 배포 release_id를 함께 대조 |
| release_id | Vercel 배포 호스트, 로컬은 local. Git SHA만으로 CLI 배포를 구분하지 않음 |
| screen | 현재 노출된 일반 화면/모달의 고정 값 |
| entry_point | feed/weekly_top/my_page/story_detail/shared_link/chat_list/chat_return |
| conversation_type | 새 방 new, 기존·서버 복구 방 continuation |
| recruitment_source | community/sns/technical_test/unattributed. source=qa만 technical_test |
| mode | simulation/explanation |
| operation/error_code | 고정 작업 목록 / save_failed 또는 unconfirmed |
| outcome | completed/submitted/skipped |

운영 GA4에는 release_id/screen/entry_point/conversation_type/recruitment_source/mode/operation/error_code/outcome 9개 이벤트 범위 맞춤 측정기준 등록 기록이 있습니다. 확장한 button_id/element_type/reason의 보고서용 맞춤 측정기준 추가와 실제 QA/운영 수신은 아직 하지 않았습니다. duration_ms·개인 flow ID 등 이전 설계 후보를 구현된 차원으로 안내하지 않습니다.

## 동의와 제외 정보

동의 전 저장·전송하지 않고 거부해도 기능을 사용할 수 있습니다. 동의 뒤 유입 범주만 탭 세션에 보관하고 같은/다른 탭 철회 시 삭제·전송 차단합니다. URL 쿼리·프래그먼트, 이메일·닉네임·계정/사연/방 ID·사연/대화 원문·평가 점수·임의 오류를 GA4에 보내지 않습니다. GA4의 session_id를 앱 UUID로 덮어쓰지 않습니다.

## 버튼과 검증 근거

현재 전체 행동은 [2026-10-09 목록](../plan-execution/2026-10-09-analytics-inventory.md)을 사용합니다. 기존 버튼 ID는 [174개 정적 목록](../plan-execution/2026-09-28-button-inventory.md)과 [화면별 계약](../plan-execution/2026-09-28-button-behavior-matrix.md)을 사용합니다. 과거 153개 추출 CSV는 당시 근거입니다. 정적 연결과 실제 조건부 클릭·저장·GA4 수신은 서로 다른 판정입니다.

배포·수신 상태는 [실행 기록](../plan-execution/2026-09-28-in-progress-release-preflight.md)을 따릅니다. 기존 저장 성공 기준으로 수집한 수치를 복원한 답변 완료 기준과 섞지 않습니다.
