# 첫 공개 핵심 버튼 계약 — 2026-09-28

**2026-09-30 후속:** 실제 A·B 핵심 과업에 이어 운영자 답변(13~14), 닉네임(22~24), 댓글 수정·삭제(13~18), 분석 철회(03), 탈퇴 취소·확정(10~12, 일회용 기술 계정)을 확인했다. 주입 실패·실제 성공과 174개 전체 미검증 범위는 [최신 preflight](2026-09-28-in-progress-release-preflight.md)에 구분했다.


[PLAN](../../PLAN.md)이 정책 기준이고 [174개 정적 버튼 ID 목록](2026-09-28-button-inventory.md)이 위치 기준이다. 아래는 첫 과업의 핵심 행동에 한정한 **코드 계약과 검증 케이스**다. 조건부 노출과 실제 계정·브라우저 결과는 아직 이 표에서 PASS로 간주하지 않는다. GA4는 동의 뒤 허용된 핵심 과업만 전송한다.

| 화면 / button_id | 동작·선행 조건 | 성공 결과 | 실패·취소 | GA4 / 확인 케이스 |
| --- | --- | --- | --- | --- |
| 가입 `welcome-modal-button-11` | 메일함 소유 확인 요청. Preview에서만 활성화 | 요청 접수 안내, 메일 한 통 예정. 존재 여부는 노출하지 않음 | 발송/한도 오류를 보여주고 주소 보존 | 제외 / A·B 메일 수신·링크 1회·만료 |
| 가입 `welcome-modal-button-12` | 로그인 또는 소유 확인 후 새 계정 생성 | 실제 인증 세션 확인 후 화면 전환 | 로그인·저장 오류 안내, 입력 보존 | 제외 / 새 가입·기존 가입·새로고침 |
| 사연 작성 `create-story-modal-button-04` | 로그인·필수 입력·서버 저장 가능 | 서버 저장 성공 확인 후 모달 종료·사연 표시 | 요청 실패면 모달과 입력 유지, 같은 요청 ID 재시도 | `story_publish_success` / 연타·통신 끊김·새로고침 중복 0 |
| 사연 상세 `story-detail-modal-button-09`, `story-detail-modal-button-10` | 타인의 공개 사연, 본인 아님, 변경 횟수 남음 | `vote_story` 성공 결과로 선택·숫자 갱신 | 취소/오류면 기존 선택·숫자 유지 | `vote_submit`, `vote_change_success` / 같은 선택·첫 동시 요청·반대 1회 |
| 사연 상세 `story-detail-modal-button-03` | 작성자·비공개 기능 플래그·DB 열 존재 | 비공개/재공개를 서버에서 확인해 화면과 마이페이지 구분 반영 | 확인창 취소·서버 오류면 이전 상태 유지 | 제외 / A 작성자·B 타인·익명 REST·Realtime |
| 사연 상세 `story-detail-modal-button-11` | 접근 가능한 사연 | AI 모드 선택 화면 진입 | 제한·권한·서버 오류는 안내 후 원래 화면 유지 | `ai_entry_click` / 게스트·본인·타인·숨김·비공개 |
| 모드 선택 `ai-chat-mode-selection-modal-button-03`, `ai-chat-mode-selection-modal-button-04`, `ai-chat-mode-selection-modal-button-05` | 모드·시작 방식 선택 | 선택에 맞는 AI 방 열기 | 방 생성 실패 시 재시도 가능 | `ai_mode_select`, `ai_start_select`, `ai_chat_open` / 중복 클릭·뒤로가기 |
| AI 대화 `ai-chat-view-button-16` | 로그인·입력 존재·서버 준비·횟수 여유 | 명시적 완료와 비어 있지 않은 답변을 표시. 저장 성공을 별도 확인 | 부분/공급자/저장 오류면 입력 보존, 실패 차감 0 | `ai_chat_turn1`과 `operation_success/error` 분리 / 정상·중단·저장 실패 |
| AI 대화 `ai-chat-view-button-15` | 답변은 받았지만 저장 실패 | 새 요청 ID로 새 답변을 받아 정상 저장 | 오류면 이전 저장 이력과 입력 유지 | 실제 새 정상 답변·저장 결과만 / 실패 재요청 |
| AI 마무리 `ai-chat-view-button-14` | 두 모드의 정상 저장 답변 1회 이상. 모드 없는 옛 방 제외 | 대화 보존하고 평가 화면 열기 | 돌아가면 대화 계속 사용 | `ai_chat_finish`, `ai_feedback_view` / 옛 방·새 방 |
| 도움 평가 `ai-chat-view-button-20`, `ai-chat-view-button-21` | 마무리 화면·점수 또는 건너뛰기 | 서버가 한 방의 한 평가 결과를 확인하고 닫기 | 저장 오류면 선택 화면·재시도 유지, 평가 없이 닫기 가능 | `ai_feedback_submit`에 점수값 제외 / 반복 제출·삭제·건너뛰기 |
| 분석 동의 `analytics-consent-button-01`, `analytics-consent-button-02`, `analytics-consent-button-03`, `analytics-consent-button-04` | 첫 방문 배너 또는 마이 설정 | 거부/동의/철회 선택 유지 | 분석 장애는 제품 사용에 영향 없음 | 선택 자체는 외부 전송 제외 / 태그 미로드→동의 뒤 QA 이벤트→철회 뒤 중단 |
| 이의 제기 `app-button-09` | 가려진 내 사연·빈칸 아닌 설명 | 서버 접수 뒤 창 종료·대기 상태 표시 | 저장 실패면 설명과 창을 보존하고 중복 제출을 막음 | 제외 / 서버 오류·재시도·계정 교체 |
| AI 대화 전체 삭제 `my-page-view-button-37` | 내 방 존재·두 번째 확인 | 서버 삭제 성공 뒤 확인창 종료·목록 비움 | 삭제 실패면 확인창·오류 안내를 남기고 다시 시도 | 제외 / 서버 실패·계정 교체 |

코드의 `data-button-id`는 같은 행동의 반복 렌더링 인스턴스에서 같은 값을 쓴다. 이 목록의 성공/실패 내용은 구현 계약이지 실제 사용자 관찰이 아니다. 남은 버튼의 화면 노출·동작 결과·실패/취소·이벤트 제외 사유·검증 케이스는 [전체 ID 목록](2026-09-28-button-inventory.md)을 기준으로 확장해야 한다.

PLAN에서 알림·구독은 첫 공개에 “준비 중”으로 정했다. 실제 발송 코드가 없는데도 마이 화면에서 알림 수신을 약속하며 켜고 끄던 버튼 3개는 제거하고 준비 중 안내로 바꿨다. 버튼 정적 수는 177→174이며 기존의 다른 `data-button-id`는 바꾸지 않았다. 이의 제기·전체 삭제의 [주입 500 뒤 정상 재시도](2026-09-28-preview-browser-followup.md)와 [사연·댓글·AI의 선택한 핵심 버튼](2026-09-28-in-progress-release-preflight.md)은 Preview의 임시 계정으로 확인했다. 실제 공급자·DB 장애와 나머지 조건부 버튼의 브라우저 시험은 남았다.
