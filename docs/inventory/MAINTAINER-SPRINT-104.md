# Inventory Maintainer Sprint 104: Detail Quality Status Derivation

## Status

Closed in commit-ready state.

## Issue 1: Inventory Detail Quality State Drifted From Derived Expiry Semantics

### Problem

The inventory list/filter path treats damaged, quarantined, and expired inventory as derived quality states because `inventory` does not have a physical `quality_status` column. The inventory detail hook still carried a comment saying expiry-derived quality was not implemented, and the detail container did not map derived quality status into `ItemDetailData`. This left the detail header and item-alert input using related but scattered logic.

### Workflow Spine

Inventory detail route/container
-> `useInventoryDetail`
-> item alert input
-> `InventoryDetailContainer` item mapping
-> `InventoryDetailView` header and item-contextual alerts
-> existing detail query keys/cache policy.

### Touched Domains

- Inventory utility helpers.
- Inventory detail hook.
- Inventory detail container.
- Inventory quality status tests.
- Inventory sprint evidence.

### Business Value Protected

Operators reviewing a battery lot or serialized unit should see consistent exception state on the detail surface. Expired stock is not merely a date display; it is an operational quality exception that affects picking, sales, support, and disposal decisions.

### Scope Constraints

- Do not add a `quality_status` database column.
- Do not change inventory list filters, server read predicates, alert dismissal, query keys, cache invalidation, quality inspection records, or item alert rendering.
- Keep the derivation pure and reusable.

### Changes

- Added `deriveInventoryQualityStatus` in `src/lib/inventory-utils.ts`.
- Derived exceptional quality status from `status` (`damaged`, `quarantined`) and expired `expiryDate`.
- Reused the helper in `useInventoryDetail` for item alert input.
- Reused the helper in `InventoryDetailContainer` for `ItemDetailData.qualityStatus`.
- Removed the stale "expired not implemented" detail-hook comment.
- Added focused unit and source-contract coverage for derivation and hook/container usage.

### Standards Checked

- Domain ownership: quality-status derivation now lives in an inventory utility instead of being duplicated in hook/container code.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: detail hook and container mappings now share the same pure derivation; server reads and cache contracts are unchanged.
- Tenant isolation/data integrity: no auth boundary, organization predicate, database write, inventory movement, or quality inspection behavior changed.
- Query/cache contract: no query keys, stale times, invalidations, or optimistic updates changed.
- UI states/error handling: detail header can receive the derived status; item alerts continue to use expiry dates for expired/expiring alert generation.
- Reviewability: focused helper and mapping change with no migration.

### Smells Removed

- Stale comment claiming expiry-derived quality status was not implemented.
- Hook-local damaged/quarantined derivation.
- Missing detail-container mapping for derived quality status.
- Drift between list/filter semantics and detail presentation data.

### Deferred

- Date-only expiry semantics still differ across surfaces that use exact timestamps versus SQL `CURRENT_DATE`; aligning that policy is a separate inventory expiry semantics sprint.
- Browser QA was not selected because this is a data mapping and helper cleanup with focused unit coverage.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/inventory-quality-status.test.ts tests/unit/inventory/query-normalization-wave3-quality.test.tsx` - 2 files, 9 tests.
- Passed: focused ESLint on touched helper, hook, container, and tests.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. Serialized gates remain retired and were not relevant to this detail quality-status derivation slice.

### Residual Risk

Low for detail quality-state consistency. Moderate policy risk remains around exact timestamp expiry versus date-only expiry semantics; this sprint preserves current behavior and only centralizes the existing client-side exceptional status derivation.
