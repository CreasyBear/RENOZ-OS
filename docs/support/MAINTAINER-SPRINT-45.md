# Support Maintainer Sprint 45

This sprint follows Sprint 44's RMA create feedback cleanup and stays on the support/RMA bulk workflow. The target is bulk RMA approve/receive/retry failure feedback: per-RMA failures and top-level mutation errors should be safe before they reach operators.

Status: Closed after Issue 1.

## Business Value

Bulk RMA actions let RENOZ Energy clear batches of return work quickly. If a batch partially fails, operators need actionable row-level feedback without database details, and the failed rows should remain selected for retry.

## Workflow Spine

RMA list route
-> `RmasListContainer`
-> `useBulkApproveRma` / `useBulkReceiveRma`
-> `bulkApproveRma` / `bulkReceiveRma` server functions
-> existing RMA/inventory cache invalidation
-> bulk failure alert, retry selection, and operator toast.

## Architecture Constraints

- Keep this sprint to RMA bulk feedback ownership.
- Do not change RMA list routing, selection semantics, bulk mutation success behavior, cache invalidation, inventory receive transactions, serialized lineage, or status-transition rules.
- Sanitize per-RMA failure messages before displaying them in the bulk alert or toast.
- Sanitize top-level bulk mutation errors before displaying them.
- Keep `bulkReceiveRma` from returning raw exception text in its `failed` payload.
- Treat serialized/reliability gates as closed for the standing goal unless a future slice touches serialized lineage.

## Issue Ledger

### 1. RMA Bulk Failure Feedback Boundary

Problem:

- `RmasListContainer` displayed `failure.error` directly in the bulk failure alert and toast.
- Top-level bulk approve, receive, and retry mutation errors surfaced raw `Error.message` text.
- `bulkReceiveRma` serialized `err.message` into `BulkRmaResult.failed`, which could leak database or infrastructure text from the nested receive transaction.

Workflow protected:

RMA list route -> `RmasListContainer` -> bulk approve/receive hooks -> RMA bulk server functions -> existing cache invalidation -> safe row-level feedback and retry selection.

Implemented slice:

- Added RMA bulk feedback helpers for per-row messages, summary toasts, and top-level mutation errors.
- Routed RMA list bulk approve/receive/retry failures through those helpers.
- Added server-side bulk receive failure formatting before adding errors to `BulkRmaResult.failed`.
- Added formatter and source-contract tests.

Out of scope:

- Changing bulk approve/receive mutation success behavior, retry selection behavior, RMA/inventory transactions, serialized lineage, cache invalidation, and browser QA.
- Broader bulk failure handling in other domains.

Closeout:

- Touched domains: support/RMA list bulk actions, RMA bulk receive server function, support RMA bulk feedback helper, support tests, support sprint evidence.
- Workflow protected: RMA list route -> `RmasListContainer` -> `useBulkApproveRma` / `useBulkReceiveRma` -> `bulkApproveRma` / `bulkReceiveRma` -> existing cache invalidation -> bulk failure alert, retry selection, and operator toast.
- Business value protected: operators can continue bulk RMA cleanup with row-level failure feedback that keeps failed rows selected for retry and does not expose database or infrastructure details.
- Architecture standards checked: RMA list container still owns selection and bulk mutation orchestration; helper owns failure message formatting; bulk receive server function formats failed payload messages before returning them; RMA routes, success behavior, cache invalidation, inventory receive transaction behavior, serialized lineage, and status-transition rules unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, inventory transaction, serialized lineage write, or status transition changed. Existing `withAuth` and organization-scoped bulk fetch behavior remain unchanged.
- Query/cache contract checked: `useBulkApproveRma` and `useBulkReceiveRma` invalidation behavior remains unchanged; this slice only changed failed-result formatting and UI feedback text.
- Smells removed: direct `failure.error` display in bulk alerts/toasts; raw top-level `Error.message` feedback for bulk approve, receive, and retry; raw nested `receiveRma` exception text serialized through `BulkRmaResult.failed`.
- Smells deferred: bulk failure handling in non-RMA domains still has similar patterns; RMA bulk receive still loops through `receiveRma` one item at a time, which may deserve a separate performance/transaction review; browser QA remains deferred.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/rma-bulk-feedback.test.ts tests/unit/support/rma-bulk-feedback-contract.test.ts tests/unit/support/rma-mutation-errors.test.ts tests/unit/support/use-rma-mutations.test.tsx`; focused eslint for changed helper/container/server/tests; source scan for RMA bulk formatter/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (44 files, 174 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback and server failed-payload contract slice with unit/source coverage and no visual layout change; serialized/reliability gates, by maintainer direction, because the serialized gate track is closed and this slice did not change serialized lineage.
- Goal adaptations: declined. The standing product-owner/repo-maintainer posture and Sprint 42 serialized-gate adaptation still fit.
- Residual risk: support feedback cleanup can now move out of the RMA core workflow; remaining support direct `sonner`/raw-error sites are mostly issues board, knowledge base, CSAT, escalation dialog, and read-state messages.
