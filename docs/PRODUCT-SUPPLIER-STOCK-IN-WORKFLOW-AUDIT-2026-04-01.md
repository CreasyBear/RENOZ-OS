# Product / Supplier / Stock-In Workflow Audit

**Date:** 2026-04-01  
**Method:** Code-trace investigation using route → container/form → hook → server function → cache/landing behavior  
**Goal:** Identify canonical workflows, dead or duplicate entry points, and the root causes behind broken or confusing product creation, supplier creation, and stock-in UX.

## Executive Summary

This is not one bug. It is a **workflow sprawl** problem.

- **Supplier create** is mostly healthy and should be treated as the baseline pattern.
- **Product create** has fewer entry points than it feels like, but the success behavior is inconsistent enough to make it feel random.
- **Stock in** is the real problem area. The app currently exposes multiple “receive” stories that use different hooks, different server paths, different cache refresh behavior, and different UX language.

### Root cause

The product does not consistently distinguish between these narratives:

1. creating a product record
2. creating a supplier record
3. receiving goods against a purchase order
4. manually receiving inventory without a PO
5. adjusting stock for admin/correction reasons
6. warehouse/mobile scanning receive flows

Instead, several of these are presented as interchangeable “create” or “receive” actions even when they are backed by different mutations and different operational semantics.

## Capability Lanes

### 1. Product creation lane

#### Entry points found

| Entry point | Reachable from | Mutation path | Current behavior | Recommendation |
|---|---|---|---|---|
| `/products/new` | Product list and product routes | `ProductForm` → `useCreateProduct` → `createProduct` | Canonical full-page create flow; route navigates back to `/products` after success while hook also shows a `View Product` toast action | **Keep as canonical**, but normalize success destination |
| `BundleCreator` | Exported component only; no caller found in current repo search | bundle form → `useCreateProduct` → `createProduct`, then `useSetBundleComponents` | Secondary product-create narrative exists in code, but no current reachable UI was found | **Broken / needs decision** before keeping; likely hide or intentionally surface |

#### Product create findings

1. The app effectively has **one reachable canonical product create route**, not many.
2. The main problem is **split success semantics**:
   - [`/products/new`](../src/routes/_authenticated/products/new.tsx) always navigates to the list
   - [`useCreateProduct`](../src/hooks/products/use-products.ts) always shows a `View Product` toast action
   - [`BundleCreator`](../src/components/domain/products/bundles/bundle-creator.tsx) reuses that same generic create hook even though bundle creation is a different narrative
3. This means success handling is currently owned by both the **page** and the **shared mutation hook**, which makes behavior feel inconsistent by entry point.

#### Canonical recommendation

- Keep `/products/new` as the canonical manual product creation flow.
- Move success behavior out of the generic hook and make it caller-directed.
- Decide whether bundle creation is:
  - a real distinct narrative worth surfacing intentionally, or
  - dead/unlaunched code that should be hidden until ready.

## 2. Supplier creation lane

#### Entry points found

| Entry point | Reachable from | Mutation path | Current behavior | Recommendation |
|---|---|---|---|---|
| `/suppliers/create` | Supplier directory/page actions | `SupplierCreateContainer` → `useCreateSupplier` → `createSupplier` | Straight single-route flow with server-generated supplier code and detail-page navigation after success | **Keep as canonical** |

#### Supplier create findings

1. Supplier creation is currently the **cleanest of the three lanes**.
2. I did **not** find meaningful secondary embedded supplier-create flows in PO/product workflows during this pass.
3. The main debt is modest and internal:
   - form schema vs RPC schema drift risk
   - narrow invalidation without detail priming
4. From a workflow perspective, supplier create is **not currently the sprawl problem**.

#### Canonical recommendation

- Keep `/suppliers/create` as the sole canonical supplier-create flow.
- Use it as the baseline pattern for success behavior and navigation consistency in the other lanes.

## 3. Stock-In lane

This is the real workflow-sprawl zone.

### Entry-point matrix

