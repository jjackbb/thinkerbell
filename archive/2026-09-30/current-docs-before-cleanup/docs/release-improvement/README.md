# 기능 정상화·검증의 상세 자료

**최신 계획: [PLAN.md](../../PLAN.md).** 이 폴더는 그 계획의 근거와 세부 명세를 보관합니다. 독립 일정·출시 조건을 정하지 않습니다.

| 자료 | 사용 방법 |
|---|---|
| [현재 상태 분석](01-current-state.md) | 2026-09-22 18:11 기준 코드 점검·과거 인터뷰 근거. 이후 정책 정정과 구분 |
| [버튼·이벤트 명세](02-events-and-buttons.md) | PLAN의 첫 정상 답변·동의·평가 기준에 맞춘 구현 참고. 아직 기능 검증 완료 아님 |
| [검증·개선 확인 명세](03-validation-and-improvement.md) | 기능·권한·계측·실제 사용자 개선 시나리오. 실행 결과와 구분 |
| [UX 기준과 남은 선택](04-ux-priorities-and-decisions.md) | 확정된 정책과 화면 세부 미결정을 구분 |
| [상호작용 원본 CSV](source-interactions.csv) | 이동 전 소스의 정적 위치 153곳을 포함한 추출 원본. 실제 화면 버튼 수·검증 결과 아님 |
| [점검 근거 JSON](audit-evidence.json) | 당시 명령·공개 URL 조회·미실행 기록. 변경하지 않은 역사 자료 |

CSV와 JSON은 원본 바이트를 유지했습니다. 옛 `src/`는 지금 `frontend/src/`, 옛 `api/index.ts` 구현은 `backend/app.ts`, 옛 `supabase/`는 `backend/supabase/`입니다. 세부 이동표와 이번 검증은 [폴더 정리 기록](../folder-reorganization.md)에 있습니다.

이전 W0~W9 계획과 수정 전 명세는 [보관 안내](../../archive/2026-09-22/README.md)에서 찾습니다. 그 안의 3턴 대표 지표·고정 관찰 기간·성인 인증 포함 출시·미결정 표시는 최신 정책이 아닙니다.
