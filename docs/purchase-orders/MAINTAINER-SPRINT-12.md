# Purchase Orders Maintainer Sprint 12

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order List Read-Error Safety

### Problem

`POListPresenter` rendered `error.message` directly in the purchase-order list error state. The `usePurchaseOrders` hook normalizes read failures, but the presenter contract still accepted any `Error`, which meant a future caller or bypassed hook path could leak database or infrastructure copy into the operator-facing list.

### Workflow Spine

Purchase orders page
-> `PODirectory`
-> `POListPresenter`
-> `usePurchaseOrders`
-> `listPurchaseOrders`
-> centralized query key and read-path normalization
-> operator-safe list error state.

### Touched Domains

- Purchase-order list presenter.
- Purchase-order list read-state copy helper.
- Purchase-order list read-state tests.

### Business Value Protected

The purchase-order list is the operator entry point for supplier ordering, approvals, receiving, and cleanup. A hard list failure should tell the operator what to do without exposing internal database, constraint, or infrastructure text.

### Scope Constraints

- Do not change list query keys, filters, sorting, pagination, selection, bulk actions, status chips, receiving dialogs, mutation behavior, server functions, tenant predicates, or cache invalidation.
- Preserve read-path normalized copy when the error is a `ReadQueryError`.
- Hide non-read/raw errors behind purchase-order-owned fallback copy.

### Changes

- Added `po-list-error-messages.ts` with purchase-order-owned fallback copy and `getPurchaseOrderListErrorMessage`.
- Changed `POListPresenter` to render the helper result instead of `error.message`.
- Added focused coverage proving normalized read copy is preserved and raw database-style errors are suppressed in the rendered list error state.

### Standards Checked

- Domain ownership: purchase-order list copy now lives in a purchase-order-owned helper rather than inline presenter logic.
- Route -> container/page -> hook -> server flow: unchanged.
- Query/cache policy: no query keys, stale times, invalidations, or cache behavior changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory side effect, or finance side effect changed.
- UI states/error handling: list hard-error state now trusts only read-path-normalized messages.
- Reviewability: the diff is limited to one helper, one presenter line, focused tests, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in the purchase-order list presenter.
- Missing regression coverage for raw purchase-order list read-error suppression.

### Deferred

- Other domains may still have presenters that accept arbitrary `Error` messages. This sprint intentionally stayed on the purchase-order list path already under active maintenance.
- Browser QA was not selected because this is source-covered error-copy behavior with no route/layout/interaction change.

### Gates

- Passed: focused list read-state and purchase-order normalization contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-list-read-state.test.tsx tests/unit/purchase-orders/query-normalization-wave3c.test.tsx tests/unit/purchase-orders/query-normalization-wave3c-consumers.test.tsx tests/unit/purchase-orders/purchase-order-list-mutation-feedback-contract.test.ts` - 4 files, 9 tests.
- Passed: broader purchase-order/procurement suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/use-purchase-orders.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 34 files, 98 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed direct list `error.message`, helper usage, fallback copy, read-path guard, and raw database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was error-copy behavior in an existing list error state with focused render coverage.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, read-path contracts, modular domain ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

Low. `POListPresenter` still accepts `Error | null` for compatibility, but it no longer treats arbitrary error messages as display-safe.
