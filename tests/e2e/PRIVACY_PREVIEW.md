# Privacy notice review preview

Current approved policy and deployment boundaries: [integration review](../../docs/plan-execution/2026-10-14-integrated-review.md). This supersedes the historical 14+ proposal for review only; live age enforcement is not implemented.

This is an isolated review deliverable, not a published policy or consent collection flow. Required supplier, transfer, retention and legal-basis facts remain unresolved. Versioned content is shared by the standalone draft page and signup modal. The existing production App never supplies the optional signup review slot; the normal Vite build has no preview entry or draft import.

Run locally from the repository root:

    node node_modules/vite/bin/vite.js --config tests/e2e/privacy-vite.config.ts

Open http://127.0.0.1:4178/privacy.html. For the email-ownership variant, prefix the command with PRIVACY_EMAIL_CHECK_ENABLED=true. The fixture uses synthetic Supabase, no real environment files, and no backend proxy. Do not use this fixture to test real registration. Its age statement is presentation only, not an age-verification control or stored consent.

Checks:

    npm run lint
    npx tsc --noEmit -p tests/e2e/tsconfig.json
    npm run build
    node --import tsx --test tests/privacy-notice-draft.test.mjs tests/signup-landing.test.mjs tests/signup-email-ownership-http.test.mjs tests/ga4-event-policy.test.mjs
    npx playwright test --config tests/privacy.playwright.config.ts
    PRIVACY_EMAIL_CHECK_ENABLED=true npx playwright test --config tests/privacy.playwright.config.ts

The browser suite contains three cases at desktop and mobile widths (six per flag mode, twelve intended executions). It covers optional-analytics refusal preservation, no blanket-consent checkbox, draft version/age, native dialog labeling and focus, Escape, explicit close, Back, repeated open preserving the current signup input, and an initially-open modal under React StrictMode. It does not submit signup or validate production mail delivery. Existing synthetic signup tests separately exercise account creation and mailbox proof logic.

Local status: type checks, production build, pure/SSR tests and production-bundle exclusion PASS. Browser launch is BLOCKED by Chromium's local socket permission error before any test runs, with the installed system Chromium during this integration. No security restriction bypass was attempted. Listing tests is collection only, not a pass. Screen-reader use, actual mobile Safari and visual review are NOT_RUN. Do not mark privacy compliance or end-to-end QA complete on this evidence.
