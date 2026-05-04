# Maintainer Sprint 5: Fulfillment Operator Safety and UI Maintainability

Sprint 5 follows the Sprint 4 fulfillment cache closeout into the operator-facing workflow surfaces: picking, shipment completion, shipment documents, and recovery actions.

Status: Closed after Issues 1, 2, 3, 4, 5, 6, 7, 8, and 9.

## Business Value

RENOZ Energy operators need fulfillment actions to be clear under pressure. Picking, shipping, and shipment document generation should fail honestly without leaking raw technical errors or forcing operators to guess whether stock, documents, or shipment state changed.

## Workflow Spine

```text
fulfillment route or order detail fulfillment tab
  -> fulfillment dashboard / shipment list / pick dialog
  -> fulfillment action hook
  -> order or shipment server function
  -> schema/database side effects
  -> query key/cache policy
  -> operator-safe success, blocked, failed, retry, and empty states
```

## Pattern Map

- Routes: `src/routes/_authenticated/orders/fulfillment.tsx`, `src/routes/_authenticated/orders/$orderId.tsx`
- Containers/pages: `src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx`, `src/components/domain/orders/containers/order-detail-container.tsx`
- High-risk UI surfaces: `src/components/domain/orders/fulfillment/fulfillment-dashboard.tsx`, `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`, `src/components/domain/orders/fulfillment/shipment-list.tsx`, `src/components/domain/orders/fulfillment/pick-items-dialog.tsx`
- Hooks: `src/hooks/orders/use-shipments.ts`, `src/hooks/orders/use-picking.ts`, `src/hooks/orders/order-mutation-client-errors.ts`
- Cache policy: `src/hooks/orders/_fulfillment-cache.ts`
- Tests: `tests/unit/orders/order-client-contracts.test.ts`, `tests/unit/orders/shipment-list.test.tsx`, `tests/unit/orders/fulfillment-import-workflow.test.tsx`, `tests/unit/orders/ship-order-item-selection.test.ts`, `tests/unit/orders/shipment-shipping-cost-amendment.test.ts`, `tests/unit/orders/ship-order-address.test.ts`, `tests/unit/orders/ship-order-carrier.test.ts`

## Triage Findings

- Sprint 4 removed the highest-risk fulfillment cache-integrity debt, but left UI/operator safety and large-file maintainability as residual risk.
- `ship-order-dialog.tsx`, `fulfillment-dashboard.tsx`, `shipment-list.tsx`, and `pick-items-dialog.tsx` are large workflow-heavy components; extraction should happen by workflow responsibility, not by broad file splitting.
- `shipment-list.tsx` and `pick-items-dialog.tsx` still show raw `error.message` for high-traffic fulfillment actions.
- Orders already has a domain error normalizer in `src/hooks/orders/order-mutation-client-errors.ts`; the next slice should reuse it before inventing new UI error handling.

## Issue Ledger

### 1. Fulfillment Action Operator-Safe Errors

Business value: when picking, unpicking, marking a shipment shipped, or generating shipment documents fails, operators should see a stable action-level message unless the server error is a meaningful conflict, validation, blocked, retryable, or not-found state.

Workflow invariant: fulfillment action components must normalize order/shipment mutation errors through the domain error contract before rendering toasts, and unknown errors must use the action fallback instead of leaking raw implementation text.

Affected files:

- `src/hooks/orders/order-mutation-client-errors.ts`
- `src/components/domain/orders/fulfillment/shipment-list.tsx`
- `src/components/domain/orders/fulfillment/pick-items-dialog.tsx`
- `tests/unit/orders/order-client-contracts.test.ts`
- `tests/unit/orders/shipment-list.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- splitting `ship-order-dialog.tsx` or `fulfillment-dashboard.tsx`
- changing server validation messages
- changing picking, shipment, or document generation behavior
- adding browser QA for every fulfillment action

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx
```

Closeout criteria:

- unknown order/shipment mutation errors use the action fallback message
- conflict, blocked, retryable, validation, and not-found mutation messages remain available when classified
- `shipment-list.tsx` normalizes mark-shipped and shipment document action failures
- `pick-items-dialog.tsx` normalizes pick/unpick failures
- focused tests pass
- lint/typecheck evidence is recorded

### 2. Shipment Document Action Boundary

Business value: shipment document generation is a fulfillment workflow responsibility that should be easy to review independently from shipment card rendering, tracking history, shipment completion, and delivery confirmation.

Workflow invariant: shipment document buttons must route through one orders-owned hook that handles document generation, success feedback, generated-file opening, and operator-safe error fallback while the shipment list remains responsible for shipment list/card orchestration.

Affected files:

- `src/hooks/orders/use-shipment-document-actions.ts`
- `src/hooks/orders/index.ts`
- `src/components/domain/orders/fulfillment/shipment-document-actions.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `src/components/domain/orders/fulfillment/shipment-list.tsx`
- `tests/unit/orders/shipment-list.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing document generation server functions
- changing document cache invalidation policy
- splitting the rest of `shipment-list.tsx`
- extracting fulfillment import or shipping-dialog behavior

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/shipment-list.test.tsx
```

Closeout criteria:

- shipment document generation logic leaves `shipment-list.tsx`
- shipment document button UI lives in a focused fulfillment component
- shipment document generation, toast, file-open, pending-state, and fallback-error behavior live in a focused hook
- shipment list tests cover dispatch-note generation and unknown document failure fallback
- focused tests pass
- lint/typecheck evidence is recorded

### 3. Pending Shipment Completion Boundary

Business value: completing an existing pending shipment draft is a fulfillment recovery workflow that should be reviewable independently from shipment card rendering, tracking history, document generation, and delivery confirmation.

Workflow invariant: pending shipment completion must keep its form state, validation, mark-shipped mutation, idempotency key generation, success/failure toasts, and pending-dialog guards in a focused hook/component boundary while `ShipmentList` remains responsible for listing shipments and opening the workflow.

Affected files:

- `src/hooks/orders/shipment-action-errors.ts`
- `src/hooks/orders/use-pending-shipment-completion.ts`
- `src/hooks/orders/use-shipment-document-actions.ts`
- `src/hooks/orders/index.ts`
- `src/components/domain/orders/fulfillment/pending-shipment-completion-dialog.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `src/components/domain/orders/fulfillment/shipment-list.tsx`
- `tests/unit/orders/shipment-list.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing mark-shipped server behavior
- changing shipment cache invalidation
- changing shipment document actions
- splitting shipment tracking, item display, delivery confirmation, or card rendering
- extracting fulfillment import or shipping-dialog behavior

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/shipment-list.test.tsx
```

