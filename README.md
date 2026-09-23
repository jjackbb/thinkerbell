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

## 배포와 현재 구현의 한계

기존 Vercel 구조를 유지합니다. 루트 `api/index.ts` → `backend/app.ts`, 루트 `vercel.json`의 `/api/*` rewrite, 정적 출력 `dist/`를 사용합니다. 이번 폴더 정리는 원격 프로젝트 설정 변경이나 배포를 포함하지 않습니다.

계획의 AI 공급자는 포텐스 단독입니다. 현재 코드에는 Gemini 예비 경로가 남아 있으며 제거는 기능 정상화 작업에서 수행해야 합니다. GA4 동의 처리도 아직 구현 전이므로 측정 ID 입력만으로 계획이 완료되었다고 보지 않습니다. 실제 가입·AI·DB·계측 검증 상태는 상세 기록에서 구분합니다.
