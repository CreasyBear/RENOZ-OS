# Inventory Maintainer Sprint 130: PO Receive Purchasable Product Preflight

## Status

Closed in commit-ready state.

## Issue 1: Stale PO Receiving Could Bypass Purchasable Product Policy

### Problem

Purchase-order creation and direct inventory PO creation now require linked products to be active and purchasable. Single and bulk PO receiving still only required linked products to be tenant-scoped and non-deleted before creating receipt rows, inventory movements, cost layers, valuation changes, and serialized lineage.

That meant old or stale POs could still create stock for products that are inactive, discontinued, or not purchasable.

### Workflow Spine

Purchase-order receiving / bulk receiving
-> supplier receiving server function
-> purchasable product preflight
-> receipt item validation
-> inventory balance, movement, cost layers, valuation recompute, product cost update
-> optional serialized lineage upsert/event.

### Touched Domains

- Supplier single PO receiving.
- Supplier bulk PO receiving.
- Shared supplier receive product requirement helper.
- Supplier receiving serialization contract tests.
- Inventory/procurement sprint evidence.

### Business Value Protected

Receiving is where procurement becomes warehouse truth and financial value. It should not revive inactive, discontinued, or non-purchasable products into stock through stale purchase orders.

### Scope Constraints

- Do not rewrite receiving transaction flow.
- Do not change serial-number validation semantics for valid products.
- Do not change receipt persistence, cost allocation, movements, cost layers, valuation recomputation, product cost update, hooks, query keys, or cache invalidation.
- Do not repair existing stale purchase orders in this slice.

### Changes

- Tightened single PO receiving product requirement query to require:
  - same organization
  - `status = 'active'`
  - `isActive = true`
  - `isPurchasable = true`
  - `deletedAt IS NULL`
- Applied the same predicate to bulk receiving preflight.
- Updated shared receive error copy to name inactive/non-purchasable product state.
- Updated the focused supplier receiving contract test.

### Standards Checked

- Domain ownership: supplier receiving product validation stays inside supplier receiving functions and helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server preflight hardened; UI and cache behavior unchanged.
- Tenant isolation/data integrity: linked product IDs remain tenant-scoped and now require active purchasable state before stock-in.
- Transactional inventory/finance integrity: receiving cannot create inventory, movement, cost-layer, valuation, or product-cost changes for inactive/non-purchasable linked products.
- Serialized lineage continuity: serialized lineage writes are unchanged for valid products and blocked before write for invalid product state.
- UI states/error handling: invalid linked products return operator-safe transition-blocked copy.
- Reviewability: two predicate updates, one helper message update, one focused test update, one closeout note.

### Smells Removed

- Stale purchase orders could bypass the stricter PO creation product policy during receiving.
- Product-state requirements differed between PO write and PO receive workflows.

### Deferred

- Existing stale POs need a dedicated repair/re-link or cancellation workflow.
- Bulk receiving row UI could surface product-state blocker copy more prominently; current row failure normalization remains unchanged.
- Browser QA was not selected because this is a server receiving preflight slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/suppliers/receive-goods-serialization.test.ts`.
- Passed: focused ESLint on touched supplier receiving files and test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves lineage continuity by blocking invalid product state before serialized receipt writes.

### Residual Risk

Low for new receiving attempts. Existing stale purchase orders are now blocked at receive time but not automatically repaired.
