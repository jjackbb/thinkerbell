#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_name="thinkerbell-private-$$"
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
  if docker exec "$container_name" psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1; then
    sleep 1
    if docker exec "$container_name" psql -U postgres -d postgres -Atqc 'select 1' >/dev/null 2>&1; then
      ready=true
      break
    fi
  fi
  sleep 0.5
done
if [[ "$ready" != true ]]; then docker logs --tail 30 "$container_name"; exit 1; fi
docker exec "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f /work/tests/story-author-private-contract.sql

# Hold the parent row before changing visibility. Both independent INSERT
# transactions must wait on the trigger's FOR SHARE lock, then fail after the
# private switch commits. No operating database or user data is involved.
docker exec "$container_name" env PGAPPNAME=private-switch-race \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc \
  "begin; select id from public.stories where id='story-2' for update; select pg_sleep(5); update public.stories set visibility='private' where id='story-2'; commit;" \
  >"$race_output_dir/switch" 2>&1 &
switch_pid=$!

locked=false
for attempt in {1..50}; do
  holders="$(docker exec "$container_name" psql -U postgres -d postgres -Atqc \
    "select count(*) from pg_stat_activity a join pg_locks l on l.pid=a.pid where a.application_name='private-switch-race' and l.relation='public.stories'::regclass and l.mode='RowShareLock' and l.granted")"
  if [[ "$holders" -gt 0 ]]; then locked=true; break; fi
  sleep 0.1
done
if [[ "$locked" != true ]]; then echo 'FAIL: private switch did not hold parent row'; exit 1; fi

docker exec "$container_name" env PGAPPNAME=private-comment-race \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc \
  "insert into public.comments(id,\"storyId\",content) values('race-comment','story-2','synthetic blocked')" \
  >"$race_output_dir/comment" 2>&1 &
comment_pid=$!
docker exec "$container_name" env PGAPPNAME=private-room-race \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atqc \
  "insert into public.ai_personas(id,\"storyId\",\"userId\") values('race-room','story-2','11111111-1111-4111-8111-111111111111')" \
  >"$race_output_dir/room" 2>&1 &
room_pid=$!

waiting=false
for attempt in {1..40}; do
  blocked="$(docker exec "$container_name" psql -U postgres -d postgres -Atqc \
    "select count(*) from pg_stat_activity where application_name in ('private-comment-race','private-room-race') and wait_event_type='Lock'")"
  if [[ "$blocked" -eq 2 ]]; then waiting=true; break; fi
  sleep 0.1
done
if [[ "$waiting" != true ]]; then echo 'FAIL: simultaneous inserts did not wait for private switch'; exit 1; fi

wait "$switch_pid"
comment_status=0
room_status=0
wait "$comment_pid" || comment_status=$?
wait "$room_pid" || room_status=$?
if [[ "$comment_status" -eq 0 || "$room_status" -eq 0 ]] ||
    ! rg -q 'STORY_NOT_FOUND' "$race_output_dir/comment" ||
    ! rg -q 'STORY_NOT_FOUND' "$race_output_dir/room"; then
  cat "$race_output_dir/switch" "$race_output_dir/comment" "$race_output_dir/room"
  echo 'FAIL: private switch admitted a concurrent comment or room' >&2
  exit 1
fi
remaining="$(docker exec "$container_name" psql -U postgres -d postgres -Atqc \
  "select (select count(*) from public.comments where id='race-comment')=0 and (select count(*) from public.ai_personas where id='race-room')=0 and (select count(*) from public.stories where id='story-2' and visibility='private')=1")"
if [[ "$remaining" != t ]]; then
  echo "FAIL: unexpected post-race rows: $remaining" >&2
  exit 1
fi
echo 'PASS: private switch blocks concurrent comment and AI room creation'
