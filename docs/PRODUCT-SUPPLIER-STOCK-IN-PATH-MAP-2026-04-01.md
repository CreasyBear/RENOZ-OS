# Product / Supplier / Stock-In Path Map

**Date:** 2026-04-01  
**Method:** code-backed path tracing using `investigate` + architecture/design review lenses  
**Purpose:** create a wrecking-ball-safe map of product create, supplier create, and stock-in paths before any workflow consolidation

## Summary

This map confirms three things:

1. **Supplier create is low-sprawl** and already behaves like a mostly canonical flow.
2. **Product create is not broadly duplicated**, but its success behavior is split across surfaces and hook ownership.
3. **Stock-in is the real sprawl zone**, and it contains both:
   - multiple valid business narratives
   - dead or orphaned paths that should not shape future architecture

Most importantly, **PO receiving and manual receiving are distinct workflows** and must remain separate in the rationalisation phase.

## Reachable Path Inventory

### Product Create

| Path ID | User intent | Launch surface | UI surface opened | Hook / mutation | Server function | Permission gate | Side effects | Read-after-write | Success destination | Current recovery UX | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `PROD-CREATE-01` | Create a normal product | Product page actions → `/products/new` | Full-page `ProductForm` | `useCreateProduct` | `createProduct` | `PERMISSIONS.product.create` | inserts product row | invalidates product lists only | route navigates to `/products`; hook also offers toast action to view detail | toast only | **Canonical workflow** |
| `PROD-CREATE-02` | Create a bundle product | no reachable caller found in current repo search; component exported only | `BundleCreator` dialog/workflow | `useCreateProduct` then `useSetBundleComponents` | `createProduct` then bundle mutation | product create permission plus bundle write path | inserts bundle product + component relations | generic product list invalidation + bundle-specific follow-up | internal step success inside dialog | inline submit error + toast | **Broken / needs decision** |

### Supplier Create

| Path ID | User intent | Launch surface | UI surface opened | Hook / mutation | Server function | Permission gate | Side effects | Read-after-write | Success destination | Current recovery UX | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `SUP-CREATE-01` | Create a supplier | Supplier directory/page actions → `/suppliers/create` | `SupplierCreateContainer` + `SupplierForm` | `useCreateSupplier` | `createSupplier` | `PERMISSIONS.suppliers.create` | inserts supplier row, generates supplier code, logs activity | invalidates supplier list | navigates to supplier detail | inline form validation + error toast | **Canonical workflow** |

### Stock-In

| Path ID | User intent | Launch surface | UI surface opened | Hook / mutation | Server function | Permission gate | Side effects | Read-after-write | Success destination | Current recovery UX | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `STOCK-01` | Manual/ad-hoc receive | Inventory nav / quick actions → `/inventory/receiving` | `ReceivingPage` + `ReceivingForm` | `useReceiveInventory` | `receiveInventory` | `PERMISSIONS.inventory.receive` | inventory row create/update, movements, cost layers | optimistic inventory patch + invalidate inventory queries | stays on receiving page | form-level error + toast | **Canonical workflow** |
| `STOCK-02` | Manual/ad-hoc receive in warehouse | Mobile nav → receiving | mobile receiving page | `useReceiveInventory` | `receiveInventory` | `PERMISSIONS.inventory.receive` | same underlying inventory receive side effects | no shared desktop queue; mobile queue/offline sync | stays on mobile receive screen | offline queue warnings + toast | **Canonical workflow** |
| `STOCK-03` | Receive goods for one PO | PO detail | `ReceivingDialogWrapper` → `GoodsReceiptDialog` | `useReceiveGoods` | `receiveGoods` | `PERMISSIONS.inventory.receive` | receipt header, receipt items, PO item qty/status updates, inventory movements, cost layers, product cost updates | broad invalidation across PO, receipts, inventory, products | stays in PO context; parent may switch tabs | dialog validation + mutation errors | **Canonical workflow** |
| `STOCK-04` | Receive goods for one PO | PO list row action | same `ReceivingDialogWrapper` / `GoodsReceiptDialog` | `useReceiveGoods` | `receiveGoods` | `PERMISSIONS.inventory.receive` | same as `STOCK-03` | same as `STOCK-03` | stays in PO list context | dialog validation + mutation errors | **Launcher into canonical workflow** |
| `STOCK-05` | Receive goods for one PO | Procurement receiving dashboard | same `ReceivingDialogWrapper` / `GoodsReceiptDialog` | `useReceiveGoods` | `receiveGoods` | `PERMISSIONS.inventory.receive` | same as `STOCK-03` | same as `STOCK-03` | stays in receiving dashboard context | dialog validation + mutation errors | **Launcher into canonical workflow** |
| `STOCK-06` | Receive goods for multiple POs | PO list bulk actions | `BulkReceivingDialogContainer` | `useBulkReceiveGoods` | `bulkReceiveGoods` delegating to `receiveGoods` | `PERMISSIONS.inventory.receive` via delegated single-PO receives | per-PO receipts and related PO/inventory side effects | invalidates PO list + inventory lists; bulk dialog manages failed reselection | stays in list context | partial-failure toast + reselection + dialog loading | **True alternative workflow** |
| `STOCK-07` | Receive goods for multiple POs | Procurement receiving dashboard | same `BulkReceivingDialogContainer` | `useBulkReceiveGoods` | `bulkReceiveGoods` | `PERMISSIONS.inventory.receive` via delegated single-PO receives | same as `STOCK-06` | same as `STOCK-06` | stays in dashboard context | partial-failure toast + reselection + dialog loading | **Launcher into alternative workflow** |
| `STOCK-08` | Add stock from product detail | Product inventory tab `Add Stock` | `StockAdjustment` dialog with `adjustmentType = add` | `useReceiveStock` | `receiveStock` → `receiveInventory` | inherits `receiveInventory` permission path | inventory receive side effects only; no PO receipt semantics | invalidates product inventory + product movement queries only | stays on product detail | inline error + toast | **Broken path needing repair before classification** |
| `STOCK-09` | Correct stock from product detail | Product inventory tab `Adjust Stock` | same `StockAdjustment` dialog with subtract/set | `useAdjustStock` | `adjustInventory` / adjust path | `PERMISSIONS.inventory.adjust` | inventory adjustment movements, no receipt semantics | invalidates product inventory + product movement queries | stays on product detail | inline error + toast | **Canonical workflow** |
| `STOCK-10` | Record receipt through legacy dialog | no reachable caller found in current repo search | `ReceiptCreationDialog` | `useReceiveGoods` | `receiveGoods` | `PERMISSIONS.inventory.receive` | PO receipt side effects | same as PO receive if ever called | none confirmed | inline + toast | **Legacy / dead path** |
| `STOCK-11` | Bulk receive stock for multiple products | no reachable caller found in current repo search | no surfaced UI found | no hook/caller found | `bulkReceiveStock` | bare `withAuth()` only, no explicit inventory receive permission | batched inventory receive updates and movements | no UI read-after-write observed because no caller | none confirmed | none confirmed | **Legacy / dead path** |

