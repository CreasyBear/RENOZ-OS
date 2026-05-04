# Inventory Maintainer Sprint 55

This sprint follows Sprint 54's supplier price import valid-count cleanup. The target is supplier price import execute trust-boundary hardening: execution should assert supplier/product identity continuity before building write values, even if the submitted row status says it is resolved.

Status: Closed after Issue 1.

## Business Value

Supplier price import execution writes procurement cost data. A malformed or stale validated-row payload should fail with an operator-safe validation error instead of relying on non-null assertions for supplier and product IDs at the write boundary.

## Workflow Spine

validated supplier price import rows
-> execute import server function
-> unresolved-status guard
-> resolved identity assertion
-> tenant-scoped price-list insert/update
-> optional price-change audit request
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to execute-import resolution identity assertions.
- Preserve CSV parsing, preview validation, row normalization, row defaults, numeric/date validation, supplier/product resolution semantics, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into live database fixtures, preview UI redesign, approval-required flow changes, or supplier/product seed data.

## Issue Ledger

### 1. Execute Import Trusted Resolution IDs After Status Check

Problem:

- `executePriceImport` rejected rows with unresolved statuses.
- The input schema still allowed a submitted `resolved` or `duplicate_target` row to omit `supplierId` or `productId`.
- The write payload relied on non-null assertions for those IDs instead of asserting identity continuity at the mutation boundary.

Workflow protected:

validated rows -> execute import server function -> resolved identity assertion -> tenant-scoped price-list insert/update.

Implemented slice:

- Reused the existing `assertResolvedResolution` helper before building price-list write values.
- Removed non-null assertions from supplier/product IDs in the execute write payload.
- Added focused contract coverage that execution asserts resolved identities before using IDs.

Out of scope:

- Changing supplier/product resolution semantics.
- Changing preview UI copy, execute response shape, approval-required behavior, or query/cache invalidation.
- Adding live database fixtures for seeded execute-import validation.

Closeout:

- Touched domains: supplier price import server function, supplier price import execute contract tests, inventory sprint evidence.
- Workflow protected: validated supplier price import rows -> execute import server function -> unresolved-status guard -> resolved identity assertion -> tenant-scoped price-list insert/update -> optional price-change audit request -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: malformed or stale supplier price import execution payloads now fail before procurement cost writes can use missing supplier/product identities.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; mutation-boundary identity assertion uses the existing price-resolution helper instead of local non-null trust.
- Tenant isolation and data integrity checked: tenant-scoped update predicates remain unchanged; insert/update values now require asserted supplier/product IDs; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: non-null assertions at the supplier price import write boundary trusted client-submitted resolution payload shape.
- Smells deferred: live database fixtures for seeded execute-import validation; approval-required import semantics; preview/template UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `91` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server mutation-boundary hardening change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, tenant/data integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage proves the assertion is present; live seeded execute-import tests remain needed to prove full DB behavior under realistic supplier/product data.
