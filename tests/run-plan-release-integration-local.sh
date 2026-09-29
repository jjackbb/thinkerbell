#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_name="thinkerbell-release-integration-$$"
cleanup() {
  docker stop "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d --name "$container_name" \
  -e POSTGRES_PASSWORD=localtest -v "$repo_root:/work:ro" \
  public.ecr.aws/supabase/postgres:17.6.1.171 >/dev/null
ready=false
for attempt in {1..60}; do
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
  -f /work/tests/plan-release-integration.sql | tail -8
