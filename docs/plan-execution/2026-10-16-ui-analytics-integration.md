# UI and analytics integration validation

## Scope and provenance

The integration is based on main commit `814c69bc178b3e9716cf3b6c74aa6bc11bd8b1ad`, tree `d82d477cb0f66827ceecef203d13d387e8bfd2b2`.

It combines the reviewed UI and analytics source candidates. The original source blobs and each changed-file checksum were checked before integration. The existing changelog remains byte-for-byte unchanged. The new UI, analytics and race-fix records are kept in these dedicated validation documents; historical changelog contents are not re-uploaded. No repository AGENTS.md or local skill directory was present; CLAUDE.md, README.md, PLAN.md and testing instructions were consulted.

- [UI candidate scope and narrower local checks](2026-10-16-ui-clarity-candidate.md)
- [Campaign/account exclusion scope and required release gates](2026-10-16-campaign-account-exclusion.md)

## Combined local validation

- PASS: application TypeScript and production build.
- PASS: final 280 non-REST unit/API/SSR checks, zero failures/skips (the earlier pre-P1 integration had 270).
- PASS: browser fixture TypeScript and fixture build.
- PASS: generic browser collection has 46 cases; analytics has 12 cases. Collection is not execution. Some existing adult scenarios are intentionally skipped in the generic fixture and are executed by the existing explicit adult configurations in CI.
- BLOCKED locally: Chromium launch due to environment socket/container restrictions. No browser assertions or visual pass are claimed from this local environment.

The isolated workflow now runs `tests/analytics.playwright.config.ts` in its own step. The generic Playwright configuration ignores `analytics.spec.ts`, because its production-entry fixture, port and synthetic Google ID differ from the generic UI fixture. Existing privacy, adult eligibility and real disposable PostgreSQL/PostgREST checks remain unchanged. Final execution evidence is the Actions run attached to the exact validation commit.

## GA4 race regression follow-through

Two P1 findings were reproduced using the previous candidate modules in an isolated temporary copy, then verified against the final integrated sources:

1. A late result from work started under an excluded/pending identity could reach GA4 after logout or account change. Each asynchronous direct event now carries a frozen start-time eligibility/consent/account-revision snapshot. The final GA4 sink rejects a blocked start, any account revision change, or consent withdrawal/reacceptance. AI turn 1/3, save success/error, feedback, story publication, vote/comment completion, room creation and delayed story opening pass their original context. The context contains no identity or content, is not persisted, and never enters event properties. Internal DB logging keeps its existing independent consent and nine-event policy.
2. Supabase can report `INITIAL_SESSION(null)` while explicit restoration fails. Ignoring this notification prevents it from invalidating or overriding the authoritative initial `getSession()` result. Anonymous startup is allowed only after that read succeeds without error. Newer genuine auth transitions still invalidate stale reads and eligibility replies.

PASS: 20 account-guard/async-context tests; 30 with campaign and GA4 event-policy tests. Coverage includes excluded/pending starts, logout/normal-account transitions, same-account refresh, consent withdrawal/reacceptance, valid unchanged controls, internal DB preservation, both error-result arrival orders, rejected restoration promises with null/non-null notifications, and stale startup replies after a newer login. The async tests execute the production GA4/event modules with synthetic transport and check the real asynchronous call sites. They do not claim mounted browser interaction or real Google receipt.

Reproduce the focused checks with `node --import tsx --test tests/analytics-account-eligibility.test.mjs tests/analytics-async-context.test.mjs tests/ga4-event-policy.test.mjs tests/campaign-attribution.test.mjs`. The existing isolated workflow discovers the new unit test automatically.

## Publication and release boundary

Only `codex/notifications-validation-20261013` is authorized for this validation publication. Existing `vercel.json` explicitly disables deployment for that branch. The workflow uses read-only repository access, synthetic auth/data, a stub Google loader and disposable database containers; it does not use production credentials.

Main publication, production deployment, real environment changes, real GA4 receipt and deletion of existing test data are not part of this integration. Before production deployment, configure and verify the approved excluded-account list server-side. Missing or invalid configuration intentionally suppresses GA4 for every signed-in account. No actual exclusion email addresses or derived hashes are added to source or documentation.

Browser stubs establish application gating and sanitized commands, not Google's real collection behavior. Real post-deployment exclusion and non-excluded control receipt remain separate required checks. Anonymous activity before login and already collected historical data cannot be removed by this account gate.
