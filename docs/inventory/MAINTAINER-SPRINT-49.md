# Inventory Maintainer Sprint 49

This sprint follows Sprint 48's supplier price import calendar-date validation cleanup. The target is supplier price import date-window integrity: an expiry date should not be accepted when it falls before the row's effective date.

Status: Closed after Issue 1.

## Business Value

Supplier price imports control procurement cost timing for lithium-ion battery ordering. A price row that expires before it becomes effective creates a misleading cost window and can confuse operators reviewing supplier price readiness.

## Workflow Spine

supplier price import CSV
-> price-import server function
-> row normalization
-> field validation
-> date-window validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price import date-window validation.
- Preserve row normalization, numeric validation, individual date validation, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into import execution transactions, approval-required behavior, live database fixtures, pricing CRUD, or pricing UX.

## Issue Ledger

### 1. Expiry Dates Could Precede Effective Dates

Problem:

- Sprint 48 made individual import dates real calendar dates.
- The row schema still allowed a valid expiry date that was earlier than the valid effective date.
- That could carry an impossible supplier price window into resolution and persistence.

Workflow protected:

CSV import -> row normalization -> field validation -> date-window validation -> supplier/product resolution -> import execution.

Implemented slice:

- Added schema-level cross-field validation for supplier price import rows.
- Rejects rows where both dates are present and `expiryDate` is earlier than `effectiveDate`.
- Added focused parser coverage for equal-date, later-expiry, and earlier-expiry price windows.

Out of scope:

- Inferring date-window validity when `effectiveDate` is omitted and defaults to today during validation/execution.
- Changing numeric validation, supplier/product resolution, or import execution semantics.
- Changing approval-required behavior.
- Changing hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import date-window tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row normalization -> field validation -> date-window validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price imports now reject price windows that expire before becoming effective, reducing misleading procurement cost timing data.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; date-window integrity stays local to the import row schema with pure parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: individually valid dates could still form an impossible supplier price window.
- Smells deferred: live database fixtures for full validate/execute import with seeded supplier/product resolution; date-window handling when `effectiveDate` is omitted and defaults to today; approval-required import semantics; price import UX hardening.
- Gates run: focused supplier price import/pricing tests; focused ESLint; supplier + purchase-order unit suites (`30` files, `83` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-validation correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure parser coverage proves the explicit date-window contract; live DB fixtures are still needed to prove full import validation and execution under seeded supplier/product data.
