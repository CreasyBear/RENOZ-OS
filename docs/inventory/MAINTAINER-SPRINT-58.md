# Inventory Maintainer Sprint 58

This sprint follows Sprint 57's supplier price import control-field normalization cleanup. The target is supplier price import currency-code validation: currency should normalize and validate as a three-letter code before supplier/product resolution or persistence.

Status: Closed after Issue 1.

## Business Value

Supplier price imports feed procurement cost data. Malformed currency values such as `AU`, `AUDD`, or symbols should fail before import resolution, while valid lower-case spreadsheet values such as `usd` should normalize consistently.

## Workflow Spine

supplier price import CSV
-> CSV parsing
-> raw/control-field normalization
-> currency-code validation
-> row schema validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to currency normalization and format validation in the supplier price import row schema.
- Preserve header aliasing, row order, row defaults, numeric/date validation, supplier/product resolution semantics, execute import behavior, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into a strict currency allowlist, exchange-rate handling, localization, CSV parser replacement, live database fixtures, or template upload UX.

## Issue Ledger

### 1. Currency Accepted Arbitrary Strings

Problem:

- Sprint 57 normalized currency casing at the row-builder boundary.
- The row schema still accepted arbitrary currency strings.
- Malformed currency metadata could flow into supplier price persistence and downstream procurement cost workflows.

Workflow protected:

raw/control-field normalization -> currency-code validation -> row schema validation -> supplier/product resolution -> import execution.

Implemented slice:

- Added schema-level currency parsing that trims, uppercases, and validates a three-letter code.
- Kept row-builder uppercase normalization for imported CSV cells.
- Added focused coverage for valid lower-case currency normalization and malformed currency rejection.

Out of scope:

- Adding an ISO currency allowlist.
- Validating exchange rates.
- Changing supplier/product resolution, import execution, hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import numeric/currency validation tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> CSV parsing -> raw/control-field normalization -> currency-code validation -> row schema validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: malformed supplier price currencies now fail before procurement pricing data can be resolved or persisted; valid lower-case codes normalize consistently.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; currency validation lives in the import row schema with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: supplier price import currency accepted arbitrary strings and could persist inconsistent procurement metadata.
- Smells deferred: strict currency allowlist; live database fixtures for full validate/execute import with seeded supplier/product resolution; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `95` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-validation correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves currency-code validation; live seeded import execution remains needed for end-to-end import confidence.
