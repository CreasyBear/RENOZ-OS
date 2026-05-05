# Orders Maintainer Sprint 18

## Status

Closed in commit-ready state.

## Issue 1: Ship Order Dialog Shipment Failure Feedback

### Problem

Sprint 17 removed raw failure feedback from delivery confirmation and deliberately deferred the adjacent shipment creation fallback in `ShipOrderDialog`. `handleShipmentError` still used `error.message` for unknown shipment creation or mark-shipped errors when no explicit recovery message was supplied. That bypassed the orders shipment action formatter already used by shipment documents, pending shipment completion, and delivery confirmation.

### Workflow Spine

Order detail fulfillment tab or fulfillment route
-> `ShipOrderDialog`
-> create shipment mutation
-> optional mark-shipped mutation
-> shipment/order cache invalidation
-> operator-safe shipment creation feedback.

### Touched Domains

- Orders fulfillment ship-order dialog.
- Orders fulfillment feedback contract tests.

### Business Value Protected

Shipment creation is a stock-moving fulfillment workflow. Operators should see action-level recovery copy for unknown failures while preserving useful validation messages and per-line item errors that help correct shipment selections.

### Scope Constraints

- Do not change shipment create/mark-shipped server functions, payload shape, item selection, carrier/address workflow, shipping-cost amendment sync, idempotency keys, query keys, cache invalidation, success feedback, workflow notices, or dialog pending guards.
- Preserve server `ValidationError.errors` mapping into line-item errors.
- Preserve explicit recovery copy for the partial success case where a shipment was created but could not be marked as shipped.

### Changes

- Added a `SHIPMENT_OPERATION_FALLBACK` constant to `ShipOrderDialog`.
- Routed `handleShipmentError` through `getShipmentActionErrorMessage`.
- Added a focused source contract proving the raw `error.message`/`Shipment operation failed` fallback is gone while `ValidationError` line-item mapping remains.

### Standards Checked

- Domain ownership: shipment creation feedback now uses the orders shipment action formatter already used by adjacent fulfillment workflows.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes client-side failure copy after existing shipment actions fail.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unknown shipment creation failures now fall back to stable fulfillment copy; validation and explicit partial-success recovery copy remain available.
- Reviewability: the diff is limited to one formatter call, one constant, focused tests, and this closeout note.

### Smells Removed

- Raw shipment creation `error.message` fallback.
- Generic `Shipment operation failed` copy that was not aligned with the orders action formatter.
- Missing source coverage for the ship-order dialog failure boundary.

### Deferred

- Browser QA was deferred because this is failure-copy behavior covered by source/helper tests and no route/layout behavior changed.
- Broader fulfillment visual QA is still useful before a release that changes the shipping dialog layout or item-selection behavior.

### Gates

- Passed: focused shipment feedback set, `./node_modules/.bin/vitest run tests/unit/orders/ship-order-dialog-feedback-contract.test.ts tests/unit/orders/confirm-delivery-feedback-contract.test.ts tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/ship-order-form.test.ts tests/unit/orders/shipment-list.test.tsx` - 5 files, 14 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 36 files, 129 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for ship-order formatter wiring, removed raw shipment operation fallback, and preserved `ValidationError` line-item mapping.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, safe mutation feedback contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for ship-order failure feedback. Remaining fulfillment debt is more about visual/workflow QA and large-dialog maintainability than raw shipment mutation feedback in these covered paths.