Closeout criteria:

- pending shipment completion form/mutation logic leaves `shipment-list.tsx`
- pending shipment completion dialog UI lives in a focused fulfillment component
- shipment action error fallback helper is shared outside document-specific hooks
- existing mark-shipped dialog behavior remains covered by shipment-list tests
- focused tests pass
- lint/typecheck evidence is recorded

### 4. Shipment Card Detail Boundary

Business value: shipment tracking, shipment items, serials, tracking history, and delivery confirmation are read-only fulfillment details that should be reviewable independently from shipment actions and mutation workflows.

Workflow invariant: `ShipmentList` should orchestrate the list and action entry points, while a focused shipment detail component owns read-only shipment detail rendering and tracking-link behavior.

Affected files:

- `src/components/domain/orders/fulfillment/shipment-card-details.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `src/components/domain/orders/fulfillment/shipment-list.tsx`
- `tests/unit/orders/shipment-list.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing shipment read server functions
- changing shipment action hooks
- changing pending completion, document generation, or delivery confirmation mutation behavior
- extracting the full shipment card shell
- extracting fulfillment import or shipping-dialog behavior

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/shipment-list.test.tsx
```

Closeout criteria:

- shipment tracking, dates, item serials, tracking history, and delivery confirmation rendering leave `shipment-list.tsx`
- shipment card details live in a focused fulfillment component
- shipment list tests cover tracking link, serial display, tracking history, and delivery confirmation rendering
- focused tests pass
- lint/typecheck evidence is recorded

### 5. Fulfillment Import Workflow Boundary

Business value: carrier or warehouse shipment CSV imports are operationally sensitive because they can mark shipments as shipped and move fulfillment state forward. Operators need upload, preview, dry-run, result, and download behavior that is reviewable without scanning the whole dashboard.

Workflow invariant: fulfillment dashboard -> import dialog -> fulfillment import workflow hook -> import fulfillment mutation -> shipment import schema/server function -> fulfillment/shipment/order cache invalidation -> operator-facing preview, importing, complete, and result-download states.

Affected files:

- `src/hooks/orders/use-fulfillment-import-workflow.ts`
- `src/hooks/orders/index.ts`
- `src/components/domain/orders/fulfillment/fulfillment-import-dialog.tsx`
- `src/components/domain/orders/fulfillment/fulfillment-dashboard.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `tests/unit/orders/fulfillment-import-workflow.test.tsx`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing import server behavior or tenant isolation in `importFulfillmentShipmentsHandler`
- changing shipment cache invalidation in `fulfillment-dashboard-container.tsx`
- redesigning the dashboard queue tables, refresh behavior, or summary metrics
- changing CSV validation copy for blank required cells
- splitting `ship-order-dialog.tsx`

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/fulfillment-import-workflow.test.tsx
```

Closeout criteria:

- CSV parsing and header mapping leave `fulfillment-dashboard.tsx`
- import preview, dry-run, mutation, result CSV, success toast, and reset state live in an orders hook
- import dialog UI lives in a focused fulfillment component
- dashboard remains responsible for opening the import dialog and presenting fulfillment queues
- focused import workflow tests cover parsing, result CSV escaping, and mutation payload behavior
- focused tests, lint, typecheck, and full orders suite pass

### 6. Ship Order Item Selection Boundary

Business value: ship-order item selection controls inventory integrity at the point where picked stock becomes shipment reservations or shipped stock. Quantity, pending-draft reservation, and serialized lineage selection rules should be reviewable without reading shipment creation, mark-shipped, address, carrier, amendment, and confirmation code in one dialog.

Workflow invariant: ship order dialog -> order detail and existing shipments -> item availability/reservation summary -> item selection boundary -> create shipment item payload -> shipment server inventory/serial validation.

Affected files:

- `src/components/domain/orders/fulfillment/ship-order-item-selection.ts`
- `src/components/domain/orders/fulfillment/ship-order-items-table.tsx`
- `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `tests/unit/orders/ship-order-item-selection.test.ts`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing shipment create or mark-shipped mutation behavior
- changing pending shipment reservation math in `shipment-availability.ts`
- changing carrier, address, shipping cost amendment, or confirmation-step behavior
- browser QA for the full ship-order dialog

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/ship-order-item-selection.test.ts
```

Closeout criteria:

- item selection availability, selected-quantity, selected-serial, select-all, and summary rules leave `ship-order-dialog.tsx`
- item selection table UI leaves `ship-order-dialog.tsx`
- ship-order dialog remains responsible for shipment workflow orchestration and mutation side effects
- focused tests cover pending-draft reservation exclusion, serialized selection bounds, partial confirmation summary, toggle, and select-all behavior
- focused tests, lint, typecheck, and full orders suite pass

### 7. Shipment Shipping Cost Amendment Boundary

Business value: a shipment can be successfully created while the order-total shipping amendment fails. That recovery path must be explicit, operator-safe, and reviewable independently from shipment creation, mark-shipped, item selection, address handling, and confirmation UI.

Workflow invariant: ship order dialog -> create shipment success -> shipping cost amendment hook -> request amendment -> approve amendment -> apply amendment -> order amendment/detail/list cache policy -> operator-safe synced or manual-recovery notice.

Affected files:

- `src/hooks/orders/use-shipment-shipping-cost-amendment.ts`
- `src/hooks/orders/index.ts`
- `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`
- `tests/unit/orders/shipment-shipping-cost-amendment.test.ts`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing order amendment server behavior, approval policy, or cache invalidation
- changing shipment create or mark-shipped mutation behavior
- changing carrier, address, item selection, or confirmation-step behavior
- changing successful shipment toast copy
- browser QA for the full ship-order dialog

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/shipment-shipping-cost-amendment.test.ts
```

