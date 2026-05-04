# Inventory Maintainer Sprint 46

This sprint follows Sprint 45's supplier price import numeric-validation cleanup. The target is supplier price import strict decimal parsing: malformed decimal strings should not be partially accepted by `parseFloat` before supplier/product resolution.

Status: Closed after Issue 1.

## Business Value

Supplier price imports maintain procurement cost data for battery stock. Operators should not be able to import values like `12abc` or `10%` and have them silently interpreted as valid prices or discounts.

## Workflow Spine

supplier price import CSV
-> price-import server function
-> row normalization
-> strict numeric field validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to strict decimal parsing in supplier price import row validation.
- Preserve row normalization, CSV parsing, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into import execution transactions, approval-required behavior, live database fixtures, or pricing UX.

## Issue Ledger

### 1. Decimal Import Fields Could Accept Partial Numeric Strings

Problem:

- Sprint 45 added explicit decimal validation but still used `Number.parseFloat`.
- `parseFloat` accepts numeric prefixes, so malformed values like `12abc` can become `12`.
- Price and discount imports should require the whole cleaned string to be numeric.

Workflow protected:

CSV import -> row normalization -> strict numeric validation -> supplier/product resolution -> import execution.

Implemented slice:

- Replaced `Number.parseFloat` with full-string `Number` conversion after currency/comma cleanup.
- Preserved existing empty, finite, and non-negative validation behavior.
- Expanded focused numeric validation tests for malformed decimal suffixes like `12abc` and `10%`.

Out of scope:

- Changing row normalization, supplier/product resolution, or import execution semantics.
- Changing approval-required behavior.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import numeric-validation tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row normalization -> strict numeric field validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: malformed supplier price and discount values can no longer be partially parsed into apparently valid procurement cost data for battery stock.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; decimal parsing remains local to the import server module and covered as a pure helper.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: `parseFloat` accepted numeric prefixes from malformed decimal strings.
- Smells deferred: live database fixtures for full validate/execute import with seeded supplier/product resolution; approval-required import semantics; price import UX hardening.
- Gates run: focused price import/pricing tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server numeric-validation correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves the strict decimal parsing contract; live DB fixtures are still needed to prove full import validation and execution under seeded supplier/product data.
