-- =============================================================================
-- 유저테스트 계측 테이블 (2026-09-03)
-- =============================================================================
-- 9/4에 30명이 앱을 처음 쓰는 5분을 관찰한다. 관찰이 "왜 멈췄나"를 알려주고,
-- 이 테이블이 "어디서 멈췄나"를 알려준다. 그날 밤 SQL 한 방으로 퍼널을 뽑는 것이
-- 목적이므로, 스키마는 최대한 단순하게 둔다.
--
-- 컬럼 이름만 이 프로젝트의 다른 테이블(camelCase)과 다르게 snake_case로 둔다.
-- 9/4 밤에 이 테이블을 직접 SQL로 조회할 사람이 `docs/usertest-20260904.md`에
-- 적힌 이름 그대로 타이핑할 것이기 때문이다. 따옴표 없이 쓸 수 있는 편이 낫다.
--
-- 붙이는 이벤트는 9개뿐이다. 죽은 버튼이나 안 쓰는 화면에 이벤트를 심으면
-- 데이터가 오염된다 — `docs/userflow.md`에 세워둔 원칙 그대로다.
-- =============================================================================

create table if not exists public.events (
  id         uuid        primary key default gen_random_uuid(),
  -- 브라우저 탭 하나의 방문. 로그인 전 진입과 로그인 후 행동을 잇는 유일한 끈이다.
  session_id text        not null,
  -- 로그인한 경우에만 채운다. 둘러보는 사람은 null.
  user_id    uuid,
  event_name text        not null,
  props      jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  -- 아는 이름만 받는다. 오타나 실수로 심은 이벤트가 퍼널을 흐리지 않도록.
  constraint events_name_check check (event_name in (
    'app_open',
    'login_success',
    'story_view',
    'vote_submit',
    'ai_entry_click',
    'ai_mode_select',
    'ai_start_select',
    'ai_chat_turn1',
    'ai_chat_turn3'
  ))
);

-- 퍼널은 "이벤트 이름별로 몇 세션이 도달했나"를 세는 일이라 이 두 개면 충분하다.
create index if not exists events_name_time_idx on public.events (event_name, created_at);
create index if not exists events_session_idx   on public.events (session_id, created_at);

-- -----------------------------------------------------------------------------
-- 권한
-- -----------------------------------------------------------------------------
alter table public.events enable row level security;

-- 쓰기만 열어준다. 둘러보는 사람(anon)도 진입 자체를 남겨야 퍼널의 분모가 생긴다.
-- 남의 이름으로 남기는 것만 막는다 — 로그인했으면 자기 id, 아니면 null이어야 한다.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- 읽기 정책은 만들지 않는다. 이 로그는 남이 볼 것이 아니고,
-- 분석은 대시보드(서비스 권한)에서 한다.