Closeout criteria:

- shipping cost amendment request/approve/apply sequencing leaves `ship-order-dialog.tsx`
- unknown amendment sync failures use operator-safe fallback text instead of raw implementation messages
- useful conflict guidance remains available when the order amendment contract classifies it
- ship-order dialog remains responsible for shipment workflow orchestration and recovery notice display
- focused tests cover amendment request shape, request/approve/apply sequencing, unknown fallback copy, and conflict guidance
- focused tests, lint, typecheck, and full orders suite pass

### 8. Ship Order Address Boundary

Business value: shipping address selection controls where battery shipments are sent and whether a one-off destination is saved back to the order. Address option derivation, address-source selection, field mutation, and one-off override behavior should be reviewable without reading shipment mutation, carrier, item selection, amendment, and confirmation logic.

Workflow invariant: ship order dialog -> order/customer address data -> address workflow boundary -> shipment address payload/addressSource/customerAddressId/saveToOrder flag -> create shipment server validation and order shipping-address side effects.

Affected files:

- `src/components/domain/orders/fulfillment/ship-order-address-workflow.ts`
- `src/components/domain/orders/fulfillment/ship-order-address.tsx`
- `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `tests/unit/orders/ship-order-address.test.ts`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing shipment create server behavior
- changing address schema validation
- changing carrier, item selection, shipping cost amendment, or confirmation-step behavior
- redesigning the address picker
- browser QA for the full ship-order dialog

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/ship-order-address.test.ts
```

Closeout criteria:

- order/customer address option derivation leaves `ship-order-dialog.tsx`
- address field mutation, collapsible state, selected address state, and save-to-order state leave `ship-order-dialog.tsx`
- shipment address payload, addressSource, and customerAddressId helpers are explicit and tested
- address section UI lives in a focused fulfillment component
- focused tests cover option ordering, payload construction, source/customer ID resolution, and incomplete-address detection
- focused tests, lint, typecheck, and full orders suite pass

### 9. Ship Order Carrier and Confirmation Boundary

Business value: carrier selection, shipping-cost normalization, success copy, and final shipment review are operator-facing fulfillment decisions. They should be reviewable without reading shipment creation, mark-shipped fallback recovery, address selection, item selection, and amendment orchestration in one dialog.

Workflow invariant: ship order dialog -> carrier workflow boundary -> carrier/service/tracking/cost form fields -> shipment create and optional mark-shipped payload -> confirmation review boundary -> operator-safe final status and success copy.

Affected files:

- `src/components/domain/orders/fulfillment/ship-order-carrier-workflow.ts`
- `src/components/domain/orders/fulfillment/ship-order-carrier.tsx`
- `src/components/domain/orders/fulfillment/ship-order-confirmation.tsx`
- `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`
- `src/components/domain/orders/fulfillment/index.ts`
- `tests/unit/orders/ship-order-carrier.test.ts`
- `docs/orders/MAINTAINER-SPRINT-5.md`

Out of scope:

