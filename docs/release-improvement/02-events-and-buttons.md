# 버튼·이벤트 현재 계약

정책은 [PLAN](../../PLAN.md) §3, 실제 전송 허용 목록은 [ga4EventPolicy.ts](../../frontend/src/lib/ga4EventPolicy.ts), 속성 정제는 [analyticsContext.ts](../../frontend/src/lib/analyticsContext.ts)입니다. [이전 후보 명세·ID](../../archive/2026-09-30/current-docs-before-cleanup/docs/release-improvement/02-events-and-buttons.md)는 이력이며 추가 계측 지시가 아닙니다.

## 첫 공개에서 전송하는 것

| 구분 | 이벤트 | 기준 |
| --- | --- | --- |
| 사연·참여 | story_view, story_publish_success, vote_submit, vote_change_success, comment_create_success | 실제 상세 표시 또는 서버의 확정 저장 |
| AI 진입 | ai_entry_click, ai_mode_select, ai_start_select, ai_settings_confirm, ai_chat_open | 해당 사용자 행동·실제 대화 진입 |
| AI 답변 | ai_chat_turn1, ai_chat_turn3 | 열린 이용 구간에서 정상 완료된 첫/세 번째 응답. 저장 결과와 분리 |
| 저장 결과 | operation_success, operation_error | operation=ai_reply_save만 허용 |
| 마무리·평가 | ai_chat_finish, ai_feedback_view, ai_feedback_submit | 실제 마무리·노출·평가 저장. 평가값 제외 |

답변이 정상 완료된 뒤 저장에 실패하면 첫 답변 1과 저장 오류 1을 기록합니다. 부분 응답·빈 응답·명시적 완료 없는 종료는 첫 답변 0입니다. 정상 완료 신호가 두 번 와도 같은 요청/이용 구간의 대표 이벤트는 중복하지 않습니다. 저장 실패 시 새 답변 재요청은 새 정상 응답이며 첫 답변 이벤트를 다시 보내지는 않습니다. 차감과 도움 평가 자격은 정상 저장 기준입니다.

수동 page_view, 전체 ui_click, 가입·로그인·계정·신고·위기 지원·단순 화면 이동은 첫 공개 GA4에서 제외합니다. 내부 동의 이벤트와 GA4 외부 전송은 같은 범위가 아닙니다.

## 현재 속성

| 속성 | 값·출처 |
| --- | --- |
| event_schema_version | 현재 코드 3. 정의 변경 시 배포 release_id를 함께 대조 |
| release_id | Vercel 배포 호스트, 로컬은 local. Git SHA만으로 CLI 배포를 구분하지 않음 |
| screen | 과업별 고정 화면 값. 전체 화면 조회 이벤트가 아님 |
| entry_point | feed/weekly_top/my_page/story_detail/shared_link/chat_list/chat_return |
| conversation_type | 새 방 new, 기존·서버 복구 방 continuation |
| recruitment_source | community/sns/technical_test/unattributed. source=qa만 technical_test |
| mode | simulation/explanation |
| operation/error_code | ai_reply_save/save_failed |
| outcome | completed/submitted/skipped |

운영 GA4에는 release_id/screen/entry_point/conversation_type/recruitment_source/mode/operation/error_code/outcome 9개 이벤트 범위 맞춤 측정기준 등록 기록이 있습니다. duration_ms·개인 flow ID 등 이전 설계 후보를 구현된 차원으로 안내하지 않습니다.

## 동의와 제외 정보

동의 전 저장·전송하지 않고 거부해도 기능을 사용할 수 있습니다. 동의 뒤 유입 범주만 탭 세션에 보관하고 같은/다른 탭 철회 시 삭제·전송 차단합니다. URL 쿼리·프래그먼트, 이메일·닉네임·계정/사연/방 ID·사연/대화 원문·평가 점수·임의 오류를 GA4에 보내지 않습니다. GA4의 session_id를 앱 UUID로 덮어쓰지 않습니다.

## 버튼과 검증 근거

현재 버튼 ID는 [174개 정적 목록](../plan-execution/2026-09-28-button-inventory.md)과 [화면별 계약](../plan-execution/2026-09-28-button-behavior-matrix.md)을 사용합니다. 과거 153개 추출 CSV는 당시 근거입니다. 정적 연결과 실제 조건부 클릭·저장·GA4 수신은 서로 다른 판정입니다.

배포·수신 상태는 [실행 기록](../plan-execution/2026-09-28-in-progress-release-preflight.md)을 따릅니다. 기존 저장 성공 기준으로 수집한 수치를 복원한 답변 완료 기준과 섞지 않습니다.