## Surface → Workflow Mapping

### Product Create

| Surface | Workflow target | Notes |
|---|---|---|
| `/products/new` | `PROD-CREATE-01` | real canonical route |
| `BundleCreator` | `PROD-CREATE-02` | secondary create narrative; not currently proven reachable |

### Supplier Create

| Surface | Workflow target | Notes |
|---|---|---|
| `/suppliers/create` | `SUP-CREATE-01` | canonical route |

### Stock-In

| Surface | Workflow target | Notes |
|---|---|---|
| `/inventory/receiving` | `STOCK-01` | manual desktop receiving |
| mobile receiving page | `STOCK-02` | mobile warehouse receiving |
| PO detail receive action | `STOCK-03` | single-PO goods receipt |
| PO list receive action | `STOCK-04` → `STOCK-03` | launcher |
| procurement dashboard receive action | `STOCK-05` → `STOCK-03` | launcher |
| PO list bulk receive | `STOCK-06` | multi-PO operational flow |
| procurement dashboard bulk receive | `STOCK-07` → `STOCK-06` | launcher |
| product-detail `Add Stock` | `STOCK-08` | currently separate UX over manual receive backend |
| product-detail `Adjust Stock` | `STOCK-09` | distinct correction workflow |
| legacy receipt dialog export | `STOCK-10` | no active surface found |
| orphaned bulk receive API | `STOCK-11` | no active surface found |

## Clash Matrix

### 1. Product-detail Add Stock vs Manual Receiving

| Dimension | Product-detail Add Stock | Manual Receiving | Clash |
|---|---|---|---|
| Business event | ad-hoc stock receive, but framed as product-admin shortcut | ad-hoc/manual stock receive | same business event |
| User wording | “Add Stock” inside admin inventory tab | “Receive Inventory” | wording diverges |
| Server path | `receiveStock` → `receiveInventory` | `receiveInventory` | thin wrapper vs canonical |
| Data captured | location, qty, notes, optional cost | product, location, qty, unit cost, serial/batch details | product detail path is narrower and more admin-oriented |
| Risk if merged naively | may lose convenient product context | may lose richer receiving affordances if staying inline | should share workflow, not remain separate |

**Conclusion:** safe to converge at the workflow level, but the product-detail surface needs product preselection and a smooth return path.

### 2. PO Receive vs Manual Receiving

| Dimension | PO Receive | Manual Receiving | Clash |
|---|---|---|---|
| Business event | receiving supplier goods against a purchase order | manual/ad-hoc stock-in | fundamentally different |
| Records created | receipt header/items, PO quantity updates, PO status changes, inventory/cost updates | inventory/cost updates only | PO data would be lost |
| Metadata | carrier, tracking, delivery ref, landed cost allocation | serial/batch/cost/manual notes | materially different |
| Success context | stay in PO/procurement workflow | stay in inventory workflow | different operator context |

