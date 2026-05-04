# Inventory Maintainer Sprint 56

This sprint follows Sprint 55's supplier price import execute trust-boundary hardening. The target is supplier price import preview summary error honesty: the summary error ledger should include resolution failures, not only parser/schema exceptions.

Status: Closed after Issue 1.

## Business Value

Supplier price import previews should give operators a coherent cleanup list. If unresolved suppliers or products are counted as invalid but omitted from the summary error ledger, the preview can still under-explain why procurement price imports are blocked.

## Workflow Spine

supplier price import CSV
-> row validation
-> supplier/product resolution
-> preview row status
-> preview valid/invalid summary counts
-> preview summary error ledger
-> operator cleanup
-> import execution
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to preview summary error construction.
- Preserve CSV parsing, row normalization, row defaults, numeric/date validation, supplier/product resolution semantics, execute import behavior, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into live database fixtures, preview UI redesign, execute-import flow changes, or supplier/product seed data.

## Issue Ledger

### 1. Preview Summary Errors Were Parser-Only

Problem:

- Sprint 53 and Sprint 54 made invalid/valid counts follow validation result status.
- `summary.errors` still came from the parser/schema exception ledger only.
- Invalid rows caused by supplier/product resolution could therefore be counted as invalid without appearing in the top summary error list.

Workflow protected:

row validation -> supplier/product resolution -> preview row status -> preview summary error ledger -> operator cleanup.

Implemented slice:

- Added a centralized preview summary builder.
- Included parser/schema errors and resolution failure messages in the same summary ledger.
- Preserved the existing `summary.errors` and `summary.hasMoreErrors` response keys.
- Added focused coverage for resolution messages and summary overflow signaling.

Out of scope:

- Changing supplier/product resolution semantics.
- Changing preview UI copy, execute-import behavior, or response shape keys.
- Adding live database fixtures for seeded preview validation.

Closeout:

- Touched domains: supplier price import server function, supplier price import preview-summary tests, inventory sprint evidence.
- Workflow protected: supplier price import CSV -> row validation -> supplier/product resolution -> preview row status -> preview valid/invalid summary counts -> preview summary error ledger -> operator cleanup -> import execution -> procurement cost readiness.
- Business value protected: preview summaries now explain invalid resolution rows alongside parser errors, giving operators a more coherent cleanup path before procurement price import execution.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; preview summary construction is centralized as a pure helper with focused coverage.
- Tenant isolation and data integrity checked: no tenant predicates changed; organization-scoped supplier/product resolution and execute-import writes remain unchanged; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: preview summary errors were coupled to parser exceptions and could omit invalid supplier/product resolution results.
- Smells deferred: live database fixtures for seeded validate/execute import previews; preview UI copy review; template upload UX hardening.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `93` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server preview-summary correction with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers honest UI states, operator-safe errors, procurement data integrity, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: pure helper coverage proves summary construction behavior; live seeded preview validation remains needed to exercise the full server function against real supplier/product resolution data.
