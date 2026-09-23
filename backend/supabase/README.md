# DB 구조와 변경 이력

최신 계획은 [PLAN.md](../../PLAN.md) §2·4입니다. 기존 `supabase/`를 `backend/supabase/`로 이동했으며 **SQL 파일 내용은 변경하지 않았습니다.**

`migrations/00000000000000_init_schema.sql`은 과거 문서에 따르면 2026-08-17 thinkerbell 프로젝트(`vzhyhadjtaqbapicjrco`)의 public 스키마를 추출한 파일입니다. 데이터는 포함하지 않습니다. 이후 마이그레이션도 당시 이력으로 유지합니다.

현재 원격 DB와 일치하는지는 미확인입니다. [기존 점검](../../docs/release-improvement/01-current-state.md)에 로컬 생성 정의가 없는 테이블·RPC 목록이 있습니다. 폴더 이동이나 로컬 빌드 합격을 원격 DB·RLS 검증으로 해석하지 않습니다.

## 후속 DB 작업 시

- 실제 대상 프로젝트·접근 권한·원격 스키마를 먼저 확인합니다. 기존 파일을 운영 DB에 재적용하지 않습니다.
- Supabase 작업 디렉터리는 이제 `backend/`입니다. CLI가 사용하는 `supabase/`가 그 아래에 있습니다. 실제 명령은 설치된 CLI 도움말로 확인합니다.
- 현재 저장소에는 Supabase 로컬 실행용 `config.toml`이 없습니다. 이번 정리에서 새 프로젝트 연결·로컬 DB 구성·원격 명령은 실행하지 않았습니다.
- 기존 데이터·대화와 호환되는 변경부터 검증하고 PLAN의 운영 반영 순서를 따릅니다. 파괴적 되돌리기·기존 데이터 삭제를 복구 방법으로 사용하지 않습니다.

이전 적용 안내는 [원본](../../archive/2026-09-22/before-alignment/supabase/README.md)에 보존했습니다.
