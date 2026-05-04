# Inventory Maintainer Sprint 57

This sprint follows Sprint 56's supplier price import summary-error cleanup. The target is supplier price import control-field normalization: template control fields should tolerate common spreadsheet casing without failing validation or persisting inconsistent currency values.

Status: Closed after Issue 1.

## Business Value

Operators preparing supplier price imports may type `Active`, `Percentage`, or `aud` while editing spreadsheet templates. These values represent valid procurement metadata and should normalize at import boundaries instead of creating avoidable cleanup work or inconsistent currency casing.

## Workflow Spine

supplier price import CSV
-> CSV parsing
-> raw cell normalization
-> control-field normalization
-> row schema validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to supplier price import row-builder normalization for control fields.
- Preserve header aliasing, row order, row defaults, numeric/date validation, supplier/product resolution semantics, execute import behavior, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into currency allowlists, localization, CSV parser replacement, live database fixtures, or template upload UX.

## Issue Ledger

### 1. Control Field Casing Could Break Valid Imports

Problem:

- Sprint 51 normalized raw cell whitespace and CRLF artifacts.
- `discountType` and `status` still required exact lowercase values before schema validation.
- `currency` accepted arbitrary casing and could persist lowercase values such as `aud`.

Workflow protected:

CSV parsing -> raw cell normalization -> control-field normalization -> row schema validation -> supplier/product resolution.

Implemented slice:

- Normalized `currency` cells to uppercase in the row builder.
- Normalized `discountType` and `status` cells to lowercase in the row builder.
- Kept supplier/product text and numeric/date cells untouched except for existing trimming.
- Added focused coverage proving mixed-case control fields normalize before schema validation.

Out of scope:

- Adding a strict currency allowlist.
- Changing discount or status semantics.
- Changing supplier/product resolution, import execution, hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import row-normalization tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> CSV parsing -> raw cell normalization -> control-field normalization -> row schema validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: valid spreadsheet-edited supplier price imports with mixed-case currency, discount type, or status values are less likely to fail or persist inconsistent procurement metadata.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; control-field normalization happens at the import row-builder boundary with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: enum-like import fields required exact casing, and currency casing could persist inconsistently.
- Smells deferred: strict currency allowlist; live database fixtures for full validate/execute import with seeded supplier/product resolution; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `94` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-normalization correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves control-field normalization; live seeded import execution remains needed for end-to-end import confidence.
