# Orders Maintainer Sprint 24

## Status

Closed in commit-ready state.

## Issue 1: Amendment Workflow Failure Feedback

### Problem

Amendment request, approve, apply, reject, and cancel surfaces still used raw caught mutation messages in toasts or dialog submit errors. Amendments can change order quantities, prices, discounts, shipping, fulfillment readiness, and totals, so blocked or failed amendment feedback needs to be safe, stage-specific, and recoverable.

### Workflow Spine

Order detail / fulfillment tab
-> amendment request or review dialog
-> amendment mutation hook
-> amendment server function
-> order/amendment cache invalidation
-> operator-safe staged feedback.

### Touched Domains

- Orders amendment request workflow.
- Orders amendment review workflow.
- Orders fulfillment amendment cancellation.
- Orders amendment feedback tests.

### Business Value Protected

Amendments protect controlled order changes after fulfillment has started. Operators should see clear request/approval/apply/cancel recovery copy without leaking database or backend details, especially when order versions or fulfillment state block a change.

### Scope Constraints

- Do not change amendment schemas, request payloads, staged submit sequencing, approval/apply behavior, cancellation behavior, form defaults, product search, financial impact calculation, or dialog layout.
- Do not change amendment server functions, order version checks, tenant predicates, inventory behavior, finance persistence, or query/cache invalidation.
- Preserve safe conflict/validation guidance where it helps the operator recover.

### Changes

- Added `getOrderAmendmentActionErrorMessage` for request, approve, reject, apply, approve-and-apply, and cancel failures.
- Added `getOrderAmendmentStepErrorMessage` for staged amendment request dialog failures.
- Routed amendment review approve/apply/reject toasts through the formatter.
- Routed amendment request staged errors and mutation fallback submit errors through the formatter.
- Routed order detail apply-approved-amendment feedback through the formatter.
- Routed fulfillment-tab cancel-amendment feedback through the formatter.
- Added focused tests for unsafe backend suppression, safe conflict/validation guidance, staged copy, and source wiring.

### Standards Checked

- Domain ownership: amendment failure copy is now owned by the Orders amendment action formatter.
- Route -> container/page -> dialog/tab -> hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only UI failure copy after existing amendment mutations fail.
- Query/cache policy: no query keys, invalidations, mutation payloads, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, order version logic, database write, inventory movement, or finance persistence changed.
- UI states/error handling: amendment staged errors and toasts now receive safe, action-specific copy.
- Reviewability: one helper, four amendment call sites, one focused test file, and this closeout note.

### Smells Removed

- Raw request/approval/apply staged error messages in `AmendmentRequestDialogContainer`.
- Raw approve/apply/reject toasts in `AmendmentReviewDialog`.
- Raw apply-approved-amendment toast in the order detail action container.
- Raw cancel-amendment toast in the fulfillment tab.
- Missing focused coverage for amendment feedback boundaries.

### Deferred

- Remaining order-specific raw error paths still need separate slices: order item draft actions, fulfillment error-boundary display, Xero sync alert copy, and server result-row messages.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused amendment feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-amendment-feedback-contract.test.ts tests/unit/orders/shipment-shipping-cost-amendment.test.ts tests/unit/orders/order-amendments-wire-types.test.ts` - 3 files, 9 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 40 files, 146 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is an amendment failure-copy contract with no intended route, interaction, or layout change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, amendment workflow reliability, safe mutation contracts, and risk-selected evidence.

### Residual Risk

Low for amendment request/review/apply/cancel feedback. Moderate for the broader Orders domain because draft item, fulfillment boundary, Xero alert, and server result-row feedback still need bounded cleanup.