- changing shipment create server behavior
- changing mark-shipped mutation behavior
- changing shipping cost amendment request/approval/apply behavior
- changing item selection or address payload behavior
- browser QA for the full ship-order dialog

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/orders/ship-order-carrier.test.ts
```

Closeout criteria:

- carrier constants, service lookup, carrier label resolution, and carrier value resolution leave `ship-order-dialog.tsx`
- shipping-cost cents normalization and success toast copy are explicit and tested
- carrier form rendering lives in a focused fulfillment component
- final confirmation review rendering lives in a focused fulfillment component
- `ship-order-dialog.tsx` remains responsible for the shipment mutation/recovery spine
- focused tests, lint, typecheck, and full orders suite pass

## Closeout Log

### Issue 1: Fulfillment Action Operator-Safe Errors

Touched domains: orders fulfillment UI, order/shipment mutation error contract, shipment action tests.

Workflow protected: fulfillment dashboard/order detail -> shipment list or pick dialog -> mark-shipped, shipment-document, pick, or unpick action -> normalized domain mutation error -> operator-facing toast.

Business value: operators now get stable action-level failure text for unknown fulfillment action failures, while known validation, blocked, retryable, conflict, and not-found states can still surface useful server-owned guidance.

Standards checked:

- reused `order-mutation-client-errors.ts` instead of creating component-local error parsing
- unknown mutation errors now return the action fallback from `getClientErrorMessage`
- `shipment-list.tsx` normalizes mark-shipped and shipment document action failures
- `pick-items-dialog.tsx` normalizes pick/unpick failures through the order mutation error contract
- tests cover both the shared unknown-error fallback and the shipment-list operator toast

Smells removed:

- high-traffic fulfillment actions displayed raw `error.message` values directly in toasts
- shipment action fallback wording was inconsistent across mark-shipped and document-generation actions
- the shared error helper still allowed unknown implementation errors to leak into operator-facing messages

Deferred:

- `ship-order-dialog.tsx` and `fulfillment-dashboard.tsx` remain large workflow-heavy files
- this slice did not audit every order amendment or document-generation error surface
- browser QA was skipped because this is a focused unit-covered error contract and toast behavior slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/eslint src/hooks/orders/order-mutation-client-errors.ts src/components/domain/orders/fulfillment/shipment-list.tsx src/components/domain/orders/fulfillment/pick-items-dialog.tsx tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `git diff --check -- docs/orders/MAINTAINER-SPRINT-5.md src/hooks/orders/order-mutation-client-errors.ts src/components/domain/orders/fulfillment/shipment-list.tsx src/components/domain/orders/fulfillment/pick-items-dialog.tsx tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx`

Goal adaptation: no standing goal change. Sprint 5 carries the goal from fulfillment data correctness into operator safety: honest UI states and error handling are part of production readiness, not polish.

Residual risk: the next Sprint 5 slice should address the large fulfillment UI files by extracting one workflow responsibility at a time, starting with shipment document actions or the fulfillment import surface.

### Issue 2: Shipment Document Action Boundary

Touched domains: orders fulfillment UI, orders document action hook, shipment document generation UX tests.

Workflow protected: shipment list -> shipment document action buttons -> shipment document action hook -> document generation hook/server function -> document history/order document cache policy -> generated file open or operator-safe toast.

Business value: shipment document generation is no longer hidden inside the shipment card component. Future changes to packing slips, dispatch notes, delivery notes, or blocked-state copy now have a smaller review surface.

Standards checked:

- extracted `useShipmentDocumentActions` into the orders hook layer to own document generation side effects and operator-safe error handling
- extracted `ShipmentDocumentActions` into the fulfillment component layer to own document buttons and blocked-state messages
- kept document generation hooks and their cache invalidation policy unchanged
- kept shipment card/list rendering in `ShipmentList`
- exported the new hook/component through existing domain indexes

Smells removed:

- `shipment-list.tsx` directly owned three document mutations, loading checks, success toasts, `window.open`, and error fallback copy
- document action fallback handling was colocated with unrelated shipment completion logic
- blocked-state copy for delivery/dispatch documents was visually outside the action responsibility

Deferred:

- `shipment-list.tsx` still owns shipment completion, tracking, item display, delivery confirmation, and card rendering
- `ship-order-dialog.tsx` and `fulfillment-dashboard.tsx` remain large and need separate workflow-responsibility extractions
- document action browser QA was skipped because this slice is covered by focused component tests and does not alter server behavior

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/eslint src/hooks/orders/use-shipment-document-actions.ts src/hooks/orders/index.ts src/components/domain/orders/fulfillment/shipment-document-actions.tsx src/components/domain/orders/fulfillment/index.ts src/components/domain/orders/fulfillment/shipment-list.tsx tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`
- `git diff --check -- docs/orders/MAINTAINER-SPRINT-5.md src/hooks/orders/use-shipment-document-actions.ts src/hooks/orders/index.ts src/components/domain/orders/fulfillment/shipment-document-actions.tsx src/components/domain/orders/fulfillment/index.ts src/components/domain/orders/fulfillment/shipment-list.tsx tests/unit/orders/shipment-list.test.tsx`

Goal adaptation: no standing goal change. This applies the goal's modularity standard to an operator-facing fulfillment UI by extracting a workflow responsibility without changing behavior.

Residual risk: the next Sprint 5 slice should continue reducing large-file risk, either by extracting pending shipment completion from `shipment-list.tsx` or by isolating the fulfillment import workflow from `fulfillment-dashboard.tsx`.

### Issue 3: Pending Shipment Completion Boundary

Touched domains: orders fulfillment UI, shipment mutation hook usage, shipment action error handling, shipment-list regression tests.

Workflow protected: shipment list -> pending shipment completion dialog -> mark-shipped mutation -> shipment inventory/cache contract from Sprint 4 -> operator-safe success or fallback error toast.

Business value: pending shipment drafts can still be completed from the shipment list, but the completion workflow is now isolated from shipment card rendering. This makes future changes to carrier/tracking/cost validation or completion copy smaller and safer.

Standards checked:

- extracted `usePendingShipmentCompletion` into the orders hook layer to own completion form state, validation, mark-shipped mutation, idempotency key creation, and success/error toasts
- extracted `PendingShipmentCompletionDialog` into the fulfillment component layer to own dialog fields, pending guards, and completion controls
- moved `getShipmentActionErrorMessage` into `shipment-action-errors.ts` so mark-shipped and document actions share an action-error contract without depending on each other
- kept `ShipmentList` responsible for list/card orchestration and opening the completion workflow
- kept mark-shipped server behavior and cache invalidation unchanged

Smells removed:

- `shipment-list.tsx` owned pending shipment form state, validation, mutation calls, idempotency key creation, pending-dialog guards, and dialog UI
- mark-shipped error fallback depended on a document-action hook helper
- shipment completion workflow was colocated with document actions, tracking history, item display, and delivery confirmation rendering

Deferred:

