#!/usr/bin/env bash
set -euo pipefail

# Disposable local Supabase PostgreSQL only; no operating DB connection.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_name="thinkerbell-ai-quota-$$"
race_output_dir="$(mktemp -d)"
cleanup() {
  docker stop "$container_name" >/dev/null 2>&1 || true
  rm -rf "$race_output_dir"
}
trap cleanup EXIT

docker run --rm -d --name "$container_name" \
  -e POSTGRES_PASSWORD=localtest -v "$repo_root:/work:ro" \
  public.ecr.aws/supabase/postgres:17.6.1.171 >/dev/null
ready=false
for attempt in {1..60}; do
  # The image briefly accepts connections during bootstrap, then restarts.
  if docker exec "$container_name" psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1; then
    sleep 1
    if docker exec "$container_name" psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1; then
      ready=true
      break
    fi
  fi
  sleep 0.5
done
if [[ "$ready" != true ]]; then
  docker logs --tail 30 "$container_name"
  exit 1
fi
docker exec "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f /work/tests/ai-quota-reservations-contract.sql

docker exec "$container_name" psql -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
  -c "select result from public.reserve_ai_first_reply('22222222-2222-2222-2222-222222222222','race-room-3','00000000-0000-0000-0000-000000000013','2026-09-28 12:01:00+09','2026-09-28 12:11:00+09')" \
  >"$race_output_dir/one" 2>&1 &
first_pid=$!
docker exec "$container_name" psql -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
  -c "select result from public.reserve_ai_first_reply('22222222-2222-2222-2222-222222222222','race-room-4','00000000-0000-0000-0000-000000000014','2026-09-28 12:01:00+09','2026-09-28 12:11:00+09')" \
  >"$race_output_dir/two" 2>&1 &
second_pid=$!
first_status=0
second_status=0
wait "$first_pid" || first_status=$?
wait "$second_pid" || second_status=$?
if [[ "$first_status" -eq "$second_status" ]]; then
  cat "$race_output_dir/one" "$race_output_dir/two"
  echo 'FAIL: exactly one concurrent final slot must succeed' >&2
  exit 1
fi
if ! rg -q 'reserved' "$race_output_dir/one" "$race_output_dir/two" \
    || ! rg -q 'AI_QUOTA_REACHED' "$race_output_dir/one" "$race_output_dir/two"; then
  cat "$race_output_dir/one" "$race_output_dir/two"
  echo 'FAIL: unexpected concurrent reservation result' >&2
  exit 1
fi
active_count="$(docker exec "$container_name" psql -U postgres -d postgres -Atqc \
  "select count(*) from public.ai_quota_reservations where user_id='22222222-2222-2222-2222-222222222222' and quota_day='2026-09-28' and status in ('reserved','completed')")"
if [[ "$active_count" != 3 ]]; then
  echo "FAIL: concurrent final slot count is $active_count" >&2
  exit 1
fi
echo 'PASS: concurrent final slot admits exactly one request'
