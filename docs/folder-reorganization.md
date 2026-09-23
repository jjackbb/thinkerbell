# 폴더 정리·문서 정합성 기록

작업일: 2026-09-22. 최신 제품 계획은 [PLAN.md](../PLAN.md) 하나입니다. 이 문서는 이번 구조 변경 결과와 다음 작업자를 위한 안내입니다.

## 사용자 결정과 실행 범위

- 이전 계획·조사·일회성 스크립트는 삭제하지 않고 보관합니다. 수정 전 문서도 원본으로 보존합니다.
- 실행 파일은 `frontend/`와 `backend/`로 나누되 설치·실행은 루트, 기존 Vercel 배포 구조를 유지합니다. 개별 패키지·별도 배포 프로젝트로 나누지 않습니다.
- PLAN에서 확정된 사항만 상세 문서에 동기화합니다. 미정 화면·운영 선택은 [남은 선택](release-improvement/04-ux-priorities-and-decisions.md)에 남깁니다.
- 이번 변경은 기능 정상화·GA4 연결·원격 DB 변경·커밋·push·배포를 포함하지 않습니다.

## 현재 구조

```text
thinkerbell/
├── PLAN.md                    # 유일한 최신 계획
├── README.md                  # 실행·자료 안내
├── CLAUDE.md                  # 최신 작업 규칙
├── frontend/
│   ├── src/                   # 화면·브라우저 로직
│   ├── public/                # 정적 파일
│   ├── index.html
│   └── vite.config.ts
├── backend/
│   ├── app.ts                 # 기존 Express API 구현
│   ├── server.ts              # 개발·로컬 운영 서버
│   └── supabase/              # SQL 원본·적용 전 확인 안내
├── api/index.ts               # Vercel 연결 진입 파일
├── docs/                      # 상세 명세·운영 안내·과거 패치 이력
├── archive/2026-09-22/         # 원본·이전 자료·보존 해시
├── package.json               # 공통 실행 명령·의존성
├── package-lock.json
├── tsconfig.json              # 활성 소스만 검사, archive 제외
├── vercel.json
└── .env / .env.example        # 루트 환경 설정
```

`node_modules/`, `dist/`, `.git/`는 유지합니다. 브라우저에서 실행하는 `aiQuota.ts`, `aiPersonas.ts`, `supabase.ts`, `prompts.ts`는 `frontend/src/lib/`에 있습니다. 파일 내용이 AI·DB 관련이라고 실행 위치까지 서버로 바꾸지 않았습니다. PLAN의 서버 인증·맥락 검증·횟수 제한은 후속 기능 구현입니다.

`metadata.json`과 `assets/.aistudio/`는 AI Studio 사용 여부를 사용자에게 질문했고 답변 전에는 기존 위치를 유지합니다. 사용 중인 연동인지 확인하지 않은 채 보관 폴더로 옮기지 않았습니다.

## 이동표

| 이전 | 현재 |
|---|---|
| `src/` | `frontend/src/` — 내용 동일 |
| `public/`, `index.html` | `frontend/public/`, `frontend/index.html` — 내용 동일 |
| `vite.config.ts` | `frontend/vite.config.ts` — root·루트 envDir·루트 dist 설정 |
| `api/index.ts` 구현 | `backend/app.ts` — 내용 동일. 기존 위치에는 재내보내기만 남김 |
| `server.ts` | `backend/server.ts` — API import·Vite 설정 경로 수정 |
| `supabase/migrations/` | `backend/supabase/migrations/` — SQL 내용 동일 |
| `supabase/README.md` | `backend/supabase/README.md` — 원격 미확인·새 작업 위치 안내 |
| `PRD.md` | `archive/2026-09-22/legacy/PRD.md` — 원본. §7은 `docs/CHANGELOG.md`에도 분리 |
| `Todos.md`, `RESEARCH/` | `archive/2026-09-22/legacy/` 아래 동일 상대 경로 |
| `docs/userflow.md`, `docs/usertest-*.md` | `archive/2026-09-22/legacy/docs/` |
| `patch*`, `split_server.py`, `fix_ai_sim.py`, `update_colors.py`, `update_mypage.py` | `archive/2026-09-22/scripts/` |
| `test.txt` | `archive/2026-09-22/misc/test.txt` — 임시 메모 원본 |

