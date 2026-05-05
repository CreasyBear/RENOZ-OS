# Purchase Orders Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: Purchase Order Detail Read-Error Safety

### Problem

`PODetailContainer` rendered `error.message` directly in its hard-error state. The `usePurchaseOrder` hook normalizes detail read failures, but the container still accepted any `Error`, so a future caller, bypassed hook path, or unexpected non-read exception could expose database or infrastructure copy on the purchase-order detail page.

### Workflow Spine

Purchase-order detail route
-> `PODetailContainer`
-> `usePurchaseOrder`
-> `getPurchaseOrder`
-> centralized query key and read-path normalization
-> operator-safe detail error state.

### Touched Domains

- Purchase-order detail container.
- Purchase-order detail read-state copy helper.
- Purchase-order detail read-state tests.

### Business Value Protected

Purchase-order detail is the working surface for approval, ordering, receiving, landed costs, activity, and lifecycle actions. A hard read failure should explain the state safely without leaking database, constraint, or infrastructure text.

### Scope Constraints

- Do not change route behavior, tabs, edit/receive route modes, lifecycle mutations, activity logging, query keys, cache invalidation, server reads, tenant predicates, or purchase-order data transforms.
- Preserve normalized not-found copy when the hook returns a `ReadQueryError`.
- Preserve explicit missing-data not-found copy when the detail result is absent without an error.
- Hide non-read/raw errors behind purchase-order-owned fallback copy.

### Changes

- Added `po-detail-error-messages.ts` with detail fallback copy, missing-data not-found copy, and `getPurchaseOrderDetailErrorMessage`.
- Changed `PODetailContainer` to render the helper result instead of arbitrary `error.message`.
- Added focused coverage proving normalized read copy is preserved, missing-data not-found copy remains stable, raw database-style errors are suppressed, and the container stays wired to the helper.

### Standards Checked

- Domain ownership: purchase-order detail error copy now lives in a purchase-order-owned helper.
- Route -> container/page -> hook -> server flow: unchanged.
- Query/cache policy: no query keys, stale times, invalidations, optimistic updates, or cache ownership changed.
- Tenant isolation/data integrity: no server function, auth boundary, organization predicate, write path, inventory side effect, or finance side effect changed.
- UI states/error handling: detail hard-error state now trusts only read-path-normalized messages.
- Reviewability: the diff is limited to one helper, one container render line, focused tests, and this closeout note.

### Smells Removed

- Direct `error.message` rendering in the purchase-order detail container.
- Missing regression coverage for raw detail read-error suppression.

### Deferred

- Other domains may still have hard-error presenters that accept arbitrary `Error` messages. This sprint intentionally stayed on the purchase-order detail path already under active maintenance.
- Browser QA was not selected because this is source-covered error-copy behavior with no route/layout/interaction change.

### Gates

- Passed: focused detail/list read-state and detail normalization contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/purchase-order-detail-read-state.test.ts tests/unit/purchase-orders/query-normalization-wave3c.test.tsx tests/unit/purchase-orders/purchase-order-detail-mutation-feedback-contract.test.ts tests/unit/purchase-orders/purchase-order-list-read-state.test.tsx` - 4 files, 11 tests.
- Passed: broader purchase-order/procurement suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/use-purchase-orders.test.tsx tests/unit/suppliers/query-normalization-wave7c.test.tsx` - 35 files, 102 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed detail `error instanceof Error`, helper usage, fallback copy, not-found copy, read-path guard, and raw database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was error-copy behavior in an existing detail error state with focused source/helper coverage.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, read-path contracts, modular domain ownership, meaningful tests, and risk-selected evidence.

### Residual Risk

Low. `PODetailContainer` still accepts hook-compatible error values for compatibility, but it no longer displays arbitrary error messages.
