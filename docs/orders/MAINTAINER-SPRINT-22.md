# Orders Maintainer Sprint 22

## Status

Closed in commit-ready state.

## Issue 1: Order Detail Document Generation Feedback

### Problem

Order detail document actions still used raw caught error messages when quote, invoice, pro-forma, packing-slip, dispatch-note, or delivery-note generation failed. These actions sit in the main order workflow and can fail due to document service, server validation, shipment state, or infrastructure issues. Operators need safe document-specific recovery copy, not backend details.

### Workflow Spine

Order detail container
-> document action callbacks
-> order or shipment document mutation hook
-> document server function
-> generated document history and order detail cache invalidation
-> generated PDF open or operator-safe failure toast.

### Touched Domains

- Orders document action feedback.
- Order detail container document action wiring.
- Orders document feedback tests.

### Business Value Protected

Order documents are part of quoting, invoicing, dispatch, delivery, and fulfillment handoff. Failed document generation should be actionable and safe without exposing storage, database, or document-service internals.

### Scope Constraints

- Do not change document generation hooks, server functions, result normalization, document history invalidation, order detail invalidation, generated URL opening, success copy, or document availability logic.
- Do not change shipment selection, dispatch-note routing, packing-slip/delivery-note eligibility checks, tenant predicates, database writes, finance persistence, inventory movement, or document templates.
- Preserve safe blocked/validation messages where shipment state prevents document generation.

### Changes

- Added `getOrderDocumentActionErrorMessage` for order-scoped quote, invoice, and pro-forma generation failures.
- Added `getShipmentOperationalDocumentErrorMessage` for shipment-backed packing slip, dispatch note, and delivery note failures.
- Routed order detail document action catches through the new formatter helper.
- Routed order detail operational shipment document generation through shipment action normalization.
- Added focused source and formatter coverage for unsafe backend messages and safe blocked/validation guidance.

### Standards Checked

- Domain ownership: document action failure copy is now owned by the Orders domain instead of inline container branches.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only failure copy after existing document mutations fail.
- Query/cache policy: no query keys, invalidation paths, mutation payloads, result normalization, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database write, document persistence, inventory movement, or finance persistence changed.
- UI states/error handling: document generation toasts now use safe order/shipment action copy.
- Reviewability: one helper, two call sites, one focused test file, and this closeout note.

### Smells Removed

- Raw quote generation `error.message` toast.
- Raw invoice generation `error.message` toast.
- Raw pro-forma generation `error.message` toast.
- Raw shipment operational document `error.message` toast.
- Missing coverage for order detail document action feedback.

### Deferred

- Remaining order-specific raw error paths still need separate slices: amendment feedback, payment/refund dialog feedback, order item draft actions, fulfillment error-boundary display, Xero sync alert copy, and server result-row messages.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused document feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-document-action-feedback-contract.test.ts tests/unit/orders/order-document-surfaces.test.tsx` - 2 files, 6 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 38 files, 140 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is a document action failure-copy contract with no intended route, interaction, or layout change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, document workflow reliability, reviewable slices, and risk-selected evidence.

### Residual Risk

Low for order detail document generation feedback. Moderate for the broader Orders domain because amendment, payment/refund, order item, fulfillment boundary, Xero alert, and server result-row feedback still need bounded cleanup.
