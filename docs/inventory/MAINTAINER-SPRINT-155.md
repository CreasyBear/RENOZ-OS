# Inventory Maintainer Sprint 155: Browser Bulk Status Workflow

## Status

Closed in commit-ready state.

## Issue 1: Inventory Selection Had No Safe Status Workflow

### Problem

The inventory browser exposed row selection, but the page did not wire a meaningful bulk operation into the selected state. Meanwhile, `bulkUpdateStatus` existed server-side and had been hardened, but it was not connected through the route -> page -> hook -> cache contract.

For RENOZ Energy warehouse work, selecting inventory rows should lead to an operator-safe action with evidence. It should not imply that allocation or sale state can be manually simulated from the browser.

### Workflow Spine

Inventory browser row selection
-> guarded bulk status dialog
-> operator selects a disposition status and enters an audit reason
-> page container calls `useBulkUpdateInventoryStatus`
-> hook calls `bulkUpdateStatus`
-> server authenticates adjust permission
-> server rejects workflow-owned statuses (`allocated`, `sold`)
-> server locks organization-scoped inventory rows
-> server rejects allocated rows until allocations are released
-> server updates disposition status, movement evidence, serialized lineage, and product activity in one transaction
-> hook invalidates inventory, detail, movement, product, availability, valuation, WMS, and serialized caches.

### Touched Domains

- Inventory browser UI.
- Inventory browser page/container.
- Inventory stock mutation hook and cache policy.
- Inventory bulk status server function.
- Serialized lineage cache continuity.
- Inventory unit and contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators can now quarantine, mark returned, mark damaged, or restore available stock from selected browser rows with a required reason. Allocation and sale state remain owned by allocation and fulfillment workflows, preventing a misleading manual shortcut around order/inventory integrity.

### Scope Constraints

- Do not reintroduce old serialized gates.
- Do not turn browser bulk status into allocation or fulfillment control.
- Do not optimistically patch status rows; refetch after the transaction.
- Do not redesign the full inventory browser or transfer/delete/export workflows.

### Changes

- Added `useBulkUpdateInventoryStatus` and exported it from inventory hooks.
- Extended the shared stock mutation cache helper so mutation results with `items[]` invalidate exact inventory details, product stock summaries, and serialized caches when serials are present.
- Wired the inventory browser page to the bulk status mutation.
- Added a bulk status dialog to `InventoryBrowser`.
- Made row selection expose actions for one or more selected rows instead of only two or more.
- Restricted browser bulk status options to `available`, `quarantined`, `damaged`, and `returned`.
- Required a status-change reason before submission.
- Added server-side rejection for workflow-owned `allocated` and `sold` statuses.
- Simplified the allocated-row guard so any live allocation blocks manual disposition changes.
- Kept serialized lineage updates aligned with the allowed disposition statuses.

### Standards Checked

- Domain ownership: inventory browser owns row selection and disposition initiation; allocation and sale remain workflow-owned.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route page now calls a named hook, hook calls the server function, server enforces status invariants, cache helper refreshes dependent surfaces.
- Tenant isolation/data integrity: server still scopes and locks inventory rows by organization before writes.
- Transactional inventory/finance integrity: status, movement evidence, serialized lineage, and product activity remain inside the transaction; no finance writes changed.
- Serialized lineage continuity: serialized cache invalidation now follows bulk status results, and server lineage updates remain transaction-bound.
- UI states/error handling: dialog requires explicit status and reason; hook maps allocation/workflow-owned blockers to operator-safe copy.
- Query/cache contract: exact inventory details and product summaries are invalidated from returned `items[]`; serialized caches invalidate only when affected rows include serials.
- Reviewability: one hook, one cache-helper extension, one page callback, one bounded dialog, one server invariant.

### Smells Removed

- Selected inventory rows no longer dead-end with no meaningful page-level operation.
- Bulk status was no longer a hardened but unreachable server surface.
- UI no longer implies manual control over workflow-owned `allocated` or `sold` states.
- Direct server calls can no longer use bulk status to bypass allocation or fulfillment ownership.

### Deferred

- Authenticated browser smoke for the inventory route remains deferred in this local pass.
- Product-specific status reason taxonomy remains deferred.
- Bulk transfer/delete/export wiring remains deferred; this sprint only cleaned the status path.
- Historical cleanup for previously divergent serialized rows remains deferred from Sprint 154.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/use-bulk-update-inventory-status.test.tsx tests/unit/inventory/query-normalization-wave3-browser.test.tsx tests/unit/inventory/inventory-browser-bulk-status-contract.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/status-updates.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/_stock-mutation-cache.ts src/hooks/inventory/index.ts src/components/domain/inventory/inventory-browser.tsx src/routes/_authenticated/inventory/inventory-browser-page.tsx tests/unit/inventory/use-bulk-update-inventory-status.test.tsx tests/unit/inventory/query-normalization-wave3-browser.test.tsx tests/unit/inventory/inventory-browser-bulk-status-contract.test.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`
- Skipped: authenticated browser smoke for `/inventory/browser`.

### Goal Adaptation

No adaptation needed. This sprint directly follows the maintainer goal by turning a dead UI affordance and partially isolated server function into a protected domain workflow with explicit cache, status ownership, and evidence contracts.

### Residual Risk

Moderate-low. The route/page/hook/server contract is now covered, but the actual authenticated browser interaction was not visually smoked in this pass. The browser still has other partially wired bulk affordances (`transfer`, `delete`, `export`) that should be evaluated separately before being exposed broadly.