- `shipment-list.tsx` still owns tracking history, item display, delivery confirmation, and card layout
- `fulfillment-dashboard.tsx` still owns fulfillment import and dashboard presentation in one large file
- `ship-order-dialog.tsx` remains a large workflow-heavy dialog
- browser QA was skipped because this extraction is covered by focused component tests and does not alter server behavior

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/eslint src/hooks/orders/shipment-action-errors.ts src/hooks/orders/use-pending-shipment-completion.ts src/hooks/orders/use-shipment-document-actions.ts src/hooks/orders/index.ts src/components/domain/orders/fulfillment/pending-shipment-completion-dialog.tsx src/components/domain/orders/fulfillment/index.ts src/components/domain/orders/fulfillment/shipment-list.tsx tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`
- `git diff --check -- docs/orders/MAINTAINER-SPRINT-5.md src/hooks/orders/shipment-action-errors.ts src/hooks/orders/use-pending-shipment-completion.ts src/hooks/orders/use-shipment-document-actions.ts src/hooks/orders/index.ts src/components/domain/orders/fulfillment/pending-shipment-completion-dialog.tsx src/components/domain/orders/fulfillment/index.ts src/components/domain/orders/fulfillment/shipment-list.tsx tests/unit/orders/shipment-list.test.tsx`

Goal adaptation: no standing goal change. This continues the Sprint 5 modularity pass by turning another operator workflow inside `shipment-list.tsx` into an explicit hook/component boundary.

Residual risk: the next Sprint 5 slice should either extract shipment tracking/item display from `shipment-list.tsx` or move to the higher-risk `fulfillment-dashboard.tsx` import workflow.

### Issue 4: Shipment Card Detail Boundary

Touched domains: orders fulfillment UI, shipment-list regression tests.

Workflow protected: shipment list -> shipment card detail rendering -> tracking link, shipment dates, item serials, tracking history, and delivery confirmation details.

Business value: operators still see the same shipment detail context, but shipment read-only display is now isolated from fulfillment actions. Future changes to tracking or item/serial presentation have a smaller review surface and lower risk of touching mutation flows.

Standards checked:

- extracted `ShipmentCardDetails` into the fulfillment component layer for read-only shipment detail rendering
- kept shipment actions (`Mark Shipped`, document generation, confirm delivery) in the shipment-list orchestration layer
- kept server reads, hooks, and cache policy unchanged
- exported the detail component through the fulfillment index
- added regression coverage for tracking link behavior, serial display, tracking history, and delivery confirmation

Smells removed:

- `shipment-list.tsx` mixed read-only detail rendering with action entry points and mutation workflow dialogs
- tracking link behavior lived inline with mark-shipped and document action controls
- item/serial display and tracking history made the shipment-list card harder to scan and review

Deferred:

- `shipment-list.tsx` still owns the shipment card shell and action entry points
- `fulfillment-dashboard.tsx` still owns fulfillment import and dashboard presentation in one large file
- `ship-order-dialog.tsx` remains a large workflow-heavy dialog
- browser QA was skipped because this extraction is covered by focused component tests and does not alter server behavior

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/eslint src/components/domain/orders/fulfillment/shipment-card-details.tsx src/components/domain/orders/fulfillment/index.ts src/components/domain/orders/fulfillment/shipment-list.tsx tests/unit/orders/shipment-list.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/orders/order-client-contracts.test.ts tests/unit/orders/shipment-list.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`
- `git diff --check -- docs/orders/MAINTAINER-SPRINT-5.md src/components/domain/orders/fulfillment/shipment-card-details.tsx src/components/domain/orders/fulfillment/index.ts src/components/domain/orders/fulfillment/shipment-list.tsx tests/unit/orders/shipment-list.test.tsx`

Goal adaptation: no standing goal change. This continues the Sprint 5 modularity pass by separating read-only shipment detail presentation from action workflows.

Residual risk: `shipment-list.tsx` is now smaller, but the higher-leverage next Sprint 5 slice is likely the fulfillment import workflow inside `fulfillment-dashboard.tsx`, because that file still combines dashboard presentation, CSV parsing/import state, result download, and refresh behavior.

### Issue 5: Fulfillment Import Workflow Boundary

Touched domains: orders fulfillment UI, fulfillment import workflow hook, shipment import schema/client contract tests.

Workflow protected: fulfillment dashboard -> import shipment dialog -> CSV parse/preview/dry-run/import/result workflow -> import fulfillment mutation -> shipment import server function -> fulfillment, shipment, and order cache invalidation from the container.

Business value: shipment import remains available to operators, but the workflow is now isolated from dashboard presentation. Future changes to CSV parsing, carrier import validation, dry-run behavior, or result downloads can be reviewed without touching picking, shipping, shipment recovery, refresh, or summary metric rendering.

Standards checked:

- extracted `useFulfillmentImportWorkflow` into the orders hook layer for CSV parsing, preview state, valid-row selection, import mutation orchestration, result CSV generation, success toast, and reset behavior
- extracted `FulfillmentImportDialog` into the fulfillment component layer for upload/dropzone, preview, dry-run toggle, importing, complete, and result-table UI
- kept `fulfillment-dashboard.tsx` responsible for dashboard orchestration and opening the dialog
- kept import server behavior, tenant isolation, and cache invalidation policy unchanged
- added focused tests for parser/schema alignment, CSV result escaping, and mutation payload behavior

Smells removed:

- `fulfillment-dashboard.tsx` mixed CSV parsing, header mapping, import state, dry-run state, mutation handling, result CSV download, and dashboard rendering in one file
- import result CSV construction was untested
- the dashboard component carried file-input/drop handling and import-state reset behavior unrelated to queue presentation

Deferred:

