# Inventory Maintainer Sprint 48

This sprint follows Sprint 47's supplier price import optional-field cleanup. The target is supplier price import calendar-date validation: date-shaped strings should also be real calendar dates before supplier/product resolution or persistence.

Status: Closed after Issue 1.

## Business Value

Supplier price imports control procurement cost timing for lithium-ion battery stock. Impossible effective or expiry dates should fail at import parsing instead of creating misleading price windows for ordering and finance decisions.

## Workflow Spine

supplier price import CSV
-> price-import server function
-> row normalization
-> date format and calendar validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price import date validation.
- Preserve row normalization, numeric validation, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into import execution transactions, approval-required behavior, live database fixtures, or pricing UX.

## Issue Ledger

### 1. Date-Shaped Impossible Dates Passed Import Parsing

Problem:

- Sprint 47 required date fields to use `YYYY-MM-DD`.
- Regex validation still allowed impossible calendar dates such as `2026-02-30` or `2026-13-01`.
- Those values could flow into supplier pricing resolution and persistence as operator-visible procurement timing data.

Workflow protected:

CSV import -> row normalization -> date format and calendar validation -> supplier/product resolution -> import execution.

Implemented slice:

- Added calendar-date validation after the existing `YYYY-MM-DD` format check.
- Kept blank optional date behavior as `undefined`.
- Added focused parser coverage for impossible effective and expiry dates.

Out of scope:

- Changing numeric validation, supplier/product resolution, or import execution semantics.
- Changing approval-required behavior.
- Changing hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import optional-field tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row normalization -> date format and calendar validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: impossible supplier price effective/expiry dates now fail before procurement cost timing can be resolved or persisted.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; date validation stays local to the import server module with pure parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: date-shaped impossible values passed validation as if they were valid supplier pricing dates.
- Smells deferred: live database fixtures for full validate/execute import with seeded supplier/product resolution; approval-required import semantics; price import UX hardening.
- Gates run: focused supplier price import/pricing tests; focused ESLint; supplier + purchase-order unit suites (`29` files, `81` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-validation correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves the import parser contract; live DB fixtures are still needed to prove full import validation and execution under seeded supplier/product data.
