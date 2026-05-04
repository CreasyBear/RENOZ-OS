# Inventory Maintainer Sprint 61

This sprint follows Sprint 60's supplier price import percentage-discount cap cleanup. The target is supplier price import quantity-window validation: minimum order quantity should not exceed maximum order quantity.

Status: Closed after Issue 1.

## Business Value

Supplier price imports define ordering constraints for battery procurement. A row with `minOrderQty` greater than `maxOrderQty` creates an impossible purchasing window and should fail before supplier/product resolution or persistence.

## Workflow Spine

supplier price import CSV
-> row schema validation
-> quantity-window validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price import quantity-window validation.
- Preserve CSV parsing, row normalization, row defaults, currency/numeric/date validation, discount semantic validation, supplier/product resolution semantics, execute import behavior, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into MOQ/MOQ pricing policy, supplier pricing CRUD, live database fixtures, or template upload UX.

## Issue Ledger

### 1. Minimum Order Quantity Could Exceed Maximum Order Quantity

Problem:

- `minOrderQty` and `maxOrderQty` were individually validated as positive whole numbers.
- The row schema did not validate the relationship between them.
- Impossible order quantity windows could flow into supplier pricing data and procurement decisions.

Workflow protected:

row schema validation -> quantity-window validation -> supplier/product resolution -> import execution.

Implemented slice:

- Added schema-level validation rejecting rows where `minOrderQty` is greater than `maxOrderQty`.
- Kept equal min/max values valid.
- Added focused coverage proving equal quantity windows pass and impossible windows fail.

Out of scope:

- Changing quantity defaults or supplier pricing policy.
- Changing supplier/product resolution, import execution, hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import numeric/quantity validation tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row schema validation -> quantity-window validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price imports now reject impossible order quantity windows before they can affect procurement pricing data.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; quantity-window validation lives in the import row schema with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: individually valid min/max order quantities could still form an impossible ordering window.
- Smells deferred: MOQ/MOQ pricing policy; live database fixtures for full validate/execute import with seeded supplier/product resolution; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `98` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-validation correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers procurement data integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves quantity-window validation; live seeded import execution remains needed for end-to-end import confidence.