- blank required CSV cells still surface the current schema type error wording because this slice preserved parser behavior
- `fulfillment-dashboard.tsx` still owns picking, shipping, recovery queue tables, refresh behavior, and summary metrics
- `ship-order-dialog.tsx` remains the largest fulfillment workflow dialog and is the next high-value modularity target
- browser QA was skipped because this extraction is covered by focused component/unit tests and does not alter server behavior

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/fulfillment-import-workflow.test.tsx`
- `./node_modules/.bin/eslint src/hooks/orders/use-fulfillment-import-workflow.ts src/hooks/orders/index.ts src/components/domain/orders/fulfillment/fulfillment-import-dialog.tsx src/components/domain/orders/fulfillment/fulfillment-dashboard.tsx src/components/domain/orders/fulfillment/index.ts tests/unit/orders/fulfillment-import-workflow.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`

Goal adaptation: no standing goal change. This applies the goal's route -> container/page -> hook -> server/schema -> query/cache lens by turning the dashboard import path into an explicit workflow boundary while preserving existing server and cache contracts.

Residual risk: Sprint 5 can either close here with fulfillment operator-safety and modularity gains, or continue into `ship-order-dialog.tsx`, which still combines shipment form state, stock/serial selection, side-effect orchestration, validation, and operator messages in one large workflow surface.

### Issue 6: Ship Order Item Selection Boundary

Touched domains: orders fulfillment UI, ship-order inventory/serial selection boundary, item-selection regression tests.

Workflow protected: ship order dialog -> order detail line items plus existing pending shipments -> availability and serialized selection boundary -> create shipment item payload -> existing shipment server validation and inventory/serial side effects.

Business value: operators still select the same picked items and serials before creating shipments, but the line-item selection logic is now isolated from carrier/address/amendment/mutation code. Future changes to pending-draft reservations or serialized battery lineage selection have a focused review surface.

Standards checked:

- extracted `ship-order-item-selection.ts` for availability-derived line selection, selected item summary, quantity changes, serial changes, select-all, and availability snapshots
- extracted `ShipOrderItemsTable` for item table rendering, unavailable badges, quantity controls, serial picker wiring, and server line-item error display
- kept `ShipOrderDialog` responsible for form orchestration, shipment creation, mark-shipped, address handling, shipping cost amendment, and confirmation step
- kept `shipment-availability.ts`, server functions, schemas, mutation hooks, and cache policy unchanged
- added focused tests for inventory reservation math at the item-selection boundary

Smells removed:

- `ship-order-dialog.tsx` directly mixed item selection reducers, pending reservation initialization, serialized selection bounds, select-all behavior, table rendering, and shipment mutation orchestration
- serialized line selection rules were not covered by focused tests at the ship-order boundary
- item table UI made the already-large dialog harder to review for mutation correctness

Deferred:

- `ship-order-dialog.tsx` still owns address selection, carrier fields, shipping cost amendment orchestration, mark-shipped fallback notices, and confirmation summary
- `shipment-availability.ts` remains under the fulfillment component directory even though it behaves like domain calculation logic
- browser QA was skipped because this is a focused extraction with unit coverage and no server behavior change

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/ship-order-item-selection.test.ts`
- `./node_modules/.bin/eslint src/components/domain/orders/fulfillment/ship-order-dialog.tsx src/components/domain/orders/fulfillment/ship-order-items-table.tsx src/components/domain/orders/fulfillment/ship-order-item-selection.ts src/components/domain/orders/fulfillment/index.ts tests/unit/orders/ship-order-item-selection.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`

Goal adaptation: no standing goal change. This continues the Sprint 5 modularity pass by making inventory-sensitive ship-order item selection explicit and tested while preserving the mutation/server/cache spine.

Residual risk: the next high-value ship-order slices are address handling and shipping cost amendment orchestration. The latter is business-critical because shipment creation can succeed while order-total amendment sync fails.

### Issue 7: Shipment Shipping Cost Amendment Boundary

Touched domains: orders fulfillment UI, order amendment mutation sequencing, ship-order recovery copy, amendment sync regression tests.

Workflow protected: ship order dialog -> shipment creation succeeds -> shipping cost amendment sync hook -> request/approve/apply amendment mutations -> existing amendment cache invalidation -> synced order totals or operator-safe manual-recovery notice.

Business value: operators still get a created shipment even if order shipping amount sync fails, but the risky partial-success recovery path is now explicit and tested. Unknown amendment failures no longer feed raw implementation messages into the operator toast.

Standards checked:

- extracted `useShipmentShippingCostAmendment` into the orders hook layer to own shipping-change amendment request/approve/apply sequencing and pending state
- extracted `syncShipmentShippingCostAmendment` and `buildShipmentShippingCostAmendmentRequest` as focused, testable amendment-contract helpers
- reused `normalizeOrderMutationError` and `getClientErrorMessage` for operator-safe amendment sync error copy
- kept amendment server functions and their existing query/cache invalidation policy unchanged
- kept `ShipOrderDialog` responsible for shipment creation flow and recovery notice display

Smells removed:

- `ship-order-dialog.tsx` directly owned three amendment mutations and their sequencing
- shipping cost amendment sync failure showed raw `err.message` in the operator-facing toast description
- request/approve/apply amendment sequencing was not covered by a focused ship-order test

Deferred:

