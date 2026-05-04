# Inventory Maintainer Sprint 51

This sprint follows Sprint 50's supplier price import template domain-cleanliness cleanup. The target is supplier price import cell normalization: padded CSV cells and CRLF artifacts should be normalized before schema validation and supplier/product resolution.

Status: Closed after Issue 1.

## Business Value

Operators often prepare supplier price imports in spreadsheet tools that preserve surrounding spaces or emit CRLF line endings. Valid RENOZ battery price rows should not fail because `active\r`, ` percentage `, or padded supplier/product identifiers leak into validation and resolution.

## Workflow Spine

supplier price import CSV
-> CSV parsing
-> raw cell normalization
-> row schema validation
-> supplier/product resolution
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to raw cell normalization at the import row builder boundary.
- Preserve header aliasing, row order, defaults, numeric validation, date validation, supplier/product resolution, execute import behavior, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into CSV parser replacement, file upload UX, live database fixtures, or seeded supplier/product resolution.

## Issue Ledger

### 1. Raw CSV Cell Whitespace Could Break Valid Imports

Problem:

- `buildPriceImportRowData` copied raw cell values into the schema input.
- Padded enum cells such as ` percentage ` or CRLF status cells such as `active\r` could fail validation despite representing valid template values.
- Padded supplier codes, product names, and SKUs could also leak into supplier/product resolution and produce false unresolved rows.

Workflow protected:

CSV parsing -> raw cell normalization -> row schema validation -> supplier/product resolution.

Implemented slice:

- Added a raw import cell normalizer.
- Applied it to header-based and no-header row mapping before defaults and schema validation.
- Added focused coverage proving padded cells and CRLF artifacts normalize before parsing.

Out of scope:

- Replacing the CSV parser.
- Changing header alias behavior, row defaults, numeric/date validation, supplier/product resolution, or import execution semantics.
- Changing hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import row-normalization tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> CSV parsing -> raw cell normalization -> row schema validation -> supplier/product resolution -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: valid spreadsheet-exported supplier price imports with padded cells or CRLF endings are less likely to produce false validation or resolution failures.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; normalization happens at the import row builder boundary with focused parser coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: raw CSV cell whitespace could leak into enum validation and supplier/product resolution.
- Smells deferred: CSV parser replacement for multiline quoted fields; live database fixtures for full validate/execute import with seeded supplier/product resolution; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`31` files, `86` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server row-normalization correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: focused parser coverage proves raw cell normalization; multiline quoted CSV fields and live seeded import execution remain unverified.