| Narrative | Entry point | Reachable from | Mutation path | Current behavior | Recommendation |
|---|---|---|---|---|---|
| Manual/ad-hoc receive | `/inventory/receiving` | Inventory nav and quick actions | `ReceivingForm` → `useReceiveInventory` → `receiveInventory` | Canonical desktop manual receive with optimistic cache patching | **Keep as canonical** for manual stock-in |
| Manual/ad-hoc receive (mobile) | mobile receiving page | Mobile nav | mobile form/queue → `useReceiveInventory` → `receiveInventory` | Scan-first receive flow with offline queue | **Keep as canonical** for warehouse/mobile |
| Supplier receipt, single PO | PO detail / PO list / procurement receiving queue | PO detail, PO list, procurement dashboard | `ReceivingDialogWrapper` → `GoodsReceiptDialog` → `useReceiveGoods` → `receiveGoods` | Strongest single-PO receipt flow; shared wrapper already reused in multiple places | **Keep as canonical** for PO receipt |
| Supplier receipt, multi-PO | PO list bulk receive / procurement dashboard bulk receive | PO list, receiving dashboard | `BulkReceivingDialogContainer` → `useBulkReceiveGoods` → `bulkReceiveGoods` → `receiveGoods` | Distinct multi-PO ops narrative; legitimate but secondary | **Keep** for bulk ops, but align language/recovery with single-PO receipt |
| Product-detail “Add Stock” | Product inventory tab | Product detail | `StockAdjustment` → `useReceiveStock` → `receiveStock` → `receiveInventory` | Inline convenience flow mixed with true stock adjustment; uses narrower refresh path and generic admin wording | **Merge/reroute** rather than keep as a separate receive narrative |
| Product-detail “Adjust Stock” | Product inventory tab | Product detail | `StockAdjustment` → `useAdjustStock` → `adjustStock` | Legit admin correction flow, but currently bundled into same dialog as “Add Stock” receive semantics | **Keep**, but separate from receive story |
| Legacy goods receipt dialog | No caller found | Not meaningfully reachable in current search | `ReceiptCreationDialog` → `useReceiveGoods` → `receiveGoods` | Old alternative receipt UX still exported, but apparently unused | **Retire / delete** |
| Bulk product receive API | No caller found | No caller found | `bulkReceiveStock` | Orphaned server path; weaker permission gate than canonical receive | **Retire or collapse** into shared worker |

### Stock-in findings

#### A. There are at least four distinct stock-in stories

1. **PO receipt**  
   Goods arriving against a supplier purchase order.

2. **Manual ad-hoc receive**  
   Found stock, one-off vendor supply, or explicit manual receive not tied to a PO.

3. **Admin stock correction**  
   Add/subtract/set from product detail as an inventory-management convenience.

4. **Warehouse/mobile receive**  
   Scan-first operational receiving with offline tolerance.

The product currently blurs these together under “receive” or “add stock,” which makes the UI feel inconsistent even when the server logic is valid.

#### B. Single-PO receipt is already mostly canonical

The strongest PO receipt path is:

- [`ReceivingDialogWrapper`](../src/components/domain/purchase-orders/receive/receiving-dialog-wrapper.tsx)
- [`GoodsReceiptDialog`](../src/components/domain/purchase-orders/receive/goods-receipt-dialog.tsx)
- [`useReceiveGoods`](../src/hooks/suppliers/use-goods-receipt.ts)
- [`receiveGoods`](../src/server/functions/suppliers/receive-goods.ts)

This same dialog wrapper is already launched from:

- PO detail
- PO list
- procurement receiving route

That is good. It means the app already has one shared single-PO receipt flow.

#### C. Bulk receiving is legitimate, but operationally separate

Bulk PO receive is not just duplication. It is a real separate narrative for operations:

- selection happens on queue/list surfaces
- the dialog preloads multiple POs and serial requirements
- the server delegates through `bulkReceiveGoods`

This should survive, but it should be treated as **bulk operations built on top of canonical receive rules**, not a separate user story with different language.

#### D. Product-detail “Add Stock” is the biggest semantic mismatch