- `ship-order-dialog.tsx` still owns address selection, carrier fields, mark-shipped fallback notices, and confirmation summary
- successful shipment toast copy remains in the dialog
- browser QA was skipped because this slice is covered by focused unit tests and does not alter server behavior

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/shipment-shipping-cost-amendment.test.ts`
- `./node_modules/.bin/eslint src/hooks/orders/use-shipment-shipping-cost-amendment.ts src/hooks/orders/index.ts src/components/domain/orders/fulfillment/ship-order-dialog.tsx tests/unit/orders/shipment-shipping-cost-amendment.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`

Goal adaptation: no standing goal change. This continues the Sprint 5 modularity pass by making a partial-success finance recovery path explicit while preserving the route/container/hook/server/cache spine.

Residual risk: the remaining high-value ship-order extraction is address handling, which still combines address option derivation, field mutation, collapsible UI state, one-off override behavior, and save-to-order behavior inside `ship-order-dialog.tsx`.

### Issue 8: Ship Order Address Boundary

Touched domains: orders fulfillment UI, ship-order address workflow, address payload/source tests.

Workflow protected: ship order dialog -> order/customer address options -> address workflow hook/component -> shipment address payload, addressSource, customerAddressId, save-to-order flag -> create shipment server validation and existing order shipping-address side effects.

Business value: operators still choose an order default, saved customer address, or one-off shipment destination, but the address workflow is now isolated from shipment creation, mark-shipped, shipping cost amendment, item selection, carrier details, and confirmation summary.

Standards checked:

- extracted `ship-order-address-workflow.ts` for address option derivation, any/incomplete address checks, shipment address payload construction, addressSource/customerAddressId resolution, selected-address state, collapsible state, and save-to-order state
- extracted `ShipOrderAddressSection` for address picker, address fields, incomplete-address alert, collapsible UI, and save-to-order checkbox
- kept `ShipOrderDialog` responsible for shipment creation flow and confirmation summary
- kept shipment create server behavior, address schema validation, and cache policy unchanged
- split workflow helpers from the `.tsx` component file to satisfy fast-refresh boundaries

Smells removed:

- `ship-order-dialog.tsx` directly owned address option derivation, address picker field mutation, collapsible address UI state, selected address state, and save-to-order state
- addressSource/customerAddressId/payload behavior was implicit in the create shipment callback
- address behavior lacked focused tests at the ship-order boundary

Deferred:

- `ship-order-dialog.tsx` still owns carrier fields, mark-shipped fallback notices, successful shipment toast copy, and confirmation summary
- the confirmation address summary remains in the dialog because it is part of the final review step
- browser QA was skipped because this is a focused extraction with unit coverage and no server behavior change

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/ship-order-address.test.ts`
- `./node_modules/.bin/eslint src/components/domain/orders/fulfillment/ship-order-dialog.tsx src/components/domain/orders/fulfillment/ship-order-address.tsx src/components/domain/orders/fulfillment/ship-order-address-workflow.ts src/components/domain/orders/fulfillment/index.ts tests/unit/orders/ship-order-address.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`

Goal adaptation: no standing goal change. This continues the Sprint 5 modularity pass by making the shipment address path explicit and tested while preserving create-shipment server/schema/cache behavior.

Residual risk: `ship-order-dialog.tsx` is much smaller but still owns carrier field rendering, successful shipment toast selection, mark-shipped fallback notices, and final confirmation summary. Sprint 5 can close here or continue with a final carrier/confirmation extraction.

### Issue 9: Ship Order Carrier and Confirmation Boundary

Touched domains: orders fulfillment UI, ship-order carrier workflow, ship-order confirmation review, carrier helper tests.

Workflow protected: ship order dialog -> item/address/carrier form state -> create shipment mutation -> optional mark-shipped mutation -> optional shipping-cost amendment -> final success, recovery notice, or operator-safe error state.

Business value: operators still select carriers, enter tracking/cost details, review shipment contents, and receive the same success/recovery feedback. The carrier and confirmation surfaces are now isolated from shipment mutation and recovery orchestration, making fulfillment changes easier to review and safer to extend.

Standards checked:

- extracted `ship-order-carrier-workflow.ts` for carrier value resolution, service lookup, label derivation, shipping-cost cents normalization, and success-toast copy
- extracted `ShipOrderCarrierSection` for carrier, service, tracking, shipping cost, notes, ship-now, and missing-carrier warning UI
- extracted `ShipOrderConfirmationStep` for final item/address/carrier/status/notes review
- kept `ShipOrderDialog` responsible for shipment creation, mark-shipped recovery, shipping-cost amendment orchestration, and cache-affecting mutation calls
- kept server/schema/database/query-key behavior unchanged

Smells removed:

- `ship-order-dialog.tsx` directly owned carrier constants, service lookup, custom carrier reset behavior, shipping-cost cents normalization, success-toast selection, and confirmation rendering
- final review UI was interleaved with mutation orchestration
- carrier helper behavior lacked focused tests

Deferred:

- `ship-order-dialog.tsx` still owns the create-shipment callback, mark-shipped fallback notice, and shipping-cost amendment recovery because those are the mutation spine for this workflow
- browser QA was skipped because this is a focused extraction with unit coverage and no server behavior change
- further extraction should be considered only if shipment mutation orchestration itself becomes hard to change

Verification:

- `./node_modules/.bin/vitest run tests/unit/orders/ship-order-carrier.test.ts`
- `./node_modules/.bin/eslint src/components/domain/orders/fulfillment/ship-order-dialog.tsx src/components/domain/orders/fulfillment/ship-order-carrier.tsx src/components/domain/orders/fulfillment/ship-order-carrier-workflow.ts src/components/domain/orders/fulfillment/ship-order-confirmation.tsx src/components/domain/orders/fulfillment/index.ts tests/unit/orders/ship-order-carrier.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/orders`

Goal adaptation: no standing goal change. This closes the remaining high-value ship-order UI extraction while preserving the route/container/hook/server/schema/cache spine.

Residual risk: the dialog still carries the mutation orchestration and recovery flow, but that is now an explicit boundary rather than incidental UI bloat. Any next order sprint should move to a new high-risk workflow instead of splitting the dialog further by default.

## Sprint Closeout Audit

Completion audit:

