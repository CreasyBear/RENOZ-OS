# Inventory Maintainer Sprint 65

This sprint follows Sprint 64's supplier price import contract cleanup. The target is supplier pricing audit metadata integrity: updating an existing price-list row should not overwrite the original creator.

Status: Closed after Issue 1.

## Business Value

Supplier pricing changes affect procurement cost decisions. Audit metadata should distinguish who created a supplier price from who last updated it, especially when price records are maintained through both direct pricing workflows and CSV import execution.

## Workflow Spine

direct supplier price-list upsert and supplier price import execution
-> product/supplier resolution
-> existing price-list detection
-> tenant-scoped price-list insert/update
-> audit metadata preservation
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price-list audit metadata on existing-row updates.
- Preserve price calculations, resolution behavior, tenant predicates, non-approval import execution, query keys, cache behavior, response shapes, and UI behavior.
- Fix direct price-list upsert and import execution together because they share the same supplier pricing invariant.
- Do not broaden into full price history redesign, approval-required imports, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Existing Price Updates Rewrote Creator Metadata

Problem:

- Direct supplier price-list upsert built one `priceValues` object containing `createdBy` and `updatedBy`.
- Supplier price import execution did the same.
- Existing-row update paths spread that insert-shaped object into `update(priceLists).set(...)`, replacing the original `createdBy` with the current updater.

Workflow protected:

supplier pricing upsert -> existing price-list detection -> tenant-scoped update -> audit metadata preservation.

Implemented slice:

- Removed `createdBy`/`updatedBy` from shared price-list values in direct price-list upsert.
- Removed `createdBy`/`updatedBy` from shared price-list values in price import execution.
- Stamped `updatedBy` and `updatedAt` only on update paths.
- Stamped `createdBy` and `updatedBy` only on insert paths.
- Added cross-function contract coverage for the direct pricing and import execution upsert shapes.

Out of scope:

- Backfilling already-overwritten creator metadata.
- Changing price history approval/audit records.
- Changing bulk price-list update behavior.
- Changing supplier import validation or UI.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier pricing server function, supplier price import server function, supplier pricing audit metadata contract tests, inventory sprint evidence.
- Workflow protected: direct supplier price-list upsert and supplier price import execution -> product/supplier resolution -> existing price-list detection -> tenant-scoped insert/update -> audit metadata preservation -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price-list audit metadata now preserves original creator ownership while still recording the last updater on price changes.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier pricing remains the domain owner; insert and update payloads now reflect separate lifecycle semantics.
- Tenant isolation and data integrity checked: no tenant predicates changed; direct and import updates remain organization-scoped; no receiving, inventory, finance posting, approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: insert-shaped audit payloads reused for existing-row updates in both direct supplier pricing and import execution.
- Smells deferred: live seeded fixtures for direct/import upsert audit assertions; audit backfill for historical rows; full price-history transaction design; approval-required import workflow.
- Gates run: focused supplier pricing tests (`3` files, `7` tests); focused ESLint; supplier + purchase-order unit suites (`33` files, `102` tests); TypeScript.
- Gates skipped: browser QA, because this was a server audit-metadata mutation change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers domain ownership, safe mutation contracts, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level tests protect the update payload contract, but live database fixtures would give stronger evidence that stored `createdBy` remains unchanged across real direct/import update executions.
