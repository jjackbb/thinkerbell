#!/usr/bin/env bash
set -euo pipefail

# Disposable Supabase PostgreSQL + PostgREST contract test. Never points at a remote DB.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_prefix="thinkerbell-vote-$$"
db_name="${test_prefix}-db"
api_name="${test_prefix}-api"
network_name="${test_prefix}-net"
jwt_secret='local-vote-jwt-test-secret-1234567890'

cleanup() {
  docker stop "$api_name" >/dev/null 2>&1 || true
  docker stop "$db_name" >/dev/null 2>&1 || true
  docker network rm "$network_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$network_name" >/dev/null
docker run --rm -d --name "$db_name" --network "$network_name" \
  -e POSTGRES_PASSWORD=localtest -v "$repo_root:/work:ro" \
  public.ecr.aws/supabase/postgres:17.6.1.171 >/dev/null

for attempt in {1..30}; do
  if docker exec "$db_name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$db_name" pg_isready -U postgres >/dev/null
docker exec "$db_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f /work/tests/vote-story-contract.sql >/dev/null

docker exec "$db_name" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  -c "alter role authenticator password 'localtest'; grant anon, authenticated to authenticator;" >/dev/null

# Bare PostgREST 16 sends request.jwt.claims JSON, while the Supabase image's
# auth.uid() reads request.jwt.claim.sub. This bridge belongs only to the test DB.
docker exec -i "$db_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
create function public.set_legacy_claims() returns void language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claim.sub',
    coalesce(current_setting('request.jwt.claims', true)::jsonb->>'sub', ''),
    true
  );
end;
$$;
grant execute on function public.set_legacy_claims() to anon, authenticated;
SQL

docker run --rm -d --name "$api_name" --network "$network_name" \
  -p 127.0.0.1::3000 \
  -e "PGRST_DB_URI=postgres://authenticator:localtest@${db_name}:5432/postgres" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e "PGRST_JWT_SECRET=$jwt_secret" -e PGRST_SERVER_HOST=0.0.0.0 \
  -e PGRST_DB_PRE_REQUEST=public.set_legacy_claims \
  public.ecr.aws/supabase/postgrest:v16.3 >/dev/null

test_port="$(docker port "$api_name" 3000/tcp | tail -n 1 | cut -d: -f2)"
test_url="http://127.0.0.1:${test_port}"
rest_ready=false
for attempt in {1..30}; do
  status="$(curl -s -o /dev/null -w '%{http_code}' "$test_url/stories?limit=0" || true)"
  if [[ "$status" == '200' ]]; then rest_ready=true; break; fi
  sleep 0.5
done
if [[ "$rest_ready" != true ]]; then
  docker logs --tail 20 "$api_name"
  exit 1
fi
VOTE_TEST_REST_URL="$test_url" VOTE_TEST_JWT_SECRET="$jwt_secret" \
  node --test "$repo_root/tests/vote-story-rest.test.mjs"
