-- =============================================================================
-- Thinkerbell 초기 스키마 (2026-08-17 기준 운영 DB에서 추출)
-- =============================================================================
-- 이 파일은 저장소에 마이그레이션 파일이 전혀 없던 상태에서, 사람 손으로만
-- 관리되어 온 운영 Supabase 프로젝트(project_id: vzhyhadjtaqbapicjrco, thinkerbell)의
-- public 스키마를 그대로 역추출한 것입니다. 향후 새 환경을 만들거나 재해 복구를
-- 할 때 이 파일 하나로 스키마를 재현할 수 있도록 남겨둡니다.
--
-- 추출 방법 (Supabase MCP 도구, 2026-08-17):
--   - list_tables(schemas: ["public"], verbose: true) → 테이블/컬럼/PK
--   - information_schema.columns → 컬럼 타입/NOT NULL/기본값
--   - pg_indexes → 인덱스 (PK가 자동 생성하는 인덱스 제외하고 추가 인덱스 없음 확인)
--   - pg_class.relrowsecurity → RLS 활성화 여부
--   - pg_policies → RLS 정책
--   - pg_publication_tables (pubname='supabase_realtime') → Realtime 구독 테이블
--
-- 주의:
--   - 컬럼명이 camelCase(예: "createdAt", "votesA", "isBlind")이므로 반드시
--     큰따옴표로 감싸야 합니다. 따옴표 없이 실행하면 Postgres가 전부 소문자로
--     접어버려 애플리케이션 코드와 컬럼명이 어긋나 앱이 깨집니다.
--   - 데이터(사연 본문 등)는 포함하지 않습니다. 스키마만 재현합니다.
--   - 운영 DB에는 storyId(comments) → id(stories)를 잇는 명시적 FOREIGN KEY
--     제약이 걸려 있지 않습니다(애플리케이션 레벨에서만 관계를 관리). 이 파일도
--     실제 상태 그대로 FK 없이 재현합니다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 테이블: stories (사연)
-- -----------------------------------------------------------------------------
create table if not exists public.stories (
  "id" text not null,
  "authorId" text not null,
  "authorNickname" text not null,
  "title" text not null,
  "body" text not null,
  "category" text not null,
  "createdAt" text not null,
  "votesA" integer default 0,
  "votesB" integer default 0,
  "commentCount" integer default 0,
  "viewCount" integer default 0,
  "isHot" boolean default false,
  "isWeeklyTop" boolean default false,
  "weeklyRank" integer,
  "personaName" text,
  "personaInstruction" text,
  "reportsCount" integer default 0,
  "isBlind" boolean default false,
  "isAdult" boolean default false,
  "isHidden" boolean default false,
  "cardColor" text,
  constraint stories_pkey primary key ("id")
);

-- -----------------------------------------------------------------------------
-- 테이블: comments (댓글)
-- -----------------------------------------------------------------------------
create table if not exists public.comments (
  "id" text not null,
  "storyId" text not null,
  "authorId" text not null,
  "anonymousId" text not null,
  "content" text not null,
  "createdAt" text not null,
  "likeCount" integer default 0,
  "reportsCount" integer default 0,
  "isBlind" boolean default false,
  "authorVoted" text,
  "isEdited" boolean default false,
  constraint comments_pkey primary key ("id")
);

-- -----------------------------------------------------------------------------
-- 인덱스
-- -----------------------------------------------------------------------------
-- 운영 DB 확인 결과, 두 테이블 모두 PK가 자동 생성하는 unique 인덱스
-- (stories_pkey, comments_pkey) 외에 추가로 생성된 인덱스는 없었습니다.

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- 운영 DB에서 두 테이블 모두 RLS가 활성화되어 있고, public 역할에 대해
-- 모든 명령(ALL)을 허용하는 단일 정책만 존재합니다(qual/with_check 모두 true).
-- 즉 사실상 전체 공개(무제한 접근) 상태입니다. 있는 그대로 재현합니다.

alter table public.stories enable row level security;

create policy "Enable all access"
on public.stories
as permissive
for all
to public
using (true)
with check (true);

alter table public.comments enable row level security;

create policy "Enable all access comments"
on public.comments
as permissive
for all
to public
using (true)
with check (true);

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
-- 운영 DB에서 stories, comments 둘 다 supabase_realtime publication에
-- 포함되어 있었습니다.

alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.comments;
