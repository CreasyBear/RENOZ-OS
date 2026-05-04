# Inventory Maintainer Sprint 60

This sprint follows Sprint 59's supplier price import unsupported-volume-discount cleanup. The target is supplier price import percentage-discount validation: percentage discounts should not exceed 100 before effective price calculation.

Status: Closed after Issue 1.

## Business Value

Supplier price imports write procurement cost data. A typo such as `150` in a percentage discount currently clamps effective price to zero, turning a bad spreadsheet cell into a free-cost signal for battery procurement decisions.

## Workflow Spine

supplier price import CSV
-> row schema validation
-> discount semantic validation
-> effective price calculation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price import percentage-discount validation.
- Preserve CSV parsing, row normalization, row defaults, currency/numeric/date validation, supplier/product resolution semantics, execute import behavior, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into fixed-discount-over-base product policy, full pricing-rule redesign, live database fixtures, or template upload UX.

## Issue Ledger

### 1. Percentage Discounts Over 100 Could Clamp To Zero Cost

Problem:

- Supplier price imports accepted percentage discount values over 100.
- The supplier effective-price helper clamps negative prices to zero.
- Invalid discount percentages could therefore produce zero effective procurement cost instead of an operator-safe validation error.

Workflow protected:

row schema validation -> discount semantic validation -> effective price calculation -> import execution.

Implemented slice:

- Added schema-level validation rejecting percentage discounts greater than 100.
- Kept exactly 100 as valid.
- Added focused coverage proving `100` passes and `100.01` fails before effective price calculation.

Out of scope:

- Deciding whether fixed discounts greater than base price should be rejected.
- Changing supplier pricing CRUD behavior.
- Changing supplier/product resolution, import execution, hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import numeric/discount validation tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row schema validation -> discount semantic validation -> effective price calculation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price imports now reject impossible percentage discounts before they can create zero-cost procurement signals.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; percentage discount semantics are enforced in the import row schema with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: percentage discounts over 100 were accepted and relied on effective-price clamping.
- Smells deferred: fixed-discount-over-base policy; full supplier pricing-rule consolidation; live database fixtures for full validate/execute import with seeded supplier/product resolution.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `97` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-validation correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers procurement data integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves percentage cap validation; fixed discount policy and live seeded import execution remain open.
