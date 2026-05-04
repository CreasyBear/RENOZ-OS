# Inventory Maintainer Sprint 52

This sprint follows Sprint 51's supplier price import cell-normalization cleanup. The target is supplier price import default consistency: header-based imports and no-header imports should apply the same published defaults for optional template fields.

Status: Closed after Issue 1.

## Business Value

Supplier price imports should behave predictably for operators preparing RENOZ battery procurement data. A blank optional cell in a header-based template should not fail validation or persist an empty value when the no-header path applies a clear default.

## Workflow Spine

supplier price import CSV
-> CSV parsing
-> raw cell normalization
-> row default normalization
-> row schema validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to import row default normalization after header/no-header mapping.
- Preserve header aliasing, row order, raw cell trimming, numeric validation, date validation, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into CSV parser replacement, template upload UX, live database fixtures, or seeded supplier/product resolution.

## Issue Ledger

### 1. Header-Based Imports Skipped Published Row Defaults

Problem:

- Header-based row mapping returned before applying defaults.
- Blank header-based `Currency`, `Discount Type`, `Discount Value`, or `Status` cells could behave differently than no-header rows.
- Blank `Discount Type` and `Status` values could fail schema validation; blank `Currency` could survive as an empty string.

Workflow protected:

CSV parsing -> raw cell normalization -> row default normalization -> row schema validation -> supplier/product resolution.

Implemented slice:

- Added a shared price import row default helper.
- Applied it to both header-based and no-header row mapping paths.
- Added focused coverage proving blank optional template cells with headers receive the same defaults and parse cleanly.

Out of scope:

- Replacing the CSV parser.
- Changing header alias behavior, row order, numeric/date validation, supplier/product resolution, or import execution semantics.
- Changing hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import row-normalization tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> CSV parsing -> raw cell normalization -> row default normalization -> row schema validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: header-based supplier price imports now honor the same default behavior as no-header imports, reducing false validation failures and empty procurement metadata.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; defaults are centralized in a small import-row helper with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: duplicated and inconsistent default behavior between header and no-header import mapping paths.
- Smells deferred: CSV parser replacement for multiline quoted fields; live database fixtures for full validate/execute import with seeded supplier/product resolution; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`31` files, `87` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-normalization correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves row default consistency; live seeded validate/execute coverage remains needed for end-to-end import confidence.
