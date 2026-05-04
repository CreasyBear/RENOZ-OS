# Inventory Maintainer Sprint 40

This sprint follows Sprint 39's PO cost mutation cleanup. The target is supplier price-change application tenant scope: applying an approved price change should update the supplier price list and mark the price-change audit record applied under the active organization boundary.

Status: Closed after Issue 1.

## Business Value

Supplier price changes influence procurement cost signals for battery stock. When an approved price change is applied, both the supplier price list and the price-change audit trail need tenant-explicit mutations so future ordering, valuation review, and supplier-price history stay trustworthy.

## Workflow Spine

supplier price-change apply action
-> price-history server function
-> organization-scoped approved change read
-> tenant-scoped supplier price-list write
-> tenant-scoped price-change audit write
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to the price-change application audit write predicate.
- Preserve approval, rejection, cancellation, price-list update behavior, response shapes, query keys, cache behavior, and UI behavior.
- Do not broaden into supplier pricing UX, price-list CRUD, price import, live database fixtures, or pricing schema redesign.

## Issue Ledger

### 1. Price-Change Apply Marked Audit Record Applied By ID Only

Problem:

- Applying a price change already reads an approved change under the active organization.
- The supplier price-list write already required the active organization.
- The final price-change history update marked the audit record applied by ID only.

Workflow protected:

approved price change -> tenant-owned price-list mutation -> tenant-scoped audit-history applied mutation -> supplier pricing integrity.

Implemented slice:

- Added organization and approved-status predicates to the price-change history write that marks an approved change as applied.
- Preserved the existing organization-scoped approved change read and organization-scoped supplier price-list update.
- Preserved approval, rejection, cancellation, price-list update behavior, response shapes, query keys, cache behavior, and UI behavior.
- Added focused source contract coverage for the supplier price-list application write and price-change audit-history applied write.

Out of scope:

- Changing approval/rejection/cancellation behavior.
- Changing supplier price-list update semantics.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price-history server function, supplier price-change application tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: supplier price-change apply action -> organization-scoped approved change read -> tenant-scoped supplier price-list write -> tenant-scoped price-change audit write -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price-change application now keeps both the price-list mutation and audit-history mutation tenant-explicit before future ordering and procurement cost review depend on the applied price.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price history remains the audit workflow owner; the applied-state write now mirrors the scoped approved-record read and scoped price-list write.
- Tenant isolation and data integrity checked: the applied audit write now requires change ID, organization ID, and approved status; no price approval, rejection, cancellation, price-list CRUD, receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: price-change application marked the audit record applied by ID only after tenant-scoped reads/writes.
- Smells deferred: live database fixtures for applying supplier price changes under seeded RLS/concurrency; broader supplier price import and pricing module predicate review; supplier pricing UX hardening.
- Gates run: focused supplier pricing/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended predicate stays present; live DB fixtures are still needed to prove apply behavior under seeded multi-tenant/RLS and concurrent apply conditions.