The product inventory tab currently offers both:

- `Adjust Stock`
- `Add Stock`

but both open the same [`StockAdjustment`](../src/components/domain/products/inventory/stock-adjustment.tsx) dialog.

Inside that dialog:

- `add` uses [`useReceiveStock`](../src/hooks/products/use-product-inventory.ts) → [`receiveStock`](../src/server/functions/products/product-inventory.ts) → [`receiveInventory`](../src/server/functions/inventory/inventory.ts)
- `subtract` and `set` use inventory adjustment logic instead

That means one admin dialog is currently mixing:

- a **real stock receive**
- a **stock correction**
- a **stock set**

This is the clearest “same button, different story” UX smell in the lane.

#### E. Dead-weight paths exist today

Two strong examples:

1. [`ReceiptCreationDialog`](../src/components/domain/receipts/receipt-creation-dialog.tsx)  
   Exported but no meaningful caller found in current repo search.

2. [`bulkReceiveStock`](../src/server/functions/products/product-inventory.ts)  
   No caller found in current repo search, and it uses bare `withAuth()` instead of explicit `PERMISSIONS.inventory.receive`.

These are exactly the kinds of orphaned paths that make it hard to know which workflow is real.

#### F. Cache and recovery semantics are inconsistent across equivalent actions

| Path | Cache behavior | UX implication |
|---|---|---|
| `useReceiveInventory` | optimistic patch + rollback + inventory-specific invalidation | feels fast, but only for inventory surfaces |
| `useReceiveGoods` | broad invalidation of PO, receipts, inventory, products | better operational read-after-write truth |
| `useBulkReceiveGoods` | broad-ish invalidation plus toasts | bulk path has weaker inline recovery than single PO |
| `useReceiveStock` | narrower product inventory + movement invalidation | product-detail add-stock can drift from wider inventory/ops surfaces |

This inconsistency contributes directly to “it worked here but not there” frustration.

## Keep / Merge / Remove Decisions

### Keep as canonical

- Product create: `/products/new`
- Supplier create: `/suppliers/create`
- Manual stock-in desktop: `/inventory/receiving`
- Manual stock-in mobile: mobile receiving page
- Single PO receive: `ReceivingDialogWrapper` + `GoodsReceiptDialog`

### Keep, but as launcher/secondary surface

- PO list “Receive” action
- Procurement receiving dashboard
- Bulk PO receive dialog

These should remain, but they should be clearly understood as **launch points into canonical receipt workflows**, not unique receipt semantics.

### Merge into canonical workflows

- Product-detail `Add Stock`
  - should stop pretending to be its own stock-in narrative
  - recommended direction: product detail launches the canonical manual receiving flow for “add stock,” while keeping a separate true adjustment flow for subtract/set corrections

### Retire / hide / delete

- `ReceiptCreationDialog`
- orphaned `bulkReceiveStock` path unless a real product-level batch receive story is intentionally reintroduced

### Broken / needs decision before keeping

- `BundleCreator`
  - current code exists
  - current caller/reachability was not found in this pass
  - if the feature is not intentionally live, it should not continue shaping generic product-create UX

## Ranked Issues

### P1

1. **Stock-in has no single canonical mental model**  
   The same “receive/add stock” wording currently covers PO receipt, ad-hoc receipt, mobile warehouse receive, and admin stock correction.

2. **Product-detail Add Stock is semantically wrong**  
   It routes a real receive operation through an admin adjustment dialog, which mixes operational receiving with correction-style stock editing.

3. **Orphaned receive paths still exist in code**  
   `ReceiptCreationDialog` and `bulkReceiveStock` make it harder to know which stock-in flow is the one the product actually supports.

### P2

4. **Product create success is split between hook and caller**  
   `/products/new` navigates to list while `useCreateProduct` advertises “View Product,” and bundle creation reuses that same shared behavior.

5. **Stock-in cache/read-after-write behavior differs by entry point**  
   Equivalent receive actions update different query surfaces, which can make success look inconsistent.

