# AI 코드 수정 안내

최신 기능 계약은 [PLAN.md](../PLAN.md) §2~3입니다. 아래는 폴더 분리 후 코드 위치와 수정 시 지킬 사항입니다. 구조를 옮겼을 뿐 AI 정상화가 완료된 것은 아닙니다. [이전 안내 원본](../archive/2026-09-22/before-alignment/docs/ai-prompts.md)에 당시 설계 이유·검증 기록을 보존했습니다.

## 현재 파일 위치

| 파일 | 역할 |
|---|---|
| `frontend/src/lib/prompts.ts` | `buildSimulationPrompt`, `buildEmpathyPrompt`, `OPENING_SCRIPTS`, `EMPATHY_OPENERS`, `ratioLabel`, `SIM_END`, `detectSimEnd`, `stripSimEnd` |
| `frontend/src/components/AIChatView.tsx` | 스트림 수신·종결 기호 처리·말풍선 |
| `frontend/src/App.tsx` | 모드·공감 설정, 사연 기반 대화 진입 |
| `frontend/src/lib/aiPersonas.ts` | 브라우저에서 대화 저장·복원 요청 |
| `frontend/src/lib/aiQuota.ts` | 기존 브라우저 측 무료 횟수 처리 |
| `backend/app.ts` | `/api/chat`, `/api/chat-stream`, `/api/check-adult-content`, `/api/sanitize-text` |
| `api/index.ts` | Vercel 배포 진입. 구현은 backend를 재사용 |

현재 프롬프트 생성은 브라우저에 있습니다. 파일 이름이 AI·DB라고 해서 서버 전용 모듈이 되는 것은 아닙니다. 이번에는 실행 위치를 바꾸지 않았습니다. PLAN의 서버 소유권·저장 맥락 계약을 구현할 때 신뢰 경계를 함께 수정해야 합니다.

## 유지할 구현 맥락

- 대화 프롬프트를 컴포넌트마다 복제하지 않습니다. 공통 `BASE_RULES`, 답변 길이 규칙, 모드별 빌더를 사용합니다.
- 종결 기호는 `SIM_END` 상수에서 관리합니다. `detectSimEnd`와 `stripSimEnd`를 함께 확인합니다. 역할극의 성공/실패 종결은 도움 평가나 실제 갈등 해결 성과가 아닙니다.
- 기존 상대 역할 프롬프트의 최소 턴·화해 조건은 이번 폴더 정리에서 변경하지 않았습니다. 프롬프트 난이도와 대표 분석 이벤트 `ai_chat_turn1`은 별개입니다. 사용자 과업에서 3턴을 강제하지 않습니다.
- 작성 폼의 `opponentPersonality`는 기존 사연의 `personaInstruction`을 통해 프롬프트에 전달됩니다. 실제 저장·권한은 재검증 대상입니다.
- 기존 재사용 키는 상대 역할 `storyId + opening`, 공감 `storyId + ratio`입니다. 최종 새 대화·이어하기·관점 변경 판정은 서버 대화방 소유권·저장 맥락에 맞춰야 합니다.

## 최신 계획과 현재 구현의 차이

- **공급자:** 포텐스만 사용하도록 정상화해야 합니다. 현재 서버의 Gemini 예비 경로와 일부 모의 응답은 기존 코드이며 새 계획의 승인된 동작이 아닙니다. Gemini 키를 채워 예비 경로를 활성화하는 것을 해결책으로 삼지 않습니다.
- **횟수:** 한국 시간 하루 3회, 내 사연·정상 이어하기 제외. 첫 요청 중 예약 → 첫 정상 답변 완료 후 차감, 실패·완료 전 취소 반환이 목표입니다. 기존 브라우저 카운트·로컬 저장만으로 서버 제한을 보장하지 않습니다.
- **스트림·저장:** delta/done/error 구분, 정상 답변 저장 후 완료. 고정 인사·부분 응답·모의 응답은 정상 턴이 아닙니다.
- **공개 권한:** 비공개 사연 타인의 신규 대화 차단, 작성자 생성·기존 소유 대화 허용. 기존 공감 관점 변경은 저장된 맥락 사용.
- **마무리:** 대화 보존과 5점 도움 평가. 기존 기분·한 줄 소감 입력은 제거 대상입니다. 도움 평가값은 GA4 제외입니다.
- **콘텐츠 검사:** 실패 시 입력 보존·포텐스 재검사. 실패를 안전으로 취급하거나 브라우저 검사 결과만 신뢰하지 않습니다.

## 수정 후 확인

루트에서 `npm run lint`, `npm run build`, `npm run dev`를 사용합니다. 실제 프롬프트를 수정한 경우 허용된 시험 환경에서 답변 길이·역할 설명·종결·실패·저장·복원을 확인합니다. 실제 공급자 요청과 오류 주입 시험, 로컬 빌드와 운영 검증을 구분해 기록합니다.