**Conclusion:** must stay separate workflows. They may share language discipline and some UI patterns, but not collapse into one canonical receive flow.

### 3. Bulk PO Receive vs Single-PO Receive

| Dimension | Bulk PO Receive | Single-PO Receive | Clash |
|---|---|---|---|
| Business event | same domain event, many POs | same domain event, one PO | same family |
| UI need | queue selection, multi-PO serial resolution, partial failure handling | detailed receipt review for one PO | operational scale differs |
| Server path | `bulkReceiveGoods` delegating to `receiveGoods` | `receiveGoods` | aligned enough |

**Conclusion:** should remain separate surfaces but under one PO-receiving family. Safe to share language and recovery model.

### 4. Stock Adjustment vs Stock Receipt

| Dimension | Stock Adjustment | Stock Receipt | Clash |
|---|---|---|---|
| Business event | correction/admin inventory change | new stock entering inventory | different |
| Audit meaning | correction reason | receive/arrival provenance | different |
| Permissions | adjust | receive | different |

**Conclusion:** must stay separate. Current mixed product-detail dialog is misleading.

### 5. Bundle Create vs Normal Product Create

| Dimension | Bundle Create | Normal Product Create | Clash |
|---|---|---|---|
| Business event | create a composite/bundle product and define components | create a standard product row | different enough |
| Steps | create product + set components | create product only | bundle has extra workflow |
| UX expectation | stay in bundle setup flow | normal product success flow | different |

**Conclusion:** should not inherit generic product-create success assumptions. Either make it a deliberate separate workflow or hide it until live.

## Preserve / Reroute / Hide / Delete / Repair Sheet

| Path ID | Decision | Target workflow if rerouted | Reason |
|---|---|---|---|
| `PROD-CREATE-01` | **Preserve** | — | canonical product create route |
| `PROD-CREATE-02` | **Repair first** | later decide preserve or hide | reachable status unclear; should not influence generic create UX until intentionally live |
| `SUP-CREATE-01` | **Preserve** | — | canonical supplier create route |
| `STOCK-01` | **Preserve** | — | canonical manual receiving |
| `STOCK-02` | **Preserve** | — | canonical mobile receiving |
| `STOCK-03` | **Preserve** | — | canonical single-PO goods receipt |
| `STOCK-04` | **Reroute** | `STOCK-03` | launcher only |
| `STOCK-05` | **Reroute** | `STOCK-03` | launcher only |
| `STOCK-06` | **Preserve** | — | legitimate bulk PO workflow |
| `STOCK-07` | **Reroute** | `STOCK-06` | launcher only |
| `STOCK-08` | **Repair first** | likely `STOCK-01` with product preselected | same business event as manual receiving, but current UX and refresh model differ |
| `STOCK-09` | **Preserve** | — | distinct correction workflow |
| `STOCK-10` | **Delete** | replaced by `STOCK-03` | dead legacy duplicate |
| `STOCK-11` | **Hide** or **Delete** | none unless revived intentionally | no caller found and weaker permission posture |

## Canonical Workflow Recommendations

### Preserve as canonical

- `/products/new`
- `/suppliers/create`
- `/inventory/receiving`
- mobile receiving page
- `ReceivingDialogWrapper` / `GoodsReceiptDialog`
- bulk PO receiving dialog
- product-detail stock adjustment

### Treat as launchers, not independent workflows

- PO list receive
- procurement receiving single receive
- procurement receiving bulk receive

### Treat as unresolved until repaired

- product-detail `Add Stock`
- bundle creation flow

### Treat as dead or non-authoritative

- `ReceiptCreationDialog`
- `bulkReceiveStock`

## Missing Coverage / Verification Gaps

### Reachability gaps

- No browser-backed verification yet for whether bundle creation is intentionally surfaced somewhere outside current repo search.
- No interaction-backed proof yet for whether old receipt exports are completely unreachable in navigation.

### Test gaps

- No focused test that product-create success destination is consistent across surfaces.
- No parity test comparing product-detail add stock vs manual receiving.
- No regression test guarding against dead receipt dialog resurfacing.
- No contract test asserting orphaned `bulkReceiveStock` stays hidden or is permission-hardened if revived.
- No end-to-end test proving PO list / PO detail / procurement dashboard all resolve to the same single-PO receiving workflow.

## Safe Conclusions Before Rationalisation

1. **Do not merge PO receiving into manual receiving.**
2. **Do not remove product-detail Add Stock yet** until the reroute target and carried state are specified.
3. **Do not let bundle creation shape generic product-create UX** until its intended reachability is explicit.
4. **It is safe to plan deletion of `ReceiptCreationDialog`** unless a hidden caller is discovered during browser dogfooding.
5. **It is safe to plan retirement of `bulkReceiveStock`** unless product-batch receiving is intentionally revived as a real supported narrative.

## Next Phase Input

This map is now sufficient to define the rationalisation phase in five buckets:

1. preserve canonical workflows
2. reroute launchers
3. repair unresolved paths
4. delete dead paths
5. normalize wording, success destinations, and recovery models
