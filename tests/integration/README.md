# Isolated notification validation

Local commands (repository root):

```
python3 tests/integration/notification-validation.py
npx playwright install --with-deps chromium
npx playwright test --config playwright.config.ts
```

Requirements: Linux local Docker socket `/var/run/docker.sock`, Python 3, Node 24,
and lockfile dependencies (`npm ci --ignore-scripts`). The database runner takes no
URL, credential, container name, or image override. It forces the local Docker
socket, ignores inherited Docker/database configuration, never loads `.env`, and
creates uniquely named disposable containers on an internal Docker network. No host ports are published. On Linux, the test reaches PostgREST directly on its
internal bridge address, accepted only after verifying exact fresh container and
network identity, private subnet membership, running state, and no host bindings.
Inherited HTTP proxies are disabled. Unsupported/non-Linux access fails closed.
No production API is called.
Temporary generated PostgreSQL/JWT secrets are never printed or persisted in
artifacts. Containers and network are removed on exit (including test failure). Failed starts
print only sanitized state, port metadata and bounded container logs; container
environment configuration is never dumped. PostgreSQL readiness requires the final
authenticated TCP server, not its temporary socket-only initialization server.

The SQL drafts and activation transaction run ONLY in the freshly created fixture.
The fixture uses existing repository migration/contract SQL and its documented
read-reviewed legacy purger body. Review fingerprints are derived from those
synthetic definitions, not a production connection. The activation test creates
and changes synthetic pg_cron rows only; it does not authorize real activation.

Coverage: existing single-session SQL contracts; authenticated PostgREST own inbox,
read marking and cross-owner denial; direct table ACL plus actual recipient RLS;
service-only reply denial; two independently blocked reply creates and threshold
votes; concurrent completion/retry/purge; locked expired-row purge; concurrent cron metadata drift causing a serializable activation abort with full
rollback; and activation
queued ahead of an already-started legacy purger statement. Races assert real
`pg_stat_activity` lock waits before releasing the holder. They are not simulated
with mocked REST responses. Browser fixtures are separate from these DB tests.

Reports are in `validation-results/database/` (plain summary, SQL output, resolved
image digests) and `validation-results/browser/`. These are generated, synthetic
artifacts and should not be committed. Docker missing means NOT_RUN, never PASS.

CI triggers only on exact branch `codex/notifications-validation-20261013`; no
manual dispatch/default-branch trap, PR, schedule, deployment or secrets. It uses
standard Ubuntu hosted runners, read-only contents, nonpersisted checkout
credentials, a 20-minute timeout and no cache/artifact uploads. Reports remain runner-local and key results are printed to job logs. Free eligibility
and external Vercel integration behavior must be independently verified BEFORE
pushing: this workflow cannot disable a hosting integration's push deployment.

Official action tag SHAs verified by `git ls-remote` against actions/checkout
v4.2.2 and actions/setup-node v4.4.0 on 2026-10-13.
Images reuse official Supabase ECR version tags already used by repository tests:
Postgres 17.6.1.171 and PostgREST v16.3. Registry digest pins were not verified here;
tags can move, so resolved RepoDigests are recorded on each actual run. This is a
remaining reproducibility limit, not an invented immutable-image guarantee.

Local preparation checks: Python compilation and workflow parsing. Real Docker,
PostgREST and concurrent-session results remain NOT_RUN until a Docker-capable
run completes. No commit, push, CI dispatch, production migration or cron change
is performed by preparing these files.

## Supabase cron operator boundary

The official Supabase PostgreSQL 17.6.1.171 fixture grants `postgres` SELECT on
`cron.job`, deliberately not direct UPDATE. The activation draft therefore uses a
SERIALIZABLE transaction and the supported `cron.alter_job` API, not SELECT FOR
UPDATE or additional privileges. A simultaneous cron change must abort activation
with SQLSTATE 40001 and roll back configuration, room initialization, warning rows
and scheduler edits. Operators must re-review changed metadata before retrying.
The integration test commits that drift from a separate real connection and checks
rollback without granting cron table privileges. No operating cron is touched.

Source: [official image privilege setup](https://github.com/supabase/postgres/blob/17.6.1.171/migrations/schema-15.sql)
and [pg_cron supported update implementation](https://github.com/citusdata/pg_cron/blob/v1.6.4/src/job_metadata.c).
