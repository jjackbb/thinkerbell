# Synthetic notification and reply browser validation

This suite mounts the actual `NotificationList`, `StoryDetailModal`, and `AIChatView` components. AI-warning navigation calls the production `fetchAiWarningTarget` helper. The component fixture supplies parent callbacks and test controls. A separate `app.html` fixture mounts the unmodified complete `App` shell with synthetic Supabase auth, read-only table results, visible-content RPCs and invalidation callbacks. It exercises actual App notification navigation after an account switch, access invalidation, or comment-only invalidation. Component-only tests remain explicitly narrower; AI-return scroll preservation and all other App paths are not covered here.

## Isolation

- The dedicated Vite configuration does not load root application environment files.
- A resolve-time alias replaces the Supabase module with synthetic, in-memory authentication. No Supabase client or real credential is constructed.
- Every Playwright test intercepts traffic. Non-local URLs and unexpected API routes fail assertions. Notifications, room data, comments and identities are synthetic.
- The fixture is outside the normal frontend build entries. Nothing is deployed, posted to production, or sent to an AI provider.
- Feature flags are enabled only inside this fixture configuration.

## Run

Use Node 24 and the repository lockfile:

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npx tsc --noEmit -p tests/e2e/tsconfig.json
npx playwright test --config playwright.config.ts
```

`@playwright/test` is an exact-pinned development dependency (1.56.1). CI should use its matching Chromium. A local machine with an existing compatible Chromium may explicitly set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; the CI workflow should leave it unset.

Reports, retained failure traces, and synthetic screenshots go to `validation-results/browser/`. There are no production secrets in the fixture or artifacts. The suite intentionally uses one worker and no retries. Tests run at desktop 1280×900 and mobile 393×852 sizes.

## Coverage

- Loading, empty state, individual read and read-all, server count reconciliation
- Failed read preservation, pagination failure/retry with the same cursor
- Delayed previous-account list cleanup, pending target signal abortion on unmount
- Actual App stale-notification navigation after auth-account switch and realtime access/comment-only invalidation
- AI-warning server expiry display and current-owner target opening
- Renewed generation, wrong owner, and expired target rejection and list refresh
- Multiple replies under one root, reply-to-reply addressee, duplicate-submit guard
- Reply cancellation preserving draft, guest login gating
- Basic keyboard activation, horizontal viewport overflow checks, and screenshots

The mocked server is deliberately not a database/authorization test. PostgreSQL/RLS/PostgREST/concurrent transaction suites are separate. SSR checks and a successful test listing or fixture build do not count as an interactive browser pass.

## Local execution status

The initial local run reached Playwright and started Vite, but Chromium failed before executing a test with `socket() failed: Operation not permitted`. Therefore interactive results and screenshots are **NOT_RUN/BLOCKED**, pending execution in the authorized isolated CI environment. Do not treat launch failure as a product assertion failure or claim these cases passed.
