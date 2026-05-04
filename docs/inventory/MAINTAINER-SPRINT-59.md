# Inventory Maintainer Sprint 59

This sprint follows Sprint 58's supplier price import currency-code validation cleanup. The target is supplier price import discount semantics: volume discounts should not be accepted by the import path while effective-price calculation ignores volume semantics.

Status: Closed after Issue 1.

## Business Value

Supplier price imports write procurement cost data. If an operator imports a volume discount and the system silently calculates effective price as the base price, the imported row looks discounted but does not price that way for ordering decisions.

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

- Keep this sprint to supplier price import discount semantic validation.
- Preserve CSV parsing, row normalization, row defaults, currency/numeric/date validation, supplier/product resolution semantics, execute import behavior, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into full volume-tier pricing, product pricing tiers, supplier pricing CRUD, live database fixtures, or template upload UX.

## Issue Ledger

### 1. Volume Discounts Were Accepted But Not Priced

Problem:

- Supplier price imports accepted `discountType: "volume"`.
- The supplier effective-price helper only applies `percentage` and `fixed`; volume falls through to base price.
- This could silently persist discount metadata that does not affect imported effective price.

Workflow protected:

row schema validation -> discount semantic validation -> effective price calculation -> import execution.

Implemented slice:

- Added schema-level validation rejecting `volume` discounts in supplier price imports.
- Added an operator-safe validation message explaining that volume discounts are not supported in supplier price imports.
- Added focused coverage proving volume discounts fail before effective price calculation.

Out of scope:

- Implementing volume-tier supplier pricing semantics.
- Changing supplier pricing CRUD behavior.
- Changing supplier/product resolution, import execution, hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import numeric/discount validation tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row schema validation -> discount semantic validation -> effective price calculation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price imports no longer silently accept volume discount rows whose effective price would be calculated as the undiscounted base price.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; unsupported discount semantics are rejected in the import row schema with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: import accepted a discount type whose pricing semantics were not implemented in the supplier effective-price path.
- Smells deferred: full supplier volume-tier pricing semantics; live database fixtures for full validate/execute import with seeded supplier/product resolution; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `96` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-validation correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers procurement data integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves unsupported volume imports are rejected; broader supplier pricing CRUD still has separate volume semantics debt outside this import slice.
