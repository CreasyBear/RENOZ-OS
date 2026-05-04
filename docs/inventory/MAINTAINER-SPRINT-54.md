# Inventory Maintainer Sprint 54

This sprint follows Sprint 53's supplier price import preview invalid-count cleanup. The target is supplier price import valid-count honesty: the preview `validRows` summary should count rows whose validation result is actually valid, not every row that merely passed schema parsing before supplier/product resolution.

Status: Closed after Issue 1.

## Business Value

Supplier price import previews are operator decision support. A row with an unresolved supplier or ambiguous product should not inflate the valid count just because its CSV fields parsed; otherwise operators see conflicting summary cards and row-level cleanup instructions.

## Workflow Spine

supplier price import CSV
-> row validation
-> supplier/product resolution
-> preview row status
-> preview valid/invalid summary counts
-> operator cleanup
-> import execution
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to preview valid-row summary counting and internal naming clarity.
- Preserve CSV parsing, row normalization, row defaults, numeric/date validation, supplier/product resolution semantics, execute import behavior, query keys, cache behavior, response shape keys, and UI behavior.
- Do not broaden into live database fixtures, preview UI redesign, execute-import flow changes, or supplier/product seed data.

## Issue Ledger

### 1. Preview Valid Count Included Resolution Failures

Problem:

- Sprint 53 made `invalidRows` count actual invalid validation result statuses.
- `validRows` still counted every row that passed schema parsing, including rows later marked invalid by supplier/product resolution.
- The internal bucket name `validRows` obscured that it contained resolution candidates rather than truly valid preview rows.

Workflow protected:

row validation -> supplier/product resolution -> preview row status -> preview valid/invalid summary counts -> operator cleanup.

Implemented slice:

- Added a pure valid-row counter that counts actual validation result statuses.
- Updated preview `validRows` to count valid validation results.
- Renamed the internal parsed-row bucket to `resolvedCandidateRows` so summary semantics are easier to reason about.
- Added focused coverage for status-based valid-row counting.

Out of scope:

- Changing supplier/product resolution semantics.
- Changing preview UI copy, execute-import behavior, or response shape keys.
- Adding live database fixtures for seeded preview validation.

Closeout:

- Touched domains: supplier price import server function, supplier price import preview-summary tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row validation -> supplier/product resolution -> preview row status -> preview valid/invalid summary counts -> operator cleanup -> import execution -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: preview summaries now keep valid and invalid counts aligned to row status, reducing contradictory operator guidance before procurement price import execution.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; preview summary counting rules are centralized as pure helpers with focused coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: preview valid count was coupled to schema-parse success instead of actual validation result status, and internal naming hid the distinction.
- Smells deferred: live database fixtures for seeded validate/execute import previews; preview UI copy review; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `90` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server preview-summary correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers honest UI states, operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves status/counting behavior; live seeded preview validation remains needed to exercise the full server function against real supplier/product resolution data.
