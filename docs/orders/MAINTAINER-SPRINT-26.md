# Orders Maintainer Sprint 26

## Status

Closed in commit-ready state.

## Issue 1: Order Detail Workflow Failure Feedback

### Problem

The order detail workflow control still toasted raw mutation messages when a status transition failed or when a shipped shipment was reopened for correction. These actions are high-impact operational controls: they move orders through fulfillment, cancellation, delivery confirmation, and shipment correction paths. Failure copy needs to be safe, action-specific, and recoverable without exposing database, transaction, or service details.

### Workflow Spine

Order detail container
-> workflow action menu
-> order status mutation or reopen shipment mutation
-> order/shipment server function
-> order and shipment cache invalidation
-> operator-safe toast and detail refresh.

### Touched Domains

- Orders workflow status control.
- Orders shipment reopen control.
- Orders workflow feedback tests.

### Business Value Protected

Workflow controls drive daily fulfillment decisions and exception handling. Operators need clear recovery copy when a status change or shipment reopen is blocked, especially under concurrent edits, without low-level backend details leaking into the order workspace.

### Scope Constraints

- Do not change workflow action resolution, confirmations, mutation payloads, idempotency keys, refresh behavior, menu layout, route intents, or dialog behavior.
- Do not change server functions, schemas, tenant predicates, order version checks, shipment inventory reversal behavior, finance persistence, or query/cache invalidation.
- Preserve safe conflict guidance where it helps the operator recover.

### Changes

- Added `getOrderWorkflowActionErrorMessage` for order workflow status failures.
- Added `getReopenShipmentActionErrorMessage` for shipment reopen failures.
- Routed order workflow mutation errors through the order formatter instead of reading raw `error.message`.
- Routed reopen-shipment errors through the shipment formatter instead of reading raw `error.message`.
- Added focused contract coverage for unsafe backend suppression, safe conflict guidance, shipment reopen feedback, and source wiring.

### Standards Checked

- Domain ownership: order detail workflow failure copy is now owned by an Orders workflow formatter.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only UI failure copy after existing mutations fail.
- Query/cache policy: no query keys, invalidations, mutation payloads, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, order version check, shipment transaction, inventory reversal, database write, or finance persistence changed.
- UI states/error handling: workflow and reopen toasts now use safe, action-specific copy while preserving conflict recovery.
- Reviewability: one helper, two call sites, one focused test file, and this closeout note.

### Smells Removed

- Raw order workflow `error.message` toast in the detail container.
- Raw reopen-shipment `error.message` toast in the detail container.
- Missing focused coverage for detail workflow failure feedback boundaries.

### Deferred

- Remaining order-specific raw error paths still need separate slices: fulfillment error-boundary display, Xero sync alert copy, order creation failure copy, list bulk status comparison, and server result-row messages.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused workflow feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-workflow-feedback-contract.test.ts tests/unit/orders/order-status-contract.test.ts tests/unit/orders/order-workflow-options.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 4 files, 14 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 42 files, 152 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change routes, guarded read paths, financial persistence, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, safe mutation contracts, reviewable diffs, and risk-selected evidence. The retired serialized gate posture remains unchanged and is not part of this unrelated slice.

### Residual Risk

Low for order detail workflow and reopen-shipment feedback. Moderate for the broader Orders domain because fulfillment boundary copy, Xero alert copy, order creation failures, list bulk status handling, and server result-row messages still need bounded cleanup.