6. **Bulk PO receive recovery is weaker than single-PO receive**  
   The single receive path has a stronger canonical dialog; bulk still depends more on toast-level feedback and list reselection behavior.

### P3

7. **Supplier create is not the main problem, but its baseline pattern is not being reused elsewhere**  
   It is a useful control case for how straightforward create flows should behave.

## Canonical Workflow Recommendations

### Product create

- Canonical: `/products/new`
- Success behavior should be explicit and caller-owned
- Bundle creation should either:
  - become a clearly separate “create bundle” experience with its own success semantics, or
  - stay hidden until intentionally launched

### Supplier create

- Canonical: `/suppliers/create`
- No current need for secondary embedded supplier-create flows

### Stock-in

- **Supplier receipt:** canonical single-PO receive dialog (`ReceivingDialogWrapper` / `GoodsReceiptDialog`)
- **Bulk supplier receipt:** keep bulk PO receive as an ops variant built on the same rules
- **Manual/ad-hoc receive:** canonical `/inventory/receiving`
- **Mobile receive:** canonical mobile warehouse flow
- **Admin stock correction:** separate adjustment flow
- **Product-detail add stock:** launcher into canonical receiving, not an independent receive implementation

## Remediation Backlog

### 1. Canonical workflow decisions

1. Declare one canonical path for each narrative:
   - product create
   - supplier create
   - manual stock-in
   - PO receipt
   - admin stock adjustment

2. Decide whether bundle creation is live and supported, or hidden/incomplete.

### 2. Remove or hide dead/legacy entry points

1. Remove or hide `ReceiptCreationDialog`
2. Remove or collapse `bulkReceiveStock` unless a real caller is restored
3. Audit exports and menus so dead flows stop advertising capabilities the product no longer uses

### 3. Reroute duplicate entry points into canonical flows

1. Make product-detail `Add Stock` launch canonical manual receiving instead of its own receive semantics
2. Keep product-detail `Adjust Stock` only for true adjustment/correction actions
3. Ensure PO list and procurement receiving remain launchers into the same single-PO receipt dialog

### 4. Fix broken canonical paths

1. Normalize product-create success behavior
   - no more hook-level success action fighting page-level navigation
2. Align stock-in invalidation/read-after-write behavior so equivalent receive actions refresh the same important surfaces
3. Decide whether bulk PO receive needs a stronger persistent results surface instead of toast-heavy recovery

### 5. Add interaction and contract coverage

1. Product create success-routing tests
2. Reachability tests for canonical create/receive entry points
3. Parity tests between stock-in entry points
4. Auth contract test for orphaned or equivalent receive APIs
5. Regression guard ensuring retired dialogs/apis are not still wired into UI surfaces

## Coverage Gaps

- No focused interaction coverage for product create success destination and toast action conflicts
- No parity suite comparing `receiveInventory`, `receiveGoods`, product-detail add stock, and mobile receive
- No guard test proving `ReceiptCreationDialog` is intentionally dead or removed
- No guard test proving `bulkReceiveStock` is either intentionally unsupported or properly permission-gated and called
- Limited UX-level tests around bulk receiving recovery and result visibility

## Verification Notes

This audit was based on code tracing of current reachable surfaces and direct caller searches. I did not run browser dogfooding in this pass, so the reachability claims are code-backed rather than interaction-recorded. The strongest conclusions are still reliable because:

- `ReceiptCreationDialog` had no meaningful caller in repo search
- `bulkReceiveStock` had no caller in repo search
- supplier create showed one clear route/container path
- product create showed one reachable route plus one secondary bundle path
- stock-in clearly split across multiple hooks, dialogs, and server functions

## Bottom Line

The app does **not** have a supplier-create problem. It has a **product-create consistency problem** and a **stock-in workflow ownership problem**.

The cleanest next move is:

1. keep supplier create as-is
2. make `/products/new` the explicit canonical product-create path
3. split **receiving** from **adjusting**
4. retire dead receipt paths
5. reroute product-detail stock add into canonical receiving instead of letting it remain a hidden parallel receive flow
