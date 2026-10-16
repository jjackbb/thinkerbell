# 2026-10-16 UI clarity candidate (not published)

## Basis and scope

- Repository: jjackbb/thinkerbell, main at `814c69bc178b3e9716cf3b6c74aa6bc11bd8b1ad`.
- Remote recursive tree: `d82d477cb0f66827ceecef203d13d387e8bfd2b2`; all source blobs in this cloud candidate were verified against Git blob SHA before editing. No AGENTS.md or repository skill directory was present. README.md, CLAUDE.md and PLAN.md were consulted.
- This is an unpublished code candidate. No commit, remote push, production deployment, database update, test-data deletion or third-party message was performed.
- AI tab naming, analytics-consent placement and the initial login/onboarding flow are unchanged. The AI/age/create modal changes below are accessible names only (plus appropriate close-icon contrast/padding), not flow changes.

## Changes

1. Ranking cards use the same VoteResult policy as the feed/detail: results after voting; the signed-in author sees their own results without voting. Guest state does not grant ownership or reuse a vote. Zero votes never show a fabricated 50:50 result; 1–4 votes use counts.
2. Before voting, VoteResult now uses one neutral gradient independent of the actual A/B distribution. The previous blurred gradient still revealed the leading side. Total participation remains visible. This is a UI presentation rule, not a claim that result data is removed from the underlying public API.
3. FAQ matches result visibility. Guest My Page explicitly says the full public story is readable without login and lists voting/results as a login benefit.
4. Feed/detail vote buttons explain “니 편: 사연 속 상대방” and “내 편: 사연 작성자”. Comment-filter labels retain their previous meaning.
5. Supporting text on dark detail/AI/shared-result areas uses dedicated light text tokens. Core story/vote captions previously at 11 px are at least 12 px; feed story body is 14 px on mobile. Selected vote buttons use higher-contrast foreground/background combinations. Previously unnamed menu/close icons have explicit names. Ranking cards support native keyboard activation and inactive panels are inert/hidden to assistive technology. Narrow ranking headers can wrap instead of clipping the date.
6. Existing share entry was verified: public story detail, fixed bottom bar, visible after voting or for the author; private and unvoted stories hide it. It was not absent from the source. The change keeps that single entry, explains the location before voting, prevents the bar from flex-shrinking, and describes the image contents/link accurately. Image-success sharing now carries the direct story URL as well as image/title/text. Existing link-share, clipboard and cancellation fallbacks are preserved.

## Verification

PASS:
- `npm run lint` (TypeScript).
- `npm run build` (Vite frontend and bundled backend).
- All non-REST `tests/*.test.mjs`: 256/256, including 16 new cases.
- New production-component SSR tests: hidden results are identical when 80:20 is reversed to 20:80; voter/author/guest cases; zero/small sample; public/private share gating; side explanations; copy; icon names; dark text token contrast >=4.5:1 on #1C1C1C and #2A2A2A.
- New mocked Web Share tests: image+URL success, unsupported image, image failure then URL, user cancellation in either stage, canvas failure then clipboard, complete delivery failure. These do not send externally.
- Browser-fixture TypeScript and dedicated fixture build (with synthetic auth; no application env loaded).
- Six UI browser cases collected across desktop/mobile. Test collection is not an interactive pass.
- Changed frontend diff has no whitespace errors.

BLOCKED / NOT_RUN:
- Interactive browser assertions, visual screenshots and actual mobile Web Share targets remain unverified. The default matching Playwright browser was not installed. The installed `/usr/bin/chromium` was then selected explicitly, but it aborted before all three attempted mobile test bodies with `socket() failed: Operation not permitted`. This is an environment launch blocker, not a failed product assertion. No sandbox/network/security workaround was attempted.
- Desktop interaction, real iOS/Android share sheets, screen-reader behavior and production integration remain NOT_RUN. Run the six prepared cases in an authorized browser-capable cloud/CI environment before treating visual QA as complete.
- REST/DB/integration suites were not required or run for this UI-only patch. Existing real data was not touched.

## Recheck commands

```sh
npm run lint
npm run build
mapfile -t unit_tests < <(find tests -maxdepth 1 -name '*.test.mjs' ! -name '*-rest.test.mjs' | sort)
node --import tsx --test "${unit_tests[@]}"
node node_modules/typescript/bin/tsc --noEmit -p tests/e2e/tsconfig.json
node node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/e2e/ui-clarity.spec.ts
```

The existing analytics action ID `weekly-top-banner-action-01` is preserved when making the ranking card a native button. No new behavioral analytics scope is introduced. Integration with parallel analytics work must preserve both changes and rerun the checks on the combined final tree.
