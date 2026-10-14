# Integration plan and release blockers

This plan preserves the existing app contracts. No plan step below has been implemented by this standalone adapter draft.

This source is now included under `backend/providers/` for offline review only. No production entrypoint imports it. No key, billing, model, provider, database, or policy activation is authorized by this change.

## Route inventory

Replace provider calls behind one server-owned `AiProvider` in:
1. `/api/chat` was removed by main d406882; do not restore it.
2. `/api/chat-stream`: both legacy branch and persisted `streamServerAiTurn` branch.
3. `checkStoryContent`: create/edit story paths, with the complete six-field result type.
4. `sanitizeCommentText`: comments and replies/edits. `/api/sanitize-text` was removed by main d406882; do not restore it.

Keep public field names and SSE `text`, `provider_done`, `done`, `error` contracts unchanged. Remove live Potens endpoint/model constants only in the later integration change. Reference copies here deliberately retain the original provider calls, and are not executable entrypoints. A replacement is not complete while any legacy branch can bypass the adapter or eligibility/spend gates.

## Required ordering

Authenticate and authorize ownership → enforce current server-controlled adult eligibility and privacy requirements → validate request and task-specific sizes → resolve already-completed idempotency recovery → reserve applicable product quota and conservative spend → call provider once → require validated STOP and valid output → persist atomically → mark product success → reconcile spend.

Fail closed before any provider call, content write or quota reservation when age is unknown, false, stale, unavailable or client-forged. Keep account export/delete/support access available without AI eligibility. Server/database age-policy enforcement is separate work, not part of this adapter.

Validate original story title ≤30 and body 20–1000 characters, comments ≤200, newest chat ≤4000 on both legacy/current routes. Preserve only server-authorized history; use at most eight prior messages, trimming whole oldest user/assistant exchanges. Build system instruction separately, and never concatenate untrusted data as a system instruction. Review the current instruction that asks for strained excuses for the opposing side before adopting it.

## Completion, persistence and idempotency

- Stream text is provisional and does not authorize persistence or a successful-turn charge. Preserve main d406882’s separate product rule: user disconnect after delivered text consumes the first-reply quota; cancellation before text and provider/save failures return reservations. The provider adapter must not override route-owned quota semantics.
- Emit `provider_done` only after `streamText` resolves. Keep the existing 45-second server-turn/controller and client-close handling as an outer deadline, passing its signal into the adapter.
- Emit `done` with `persisted: true` only after `complete_ai_turn` returns a validated saved/recovered result.
- No partial answer is persisted as complete. Do not call completion RPC on parser, safety, timeout, disconnect, truncation or cancellation errors.
- Preserve UUID request IDs, ownership checks, duplicate behavior, simultaneous-first-reply reservation behavior, grandfathered-room rules and reservation expiration semantics. Keep DB uniqueness/locking as the authority across instances.
- Preserve the route-owned disconnect-after-text charge; return held first-reply reservations on provider failure; if completion committed but its response was lost, recovery must not double-charge or regenerate.
- Never make the provider adapter own database writes or successful-turn quota semantics. Map sanitized error codes at the route boundary; avoid logging provider bodies, prompts or secrets.

### Observed recovery gap requiring explicit resolution

The inspected `streamServerAiTurn` finds recovered answers in `context.savedHistory`; it does not visibly persist a separate completed-answer journal before calling `complete_ai_turn`. If a save committed but its response was lost, a later history read may recover it. If the generated answer never reached a durable DB commit, there is no durable recoverable answer in that path. Do not promise regeneration-free recovery for all save failures based on current code.

Before claiming full recovery, design and test an authorized, access-controlled, retention-bounded durable pending-completion record keyed by user/persona/request ID, or explicitly bound the guarantee to previously committed answers. Such a journal introduces sensitive-content storage and concurrency decisions and is **not implemented here**. Do not add an in-memory-only cache and call it cross-instance recovery.

## Spend ledger distinct from product quota

First-reply/room quotas do not cap all provider calls. Story/comment calls, subsequent chat messages, failures, retries and thinking may cost money. Add an atomic cross-instance global reservation ledger with a conservative worst-case estimate and in-flight headroom. Every provider attempt reserves spend; reconcile on usage, retaining conservative cost if usage is unknown. Adapter failures after upstream generation do not imply zero cost. The adapter never retries automatically.

Activation must require verified paid project, approved budget/terms, environment-held server key, verified model availability, optional logs/data sharing off and a kill switch. Kill switch failure mode is AI unavailable, not fallback to Potens or a free project.

## Required integration regression suite

Run and record separately:
- Existing story-save/idempotency, comment/reply/edit and sanitize route tests.
- Chat legacy/current, retry, ai-chat-server-turn, ai-quota, ai-retention and relevant PGlite contracts.
- Duplicate IDs, concurrent first replies, provider errors returning reservations, lost-save-response recovery without regeneration, no partial persistence, spend across workers/retries.
- Every participation/API/direct Supabase route’s age gate, old clients and existing users, with zero provider calls or quota changes before eligibility.
- Frontend cancellation/navigation/refresh/retry behavior and successful-save acknowledgment ordering.
- App-wide `npm run lint`, `npm run build`, secret/client-bundle scan and exact production configuration review.
- Explicitly authorized synthetic-only live request, then quality/safety corpus review, before any separately authorized deployment.

All of these integrated checks remain unrun for this isolated draft. Local adapter tests cannot substitute for them.
