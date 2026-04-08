# Fulfillment + Post-Order Lifecycle Audit

**Status:** COMPLETE  
**Date:** 2026-03-30  
**Scope:** Core + Adjacent post-confirmation lifecycle across status orchestration, picking, shipment creation/finalization, delivery confirmation, amendments, payments/refunds, and returns/RMA  
**Related:** [Workflow Audit and Remediation Process](./WORKFLOW-AUDIT-REMEDIATION-PROCESS.md), [Workflow Baseline Audit](./WORKFLOW-BASELINE-AUDIT-2026-03-30.md), [SCHEMA-TRACE](../SCHEMA-TRACE.md), [STANDARDS](../STANDARDS.md)

> Historical note: this audit is a point-in-time snapshot from March 30, 2026. Since then, the order detail workflow has been tightened so draft orders expose `Confirm Order`, delivery confirmation recomputes order fulfillment state, and document quick-actions have been expanded on order detail. Treat the findings below as historical context, not current behavior guarantees.

## Summary

This audit reviewed the post-confirmation lifecycle as separate operational lanes so unlike workflows do not get blended together:

1. Status orchestration
2. Warehouse picking
3. Shipment creation + shipment finalization
4. Delivery confirmation + shipment tracking
5. Amendments
6. Payments + refunds
7. Returns / RMA
8. Cross-cutting trust behaviors such as invalidation, staged failure, and recovery clarity

The dominant pattern behind current operator frustration is not “one broken screen.” It is **lifecycle fragmentation**:

- the order model, shipment model, and UI recovery states can drift apart
- several important flows are multi-stage but still presented as single actions
- some server capabilities exist but are not wired into the main order-detail workflow
- dashboard visibility does not fully match the failure/recovery states the detail flows can create
- test coverage is strongest at contract seams and weakest at the operational workflow seams where users actually get stuck

## Audit Method

### Rubric

Scores use `1-5`, where:

- `5` = strong / low-friction / low-risk
- `3` = acceptable but noticeably fragile
- `1` = high-friction / high-risk / likely source of user frustration

Rubric dimensions:

- completion success
- validation friction
- recovery clarity
- data integrity risk
- concurrency/idempotency risk
- operator effort to recover

### Verification Performed

- Code audit of `Route/Container -> Hook -> Server Fn -> DB/side effects` for each lane
- Existing targeted tests run successfully:
  - `tests/unit/orders/order-write-contracts.test.ts`
  - `tests/unit/orders/order-status-contract.test.ts`
  - `tests/unit/orders/order-shipments-facade.test.ts`
  - `tests/unit/orders/order-client-contracts.test.ts`
  - `tests/unit/orders/order-amendments-wire-types.test.ts`

### Environment Notes

- This audit is code-backed and test-backed.
- It did not include an authenticated browser walkthrough.
- Mobile/device picking was reviewed by tracing the code path rather than running the handheld flow live.

## Journey Inventory By Lane

### 1. Status Orchestration Lane

