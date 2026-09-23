# AI 프롬프트 작업 가이드

니편내편의 AI 대화 기능을 손볼 때 읽는 문서. 어디를 고치면 되는지와, 지금 구조가
왜 이렇게 됐는지를 적어둔다.

최종 수정: 2026-08-20

---

## 1. 프롬프트는 전부 `src/lib/prompts.ts` 한 곳에 있다

**대화 프롬프트를 고칠 일이 있으면 이 파일만 열면 된다.** 컴포넌트나 App.tsx 안에
프롬프트 문자열을 새로 쓰지 말 것.

| export | 쓰는 곳 | 하는 일 |
|---|---|---|
| `buildSimulationPrompt({ storyBody, opponentPersonality, opening })` | 상황 모드 | 갈등 상대방 본인을 연기시킨다 |
| `buildEmpathyPrompt({ storyBody, opponentPersonality, ratio })` | 공감 모드 | 사연을 같이 읽어주는 친구/조언자 |
| `OPENING_SCRIPTS` | 상황 모드 | 시작점 3종의 첫 대사·상황·태도 |
| `EMPATHY_OPENERS` | 공감 모드 | 비율 3종의 AI 첫 마디 |
| `ratioLabel(ratio)` | 공통 | `'High' → '내 편 100%'` 화면 라벨 |

파일 안에서 재사용하는 조각:

- `BASE_RULES` — AI 정체 차단 / 메타 발언 금지 / 대사만 출력. 모든 모드 공통.
- `KAKAO_LENGTH_RULE` — 2~3문장(최대 4문장) 제한. **모든 모드에 반드시 넣을 것.**

### 왜 모아뒀나

원래는 상황 모드 프롬프트가 `App.tsx` 안에 **두 벌 복붙**돼 있었다
(사연 등록 시 자동 생성용 / 사연에서 대화 시작용). 두 벌이 이미 서로 달라져서,
같은 사연이라도 **어디서 열었느냐에 따라 AI가 다르게 굴었다.** 톤을 바꾸려면 두
군데를 똑같이 고쳐야 했고, 한쪽만 고치면 조용히 어긋났다.

---

## 2. 프롬프트 말고 AI 관련 코드가 있는 곳

| 위치 | 내용 |
|---|---|
| `api/index.ts` `/api/chat-stream` | 실제 LLM 호출. systemInstruction + 최근 대화 + 최신 발언을 하나로 합쳐 보낸다 |
| `api/index.ts` `/api/check-adult-content` | 사연 검열 + 양측 논점(`issueMySide`/`issueYourSide`) 추출. **대화 프롬프트와 무관** |
| `api/index.ts` `/api/sanitize-text` | 댓글 비속어 필터 |
| `src/components/AIChatView.tsx` | 스트리밍 수신, `[SIM_END:*]` 파싱, 말풍선 렌더 |
| `src/App.tsx` `handleSelectAiChatMode` | 상황 모드 페르소나·세션 생성 |
| `src/App.tsx` `handleConfirmExplainSettings` | 공감 모드 페르소나·세션 생성 |
| `src/data/mockData.ts` | 기본 페르소나 3종 (사연과 무관한 데모용) |

### LLM 호출 경로

```
AIChatView → POST /api/chat-stream → Potens(claude-4-6-sonnet) → 실패 시 Gemini → 실패 시 목업
```

> ⚠️ **`GEMINI_API_KEY`가 비어 있다.** Potens가 죽으면 Gemini를 건너뛰고 곧바로
> 하드코딩된 목업 대사("너 정말 너무하다...")가 사용자에게 나간다. 폴백을 살리려면
> `.env`에 키를 채울 것.

---

## 3. 대화가 끝나는 방식 — `[SIM_END:*]`

상황 모드에서만 쓴다. AI가 답변 맨 끝에 `[SIM_END:SUCCESS]` 또는 `[SIM_END:FAIL]`을
붙이면 대화가 종료되고 요약 카드(`SessionSummaryCard`)가 뜬다.

- 파싱: `AIChatView.tsx`의 스트리밍 루프에서 문자열 검사 → `setSimEndResult`
- 기호는 화면에 보이기 전에 정규식으로 지워진다
- 4턴 이상 오가면 사용자가 직접 끝낼 수 있는 바도 따로 뜬다

**기호 문자열은 `prompts.ts`의 `SIM_END` 상수 하나에서만 온다.** 프롬프트도, 화면
쪽 파싱도 전부 그 상수를 쓴다. 문구를 바꿀 일이 있으면 거기만 고치면 된다.

| export | 하는 일 |
|---|---|
| `SIM_END.SUCCESS` / `SIM_END.FAIL` | 실제 기호 문자열 |
| `detectSimEnd(text)` | `'success' \| 'fail' \| null` 반환 |
| `stripSimEnd(text)` | 화면에 내보내기 전 기호 제거 |

예전에는 양쪽에 따로 하드코딩돼 있어서, 한쪽만 고치면 대화가 영영 안 끝나거나
기호가 그대로 화면에 새어 나왔다.

---

## 4. 난이도를 어떻게 잡았나 (건드릴 때 주의)

