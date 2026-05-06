# Orders Maintainer Sprint 23

## Status

Closed in commit-ready state.

## Issue 1: Payment And Refund Dialog Failure Feedback

### Problem

The record-payment and refund-payment dialogs wrote raw caught mutation messages into `FormDialog` submit errors. These dialogs sit on the order finance workflow, so operators should see safe payment/refund recovery copy and useful validation guidance without backend, database, or stack details.

### Workflow Spine

Order detail container
-> payment/refund dialog
-> TanStack form submit
-> order payment mutation callback
-> payment server function
-> order/payment cache updates
-> operator-safe form submit feedback.

### Touched Domains

- Orders payment dialog feedback.
- Orders refund dialog feedback.
- Orders payment feedback tests.

### Business Value Protected

Payments and refunds are finance-sensitive order closeout actions. Failure copy needs to be safe and actionable so operators can correct an amount or retry without losing trust in the order balance workflow.

### Scope Constraints

- Do not change payment/refund schemas, form fields, default values, submit payloads, disabled states, dialog layout, success behavior, or reset behavior.
- Do not change payment server functions, payment/refund validation, ledger behavior, order balance math, tenant predicates, query keys, cache invalidation, or finance persistence.
- Preserve safe amount validation guidance for recoverable form errors.

### Changes

- Added `getOrderPaymentDialogErrorMessage` for payment/refund submit failures.
- Routed `RecordPaymentDialog` submit failures through the formatter.
- Routed `RefundPaymentDialog` submit failures through the formatter.
- Added focused tests for unsafe backend message suppression, safe validation guidance, and dialog source wiring.

### Standards Checked

- Domain ownership: payment/refund submit copy is owned by the Orders dialog boundary.
- Route -> container/page -> dialog -> mutation callback -> server -> schema/database -> query key/cache policy: preserved. This slice changes only dialog failure copy after existing submit failures.
- Query/cache policy: no query keys, invalidations, optimistic behavior, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database write, finance persistence, balance calculation, or ledger behavior changed.
- UI states/error handling: `FormDialog` submit errors now receive safe payment/refund copy.
- Reviewability: one small helper, two dialog call sites, one focused test file, and this closeout note.

### Smells Removed

- Raw payment submit `err.message` in `RecordPaymentDialog`.
- Raw refund submit `err.message` in `RefundPaymentDialog`.
- Generic failed copy that bypassed the Orders mutation normalizer.
- Missing focused feedback coverage for payment/refund dialogs.

### Deferred

- Remaining order-specific raw error paths still need separate slices: amendment feedback, order item draft actions, fulfillment error-boundary display, Xero sync alert copy, and server result-row messages.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused payment feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-payment-dialog-feedback-contract.test.ts tests/unit/orders/order-payments-refund.test.ts` - 2 files, 4 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 39 files, 143 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is a payment/refund failure-copy contract with no intended route, interaction, or layout change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, finance workflow caution, safe mutation contracts, and risk-selected evidence.

### Residual Risk

Low for payment/refund dialog submit feedback. Moderate for the broader Orders domain because amendment, draft item, fulfillment boundary, Xero alert, and server result-row feedback still need bounded cleanup.
