# Inventory Maintainer Sprint 45

This sprint follows Sprint 44's supplier price import persistence-guard cleanup. The target is supplier price import numeric validation: imported price, discount, and quantity fields should fail with operator-safe validation messages when they are not finite, non-negative, or whole-number values.

Status: Closed after Issue 1.

## Business Value

Supplier price imports maintain procurement cost data for battery stock. Invalid numeric values should be rejected before supplier/product resolution or persistence so operators do not accidentally import `NaN` or malformed cost signals into procurement workflows.

## Workflow Spine

supplier price import CSV
-> price-import server function
-> row normalization
-> numeric field validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to numeric parsing and validation inside supplier price import row parsing.
- Preserve row normalization, CSV parsing, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into import execution transactions, approval-required behavior, live database fixtures, or pricing UX.

## Issue Ledger

### 1. Price Import Numeric Fields Could Parse To Invalid Numbers

Problem:

- `basePrice` and `discountValue` used raw `parseFloat`.
- `minOrderQty` and `maxOrderQty` used raw `parseInt`.
- Invalid values could become `NaN` or be partially parsed before workflow-specific validation and persistence.

Workflow protected:

CSV import -> row normalization -> numeric validation -> supplier/product resolution -> import execution.

Implemented slice:

- Added explicit non-negative decimal parsing for base price and discount value.
- Added explicit positive whole-number parsing for minimum and maximum order quantities.
- Added field-specific validation messages for invalid, negative, fractional, or zero quantity inputs.
- Routed validation through an exported pure parser helper used by the import validation flow.
- Added focused tests for currency-style numeric parsing and invalid numeric import fields.

Out of scope:

- Changing row normalization, supplier/product resolution, or import execution semantics.
- Changing approval-required behavior.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import numeric-validation tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row normalization -> numeric field validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: invalid supplier price, discount, and quantity fields are rejected before they can become malformed procurement cost signals for battery stock.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; numeric parsing stays local to the import server module and is covered as a pure helper.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: raw `parseFloat`/`parseInt` transforms could create `NaN` or partially parsed numeric values before workflow-specific validation.
- Smells deferred: live database fixtures for full validate/execute import with seeded supplier/product resolution; approval-required import semantics; price import UX hardening.
- Gates run: focused price import/pricing tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server numeric-validation correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves the numeric parsing contract; live DB fixtures are still needed to prove full import validation and execution under seeded supplier/product data.
