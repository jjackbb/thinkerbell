# supabase/

`migrations/00000000000000_init_schema.sql`은 2026-08-17 기준 운영 Supabase
프로젝트(thinkerbell, `vzhyhadjtaqbapicjrco`)의 `public` 스키마(테이블·인덱스·RLS
정책·Realtime 설정)를 그대로 추출한 초기 마이그레이션입니다. 데이터는 포함하지
않습니다.

## 새 환경에 적용하는 법

- **간단히**: Supabase 대시보드 → SQL Editor에 파일 내용을 붙여넣고 실행.
- **CLI로**: `supabase link --project-ref <프로젝트ref>` 후 `supabase db push`
  (또는 `migrations/` 폴더를 그대로 두고 `supabase db reset`으로 로컬 재현).
