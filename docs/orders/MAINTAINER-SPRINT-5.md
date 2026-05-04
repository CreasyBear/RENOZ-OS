# Maintainer Sprint 5: Fulfillment Operator Safety and UI Maintainability

Sprint 5 follows the Sprint 4 fulfillment cache closeout into the operator-facing workflow surfaces: picking, shipment completion, shipment documents, and recovery actions.

Status: Issues 1 and 2 implemented.

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
- Tests: `tests/unit/orders/order-client-contracts.test.ts`, `tests/unit/orders/shipment-list.test.tsx`

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
