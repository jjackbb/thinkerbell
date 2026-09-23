# 버튼·이벤트 설계 v2 초안

기준: 2026-09-22. **미구현 명세**이며 실제 GA4 수집 결과가 아니다. 사용자가 선택한 첫 목표는 **첫 사용 흐름과 AI 대화의 도움 여부**다.

## 무엇을 구분해서 기록할까

- `ui_click`: 사용자가 어느 버튼을 작동시켰는가. 클릭은 의도이며 성공은 아니다.
- `operation_start / operation_success / operation_error`: 저장·인증·AI 요청 등이 실제로 어떻게 끝났는가.
- 화면·단계 이벤트: 어디까지 도달했고 어떤 선택에서 멈췄는가.
- GA4 주요 이벤트: 목표에 중요한 실제 완료 행동만 지정한다.

모든 노출 버튼은 안정적인 ID와 기대 동작을 갖는다. 버튼마다 서로 다른 이벤트 이름을 만들 필요는 없다. 예를 들어 `ui_click + button_id=story_publish`와 `story_publish_success`를 나누면 등록 버튼을 누른 사람과 실제 등록에 성공한 사람을 비교할 수 있다. 주요 이벤트는 Google의 [정의·지정 방법](https://support.google.com/analytics/answer/13128484?hl=en)에 따라 별도 지정한다.

## 공통 규격

| 속성 | 정의 / 예 | 전송 위치 |
|---|---|---|
| `event_schema_version` | 새 정의는 `2`. 기존 9개 정의와 분리 | GA4 + 앱 이벤트 |
| `release_id` | 배포 commit 짧은 SHA; 개발 빌드는 `local` | 둘 다 |
| `ui_revision` | 팀 디자인안/화면 개편 버전. 전후 비교에서 고정 | 둘 다 |
| `environment` | `development / preview / production` | 둘 다 |
| `screen_name` | `welcome / feed / story_detail / story_form / ai_setup / ai_chat / ai_summary / mypage` | 둘 다 |
| `screen_section` | `account / notifications / support / inquiry_admin` 등 고정 값 | 필요한 이벤트만 |
| `button_id` | 아래 목록의 고정 식별자. 문구가 바뀌어도 유지 | `ui_click` |
| `entry_point` | `feed_card / ranking / story_detail / ai_list / mypage / shared_link / create_complete` | 흐름 관련 이벤트 |
| `auth_state` | `guest / authenticated / unknown`; 인증 판정 전에는 unknown. 관리자 여부·이메일은 보내지 않음 | 둘 다 |
| `operation` | `story_publish / comment_create / vote / ai_reply / nickname_update` 등 허용 목록 | operation 이벤트 |
| `outcome` | `created / updated / unchanged / cancelled / blocked / failed / completed` 등 고정 값 | 결과가 필요할 때 |
| `error_code` | `auth_required / validation / forbidden / network / timeout / quota / provider / save_failed` 등 정제 값 | 실패 이벤트; 원문 오류 제외 |
| `duration_ms` | 요청 시작→완료. AI는 첫 텍스트까지 `first_text_ms`도 별도 | 해당 결과 이벤트; 맞춤 측정항목 후보 |
| `mode` / `opening` | 상황/공감 및 정해진 시작 옵션. 감정 내용 추정 금지 | AI 설정·대화 이벤트 |
| `is_resume` | 저장한 대화 이어하기 여부 | AI 흐름 |
| `traffic_class` | `internal / recruited / organic`; 사전에 정한 시험/모집 구분 | 둘 다. 사람 이름이나 계정표 번호 금지 |
| `event_id` | 논리 이벤트 1건의 임의 ID. 재전송 때 동일 값 | 앱 이벤트 필수; GA4 진단용 전송 시 맞춤 차원 등록 제외 |
| `flow_id` / `request_id` | 특정 AI 진입 시도 / 요청을 잇는 임시 ID | 앱 이벤트. GA4 표준 보고서용 차원으로 등록하지 않음 |
| `story_id / persona_id` | 같은 대상에서 진행했는지 검증하는 내부 키 | 기본은 앱 이벤트에만. 제목·사연과 외부 결합 최소화 |
| `occurred_at / received_at / sequence` | 실제 발생·서버 수신·흐름 내 순서 | 앱 이벤트. 네트워크 수신 순서만으로 퍼널 구성하지 않음 |

위 표의 모든 값을 모든 이벤트에 보내지 않는다. 이벤트별 허용 목록을 만들고 공통 필수 5~7개와 필요한 속성만 전송한다. [이벤트 수집 제한](https://support.google.com/analytics/answer/9267744?hl=en)을 넘지 않도록 자동 점검한다.

GA4에는 이메일, 닉네임, 사연 제목/본문, 댓글, AI 질문/답변, 시스템 프롬프트, 문의·신고·탈퇴 사유 원문, 기분·소감 원문을 보내지 않는다. 버튼 텍스트/DOM `innerText` 자동 수집도 하지 않는다. 자유 입력이 URL·페이지 제목·오류 메시지로 새지 않는지 검사한다. [Google 개인정보 전송 방지 지침](https://support.google.com/analytics/answer/6366371?hl=en)을 기준으로 삼는다.

`session_id`는 GA4 맞춤 측정기준용 예약 이름이다. 현재 앱의 탭 UUID를 GA4의 `session_id`로 전송하는 코드는 제거하고, GA4의 자체 세션과 앱 `flow_id`를 구분한다. [이름 규칙](https://support.google.com/analytics/answer/13316687?hl=en). 같은 이름의 과거 값이 있다면 새 정의와 섞어 해석하지 않는다.

## 중복·실패·순서 처리

1. 클릭/키보드 활성화는 실제 사용자 작동 1회에 1건이다. 카드 안 투표를 눌렀다고 카드 열기까지 발생시키지 않는다. 아이콘과 부모 버튼의 이중 전송을 막는다.
2. 폼은 `onSubmit`에서 한 번 처리해 Enter 제출도 동일하게 잡는다. 제출 버튼의 `onClick`과 `onSubmit`에서 같은 클릭을 두 번 세지 않는다. `trigger=pointer/keyboard`가 필요하면 고정 값만 쓴다.
3. 버튼 재클릭은 의도로 기록할 수 있지만 같은 DB 요청·완료 이벤트는 중복 생성하지 않는다. 이미 투표한 같은 선택은 `unchanged`, 한도/로그인으로 막히면 `blocked`다.
4. 요청 시작과 확정 성공/실패는 `request_id`로 연결한다. UI가 먼저 바뀌었어도 DB가 거절하면 성공 이벤트 0건, 오류 1건이어야 한다.
   업데이트/삭제는 오류가 없다는 것만으로 성공 처리하지 않는다. RLS로 영향 행이 0인 경우를 구분하고, 반환 데이터/변경 행/요청 결과로 실제 처리를 확인한다.
5. 앱 이벤트 저장에는 `event_id` 중복 방지와 제한된 재전송을 설계한다. GA4가 임의 `event_id`만으로 자동 중복 제거한다고 가정하지 않는다. 브라우저 측에서도 논리 이벤트를 한 번만 보낸다.
6. Supabase와 GA4 전송을 서로 기다리지 않게 한다. 삽입 `{error}`를 검사하고 개발 진단에서 누락을 찾되 분석 실패가 제품 동작을 막지는 않게 한다.
7. 로그아웃/계정 교체 시 기존 once 키와 흐름을 분리한다. 기존 탭을 장시간 열어 둔 상태를 GA4 세션 1개로 가정하지 않는다.
8. 실전 데이터 수집은 동의·수집 설정에 따라 빠질 수 있다. 차단된 사용자 이벤트를 강제로 우회 전송하지 않는다. UI 동작과 분석 수집을 독립 검증한다.

## 핵심 이벤트 목록

`기존→수정`은 이름만 남겨도 의미가 바뀌므로 `event_schema_version=2`와 수집 시작일을 반드시 남긴다.

| 이벤트 | 상태 | 발생 조건 | 중복 단위 / 핵심 속성 | 주요 이벤트 제안 |
|---|---|---|---|---|
| `page_view` | 추가 | 주요 화면이 실제 노출됨 | 화면 전환당 1회; 정제 URL·이전 화면 | 아니오 |
| `ui_click` | 추가 | 등록된 버튼의 사용자 활성화 | 작동 1회; button/entry | 아니오 |
| `operation_start` | 추가 | 유효 입력으로 실제 요청 시작 | request당 1회; operation | 아니오 |
| `operation_success` | 추가 | 서버/API의 확정 성공 | request당 1회; operation/outcome/duration | 아니오 |
| `operation_error` | 추가 | 확정 실패·시간 초과 | request당 최종 결과 1회; error_code | 아니오 |
| `action_blocked` | 추가 | 로그인·한도·권한·검증으로 실행 못 함 | 실제 시도당 1회; reason/operation | 아니오 |
| `app_open` | 기존→정의 보완 | 앱 진입 | 앱 방문 기준 명시. GA4 방문 분모는 GA4 세션 사용 | 아니오 |
| `login_success` | 기존→수정 | 명시적 로그인 요청 성공 | auth request당 1회; `method=email` | 아니오 |
| `sign_up` | 추가 | 실제 회원 생성 확인 | 생성 1회; 이메일 확인 대기는 완료 이용과 분리 | 아니오 |
| `auth_restored` | 추가 | 기존 로그인 세션 복원 | 앱 초기 인증 확정당 1회 | 아니오 |
| `story_view` | 기존→수정 | 유효한 사연 상세가 실제 표시 | 앱 흐름+사연당 1회; entry_point | 아니오 |
| `story_create_start` | 추가 | 작성 폼에서 처음 입력/선택 | 작성 시도당 1회. 키 입력마다 기록하지 않음 | 아니오 |
| `story_publish_success` | 추가 | 신규 사연의 서버 저장 확인 | 새 사연당 1회; 생성/수정 구분 | 보조 후보 |
| `vote_submit` | 기존→수정 | 새 투표가 서버에 저장됨 | 투표 레코드당 1회; entry_point/option | 보조 후보 |
| `vote_change_success` | 추가 | 기존 투표의 허용된 변경 성공 | 변경 request당 1회 | 아니오 |
| `vote_result_view` | 추가 | 투표 결과 영역을 실제 표시 | 해당 결과 노출 단위; 0표 구분 | 아니오 |
| `comment_create_success` | 추가 | 새 댓글 서버 저장 확인 | 댓글당 1회; 내용 제외 | 아니오 |
| `ai_entry_click` | 기존→보완 | 실제 AI 진입 버튼 사용 | 진입 시도당 1회; entry/auth/flow | 아니오 |
| `ai_mode_select` | 기존→보완 | 상황/공감 선택 | 선택 행동당 1회; mode/flow | 아니오 |
| `ai_start_select` | 기존→의미 정정 | 상황 시작 옵션 선택 | 선택 1회. 공감 선택을 방 열림으로 세지 않음 | 아니오 |
| `ai_settings_confirm` | 추가 | 공감 설정 확정 | 확정 1회; mode/flow | 아니오 |
| `ai_chat_open` | 추가 | 대화 화면이 실제 사용 가능한 상태로 열림 | 대화 진입당 1회; mode/is_resume/auth | 아니오 |
| `ai_chat_turn1` | 기존→수정 | 현재 대화 에피소드에서 실제 AI 완료 응답 첫 쌍 | episode당 1회; mode/is_resume | 아니오 |
| `ai_chat_turn3` | 기존→수정 | 실제 AI 완료 응답 3쌍 도달 | episode당 1회; mode/is_resume | **첫 사이클 대표 후보** |
| `ai_chat_finish` | 추가 | 사용자가 명시적으로 마무리함 | 마무리 행동 1회; completed_turns | 아니오 |
| `ai_feedback_view` | 추가·도입 확정 | 선택적 도움 평가 1문항을 실제 노출 | episode당 1회; 문구·선택지·노출 상세는 시안 검토 | 아니오 |
| `ai_feedback_submit` | 추가·도입 확정 | 평가 저장이 성공함 | episode당 1회. 평가 내용은 전송 제외 | 아니오 |
| `share_action_result` | 추가 | OS 공유/복사/다운로드 결과 | request당 1회; `shared/copied/cancelled/failed/download_initiated` | 아니오 |

AI 에피소드는 **이번에 대화방을 열어 시작한 이용 구간**이다. 이전 저장 대화의 턴을 초기값으로 더하지 않는다. 새 구간에서 성공 응답 3쌍을 기록하며, 이어하기는 `is_resume=true`로 나눠 본다. 다시 열기가 많아 퍼널이 부풀지 않도록 사용자 도달률은 사용자/세션 단위로 중복을 제거한다.

기본 인사말·고정 대사·실패 후 남은 사용자 말풍선·중단된 부분 응답은 성공 턴이 아니다. 한번 실패하고 재시도해 완료됐다면 성공 쌍은 1개다. 백엔드의 실제 완료와 브라우저 수신 완료, 대화 저장 완료를 구분한다.

`ai_chat_turn3`는 충분히 사용해본 행동의 대리 지표다. **도움·감정 해소의 증거가 아니다.** 도움 여부는 별도 선택형 질문/인터뷰로 확인하며 개인별 응답은 접근을 제한한 저장소에서 분석한다. 기분 변화를 진단이나 치료 효과로 해석하지 않는다.

첫 주요 이벤트는 최대 3개 후보(`ai_chat_turn3`, `vote_submit`, `story_publish_success`)다. 실제 사용 목표에서 대표는 첫 번째이며, 나머지는 별도 경로의 보조 완료다. 모두를 하나로 합친 '성공률'은 만들지 않는다. 수집 검증 후 사용자와 최종 목록을 확인한다.

## 버튼별 구현 목록

아래는 현재 컴포넌트 기준 **초기 전수 작업 목록**이다. 사용자의 UX/UI안이 확정되면 화면에 남은 실제 요소와 대조해 ID를 확정한다. 같은 의미의 버튼이 여러 위치에 있으면 같은 `button_id`와 다른 `entry_point`를 쓴다. `A/B`, `feed/ai/mypage`처럼 병기한 값은 각각 별도 ID다.

실제 소스 위치는 [source-interactions.csv](source-interactions.csv)에 있다. 정적 button 위치 153곳과 DOM 이벤트·컨트롤 227행을 추출했다. 동적 반복/조건부 화면과 컴포넌트 콜백 71행은 별도이므로 이를 실제 버튼 298개라고 해석하지 않는다.

모든 행의 사용자 활성화는 공통 `ui_click` 대상이다. 추가 결과 열의 `op`는 `operation_start/success/error`, `blocked`는 `action_blocked`를 뜻한다. 단순 열기·닫기에 가짜 서버 성공 이벤트를 만들지 않는다.

| 화면·소스 | 버튼 ID / 실제 동작 | 추가 결과·주의 |
|---|---|---|
| WelcomeModal | `auth_login_submit`, `auth_signup_submit` | op + login/sign_up. 로그인과 가입 구분 |
| WelcomeModal | `auth_mode_login`, `auth_mode_signup`, `guest_browse` | 모드 전환/둘러보기 표시 확인 |
| LoginPromptModal | `login_prompt_continue`, `login_prompt_close` | 요청한 행동 맥락 보관; 복귀 경로 검증 |
| Header | `home_logo`, `profile_open`, `story_create_open` | 화면 전환; 로고 키보드 접근 보완 |
| Navbar | `nav_feed`, `nav_ai`, `nav_mypage` | 화면 표시 뒤 page_view, active 상태 |
| App 피드 | `feed_category_select`, `feed_sort_latest`, `feed_sort_hot` | 고정 선택 값; 새 목록 표시 |
| App 피드 | `story_create_open` (빈 화면/상단/플로팅) | 위치는 entry_point로 구분; 로그인 blocked |
| WeeklyTopBanner | `ranking_weekly`, `ranking_realtime`, `ranking_slide_select` | 표시 내용 변경; 순위별 고정 index만 |
| WeeklyTopBanner | `story_open` | story_view, entry=ranking |
| BalanceGameSection | `balance_prev`, `balance_next`, `balance_slide_select` | 손가락 이동은 별도 `ui_gesture`, 자동 롤링은 클릭 제외 |
| BalanceGameSection | `balance_vote_a`, `balance_vote_b` | op; 신규/변경/unchanged/blocked 구분 |
| StoryCard | `story_open`, `story_expand`, `story_collapse` | 상세 진입만 story_view |
| StoryCard/StoryDetailModal | `story_menu_open`, `story_menu_close` | 메뉴 표시/접기 |
| StoryCard/StoryDetailModal | `story_edit_open`, `story_hide`, `story_delete_open`, `story_report_open` | hide는 정책 정한 뒤 op, 나머지는 모달 표시 |
| StoryCard/StoryDetailModal | `story_vote_a`, `story_vote_b` | op + vote_submit 또는 vote_change_success; 카드 열기 전파 금지 |
| StoryCard | `comment_panel_open`, `comment_panel_close`, `comment_filter_all`, `comment_filter_a`, `comment_filter_b` | 실제 노출/필터 동작 대조 |
| StoryCard | `appeal_open` | 본인 블라인드 사연만 허용 |
| App 이의제기 | `appeal_submit`, `appeal_cancel` | op; 원문 사유 수집 금지 |
| StoryDetailModal | `story_detail_close`, `sensitive_body_reveal` | 닫기/본문 표시; 성인 확인과 혼동 금지 |
| StoryDetailModal | `ai_entry` | ai_entry_click; entry=story_detail |
| StoryDetailModal | `comment_submit`, `comment_login` | op + comment_create_success / 로그인 안내 |
| StoryDetailModal | `comment_like`, `comment_unlike` | op; 서버의 사용자별 상태가 기준 |
| StoryDetailModal | `comment_menu_open`, `comment_edit_open`, `comment_edit_save`, `comment_edit_cancel`, `comment_delete`, `comment_report_open` | 저장/삭제는 op, 권한·중복 검증 |
| ShareResultBar/상세 | `share_preview_open`, `share_preview_close`, `share_download`, `share_result` | share_action_result; 취소는 성공 아님 |
| CreateStoryModal | `story_form_close`, `story_form_cancel`, `story_form_category`, `story_publish`, `story_update` | 작성 시작, op, 신규만 publish_success |
| CreateStoryModal | `story_adult_check`, `adult_warning_dismiss` | 고정 선택 여부만 내부 상태; 자유 입력 제외 |
| DeleteConfirmModal | `story_delete_confirm`, `story_delete_cancel` | 서버 삭제 성공 뒤 op success; 취소는 삭제 0 |
| ReportModal | `report_reason_select`, `report_submit`, `report_cancel`, `report_close` | op; 사유 원문 외부 전송 제외 |
| AdultVerificationModal | `adult_self_confirm`, `adult_modal_close` | 자기 확인을 실제 인증 완료 이벤트로 만들지 않음 |
| AIChatModeSelectionModal | `ai_mode_simulation`, `ai_mode_explanation` | ai_mode_select |
| AIChatModeSelectionModal | `ai_opening_select`, `ai_setup_back`, `ai_setup_close` | 시작점 선택/취소; ai_start_select는 실제 선택만 |
| AIExplainSettingsModal | `ai_ratio_select`, `ai_settings_confirm`, `ai_settings_close` | 설정 확정과 실제 chat_open 분리 |
| AIChatView 목록 | `ai_list_feed`, `ai_persona_open`, `ai_persona_start` | 시작/이어하기 구분, ai_chat_open |
| AIChatView 목록 | `ai_persona_menu`, `ai_persona_pin`, `ai_persona_unpin`, `ai_error_report_open`, `ai_persona_delete` | pin/delete op, 저장/삭제 실패 안내 |
| AIChatView 채팅 | `ai_chat_leave`, `ai_settings_open`, `ai_chat_end_open` | 단순 닫기와 마무리·삭제 구분 |
| AIChatView 채팅 | `ai_message_send`, `ai_message_retry` | op + 정확한 성공 턴; 실패·대기 시간 |
| AIChatView 채팅 | `ai_login_required` | 로그인 안내; 게스트 미응답을 AI 오류로 집계하지 않음 |
| AIChatView 채팅 | `ai_end_success_select`, `ai_end_fail_select` | 사용자가 고른 종료 상태; 도움 여부로 해석 금지 |
| AIChatView 나가기 | `ai_keep_close`, `ai_discard_close`, `ai_exit_cancel`, `ai_delete_confirm`, `ai_delete_cancel` | 삭제만 op, 명시적 마무리만 finish |
| SessionSummaryCard | `ai_summary_expand`, `ai_summary_quote_jump`, `ai_summary_continue`, `ai_summary_finish` | 원문 문장 대신 고정 button_id; finish 후 대화 보존 |
| SessionSummaryCard | `ai_mood_before_select`, `ai_mood_after_select` | 선택 행동만. 선택값은 기본 GA4 제외, 저장 정책 합의 필요 |
| 확정된 선택 평가 | `ai_feedback_submit`, `ai_feedback_skip` | 종료 시 선택 평가 1문항 저장. 응답 내용은 GA4 제외; 상세 UI는 시안 검토 |
| AIErrorReportModal | `ai_error_report_submit`, `ai_error_report_cancel`, `ai_error_report_close` | 실제 접수 op, 콘솔 출력만 성공 금지 |
| PremiumModal | `premium_info`, `premium_demo`, `premium_later`, `premium_close` | 구매 이벤트 금지; demo 노출 시 실제 연결·quota 의미 확인 |
| MyPageView 요약 | `nickname_edit_open`, `nickname_random`, `nickname_save` | 랜덤 결과를 편집값에 적용, 저장 op |
| MyPageView 내역 | `my_stories`, `my_votes`, `my_comments`, `my_more`, `my_page_select`, `my_summary_back`, `my_story_open` | 기록에서 대상 사연 이동 확인; 실제 화면에 없는 것은 추가하지 않음 |
| MyPageView 설정 | `account_open`, `notification_settings_open`, `support_open`, `inquiry_admin_open` | 화면 표시, 관리자 권한 검증 |
| MyPageView 계정 | `password_change_submit`, `account_delete_open`, `account_delete_confirm`, `account_delete_cancel`, `logout` | op; 입력 비밀번호·탈퇴 사유 전송 금지 |
| MyPageView 알림 | `notify_balance_toggle`, `notify_vote_toggle`, `notify_comment_toggle` | 선호 저장 op. 알림 전달 성공과 다름 |
| MyPageView 문의 | `faq_toggle`, `inquiry_submit`, `inquiry_reply_submit` | 문의/답변 op, 원문 제외 |
| MyPageView 대화 관리 | `ai_delete_all_open`, `ai_delete_all_confirm`, `ai_delete_all_cancel` | 전체 삭제 op, 본인 데이터에만 영향 |
| CrisisSupportModal | `support_continue`, `support_close` | 기능·접근성 검증은 포함하되 위기 상태 노출을 추론할 외부 분석 이벤트는 기본 제외 |
| 위기 지원 링크 | `support_phone_link` | 전화 앱 연결 동작 검증. 실제 통화 완료 이벤트 금지, 외부 분석 기본 제외 |
| 확정된 신규 구분 | `story_hide_for_me`, `story_unhide_for_me`, `story_make_private`, `story_make_public` | 개인 숨김/작성자 비공개 각각 op. 재공개 시 댓글·투표 복원 확정; 개인 숨김 해제 위치는 Q07 미결정 |

일반 모달의 배경 클릭/ESC/닫기 버튼은 같은 모달 종료로 처리하고 `close_method=backdrop/escape/button`만 구분한다. 입력 필드의 매 타이핑·스크롤마다 이벤트를 만들지 않는다. 화면에 없는 버튼은 구현 완료로 표시하지 않는다.

비활성 버튼은 브라우저가 클릭 이벤트를 내보내지 않을 수 있다. 이벤트를 얻으려고 임의로 활성화하지 않는다. 제한 안내가 노출된 상태와 실제 허용된 시도를 분리해 분석한다. '사연 숨기기'의 기존 단일 ID는 개인 숨김/작성자 비공개로 분리할 때 종료하고 이벤트 버전을 구분한다.

비공개 사연에서 새 대화를 만들려는 실제 요청은 `action_blocked`의 정제 사유 `story_private`로 구분한다. 이미 소유한 대화를 열고 이어하는 것은 허용되므로 `ai_chat_open`의 `is_resume=true`로 기록한다. 공개 상태 변경 때문에 기존 대화를 새 생성 성공으로 세지 않는다. 이 이벤트 사유·속성은 구현할 허용 목록에 추가한다.

위기 지원처럼 민감한 상태와 직결되는 버튼은 **전수 기능 검증에는 포함하되 GA4 전송 제외**다. 이것을 이벤트 누락으로 오인하지 않도록 최종 목록에 사유를 남긴다.

## GA4 연결·운영 설정 작업

1. 실제 소유 계정의 웹 속성/스트림, 운영 URL, 시간대 `Asia/Seoul`, 보관 기간, 담당자를 기록한다. 테스트용 속성을 따로 두는 것을 추천한다. GA4를 위해 Firebase로 DB를 옮길 필요는 없다.
2. Preview와 Production에 맞는 `VITE_GA4_ID`를 설정하고 각각 다시 빌드·배포한다. Vite의 이 값은 빌드 때 들어가므로 환경변수 저장만으로 기존 배포가 바뀌지 않는다.
3. 현재 탭 전환은 대부분 React state이므로 자동 URL 변화만으로 전체 화면이 기록되지 않는다. `page_view`는 주요 화면 전환을 직접 관리한다. 정제 URL 예: `/feed`, `/story`, `/ai/setup`, `/ai/chat`, `/mypage`; 실제 사연 제목·본문을 넣지 않는다.
4. 직접 page_view를 보내는 경우 초기 자동 전송(`send_page_view`)과 향상된 측정의 **브라우저 history 기반 page_view** 중복을 함께 막는다. 마이페이지 내부 섹션은 screen_section으로 구분한다. [SPA 계측](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications), [자동·수동 페이지뷰](https://developers.google.com/analytics/devguides/collection/ga4/views).
5. 보고서에 필요한 낮은 종류 수의 속성(`button_id`, `entry_point`, `mode`, `is_resume`, `auth_state`, `release_id`, `ui_revision`, `event_schema_version`, `traffic_class`, `operation`, `error_code`)을 맞춤 측정기준으로 먼저 등록한다. 요청·사연·사용자 UUID를 차원으로 등록하지 않는다. [맞춤 정의](https://support.google.com/analytics/answer/14240153?hl=en).
6. 내부 트래픽·개발 트래픽은 먼저 시험 상태에서 분리 동작을 확인한다. 운영 데이터에서 제외할 범위를 확정한 뒤 활성화한다. Preview 데이터는 운영 기준선에 합치지 않는다.
7. DebugView에 실제 클릭·성공·실패가 들어오는지 확인한다. QA 기기만 debug를 켜고, 운영 전체에 켜두지 않는다. 이후 일반 보고서에서도 같은 릴리스의 데이터가 나타나는지 확인한다. 처리 지연을 고려해 당일 수치로 최종 판정하지 않는다. [DebugView](https://support.google.com/analytics/answer/7201382?hl=en).
8. 주요 이벤트를 지정하고 이름·조건·카운팅 방식·설정일을 기록한다. 첫 사이클의 도달 지표는 세션/사용자 중복 제거를 별도로 적용한다. 주요 이벤트 지정은 과거 데이터를 소급 변경하지 않는다.

## DB 이벤트와 GA4의 역할

GA4는 유입·기기·화면·사용자 흐름·대표 지표를 본다. 앱 이벤트/DB는 같은 사연·같은 요청에서 성공했는지, 저장이 맞는지, 정확한 AI 진입 순서와 시간을 확인한다. GA4의 사용자 기반 퍼널만으로 같은 사연/대화에서 순서대로 진행했음을 단정하지 않는다.

기존 `events`는 보존한다. 새 이벤트 허용 목록·속성·버전·idempotency를 검토하고 **DB 확장 → 테스트 → 이벤트를 보내는 클라이언트 배포** 순으로 적용한다. 복구 시 새 버전의 데이터가 이전 정의로 섞이지 않게 한다. 운영 테이블 초기화로 과거 테스트 데이터를 지우지 않는다.

GA4와 앱 이벤트 수가 완전히 같을 것이라고 기대하지 않는다. 동의·브라우저 차단·기기·세션 기준이 다르다. 통제된 QA에서는 사전에 정한 발행 건수·성공 수를 비교하고, 운영에서는 수집 가능 대상과 누락 원인을 함께 보고한다. 정밀한 세션/요청 분석은 기존 앱 이벤트를 우선 활용하고 BigQuery는 실제 분석 요구가 생길 때 검토한다.
