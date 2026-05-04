# Inventory Maintainer Sprint 43

This sprint follows Sprint 42's supplier price-list bulk-update honesty cleanup. The target is supplier price import row normalization: the published CSV template headers and no-header column order should normalize into the field names expected by the import schema before validation and supplier/product resolution.

Status: Closed after Issue 1.

## Business Value

Supplier price imports should help operators maintain procurement cost data quickly. If the advertised template produces keys that do not match the schema, valid supplier battery price rows fail before resolution, turning a high-leverage workflow into manual cleanup.

## Workflow Spine

supplier price import CSV
-> price-import server function
-> CSV row parse
-> template header/no-header normalization
-> price import schema validation
-> organization-scoped supplier/product resolution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to row normalization before supplier price import validation.
- Preserve CSV parser behavior, schema validation, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into price import execution semantics, approval-required behavior, live database fixtures, or pricing UX.

## Issue Ledger

### 1. Price Import Rows Used Normalized Header Strings Instead Of Schema Keys

Problem:

- The import template emits headers like `Supplier Code`, `Product Name`, and `Base Price`.
- Validation normalized those headers to lowercase strings like `suppliercode` and `productname`.
- The schema expects camel-case field names like `supplierCode` and `productName`.
- No-header rows used the same lowercase keys, so standard column-order imports had the same mismatch.

Workflow protected:

CSV import -> template/no-header row normalization -> schema validation -> supplier/product resolution.

Implemented slice:

- Added a canonical supplier price import column list matching the import schema field names.
- Added header aliases that normalize the published template headers into schema keys.
- Added no-header row normalization using the published template column order and defaults.
- Replaced ad hoc lowercase header keys in validation with the shared row-normalization helper.
- Exported the row-normalization helper for focused unit coverage.
- Added focused tests for published template headers and no-header column-order imports.

Out of scope:

- Changing CSV parser behavior, price import execution, or approval-required behavior.
- Changing supplier/product resolution.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import row-normalization tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> CSV row parse -> template header/no-header normalization -> price import schema validation -> organization-scoped supplier/product resolution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: the published supplier price import template can now feed valid battery supplier price rows into schema validation instead of failing because display headers did not match schema field names.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; row normalization is local to the import server module and covered as a pure helper.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: template headers and no-header rows normalized to lowercase strings like `suppliercode` while the schema expected camel-case fields like `supplierCode`.
- Smells deferred: live database fixtures for full validate/execute import with seeded supplier/product resolution; approval-required import semantics; price import UX hardening.
- Gates run: focused price import/pricing tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-normalization correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator workflow truth, finance integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves the template/no-header mapping contract; live DB fixtures are still needed to prove full import validation and execution under seeded supplier/product data.
