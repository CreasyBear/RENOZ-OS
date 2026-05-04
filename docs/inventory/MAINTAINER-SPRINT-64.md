# Inventory Maintainer Sprint 64

This sprint follows Sprint 63's approval-required execution guard. The target is supplier price import contract honesty: once approval-required imports are rejected before row processing, the execute function should not retain unreachable approval change-request writes or response artifacts that imply the workflow is implemented.

Status: Closed after Issue 1.

## Business Value

Supplier price imports support procurement cost readiness. Operators and maintainers need the execution path to say exactly what it does: non-approval imports mutate supplier prices; approval-required imports are unsupported until a transactional workflow exists.

## Workflow Spine

execute supplier price import
-> approval-required guard
-> row processing
-> tenant-scoped row re-resolution
-> tenant-scoped price-list insert/update
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to removing dead approval-required execution code after the guard.
- Preserve preview validation, row normalization, non-approval import execution, re-resolution, tenant-scoped insert/update predicates, query keys, cache behavior, and UI behavior.
- Do not broaden into implementing approval-required imports, approval workflow redesign, transaction redesign, live database fixtures, or pricing UI changes.

## Issue Ledger

### 1. Guarded Approval Imports Still Left Unreachable Change-Request Code

Problem:

- Sprint 63 rejected `approvalRequired` imports before row processing.
- The old post-write `createPriceChangeRequest` branch remained inside row processing even though it could no longer run.
- The function still accepted `importReason` and returned `changeRequests`, both now false signals for an unsupported workflow.

Workflow protected:

execute import -> approval-required guard -> row processing -> tenant-scoped price-list insert/update.

Implemented slice:

- Removed the unused `createPriceChangeRequest` import from supplier price imports.
- Removed the unreachable post-persistence approval change-request branch.
- Removed the unused `importReason` input field and always-empty `changeRequests` response field.
- Added contract coverage proving the guarded execution function no longer retains approval change-request write artifacts.

Out of scope:

- Implementing atomic approval-required import behavior.
- Changing price history approval semantics.
- Changing non-approval import response result rows.
- Changing supplier price import UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier price import server function, supplier price import execute contract tests, inventory sprint evidence.
- Workflow protected: execute supplier price import -> approval-required guard -> row processing -> tenant-scoped row re-resolution -> tenant-scoped price-list insert/update -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: maintainers no longer see code that implies unsupported approval-required imports still create price change requests after mutating procurement pricing.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price import remains the workflow owner; the server contract now reflects actual supported behavior.
- Tenant isolation and data integrity checked: no tenant predicates changed; non-approval execution still uses organization-scoped re-resolution and organization-scoped update predicates; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: unreachable approval-request mutation dependency; unused `importReason` execution input; always-empty `changeRequests` response artifact.
- Smells deferred: atomic approval-required supplier import workflow; full-batch transaction behavior; live database fixtures for seeded execute-import validation; supplier price import UI affordance hardening.
- Gates run: focused supplier price import tests (`9` files, `33` tests); focused ESLint; supplier + purchase-order unit suites (`32` files, `100` tests); TypeScript.
- Gates skipped: browser QA, because this was a server mutation-contract cleanup with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers honest contracts, safe mutation boundaries, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage protects the unsupported approval branch cleanup; a real approval-required import workflow still needs transaction design and live seeded tests before it should be exposed.
