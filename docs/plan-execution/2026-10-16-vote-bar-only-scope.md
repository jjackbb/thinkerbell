# Vote-bar-only follow-up

Base: `67a611d4120be1529ae521e385714964d7b8a4c2`.

The latest review keeps comparison sections 1, 3 and 4, and narrows section 2 to the neutral unvoted bar and hidden numeric percentages (`??%`). The additional voting explanations and button descriptions are withdrawn. No test stories or votes are deleted.

## Changes

- Keep the neutral result bar, `??%`, and existing voter/author visibility guards. Remove the newly added standalone result explanation; retain the original participant-count wording.
- Restore the original “니 편” and “내 편” button wording in the feed and detail, removing the added author/opponent sublabels.
- Restore the prior FAQ and guest-login benefit copy as requested. This is a copy rollback, not a change to actual guest reading or voting permissions; legacy copy can still differ from those permissions.
- Make the existing “댓글” and “투표” footer labels visible beside their icons and counts, matching the approved comparison section 3. Retain their existing action IDs and counts.
- Preserve readability, contrast, accessible control names, share location guidance and the story URL in image sharing. Preserve all GA4 account exclusions, consent handling, campaign attribution and async-race fixes.

## Validation and boundaries

- PASS locally: application TypeScript, production build and browser-fixture TypeScript.
- PASS locally: 281 non-REST tests, zero failures/skips; focused UI/share checks 17/17.
- Browser collection: 48 generic desktop/mobile cases. Collection is not execution. The newly added case checks visible comment/vote labels and viewport overflow for both reader and author.
- First isolated CI ([38878321778](https://github.com/jjackbb/thinkerbell/actions/runs/38878321778), commit `1b8cf9e030d999a1f13e75b4131b535434416b33`) passed types/build, 281 unit tests, real database/concurrency, analytics, privacy and adult configurations. The generic browser suite passed 45 with 2 conditional skips, but the new mobile label check failed: the author footer compressed a two-character label into a 12px-wide column. The footer now wraps its separate author notice when necessary and keeps the icon/count row on one line. The label-width and overflow assertions are unchanged; full exact-commit CI must pass again before promotion.
- Existing assertions still cover neutral rendering across opposite vote distributions, hidden numeric results before voting, voter/author visibility, guest/private sharing boundaries, share URL/cancellation and analytics privacy/race behavior.
- Exact-commit execution of the unchanged isolated CI workflow is required before main promotion. Its separate analytics, privacy, adult-eligibility and disposable PostgreSQL/PostgREST suites remain enabled.
- The historical changelog is unchanged. This dedicated file records the follow-up without re-uploading historical contents.
- No production data deletion, SQL, provider, billing, authentication, feature-flag or environment changes are included. Physical-device sharing and signed-in live GA4 exclusion/control receipt remain separate checks.