- Objective: make fulfillment operator workflows safer and easier to reason about across picking, shipment actions, shipment documents, pending shipment completion, import/recovery, ship-order item selection, shipping-cost amendment recovery, shipment address selection, carrier entry, and final confirmation review.
- Deliverables checked: issue ledger, issue closeout logs, focused tests, lint evidence, broad orders test evidence, typecheck evidence, and residual-risk notes.
- Evidence inspected: `src/components/domain/orders/fulfillment/shipment-list.tsx`, `src/components/domain/orders/fulfillment/pick-items-dialog.tsx`, `src/components/domain/orders/fulfillment/shipment-document-actions.tsx`, `src/hooks/orders/use-shipment-document-actions.ts`, `src/hooks/orders/use-pending-shipment-completion.ts`, `src/components/domain/orders/fulfillment/shipment-card-details.tsx`, `src/components/domain/orders/fulfillment/fulfillment-import-dialog.tsx`, `src/components/domain/orders/fulfillment/ship-order-dialog.tsx`, `src/components/domain/orders/fulfillment/ship-order-item-selection.ts`, `src/components/domain/orders/fulfillment/ship-order-address-workflow.ts`, `src/components/domain/orders/fulfillment/ship-order-carrier-workflow.ts`, `src/hooks/orders/use-shipment-shipping-cost-amendment.ts`, and the unit tests listed in each issue.

Touched domains: orders fulfillment UI, shipment action hooks, shipment document actions, pending shipment completion, shipment import workflow, ship-order item/serial selection, address selection, carrier/review UI, order amendment recovery, order/shipment mutation error normalization.

Workflow protected: fulfillment dashboard/order detail -> fulfillment action surface -> focused UI/hook boundary -> order or shipment mutation -> existing server/schema/database behavior -> centralized query/cache contracts -> operator-safe success, partial-success, blocked, retry, failed, empty, and review states.

Business value protected: operators should have clearer fulfillment actions under pressure: picking errors do not leak raw implementation text, shipment document generation is isolated, pending shipment drafts can be recovered safely, shipment cards are easier to review, imports have their own workflow boundary, ship-order inventory/serial/address/carrier decisions are explicit, and partial shipment/shipping-cost recovery states are honest.

Architecture standards checked:

- domain ownership: fulfillment-specific UI, helpers, and hooks now own their workflow responsibilities instead of accumulating inside `shipment-list.tsx`, `fulfillment-dashboard.tsx`, or `ship-order-dialog.tsx`
- route/container boundary: fulfillment route and order detail route behavior were not changed; this sprint worked below the route layer inside established fulfillment surfaces
- hook boundary: document actions, pending shipment completion, and shipping-cost amendment recovery moved into orders-owned hooks where they coordinate mutations and operator feedback
- server/schema/database boundary: shipment creation, picking, mark-shipped, document generation, import, amendment, address, and inventory side effects were intentionally preserved unless a slice explicitly noted otherwise
- query/cache contract: Sprint 4's fulfillment cache contracts were preserved; this sprint did not introduce literal query keys or new cache invalidation policy
- tenant isolation: no tenant-scoped server query or database write path was widened; changed surfaces continue to route through existing authenticated hooks/server functions
- inventory/finance integrity: serialized item selection, pending-draft reservation exclusion, and shipping-cost amendment partial-success recovery now have clearer boundaries and focused tests
- UI honesty: empty, reserved, failed, blocked, partial, pending, partial-success, and confirmation states are more explicit at the operator surface

Smells removed:

- high-traffic fulfillment actions leaked or reused inconsistent raw error text
- shipment document actions, pending completion, card details, and import behavior were mixed into large presentation components
- `ship-order-dialog.tsx` mixed item-selection reducers, address derivation, carrier constants, shipping-cost amendment sequencing, final review rendering, and mutation orchestration
- shipping-cost amendment failure could look like an ordinary shipment failure instead of an honest partial-success recovery state
- ship-order item, address, and carrier helper contracts lacked focused tests

Smells deferred:

- `ship-order-dialog.tsx` still owns create-shipment, optional mark-shipped, amendment recovery, and success/failure orchestration; this is now an explicit mutation spine rather than incidental UI bloat
- browser QA for the full fulfillment workflow was skipped because these slices were focused structural/operator-safety changes with unit coverage and unchanged server behavior
- database-backed integration coverage for full fulfillment workflows remains deferred to a future hardening sprint
- support/RMA/warranty closeout, remedy database integration, and cross-domain recovery visibility remain outside this orders fulfillment sprint

Verification:

- Issue 1 focused operator-safe error tests, lint, full orders suite, and typecheck recorded above
- Issue 2 focused shipment document tests, lint, full orders suite, and typecheck recorded above
- Issue 3 focused pending shipment completion tests, lint, full orders suite, and typecheck recorded above
- Issue 4 focused shipment card detail tests, lint, full orders suite, and typecheck recorded above
- Issue 5 focused fulfillment import tests, lint, full orders suite, and typecheck recorded above
- Issue 6 focused ship-order item selection tests, lint, full orders suite, and typecheck recorded above
- Issue 7 focused shipping-cost amendment tests, lint, full orders suite, and typecheck recorded above
- Issue 8 focused ship-order address tests, lint, full orders suite, and typecheck recorded above
- Issue 9 focused ship-order carrier tests, lint, full orders suite, and typecheck recorded above

Gates skipped: browser QA was skipped for each slice because the sprint was a domain-boundary, helper-contract, and operator-safety pass with unchanged server behavior. End-to-end fulfillment QA remains useful before a production release that changes business behavior.

Goal adaptations made or declined: no standing goal change. Sprint 5 confirms the goal's product-owner posture should keep treating fulfillment as an operator-safety and architecture-cleanliness domain where UI boundaries, recovery states, mutation contracts, and cache behavior must be explicit.

Residual risk: Sprint 5 closed the highest-value fulfillment UI modularity debt exposed after the Sprint 4 cache work, but it did not prove complete fulfillment behavior in a real browser or database-backed workflow. The next sprint should leave orders fulfillment and move to another high-risk business workflow, with support/RMA/warranty remedy closeout and database-backed recovery evidence as the strongest candidates.
