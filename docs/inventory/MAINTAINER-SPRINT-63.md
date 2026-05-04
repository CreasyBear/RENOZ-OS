# Inventory Maintainer Sprint 63

This sprint follows Sprint 62's supplier price import execute re-resolution cleanup. The target is supplier price import approval-required safety: the bulk execute path should not write supplier prices and then attempt to create approval/audit requests as a second non-atomic step.

Status: Closed after Issue 1.

## Business Value

Supplier price imports write procurement cost data. If `approvalRequired` is enabled and the change-request step fails after the price write succeeds, operators see an error while the price has already changed. That is worse than a clean unsupported-flow error.

## Workflow Spine

execute supplier price import
-> approval-required guard
-> row processing
-> tenant-scoped row re-resolution
-> tenant-scoped price-list insert/update
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to guarding the unsafe approval-required branch in supplier price import execution.
- Preserve CSV parsing, preview validation, row normalization, row defaults, numeric/date/discount validation, non-approval import execution, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into implementing atomic approval-required imports, approval workflow redesign, live database fixtures, or transaction redesign.

## Issue Ledger

### 1. Approval-Required Imports Could Partially Write Before Audit Failure

Problem:

- `executePriceImport` wrote or updated a price-list row first.
- If `approvalRequired` was true, it then called `createPriceChangeRequest`.
- A change-request failure would be reported as a row error after the supplier price had already persisted.

Workflow protected:

execute import -> approval-required guard -> row processing -> tenant-scoped price-list insert/update.

Implemented slice:

- Added a pre-row-processing guard that rejects `approvalRequired` executions with an operator-safe message.
- Preserved non-approval import execution behavior.
- Added focused contract coverage proving the guard appears before row iteration.

Out of scope:

- Implementing approval-required import semantics.
- Moving price-change request creation into a shared transaction.
- Changing preview validation, non-approval execution, hooks, query keys, cache invalidation, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import execute contract tests, inventory sprint evidence.
- Workflow protected: execute supplier price import -> approval-required guard -> row processing -> tenant-scoped row re-resolution -> tenant-scoped price-list insert/update -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: operators no longer can trigger an approval-required import path that may report failure after mutating supplier procurement pricing data.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; unsafe approval-required execution is rejected before mutation.
- Tenant isolation and data integrity checked: no tenant predicates changed; non-approval execution still uses organization-scoped re-resolution and tenant-scoped update predicates; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: approval-required import execution performed non-atomic price write then change-request creation.
- Smells deferred: atomic approval-required supplier import workflow; full-batch transaction behavior; live database fixtures for seeded execute-import validation.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `99` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server mutation-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, tenant/data integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage proves the unsafe branch is guarded; a real approval-required import workflow still needs transactional design and live seeded tests before being enabled.