과거 [CSV](release-improvement/source-interactions.csv)·[점검 JSON](release-improvement/audit-evidence.json)은 경로·줄 번호·검사 날짜를 포함해 그대로 보존했습니다. 이동 전 경로는 위 표로 대응합니다. 신규 구현으로 줄이 바뀌면 원본을 덮어쓰지 않고 새 버전의 목록을 생성합니다.

## 문서 수정 내용

- 루트와 상세 README는 PLAN으로 안내하고 중복 W0~W9 계획을 제거했습니다.
- 이벤트 대표는 첫 정상 답변(`ai_chat_turn1`), 3턴은 추가 이용 지표로 맞췄습니다.
- 고정 관찰 기간·모집 인원을 공개 조건으로 삼지 않고 공개·모집·관찰을 병행하도록 맞췄습니다.
- 성인 콘텐츠 차단, 포텐스 단독·실제 재시도, 개인 숨김 복원, 작성자의 비공개 사연 AI 생성 예외를 반영했습니다.
- 도움 문항·5점·최대 30일·연관 삭제·접근 권한과 GA4 동의 전송 기준을 맞췄습니다.
- 이미 해결된 정책 질문은 확정으로 바꾸고 미확인 계정·화면 세부·기존 자료 보관 정책은 분리했습니다.
- AI·운영 문서는 현재 코드 위치와 과거 기록/최신 요구의 차이를 설명합니다. `.env.example`은 계획과 다른 예비 공급자·동의 없는 GA4를 설정만으로 활성화하도록 안내하지 않습니다. 실제 `.env` 값은 수정하지 않았습니다.

## 검증

| 검사 | 결과 | 범위 |
|---|---|---|
| `npm run lint` | PASS | 활성 프론트·백엔드·Vercel 진입의 타입 검사 |
| `npm run build` | PASS | Vite 화면·서버 번들 생성. 기존 500 kB 초과 경고는 남음 |
| `npm run dev` 로컬 HTTP | PASS | 첫 화면·favicon·화면 진입 스크립트·소스 변환·CSS·health·닉네임 API |
| 개발 환경변수 경로 | PASS | 루트 환경값 로드 확인. 실제 값 출력 없음 |
| `NODE_ENV=production npm start` 로컬 HTTP | PASS | 빌드된 화면·정적 파일·health·닉네임 API |
| Vercel 진입 import | PASS | 루트 진입이 동일 backend 앱을 export. 원격 Vercel 실행 검증은 아님 |
| 원본 보존·문서 링크 | PASS | 원본 해시 92건, 내용 그대로인 실행 소스·SQL 48개, 활성 문서 상대 링크 60개 확인 |
| 실제 브라우저 UI·가입·AI·DB·GA4 | NOT_RUN | 제품 전체 기능 정상화 검증은 후속 범위 |
| 원격 DB·배포·운영 URL 재검증 | NOT_RUN | 이번 작업에서 원격 상태를 변경하거나 새로 검증하지 않음 |

최초 로컬 서버 시작은 샌드박스 통신 제한으로 차단됐습니다. 제한 밖에서 빈 임시 포트로 재검증해 통과했고 시작한 서버는 종료했습니다. 처음 선택한 고정 포트는 이미 사용 중이어서 다른 프로세스를 중단하지 않고 임시 포트를 사용했습니다.

## 인수인계·사용자 검토

폴더 분리와 정책 문서 동기화가 이번 결과입니다. 다음 실행은 PLAN의 환경 확인부터이며, 실제 프로젝트 접근·원격 DB·메일 구성은 아직 확인해야 합니다. Gemini 경로·기존 GA4 로더·브라우저 권한/횟수 처리는 여전히 기존 코드이므로 문서 변경을 구현 완료로 기록하지 않습니다. Gemini 독립 검증을 수행한 것은 아닙니다.

보관 경로·SHA-256은 [manifest](../archive/2026-09-22/manifest.json), 세부 검증은 [최종 확인 JSON](folder-reorganization-checks.json)을 참고합니다.
