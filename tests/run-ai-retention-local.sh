#!/usr/bin/env bash
set -euo pipefail
# Disposable local Docker only; accepts no remote URL or production credentials.
command -v docker >/dev/null || { echo 'NOT_RUN: Docker unavailable; isolated PostgreSQL required.' >&2; exit 2; }
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
db_name="thinkerbell-ai-retention-contract-$$"
cleanup() { docker stop "$db_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$db_name" -e POSTGRES_PASSWORD=localtest -v "$repo_root:/work:ro" \
 public.ecr.aws/supabase/postgres:17.6.1.171 >/dev/null
for attempt in {1..40}; do
 if docker exec "$db_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
 sleep 0.5
done
docker exec "$db_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /work/tests/ai-retention-contract.sql
