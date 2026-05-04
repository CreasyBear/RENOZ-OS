# Inventory Maintainer Sprint 41

This sprint follows Sprint 40's supplier price-change application scoping cleanup. The target is price-change application atomic integrity: applying an approved supplier price change should fail if the scoped price-list write does not update a row, and should fail if the audit-history row cannot be marked applied.

Status: Closed after Issue 1.

## Business Value

Supplier price changes feed future procurement decisions for battery stock. An apply action should not leave operators with an audit record that says a price was applied when the tenant-owned supplier price list did not change, or when the audit row itself could not be transitioned.

## Workflow Spine

supplier price-change apply action
-> price-history server function
-> organization-scoped approved change read
-> checked tenant-scoped supplier price-list write
-> checked tenant-scoped price-change audit write
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to result checks inside the existing price-change apply transaction.
- Preserve approval, rejection, cancellation, predicate scope, price-list update fields, response shapes, query keys, cache behavior, and UI behavior.
- Do not broaden into supplier pricing UX, price-list CRUD, price import, live database fixtures, or pricing schema redesign.

## Issue Ledger

### 1. Price-Change Apply Did Not Check Mutation Results

Problem:

- Applying a price change already read an approved change under the active organization.
- Sprint 40 made the audit-history applied write tenant-explicit.
- The scoped supplier price-list update did not verify that a row was updated.
- The audit-history applied update returned `undefined` silently if the row could not transition.

Workflow protected:

approved price change -> checked tenant-owned price-list mutation -> checked tenant-scoped audit-history applied mutation -> supplier pricing integrity.

Implemented slice:

- Added a returning check to the tenant-scoped supplier price-list update.
- Added a `NotFoundError` when the approved price change references a price list that cannot be updated under the active organization.
- Added a returning check to the tenant-scoped audit-history applied update.
- Added a `ValidationError` when the approved audit record cannot be marked applied, covering stale/concurrent transitions.
- Preserved approval, rejection, cancellation, predicate scope, price-list update fields, response shapes, query keys, cache behavior, and UI behavior.
- Expanded focused source contract coverage for checked price-list writes and checked audit-history writes.

Out of scope:

- Changing approval/rejection/cancellation behavior.
- Changing supplier price-list update fields.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price-history server function, supplier price-change application tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: supplier price-change apply action -> organization-scoped approved change read -> checked tenant-scoped supplier price-list write -> checked tenant-scoped price-change audit write -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price-change application cannot report success when the tenant-owned price list was not updated or when the approved audit row could not transition, improving trust in procurement cost history.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price history remains the audit workflow owner; mutation result checks stay inside the existing transaction.
- Tenant isolation and data integrity checked: the price-list update still requires price-list ID and organization ID and now verifies a row was updated; the applied audit write still requires change ID, organization ID, and approved status and now verifies a row transitioned; no price approval, rejection, cancellation, price-list CRUD, receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: price-change application could silently return success with an unapplied/missing scoped price-list update or missing applied audit transition.
- Smells deferred: live database fixtures for applying supplier price changes under seeded RLS/concurrency; broader supplier price import and pricing module predicate review; supplier pricing UX hardening.
- Gates run: focused supplier pricing/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server transaction/result-check correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, finance integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended checks stay present; live DB fixtures are still needed to prove apply behavior under seeded multi-tenant/RLS and concurrent apply conditions.
