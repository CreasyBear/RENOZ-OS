# Inventory Maintainer Sprint 83

This sprint follows Sprint 82's receipt-history tenant-scope hardening. The target is the bulk receive hook cache contract: after receiving multiple purchase orders, operator-facing purchase-order, receiving, inventory, and product stock surfaces should not remain stale.

Status: Closed after Issue 1.

## Business Value

Bulk receiving is a warehouse acceleration path. If it leaves PO details, receipt history, receiving metrics, inventory balances, or product stock stale, operators lose trust in the workflow and may retry or manually reconcile work that already happened.

## Workflow Spine

purchase-order list bulk action
-> bulk receive hook
-> bulk receive server function
-> receive-goods mutation side effects
-> selected/affected PO cache refresh
-> receiving metrics cache refresh
-> inventory/product stock cache refresh
-> honest operator state after partial success.

## Architecture Constraints

- Keep this sprint to the hook-side query/cache contract.
- Preserve server mutation behavior, validation, serialization checks, toast behavior, and progress callback behavior.
- Prefer explicit centralized query-key invalidation over broad ad hoc refetching.
- Treat partial success as a first-class operator state: failed selected rows should refresh alongside processed rows.

## Issue Ledger

### 1. Bulk Receive Refreshed Too Narrow A Cache Surface

Problem:

- `useBulkReceiveGoods` invalidated the purchase-order list, pending approvals, and only `inventory.lists()`.
- The mutation can change PO detail, PO item pending quantities, PO receipt history, receiving summary metrics, inventory balances, and product stock/cost surfaces.
- Partial success could leave failed selected rows stale even when the server returned affected ids for processed work.

Workflow protected:

bulk receive selection -> server mutation -> PO detail/items/receipts -> receiving metrics -> inventory/product stock state.

Implemented slice:

- Expanded bulk receive invalidation to include purchase-order status counts, receiving summary, per-PO detail, per-PO items, and per-PO receipts.
- Refreshes both selected purchase-order ids and server-returned affected ids, deduped, so partial success still clears stale selected rows.
- Replaced narrow `inventory.lists()` invalidation with the same broad inventory/product side-effect surfaces used by single PO receiving.
- Added focused hook coverage for partial-success invalidation and toast/progress behavior.

Out of scope:

- Server-side `bulkReceiveGoods` transaction semantics.
- Receipt pagination or receipt detail route design.
- Browser QA of the receiving dashboard.
- Narrow product-id or inventory-id specific invalidation, because the current server envelope does not return those ids.

Closeout:

- Touched domains: supplier bulk receive hook, supplier hook test, inventory sprint evidence.
- Workflow protected: purchase-order bulk receive -> server mutation -> selected/affected PO refresh -> receiving metrics refresh -> inventory/product stock refresh -> partial-failure operator feedback.
- Business value protected: warehouse operators should see fresh PO, receipt, receiving, inventory, and product state after bulk receiving instead of stale lists or details.
- Architecture standards checked: route/page and server function boundaries are unchanged; hook owns mutation/cache policy; all cache keys come from `queryKeys`; no schema/database/query ownership changes.
- Tenant isolation and data integrity checked: no database reads or writes changed; receive-goods tenant isolation, transactional stock effects, finance integrity, and serialized lineage behavior remain server-owned and covered by existing supplier/inventory suites.
- Query/cache contract checked: bulk receive now mirrors single receive's inventory/product side-effect invalidation and adds bulk-specific PO detail/items/receipts plus receiving metric refresh.
- Smells removed: bulk receive under-invalidated mutation side-effect surfaces and treated list refresh as enough evidence of a successful warehouse workflow.
- Smells deferred: narrower product/inventory invalidation waits on richer server mutation metadata; browser QA remains useful for dashboard perception; server bulk transaction design remains separate.
- Gates run: focused hook/consumer tests (`3` files, `7` tests); focused ESLint; inventory + supplier + purchase-order unit suites (`103` files, `319` tests); TypeScript.
- Gates skipped: browser QA, because this was a hook cache-contract change with no visual/UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers cache contracts, honest UI states, operator-safe partial failures, meaningful tests, and evidence-based closeout.
- Residual risk: broad `inventory.all` and `products.all` invalidation is correct but not minimal; future server metadata could allow tighter invalidation without risking stale warehouse state.
