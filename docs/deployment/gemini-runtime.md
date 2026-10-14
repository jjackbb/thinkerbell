# Gemini runtime: disabled deployment preparation

This implementation does not activate Gemini or execute database migrations.
Default provider remains Potens. Unknown provider names fail closed. No retries,
automatic fallback, tools, search grounding, caching or alternate models are used.

## Activation prerequisites

Do not set any readiness flags until their underlying prerequisites are verified:

- Apply and verify the adult eligibility and durable provider-budget SQL drafts
  through the approved database deployment process. Verify service-role RPC-only
  access and concurrent reservations using isolated PostgreSQL CI first.
- Verify the exact API key's Google project uses paid Gemini billing and its
  applicable data handling. Saving a key alone does not verify paid billing.
- Review and publish the actual provider/privacy notice before declaring
  GEMINI_PRIVACY_READY. Existing draft text is not a published notice.
- Confirm budget policy, approved model availability and current pricing. The
  ledger's USD 4 monthly ceiling is a conservative operational sub-limit for the
  user's KRW 10,000 budget, not an exchange-rate guarantee. Stop rather than
  automatically increasing it if fees/exchange rates change.
- Enable ADULT_ELIGIBILITY_READY=true and
  VITE_ADULT_ELIGIBILITY_ENABLED=true together after migration review. This is
  18+ self-attestation, not documentary identity or age verification.

Only after all prerequisites: AI_PROVIDER=gemini,
GEMINI_RUNTIME_ENABLED=true, GEMINI_PAID_PROJECT_VERIFIED=true,
GEMINI_PRIVACY_READY=true, GEMINI_BUDGET_READY=true,
ADULT_ELIGIBILITY_READY=true and a server-only GEMINI_API_KEY are required.
No browser bundle receives the key. Leave flags absent until approval/readiness.

## Accounting and persistence

Every Gemini call for chat (legacy and quota paths), story POST/PUT and comment
POST/PUT creates a durable budget reservation before transport. Reserve uses the
model's full 1,048,576-input-token ceiling, not an assumed byte-to-token ratio.
Task output caps are 1,024/2,048/512 tokens respectively. Raw usage reconciles
actual costs only when valid; thinking is counted with output. Unknown usage,
network ambiguity and settlement failures retain conservative reservations.
Only definitely pre-dispatch validation failures release a reservation. There is
no local/in-memory ledger fallback or time-based release of uncertain spending.

Input byte ceilings (chat 20,000, story 6,000, comment 2,000) bound local payloads
and include instruction/schema overhead. Existing character bounds remain.
Chat trimming removes oldest complete pairs only; persisted history is unchanged.

Provider cost accounting is separate from the user's daily quota. A disconnect
after text is shown charges the reserved daily turn; provider/save failure
refunds the user quota. Database complete_ai_turn remains the sole source of a
persisted done event and retention metadata. An already saved turn is replayed
without another provider call. Legacy mode never claims persisted=true.

Age checks apply to either provider when enabled. Anonymous Supabase users are
rejected; mutable user metadata cannot grant eligibility. The direct Supabase
signup endpoint can still create accounts outside the UI; such accounts cannot
use provider routes without server-authoritative eligibility. Enforcing age at
account creation itself needs separately approved Auth-hook/settings work.

## Verification

Run npm run lint, npm run build and the workflow's non-REST Node test selection.
Gemini mock suites cover every actual route, gating, dispatch ordering, usage,
stream framing, cancellation, replay, provider/save failure and Korean limits.
Run the isolated database and browser workflow on the exact candidate commit.
Passing mock tests is not paid-project verification or live-provider QA.

## Rollback

Disable GEMINI_RUNTIME_ENABLED first to stop Gemini dispatch. Choosing Potens
again is an explicit operator rollback, never an automatic fallback. Leave age
enforcement enabled if the policy is already in force. Preserve the cost ledger,
unknown reservations, quota records and completed-turn persistence.
