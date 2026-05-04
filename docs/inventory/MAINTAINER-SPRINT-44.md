# Inventory Maintainer Sprint 44

This sprint follows Sprint 43's supplier price import row-normalization cleanup. The target is supplier price import execution error honesty: if an import row cannot persist its price-list record, execution should return an operator-safe row error rather than a raw `persistedPrice.id` property-access failure.

Status: Closed after Issue 1.

## Business Value

Supplier price imports maintain procurement cost data for battery stock. When a previously validated price row becomes unavailable during execution, operators need a clear retry instruction, not a technical crash message that hides what happened.

## Workflow Spine

supplier price import execute
-> validated row set
-> tenant-scoped price-list insert/update
-> checked persisted price result
-> optional price-change audit request
-> per-row import result
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to price import execution persistence-result handling.
- Preserve row normalization, schema validation, supplier/product resolution, insert/update predicates, approval-required behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into import transaction semantics, approval-required redesign, live database fixtures, or pricing UX.

## Issue Ledger

### 1. Price Import Execute Could Return Raw Property-Access Errors

Problem:

- Existing-price updates were tenant-scoped but did not check whether `.returning()` produced a row.
- Inserts also assigned `persistedPrice` without a guard.
- Later code used `persistedPrice.id` for audit requests and success results, so stale or unavailable writes could surface as raw property-access failures.

Workflow protected:

validated import row -> tenant-scoped price-list persistence -> checked persisted result -> audit/result construction.

Implemented slice:

- Added an explicit `persistedPrice` guard after price-list update/insert execution.
- Added a row-specific `ValidationError` when a validated import row cannot be saved.
- Preserved existing per-row import result handling, so the operator receives a row error rather than a raw property-access failure.
- Preserved row normalization, schema validation, supplier/product resolution, insert/update predicates, approval-required behavior, query keys, cache behavior, response shape, and UI behavior.
- Added focused source contract coverage for the persistence guard before audit request and success-result construction.

Out of scope:

- Changing row normalization, supplier/product resolution, or import execution semantics.
- Changing approval-required behavior.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import execute contract tests, inventory sprint evidence.
- Workflow protected: supplier price import execute -> validated row set -> tenant-scoped price-list insert/update -> checked persisted price result -> optional price-change audit request -> per-row import result -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: stale or unavailable supplier price rows now produce clear row-level retry guidance instead of raw `persistedPrice.id` failures during procurement price imports.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; the guard stays local to the execute-import persistence boundary.
- Tenant isolation and data integrity checked: existing tenant-scoped update predicates and insert ownership remain unchanged; no supplier/product resolution, receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: import execution could continue after an empty scoped update/insert result and then fail with raw property-access errors.
- Smells deferred: live database fixtures for full validate/execute import with seeded supplier/product resolution; approval-required import semantics; price import UX hardening.
- Gates run: focused price import/pricing tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server execution error-handling correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the guard stays present; live DB fixtures are still needed to prove full import execution under seeded supplier/product data and stale existing-price IDs.
