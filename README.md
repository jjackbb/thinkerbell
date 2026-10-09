# 니편내편

**최신 계획은 [PLAN.md](PLAN.md) 하나입니다.** 공개 범위·정책·측정·완료 기준은 이 문서를 따릅니다. 다른 문서는 구현 참고·검증 명세·과거 근거이며 별도 계획이 아닙니다.

## 파일 안내

| 위치 | 역할 |
|---|---|
| [frontend/](frontend/) | React 화면·브라우저 로직·정적 파일·Vite 설정 |
| [backend/](backend/) | Express API·로컬 서버·DB 마이그레이션 |
| [api/index.ts](api/index.ts) | Vercel이 백엔드를 호출하는 배포 진입 파일 |
| [docs/release-improvement/](docs/release-improvement/README.md) | 결함 근거·버튼/이벤트·검증·UX 상세 참고 |
| [docs/ai-prompts.md](docs/ai-prompts.md), [docs/admin.md](docs/admin.md) | AI 수정·운영 안내 |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | 과거 패치 이력과 이후 변경 기록 |
| [archive/2026-09-22/](archive/2026-09-22/README.md) | 이전 기획·조사·테스트 준비·일회성 스크립트·수정 전 문서 |
| [docs/folder-reorganization.md](docs/folder-reorganization.md) | 폴더 이동표·이번 변경의 검증·인수인계 |

## 로컬 실행

Node.js와 npm을 사용합니다. 아래 명령은 모두 **저장소 루트**에서 실행합니다. 프론트·백엔드는 공통 `package.json`과 `package-lock.json`으로 설치합니다.

```sh
npm ci
# .env가 없을 때만 .env.example을 복사하고 실제 값을 설정합니다.
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. 루트 `.env`의 기존 값은 유지합니다. `VITE_*`는 브라우저에 포함되므로 서버 비밀키를 넣지 않습니다.

```sh
npm run lint
npm run build
NODE_ENV=production npm start
```

`lint`는 TypeScript 타입 검사입니다. 빌드는 `dist/`에 화면과 `server.cjs`를 생성합니다. `frontend/`만 별도로 설치하거나 실행하지 않습니다.

## 배포와 현재 상태

Vercel은 루트 `api/index.ts` → `backend/app.ts`, `vercel.json`의 `/api/*` rewrite, 정적 출력 `dist/`를 사용합니다. 프로젝트는 `jjackbb-projects/thinkerbell`, 공개 주소는 https://thinkerbell-eight.vercel.app/ 입니다.

포텐스 단독 AI·서버 저장·권한 경계·메일·동의 기반 GA4의 운영 반영과 핵심 기술 검증 기록이 있습니다. 최신 상태와 이번 계측 복원 배포 범위는 [인수인계](docs/plan-execution/README.md)를 확인합니다. 과거 폴더 정리 시점의 미배포 안내로 현재 상태를 판단하지 않습니다.

[현재 안내 정리 전 원본](archive/2026-09-30/current-docs-before-cleanup/README.md)은 이력입니다. [배포 절차](docs/plan-execution/2026-09-28-release-gates.md)와 [기술 근거](docs/plan-execution/2026-09-28-in-progress-release-preflight.md)를 구분합니다.
