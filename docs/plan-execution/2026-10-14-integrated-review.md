# Integrated review on main d406882

## Summary
Preserve Jisun's current AI quota behavior and removed unused endpoints. Add review-only privacy content, accurate anonymity wording, and an inactive Gemini adapter with synthetic tests. This record is the per-change release note; historical CHANGELOG is unchanged.

## Policy and rollout boundaries
- The approved minimum service age is 18+, superseding the earlier 14+ draft. This is a policy/design decision only: signup, server authorization, existing-account eligibility and direct database boundaries are not yet enforcing it. No public claim of completed age verification is added.
- The review-only notice describes last successfully saved AI response plus six calendar months, initial creation before the first response, and the later of the legacy expiry or a seven-day transition grace. This is the approved retention design, not evidence of activation. The existing retention gates, SQL drafts and deployment status remain unchanged. The existing daily 00:01 KST cleanup is distinct from immediate access expiry; supplier logs/backups are not promised to be erased at the same moment.
- The preview is not mounted by the production App and does not collect consent or modify analytics settings. Supplier contracts, transfer locations, retention exceptions and legal bases still require verification before notice publication.
- Gemini modules are backend-only, require explicit configuration and an injected transport, and are not imported by any production entrypoint. No credentials, billing, provider activation or fallback changes are included.
- Preserve main's first-answer disconnect rule: after delivered answer text, user disconnect consumes the reservation; before-text disconnect returns it. Provider and persistence failures remain separate. Removed `/api/chat` and `/api/sanitize-text` routes stay removed.
- Account deletion repair candidates, live SQL/migrations, security settings and public privacy launch are excluded.

## Approved retention and withdrawal design (not implemented)
- Ordinary stories and comments are retained until user deletion or account withdrawal. Comment-body removal while preserving reply structure remains separate from verification of author links and dependent data. This does not change the separate retention of copied AI instructions or conversations.
- Inquiries and reports: delete 90 days after processing is complete. Completion timestamps, reopened cases, legacy transitions and cleanup cadence remain to be implemented. This does not authorize changing existing account-deletion cascades into a 90-day post-withdrawal exception.
- Internal raw analytics: delete 30 days after collection. GA4 retention settings are separate and unchanged.
- Account withdrawal must also remove account identifiers from quota-reservation records. This is distinct from retaining completed reservation records for 30 days after room deletion. Removal strategy, related identifiers and retry behavior need implementation and verification; no completed anonymization or deletion is claimed.
- These are approved product retention periods, not asserted statutory retention requirements. Exceptions require a documented purpose, basis and end condition. The account-deletion/comment-delete guard interaction, ownership, atomicity, dependent-data coverage and concurrent/repeated withdrawal must pass isolated tests before any separately authorized rollout.

## Changes and rationale
- Replace absolute anonymity promises with accurate account-linked/public-content guidance in signup, story creation and FAQ wording.
- Share review content between standalone privacy preview and optional signup review slot; production does not pass that slot.
- Add inactive provider contracts, strict output/schema parsing, cancellation/limits and synthetic-only transport tests.
- Update isolated validation workflow to build before bundle-exclusion tests and run privacy tests in both email-ownership modes. Existing exact branch allowlist, permissions and no-secret boundaries remain unchanged.

## Verification
- PASS: application TypeScript check, fixture TypeScript check, production frontend/backend build.
- PASS: 176 offline unit tests, including 52 inactive adapter tests, five privacy tests and latest Jisun disconnect/closed-route cases.
- PASS: production bundles and entrypoints exclude the privacy draft and Gemini provider implementation.
- BLOCKED locally: three REST suites require disposable PostgREST/JWT fixtures; Docker/PGlite installation is unavailable. No production credentials or database substitute was used.
- BLOCKED locally: six privacy browser cases cannot launch installed Chromium because local socket creation is denied. The separate email-ownership mode is NOT_RUN locally. Browser assertions, visual inspection and real-device coverage are not claimed passed.
- Pending: isolated CI PostgreSQL/concurrency and browser checks for the exact published validation commit before main promotion.

## Files
Privacy: `frontend/src/components/{CreateStoryModal,MyPageView,PrivacyNoticeDraft,WelcomeModal}.tsx`, `frontend/src/lib/privacyNoticeDraft.ts`, `tests/privacy-notice-draft.test.mjs`, `tests/privacy.playwright.config.ts`, `tests/e2e/privacy*`, `tests/e2e/fixture/privacy*`, and `tests/e2e/PRIVACY_PREVIEW.md`.
Adapter: `backend/providers/{contracts,schemas,gemini}.ts`, `tests/gemini-provider-draft.test.mjs`, and [integration gates](2026-10-14-gemini-adapter-integration-gates.md).
Validation: `.github/workflows/notification-validation.yml`.

## Isolated CI follow-up
The first validation commit `ebe7f6fb095428fcc10babb053cd845b24237e3d` passed type/build, 176 offline unit tests, and isolated PostgreSQL/PostgREST/concurrency checks in run `38609315538`. Browser execution found two privacy-fixture problems: an operator-text locator also matched the hidden dialog, and the fixture's direct stylesheet import omitted frontend Tailwind source utilities (including modal max-height and scrolling).

The fixture now imports the same explicit-source stylesheet as the existing app/component fixtures, and the standalone notice has a named region for precise assertions. No production layout, click forcing, timeout increase or security workaround is introduced. A regression test guards the shared stylesheet contract. Local app/fixture typechecks and 177 offline tests pass; emitted CSS includes modal height/overflow utilities. The corrected browser behaviors still require a new isolated CI run before main promotion.
