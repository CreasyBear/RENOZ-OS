# Inventory Maintainer Sprint 53

This sprint follows Sprint 52's supplier price import default-normalization cleanup. The target is supplier price import preview summary honesty: unresolved supplier/product matches should be counted as invalid preview rows, not hidden behind a schema-error-only counter.

Status: Closed after Issue 1.

## Business Value

Supplier price import previews guide operator cleanup before procurement cost data is written. If the summary says `0` invalid rows while row-level results contain unresolved suppliers or products, operators can trust the wrong signal and lose time reconciling why import execution is blocked.

## Workflow Spine

supplier price import CSV
-> row validation
-> supplier/product resolution
-> preview row status
-> preview summary counts
-> operator cleanup
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to preview status classification and invalid-row counting.
- Preserve CSV parsing, row normalization, row defaults, numeric/date validation, supplier/product resolution semantics, execute import behavior, query keys, cache behavior, response shape keys, and UI behavior.
- Do not broaden into live database fixtures, preview UI redesign, execute-import flow changes, or supplier/product seed data.

## Issue Ledger

### 1. Preview Invalid Count Ignored Resolution Failures

Problem:

- Validation preview marked unresolved supplier/product rows as row-level `invalid`.
- The returned `invalidRows` summary counted only parser/schema errors.
- Resolution failures could therefore make the row list invalid while the summary underreported invalid rows.

Workflow protected:

row validation -> supplier/product resolution -> preview row status -> preview summary counts -> operator cleanup.

Implemented slice:

- Added a pure preview status helper for supplier price import resolution statuses.
- Added a pure invalid-row counter that counts actual validation result statuses.
- Updated preview `invalidRows` to count invalid validation results instead of only caught parser errors.
- Added focused coverage for resolved/duplicate versus unresolved/ambiguous status classification and summary counting.

Out of scope:

- Changing supplier/product resolution semantics.
- Changing preview UI copy, execute-import behavior, or response shape keys.
- Adding live database fixtures for seeded preview validation.

Closeout:

- Touched domains: supplier price import server function, supplier price import preview-summary tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row validation -> supplier/product resolution -> preview row status -> preview summary counts -> operator cleanup -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: preview summaries now count unresolved supplier/product matches as invalid rows, making cleanup guidance more honest before procurement price import execution.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; preview status and summary counting rules are centralized as pure helpers with focused coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: preview summary invalid count was coupled to the parser error ledger instead of the actual validation result statuses.
- Smells deferred: live database fixtures for seeded validate/execute import previews; preview UI copy review; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `89` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server preview-summary correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers honest UI states, operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves status/counting behavior; live seeded preview validation remains needed to exercise the full server function against real supplier/product resolution data.
