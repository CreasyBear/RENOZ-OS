# Orders Maintainer Sprint 17

## Status

Closed in commit-ready state.

## Issue 1: Confirm Delivery Operator-Safe Failure Feedback

### Problem

Order fulfillment still had a raw feedback path in `ConfirmDeliveryDialog`. Delivery photo upload failures and confirm-delivery mutation failures rendered caught `error.message` values directly. The shipment mutation hook already normalizes confirm-delivery server errors, but the dialog bypassed the shipment action formatter when displaying the toast, so unknown infrastructure or storage errors could leak to operators.

### Workflow Spine

Fulfillment route or order fulfillment tab
-> `ConfirmDeliveryDialog`
-> optional delivery photo upload/download URL
-> `useConfirmDelivery`
-> shipment server mutation
-> fulfillment/shipment cache invalidation
-> operator-safe delivery confirmation feedback.

### Touched Domains

- Orders fulfillment confirm-delivery dialog.
- Orders fulfillment confirm-delivery feedback helper.
- Orders fulfillment feedback contract tests.

### Business Value Protected

Delivery confirmation is a warehouse/customer handoff workflow. When proof-of-delivery upload or confirmation fails, operators should see stable recovery copy instead of raw storage, database, or transport errors. Local image type and size validation remains specific because those are operator-correctable inputs.

### Scope Constraints

- Do not change shipment server functions, upload/download hooks, delivery confirmation payload shape, idempotency key behavior, query keys, cache invalidation, dialog pending guards, success reset behavior, signature capture, photo preview, or route wiring.
- Preserve safe local file validation messages for non-image uploads and files over 10MB.
- Do not fold shipment creation or picking feedback into this slice.

### Changes

- Added `confirm-delivery-errors.ts` for delivery confirmation fallback copy and safe photo-upload validation messages.
- Routed delivery photo upload failures through `getDeliveryPhotoUploadErrorMessage`.
- Routed confirm-delivery mutation failures through `getShipmentActionErrorMessage`.
- Added focused coverage proving unknown upload errors use a fulfillment-owned fallback and the dialog no longer contains direct raw error-message toast branches.

### Standards Checked

- Domain ownership: confirm-delivery feedback copy lives beside the fulfillment dialog that owns the workflow.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint only changes client-side failure copy after existing upload/confirm actions fail.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache writes changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, database write, inventory transaction, finance persistence, or serialized lineage behavior changed.
- UI states/error handling: unknown upload and confirm failures now use action-level fulfillment fallback copy; safe local file validation copy remains specific.
- Reviewability: the diff is limited to one helper, one dialog wiring change, focused tests, and this closeout note.

### Smells Removed

- Raw delivery photo upload `error.message` toast.
- Raw confirm-delivery mutation `error.message` toast.
- Scattered local file validation copy inside the dialog.

### Deferred

- `ship-order-dialog.tsx` still has a separate raw shipment creation fallback inside `handleShipmentError`; it should be handled as a shipment creation workflow slice, not mixed into delivery confirmation.
- Browser QA was deferred because this is failure-copy behavior covered by source/helper tests and no route/layout behavior changed.

### Gates

- Passed: focused fulfillment feedback set, `./node_modules/.bin/vitest run tests/unit/orders/confirm-delivery-feedback-contract.test.ts tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx` - 3 files, 11 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 35 files, 128 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for confirm-delivery fallback wiring, removed raw confirm-delivery/upload error branches, and deferred ship-order raw fallback.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, finance persistence, document generation, release packaging, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain-owned workflow contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for confirm-delivery feedback. The next orders fulfillment slice should target `ship-order-dialog.tsx` shipment creation fallback copy or a browser QA pass of delivery confirmation if a dev-server workflow is available.