**Entry points:** [`src/components/domain/orders/containers/order-detail-container.tsx`](../src/components/domain/orders/containers/order-detail-container.tsx), [`src/hooks/orders/use-order-detail-actions.ts`](../src/hooks/orders/use-order-detail-actions.ts), [`src/components/domain/orders/containers/use-order-detail-route-intents.ts`](../src/components/domain/orders/containers/use-order-detail-route-intents.ts), [`src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx`](../src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx), [`src/server/functions/orders/order-status.ts`](../src/server/functions/orders/order-status.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 2 | Core status progression exists, but delivery completion can leave the order lifecycle out of sync. |
| Validation friction | 4 | Status guards are explicit and generally predictable. |
| Recovery clarity | 2 | Recovery is clear for blocked transitions, but less clear when shipment truth and order truth diverge. |
| Data integrity risk | 2 | Shipment delivery can update line-item delivered quantities without advancing the order record itself. |
| Concurrency/idempotency risk | 4 | Status updates themselves use guarded transitions and aggregate version updates. |
| Operator effort to recover | 2 | Operators may need manual status correction after delivery. |

**Golden path**

`draft -> confirmed -> picking -> picked -> shipped -> delivered`

**Happy path**

`detail status update` -> success toast -> follow-up action opens next workflow such as picking or shipping

**Unhappy path**

Shipment is confirmed as delivered -> shipment row becomes `delivered` and line-item `qtyDelivered` increments -> order remains `shipped` because delivery confirmation does not update `orders.status`

**Evidence**

- Status transitions and artifact side effects are driven through [`src/server/functions/orders/order-status.ts`](../src/server/functions/orders/order-status.ts), [`src/server/functions/orders/order-status-policy.ts`](../src/server/functions/orders/order-status-policy.ts), and [`src/server/functions/orders/order-status-effects.ts`](../src/server/functions/orders/order-status-effects.ts).
- Shipment finalization explicitly moves the order to `partially_shipped` or `shipped` in [`src/server/functions/orders/order-shipments-finalization.ts`](../src/server/functions/orders/order-shipments-finalization.ts).
- Delivery confirmation updates the shipment and increments `qtyDelivered`, but does not update `orders.status` or `deliveredDate` in [`src/server/functions/orders/order-shipments-status.ts`](../src/server/functions/orders/order-shipments-status.ts).
- Order detail progression, alerts, and next actions all depend on `order.status` in [`src/components/domain/orders/views/order-detail-view.tsx`](../src/components/domain/orders/views/order-detail-view.tsx) and [`src/hooks/orders/use-order-detail-data-alerts.ts`](../src/hooks/orders/use-order-detail-data-alerts.ts).

**Assessment**

- The biggest status-lane issue is lifecycle split-brain after delivery.
- The order lifecycle is authoritative in the UI, but delivery completion currently updates shipment truth more completely than order truth.

### 2. Picking Lane

**Entry points:** [`src/components/domain/orders/tabs/order-fulfillment-tab.tsx`](../src/components/domain/orders/tabs/order-fulfillment-tab.tsx), [`src/components/domain/orders/fulfillment/pick-items-dialog.tsx`](../src/components/domain/orders/fulfillment/pick-items-dialog.tsx), [`src/hooks/orders/use-picking.ts`](../src/hooks/orders/use-picking.ts), [`src/server/functions/orders/order-picking.ts`](../src/server/functions/orders/order-picking.ts), [`src/routes/_authenticated/mobile/-picking-page.tsx`](../src/routes/_authenticated/mobile/-picking-page.tsx)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 3 | Desktop picking is real and supports multi-round pick/unpick, but mobile is a distinct branch with weaker context. |
| Validation friction | 3 | Serial and quantity guards are necessary, but feedback is mostly toast-level. |
| Recovery clarity | 3 | Pick/unpick is recoverable, though mobile offline recovery is less explicit. |
| Data integrity risk | 4 | Server-side quantity and serial validation is strong. |
| Concurrency/idempotency risk | 3 | Server validation is strong, but offline/mobile and post-shipment corrections need more explicit operator guidance. |
| Operator effort to recover | 3 | Recovery is possible, but not always obvious across desktop vs mobile branches. |

**Golden path**

Confirmed order -> open pick dialog or device flow -> pick remaining quantities -> serialized selections validated -> order becomes `picked`

**Happy path**

Start a partial pick -> reopen dialog -> continue picking later -> complete pick -> hand off to shipping

**Unhappy path**

Mobile/device picking opens a separate workflow with placeholder location context and offline queueing -> user may complete picking without clear location-aware recovery when sync conflicts happen later

**Evidence**

- Desktop pick/unpick flow is staged in [`src/components/domain/orders/fulfillment/pick-items-dialog.tsx`](../src/components/domain/orders/fulfillment/pick-items-dialog.tsx) and backed by [`src/hooks/orders/use-picking.ts`](../src/hooks/orders/use-picking.ts).
- Server validation enforces no over-pick, serial uniqueness, and active-allocation checks in [`src/server/functions/orders/order-picking.ts`](../src/server/functions/orders/order-picking.ts).
- The server still permits pick/unpick in `shipped` status as part of its allowed pre-delivery correction set in [`src/server/functions/orders/order-picking.ts`](../src/server/functions/orders/order-picking.ts).
- Mobile picking is a separate route with offline queue support in [`src/routes/_authenticated/mobile/-picking-page.tsx`](../src/routes/_authenticated/mobile/-picking-page.tsx).
- The mobile mapping currently supplies placeholder location values (`""` / `"—"`) instead of real warehouse context in [`src/routes/_authenticated/mobile/-picking-page.tsx`](../src/routes/_authenticated/mobile/-picking-page.tsx).

**Assessment**

- Picking is one of the healthier lanes technically.
- The main smell is not missing mutation capability; it is a split desktop/mobile operator model with thinner recovery clarity on the mobile side.

### 3. Shipment Creation + Finalization Lane

**Entry points:** [`src/components/domain/orders/fulfillment/ship-order-dialog.tsx`](../src/components/domain/orders/fulfillment/ship-order-dialog.tsx), [`src/hooks/orders/use-shipments.ts`](../src/hooks/orders/use-shipments.ts), [`src/server/functions/orders/order-shipments.ts`](../src/server/functions/orders/order-shipments.ts), [`src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx`](../src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 2 | Shipment success is multi-stage, and stage 2/3 failures leave awkward recovery states. |
| Validation friction | 3 | Quantity and serial validation is sound, but address and shipment-stage messaging can still bounce users around. |
| Recovery clarity | 2 | The dialog recognizes partial success, but recovery is scattered between detail and dashboard surfaces. |
| Data integrity risk | 2 | Draft shipment creation has no server idempotency, and partial success can produce real persisted state before failure. |
| Concurrency/idempotency risk | 2 | `markShipped` is idempotent, `createShipment` is not. |
| Operator effort to recover | 2 | Operators may need to infer whether they are recovering a pending shipment, a shipping-cost mismatch, or a full success. |

**Golden path**

Picked order -> create shipment -> optionally mark shipped immediately -> order becomes `shipped` or `partially_shipped`

**Happy path**

Create shipment as pending -> later mark shipped from the order detail fulfillment surface

**Unhappy path**

`createShipment` succeeds -> `markShipped` fails or shipping-cost amendment fails -> shipment now exists, but the operator must infer which side effects landed and where to recover them

**Evidence**

- The UI stages `createShipment`, then `markShipped`, then optionally `request -> approve -> apply` a shipping-cost amendment in [`src/components/domain/orders/fulfillment/ship-order-dialog.tsx`](../src/components/domain/orders/fulfillment/ship-order-dialog.tsx).
- The dialog already carries workflow notices like “shipment created, shipping step incomplete” and “shipment created, shipping cost amendment failed” in [`src/components/domain/orders/fulfillment/ship-order-dialog.tsx`](../src/components/domain/orders/fulfillment/ship-order-dialog.tsx).
- `createShipment` validates shipment items but has no idempotency key in [`src/lib/schemas/orders/shipments.ts`](../src/lib/schemas/orders/shipments.ts) and [`src/server/functions/orders/order-shipments-draft.ts`](../src/server/functions/orders/order-shipments-draft.ts).
- `markShipped` is idempotent and updates order shipment totals plus order status in [`src/server/functions/orders/order-shipments-finalization.ts`](../src/server/functions/orders/order-shipments-finalization.ts).
- The fulfillment dashboard only fetches `picked` orders plus `in_transit` shipments, not pending shipments created during a partial-success recovery scenario, in [`src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx`](../src/components/domain/orders/fulfillment/fulfillment-dashboard-container.tsx).

**Assessment**

- This is the clearest staged-failure lane in the audit.
- The flow is functionally rich, but the recovery model is weaker than the mutation model.

### 4. Delivery Confirmation + Tracking Lane

**Entry points:** [`src/components/domain/orders/fulfillment/shipment-list.tsx`](../src/components/domain/orders/fulfillment/shipment-list.tsx), [`src/components/domain/orders/fulfillment/confirm-delivery-dialog.tsx`](../src/components/domain/orders/fulfillment/confirm-delivery-dialog.tsx), [`src/hooks/orders/use-shipments.ts`](../src/hooks/orders/use-shipments.ts), [`src/server/functions/orders/order-shipments-status.ts`](../src/server/functions/orders/order-shipments-status.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 2 | Shipment delivery can complete while the order lifecycle still appears incomplete. |
| Validation friction | 4 | Signature/photo are optional and the dialog is straightforward. |
| Recovery clarity | 2 | Upload and delivery states are separated, but order-level recovery is unclear after success. |
| Data integrity risk | 2 | Shipment state and line-item delivered quantities update, but order state does not. |
| Concurrency/idempotency risk | 4 | Confirm delivery itself is idempotent. |
| Operator effort to recover | 2 | Operators may need manual reconciliation after “successful” delivery confirmation. |

**Golden path**

Shipped or out-for-delivery shipment -> confirm delivery with proof -> shipment becomes `delivered` -> order becomes `delivered`

**Happy path**

Upload delivery photo -> confirm -> shipment list refreshes -> order fulfillment view reflects completion

**Unhappy path**

Confirm delivery succeeds -> shipment is `delivered` and `qtyDelivered` increments -> order still renders as `shipped`, keeps shipped-stage UI, and does not naturally close the lifecycle

**Evidence**

- Shipment list exposes confirm-delivery actions for `in_transit` and `out_for_delivery` shipments in [`src/components/domain/orders/fulfillment/shipment-list.tsx`](../src/components/domain/orders/fulfillment/shipment-list.tsx).
- The confirm-delivery dialog performs photo upload separately before submit in [`src/components/domain/orders/fulfillment/confirm-delivery-dialog.tsx`](../src/components/domain/orders/fulfillment/confirm-delivery-dialog.tsx).
- The confirm-delivery hook invalidates shipment and order-list caches, but not the order detail query directly, in [`src/hooks/orders/use-shipments.ts`](../src/hooks/orders/use-shipments.ts).
- Delivery confirmation updates shipment status and line-item `qtyDelivered`, but does not update `orders.status` in [`src/server/functions/orders/order-shipments-status.ts`](../src/server/functions/orders/order-shipments-status.ts).

**Assessment**

- Delivery confirmation is the most important broken-lifecycle finding in this audit.
- The shipment lane says “done,” but the order lane can still say “not done.”

### 5. Amendment Lane

**Entry points:** [`src/components/domain/orders/amendments/amendment-request-dialog-container.tsx`](../src/components/domain/orders/amendments/amendment-request-dialog-container.tsx), [`src/components/domain/orders/amendments/amendment-review-dialog.tsx`](../src/components/domain/orders/amendments/amendment-review-dialog.tsx), [`src/components/domain/orders/amendments/amendment-list.tsx`](../src/components/domain/orders/amendments/amendment-list.tsx), [`src/server/functions/orders/order-amendments.ts`](../src/server/functions/orders/order-amendments.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 3 | Requesting and applying amendments exists, but review/apply routing is inconsistent across surfaces. |
| Validation friction | 3 | Business rules are meaningful, especially around picked/shipped quantities. |
| Recovery clarity | 2 | One staged request UI exists, but review/apply is still partly opaque and not fully wired into detail. |
| Data integrity risk | 4 | Version and picked/shipped guards are strong. |
| Concurrency/idempotency risk | 3 | Version drift remains a real apply failure mode. |
| Operator effort to recover | 2 | Users can get stranded between requested, approved, and applied states. |

**Golden path**

Open amendment request -> request and apply, or request-only -> order and totals update consistently

**Happy path**

Use request-only when approval is needed later -> reviewer can review and then apply from a clear operational surface

**Unhappy path**

Requested amendments appear in the order fulfillment tab, but the detail container does not wire a review action into that list, even though a review dialog exists

**Evidence**

- The request dialog container models staged submission states such as `requesting`, `approving`, `applying`, and failed stage states in [`src/components/domain/orders/amendments/amendment-request-dialog-container.tsx`](../src/components/domain/orders/amendments/amendment-request-dialog-container.tsx).
- The review dialog still auto-approves and then auto-applies, and on apply failure it only toasts “Approved, but failed to apply amendment” in [`src/components/domain/orders/amendments/amendment-review-dialog.tsx`](../src/components/domain/orders/amendments/amendment-review-dialog.tsx).
- The fulfillment tab accepts `onReviewAmendment`, but the order detail container only passes `onApplyAmendment` and not review into `fulfillmentActions` in [`src/components/domain/orders/tabs/order-fulfillment-tab.tsx`](../src/components/domain/orders/tabs/order-fulfillment-tab.tsx) and [`src/components/domain/orders/containers/order-detail-container.tsx`](../src/components/domain/orders/containers/order-detail-container.tsx).

**Assessment**

- Amendment capability exists.
- The main issue is workflow reachability and inconsistent recovery between “request” and “review/apply” surfaces.

### 6. Payments + Refunds Lane

**Entry points:** [`src/components/domain/orders/dialogs/record-payment-dialog.tsx`](../src/components/domain/orders/dialogs/record-payment-dialog.tsx), [`src/components/domain/orders/tabs/order-payments-tab.tsx`](../src/components/domain/orders/tabs/order-payments-tab.tsx), [`src/hooks/orders/use-order-payments.ts`](../src/hooks/orders/use-order-payments.ts), [`src/server/functions/orders/order-payments.ts`](../src/server/functions/orders/order-payments.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 2 | Payment recording is wired; refunding is server-supported but not reachable from the main order detail flow. |
| Validation friction | 4 | Payment amount and method rules are clear. |
| Recovery clarity | 3 | Payment creation is straightforward, but refund recovery is hidden by missing UI wiring. |
| Data integrity risk | 4 | Summary recomputation after payment/refund is strong. |
| Concurrency/idempotency risk | 4 | Payment operations are not the main concurrency pain point in this lifecycle. |
| Operator effort to recover | 3 | Operators can see payment history, but not execute all available lifecycle actions from the same surface. |

**Golden path**

Record partial or full payment -> payment summary updates -> balance due and payment status refresh

**Happy path**

Record payment from header or payments tab -> order detail refreshes to show updated balance

**Unhappy path**

Operator sees a refund button pattern in the payments tab API, but the main order detail container never passes the refund callback, so the refund action never appears there

**Evidence**

- Payment recording is fully wired from order detail in [`src/components/domain/orders/containers/order-detail-container.tsx`](../src/components/domain/orders/containers/order-detail-container.tsx) and [`src/components/domain/orders/dialogs/record-payment-dialog.tsx`](../src/components/domain/orders/dialogs/record-payment-dialog.tsx).
- The payments tab renders refund controls only when `onRefundPayment` is supplied in [`src/components/domain/orders/tabs/order-payments-tab.tsx`](../src/components/domain/orders/tabs/order-payments-tab.tsx).
- The order detail container supplies `onRecordPayment` but omits `onRefundPayment` in [`src/components/domain/orders/containers/order-detail-container.tsx`](../src/components/domain/orders/containers/order-detail-container.tsx).
- Refund server and hook support already exist in [`src/server/functions/orders/order-payments.ts`](../src/server/functions/orders/order-payments.ts) and [`src/hooks/orders/use-order-payments.ts`](../src/hooks/orders/use-order-payments.ts).

**Assessment**

- This is a clean example of “capability exists, but the workflow is not actually reachable from the canonical UI.”

### 7. Returns / RMA Lane

**Entry points:** [`src/components/domain/support/rma/rma-create-dialog.tsx`](../src/components/domain/support/rma/rma-create-dialog.tsx), [`src/server/functions/orders/rma.ts`](../src/server/functions/orders/rma.ts), issue-linked entry via [`src/components/domain/orders/containers/order-detail-container.tsx`](../src/components/domain/orders/containers/order-detail-container.tsx)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 2 | The backend lifecycle is real, but generic order-detail entry is missing. |
| Validation friction | 3 | Serialized-item return validation is strict but appropriate. |
| Recovery clarity | 3 | RMA creation errors are mostly clear, but main-order entry is hidden behind other surfaces. |
| Data integrity risk | 4 | Serial validation against shipped serials and inventory side effects are strong. |
| Concurrency/idempotency risk | 4 | Not the primary concern in this audit. |
| Operator effort to recover | 2 | Operators need to enter through issue flow or separate support/RMA surfaces rather than the core order detail lifecycle. |

**Golden path**

Delivered or shipped order -> create RMA from order context -> review / receive / process -> refund or restock as needed

**Happy path**

Create RMA from an issue-linked order -> land in RMA detail after creation

**Unhappy path**

Generic order detail does not expose a direct RMA action, even though the container already builds eligible shipped line items and can open the RMA dialog when `fromIssueId` is present

**Evidence**

- The order detail container only exposes `RmaCreateDialog` when the user arrived from issue flow (`fromIssueId`) in [`src/components/domain/orders/containers/order-detail-container.tsx`](../src/components/domain/orders/containers/order-detail-container.tsx).
- The RMA server path is fully capable of validating returned items, serialized shipped serials, and downstream processing in [`src/server/functions/orders/rma.ts`](../src/server/functions/orders/rma.ts).
- Dedicated RMA screens exist outside order detail, but the generic order lifecycle surface does not expose that branch directly.

**Assessment**

- The main issue here is missing canonical entry, not missing backend support.

## Ranked Issue Matrix

| Rank | Severity | Issue | Type | Why It Matters |
|------|----------|-------|------|----------------|
| 1 | P1 | Delivery confirmation does not advance the order to `delivered` | Broken capability | Creates lifecycle split-brain between shipment truth and order truth, undermining completion tracking and downstream actions. |
| 2 | P1 | Shipment flow can partially succeed, and pending-shipment recovery is not visible in the fulfillment dashboard | Opaque recovery | Operators can end up with real persisted shipments plus missing side effects and no obvious ops queue to reconcile them. |
| 3 | P1 | Refunds are implemented server-side but not reachable from the main order-detail payments workflow | Missing capability | Post-order financial recovery is incomplete from the canonical surface. |
| 4 | P1 | Requested amendments are visible from order detail, but review is not wired into that same surface | Missing capability | Review/apply lifecycle exists in code but is not reachable where users expect it. |
| 5 | P2 | `createShipment` lacks server-side idempotency | Data integrity risk | Double submit or retry can create duplicate pending shipments. |
| 6 | P2 | Generic order detail lacks direct RMA entry | Missing capability | Returns are part of the post-order lifecycle, but the main order surface hides the branch. |
| 7 | P2 | Fulfillment dashboard only tracks `in_transit` shipments, not pending/out-for-delivery/failed recovery states | Operational blind spot | Dashboard truth does not fully reflect the failure modes created by shipment flows. |
| 8 | P3 | Mobile picking has weak warehouse-context visibility and offline conflict transparency | Smell / trust debt | The device flow is real but less explainable and less auditable than desktop picking. |

## Top 5 Blockers

### 1. Delivery confirmation does not close the order lifecycle

`confirmDelivery` updates shipments and delivered quantities, but not `orders.status`. The result is a successful delivery action that still leaves the order looking “not done.”

### 2. Shipment recovery is fragmented across stages and surfaces

The shipment dialog knows about partial success, but the dashboard does not expose every recovery state it can create. The most dangerous case is “shipment exists, but shipping side effects are incomplete.”

### 3. Refunds are a hidden capability

The server and hooks support refunds. The payments tab is already designed to render refund actions. The main order detail container simply does not wire that action through.

### 4. Amendment review path is not fully reachable from order detail

Requested amendments appear in the order fulfillment tab, but the review action is not supplied there, even though a review dialog exists. This creates a “you can see it, but not finish it here” workflow.

### 5. Shipment draft creation is not replay-safe

`markShipped` and `confirmDelivery` are idempotent. `createShipment` is not. That inconsistency makes the earliest stage of the shipment lane the riskiest one for accidental duplication.

## Prioritized Remediation Backlog

### Fix Now

- Make delivery confirmation advance the order lifecycle to `delivered` when delivered quantities satisfy the order.
- Add a single recovery model for staged shipment failures, including explicit operator messaging for:
  - shipment created, not shipped
  - shipment shipped, shipping-cost amendment failed
- Wire refund actions into the canonical order-detail payments workflow.
- Wire amendment review into the order-detail fulfillment/amendment surface, or deliberately route users to the review surface with clear CTA text.
- Add server-side idempotency to shipment draft creation.

### Next

- Expose pending and failed shipment recovery states in the fulfillment dashboard, not just `in_transit`.
- Add a direct RMA entry point from generic order detail for shipped/delivered orders.
- Normalize delivery-confirmation invalidation so non-dialog callers do not rely on container-local `refetch` to stay correct.
- Tighten mobile picking recovery visibility:
  - clearer offline queued state
  - clearer sync failure state
  - location-aware context where possible

### Later

- Unify amendment request and amendment review recovery language so they present the same staged mental model.
- Consider a single lifecycle timeline on order detail that explicitly shows:
  - shipment created
  - shipment shipped
  - shipment delivered
  - amendment requested / approved / applied
  - payment recorded / refunded
  - RMA created / received / processed
- Add lifecycle-specific telemetry for:
  - staged partial success
  - duplicate submit attempts
  - stale-detail recovery after mutation

## Coverage Gaps and Missing Instrumentation

### Tests Missing By Lane

- Picking workflow tests, especially multi-round pick/unpick and mobile/offline sync cases
- Shipment workflow tests for:
  - partial shipment
  - create-success / mark-shipped-fail
  - create-success / shipping-amendment-fail
  - duplicate shipment creation protection
- Delivery confirmation tests proving order and shipment lifecycle stay aligned
- Payment/refund workflow tests from the order-detail UI surface
- RMA workflow tests across create / approve / receive / process
- Amendment workflow tests that cover the review surface and staged failure recovery

### Instrumentation Gaps

- No explicit instrumentation for shipment stage partial success
- No explicit instrumentation for detail/dashboard truth mismatches
- No explicit instrumentation for hidden-but-supported actions such as refund or review dead ends
- No lane-specific measurement of retry frequency or operator recovery effort

## Final Assessment

The repo already contains most of the domain capability needed for a strong fulfillment and post-order lifecycle. The main problem is **workflow cohesion**, not raw backend absence.

The most important remediation direction is to make lifecycle truth consistent across:

- order status
- shipment status
- payment/refund state
- amendment stage
- return/RMA entry and follow-through

Until those are aligned, operators can complete real work and still be left wondering whether the system agrees that the work is complete.