예전 프롬프트는 화해 조건이 **OR 3개**였다. 그래서 실제로 돌려보면 **유저가 두 번째
턴에 한 번 달래주자 꼰대 부장이 소리지른 것도, 밥 먹는 속도 참견한 것까지 다
사과하고 끝났다.** 그러면 이건 대화 연습이 아니라 기분 좋은 판타지가 된다. 여기서
통한 말이 실제 대화에서는 안 통하기 때문이다.

지금은 이렇게 잡혀 있다:

- **최소 3턴** 전에는 어떤 종결 기호도 못 붙인다
- 화해는 **AND 조건**: ① 유저가 상대 입장을 먼저 인정했고 ② 그 위에서 구체적 대안을
  냈거나 비난 없이 설득했을 때만
- 하나만 충족되면 "조금 누그러진 티만 내고 계속 대화"
- **결렬도 정상 결말**임을 명시 — 억지 화해로 몰아가지 않게

난이도를 낮추고 싶으면 AND를 OR로 되돌리기 전에, **실제로 대화를 3~4번 돌려보고
판단할 것.** 프롬프트만 읽고는 체감 난이도를 알 수 없다.

---

## 5. 작성자가 적은 '상대방 성격'이 흐르는 경로

사연 작성 폼의 "상대방 성격 (선택사항)" 100자 입력이 AI까지 도달하는 길이다.
**한동안 저장이 안 돼서 통째로 버려지고 있었다.** (2026-08-19 복구)

```
CreateStoryModal (opponentPersonality)
  → App.handleCreateStory → Story.personaInstruction 으로 저장
  → DB stories.personaInstruction (컬럼은 원래부터 있었음, 마이그레이션 불필요)
  → buildSimulationPrompt({ opponentPersonality: story.personaInstruction })
```

필드 이름이 폼에서는 `opponentPersonality`, 저장 후에는 `personaInstruction`으로
바뀐다. 헷갈리기 쉬우니 주의.

---

## 6. 페르소나 재사용 규칙

`AIPersona`에 `storyId` / `opening` / `ratio`를 달아두고, **같은 조합이면 새로 만들지
않고 이전 대화를 이어서 연다.**

- 상황 모드 키: `storyId` + `opening`
- 공감 모드 키: `storyId` + `ratio`

예전에는 `시작하기`를 누를 때마다 새 페르소나가 생겨서, AI 대화 탭이 똑같은 카드로
뒤덮였다. 재사용할 때는 무료 횟수도 차감하지 않는다.

---

## 7. 무료 체험 횟수

세는 코드는 전부 `src/lib/aiQuota.ts` 한 곳에 있다.

- 상수: `DAILY_AI_QUOTA = 3`
- **로그인 상태**: Supabase `ai_chat_usage` 테이블에 한 줄씩 쌓고, 오늘 날짜 행을 센다
- **로그인 전 / 서버 응답 실패**: 예전처럼 `localStorage['nipyeon_ai_quota']`
- 하루 경계는 **한국 시간(Asia/Seoul)** 기준. DB `usedOn` 기본값과 클라이언트가
  같은 기준을 써야 자정 무렵에 숫자가 어긋나지 않는다
- **내가 쓴 사연은 횟수를 쓰지 않는다.** 재진입도 안 쓴다
- 소진 시 `PremiumModal`

`ai_chat_usage`의 RLS는 **SELECT·INSERT만 본인 것으로 허용하고 UPDATE·DELETE 정책은
일부러 만들지 않았다.** 사용 기록을 지워서 횟수를 되돌리는 길을 막기 위해서다.

> 서버가 응답하지 않으면 로컬 카운트로 내려간다. 서버 장애 때 쓰던 사람을 통째로
> 막아버리는 것보다 낫다고 봤지만, 실제 과금이 붙으면 이 폴백은 다시 봐야 한다.

---

## 8. 프롬프트 고친 뒤 확인하는 법

1. `npx tsc --noEmit && npm run build`
2. `npx tsx server.ts` 로 띄우고 실제로 3~4턴 대화해 볼 것 — **프롬프트는 눈으로
   읽어서는 결과를 알 수 없다.** 특히 답변 길이와 화해 시점.
3. 확인할 것: 답변이 2~4문장인가 / 3턴 전에 끝나지 않는가 / 상대가 너무 쉽게
   무너지지 않는가 / `[SIM_END:*]`가 화면에 새어 나오지 않는가

---

## 9. 알려진 숙제

- `GEMINI_API_KEY` 비어 있음 → 폴백 없음. **보류 결정** (2026-08-20): Potens가 무료라
  당분간 그대로 간다
- 대화 히스토리는 최근 8개만 보낸다 (`AIChatView.tsx`의 `messages.slice(-8)`).
  긴 대화에서 앞부분을 잊는다 — 프롬프트 다듬기 단계에서 같이 손볼 예정

### 정리된 것

- ~~`[SIM_END:*]` 양쪽 하드코딩~~ → `prompts.ts`의 `SIM_END` 상수로 통합 (2026-08-20)
- ~~무료 횟수가 localStorage 기반~~ → Supabase `ai_chat_usage`로 이관 (2026-08-20)
- ~~`empathyScore` 살릴지 지울지~~ → 제거 결정. 공감 비율과 정보가 중복이었고 화면에
  쓰이지도 않았다 (2026-08-20)
