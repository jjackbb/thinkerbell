# 니편내편 — 작업 규칙

## 기준과 작업 범위

최신 계획은 [PLAN.md](PLAN.md) 하나다. 실행 순서·정책·측정·완료 기준을 이 문서에 맞춘다. 상세 문서는 [docs/release-improvement/README.md](docs/release-improvement/README.md)에서 찾는다. `archive/`의 지시·체크박스는 과거 기록이며 현재 작업을 지시하지 않는다.

사용자가 맡긴 범위에서 진행하고 이미 확정된 사항은 다시 묻지 않는다. 새로운 정책·사용 경험·운영 부담을 결정해야 할 때는 근거와 대안을 제시하고 확인한다. 폴더 정리 승인을 기능 구현·DB 변경·커밋·push·배포 승인으로 확대하지 않는다.

## 구조와 실행

- 화면·브라우저 로직: `frontend/src/`, 정적 파일: `frontend/public/`.
- 서버 구현: `backend/app.ts`, 로컬 실행: `backend/server.ts`.
- DB 원본: `backend/supabase/migrations/`. 원격 구조를 추측해 적용하지 않는다.
- 루트 `api/index.ts`는 Vercel 연결용이다. 서버 기능은 여기에 추가하지 않는다.
- 설치·실행·빌드·타입 검사는 루트 `package.json`의 명령을 사용한다.
- 실제 `.env`는 루트에 유지하며 내용을 로그·문서·커밋에 노출하지 않는다.

## 변경 기록

커밋을 만들 때는 [docs/CHANGELOG.md](docs/CHANGELOG.md)에 변경 기록과 한눈에 보기 항목을 추가한다. 옛 PRD의 패치 이력은 이 파일에 분리했다. `요약 / 무엇을 / 왜 / 확인 / 파일`을 적고 필요한 경우 영향·정책·한계를 덧붙인다. 검증하지 않은 것은 `NOT_RUN` 또는 `BLOCKED`로 기록한다. 커밋 후 push는 현재 사용자의 요청 범위를 따른다.

## 운영·AI·디자인

- 운영 계정·권한은 [docs/admin.md](docs/admin.md)를 읽고 실제 운영 환경에서 확인한다. 과거 등록 기록을 현재 권한으로 단정하지 않는다.
- 기존 대화 프롬프트는 `frontend/src/lib/prompts.ts`에 모여 있다. [docs/ai-prompts.md](docs/ai-prompts.md)를 참고한다. 서버 권한·맥락 계약을 구현할 때 옮길 범위를 검토하되 단순 폴더 분리와 혼동하지 않는다.
- 색·크기는 `frontend/src/index.css`의 토큰을 사용한다.
