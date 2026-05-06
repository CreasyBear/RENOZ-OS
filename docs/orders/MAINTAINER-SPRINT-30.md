# Orders Maintainer Sprint 30

## Status

Closed in commit-ready state.

## Issue 1: Orders List Bulk Status Failure Contract

### Problem

The Orders list bulk status workflow used the string `"Some orders failed to update"` as a thrown `Error.message` sentinel to keep the bulk dialog open after handled partial failures. That made control flow depend on display text, mixed failure formatting into the container, and left server result-row messages closer to the UI than they needed to be.

### Workflow Spine

Orders list container
-> selected order bulk operation dialog
-> bulk status mutation hook
-> bulk status server function
-> order list/detail/fulfillment cache invalidation
-> operator-safe partial-failure rows and retryable dialog state.

### Touched Domains

- Orders list bulk status updates.
- Orders bulk operation dialog feedback.
- Orders bulk status feedback tests.

### Business Value Protected

Bulk status updates let operators move groups of orders through picking, cancellation, and lifecycle correction. Partial failures should keep the dialog open with actionable order-numbered rows, without relying on brittle string sentinels or surfacing arbitrary backend text.

### Scope Constraints

- Do not change bulk status server behavior, status transition rules, mutation payloads, cache invalidation, selection, dialog layout, or successful update behavior.
- Preserve the existing UX: handled partial failures keep the dialog open, show failure rows, and show a toast.
- Keep cancellation blockers local and explicit.

### Changes

- Added an explicit `BulkOrderStatusHandledFailure` type for handled partial-failure control flow.
- Added `mapBulkStatusFailures` to map structured `errorsById` and legacy `failed` rows to order-numbered, operator-safe failure rows.
- Added `mapBulkCancellationBlockedFailures` for local shipped-quantity cancellation blockers.
- Added `getBulkStatusFailureToast` for stable partial-failure toast copy.
- Routed bulk status partial failures and local cancellation blockers through the helper.
- Added focused tests for structured failure mapping, unsafe reason fallback, cancellation blockers, handled-failure type guards, and source wiring.

### Standards Checked

- Domain ownership: Orders bulk status feedback is now owned by a bulk status feedback helper.
- Route -> container/page -> dialog -> mutation hook -> server function -> schema/database -> query key/cache policy: preserved. This slice changes only client-side handled failure formatting/control flow after existing mutation results.
- Query/cache policy: no query keys, invalidations, mutation payloads, stale-time behavior, or server request shape changed.
- Tenant isolation/data integrity: no server function, tenant predicate, status transition rule, database write, inventory release, artifact queueing, or finance persistence changed.
- UI states/error handling: partial failures keep the dialog open through explicit handled-failure typing, with safer row messages.
- Reviewability: one helper, one container call path, one focused test file, and this closeout note.

### Smells Removed

- String-based `Error.message` sentinel for handled partial bulk failures.
- Inline parsing of server failure strings in the Orders list container.
- Raw unknown failed row fallback that could display backend text or unknown IDs.
- Missing focused coverage for bulk status partial-failure feedback boundaries.

### Deferred

- Remaining order-specific raw error paths still need separate slices: fulfillment error-boundary development details, RMA server result-row messages, and shipment finalization result-row messages.
- Browser QA was deferred because this is dialog failure-copy/control-flow behavior with no visual layout change.

### Gates

- Passed: focused bulk status set, `./node_modules/.bin/vitest run tests/unit/orders/order-bulk-status-feedback-contract.test.ts tests/unit/orders/order-status-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 3 files, 13 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 46 files, 166 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change routes, guarded read paths, financial persistence, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Declined. The standing maintainer goal already covers clear domain ownership, safe mutation contracts, honest UI states, operator-safe errors, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for Orders list bulk status partial-failure handling. Moderate for the broader Orders domain because fulfillment error-boundary development details and server result-row messages still need bounded cleanup.
