# Inventory Maintainer Sprint 67

This sprint follows Sprint 66's direct supplier price-list upsert result guard. The target is supplier price agreement creation result safety: agreement creation should never silently return an empty insert result to callers.

Status: Closed after Issue 1.

## Business Value

Supplier price agreements represent negotiated procurement terms. When an operator creates an agreement, the workflow should either return the created agreement or fail clearly so the operator can refresh and retry instead of continuing from an undefined success state.

## Workflow Spine

supplier price agreement create
-> tenant-scoped agreement insert
-> persisted row verification
-> supplier pricing query/cache policy
-> procurement agreement readiness.

## Architecture Constraints

- Keep this sprint to the price agreement create result contract.
- Preserve agreement fields, status defaults, tenant predicates, audit metadata, query keys, cache behavior, response shape on success, and UI behavior.
- Do not broaden into agreement approval workflow, price agreement item management, soft-delete behavior, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Price Agreement Creation Could Return No Persisted Row

Problem:

- `createPriceAgreement` inserted a price agreement and assigned the first returned row to `result`.
- `updatePriceAgreement` and `deletePriceAgreement` already guard missing results.
- Creation returned `result` without verifying that insert returned a persisted row.

Workflow protected:

supplier price agreement create -> tenant-scoped insert -> persisted row verification.

Implemented slice:

- Added an operator-safe `ValidationError` if price agreement creation returns no row.
- Added focused contract coverage proving the guard exists before `return result`.

Out of scope:

- Changing create/update schemas.
- Changing agreement status workflow.
- Changing agreement item count semantics.
- Changing supplier pricing UI behavior.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier pricing server function, supplier price agreement contract tests, inventory sprint evidence.
- Workflow protected: supplier price agreement create -> tenant-scoped agreement insert -> persisted row verification -> supplier pricing query/cache policy -> procurement agreement readiness.
- Business value protected: supplier price agreement creation now fails clearly when persistence does not return a row instead of leaking an undefined success payload.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier pricing remains the domain owner; server mutation result contract is now explicit for agreement creation.
- Tenant isolation and data integrity checked: no tenant predicates changed; agreement creation still stamps organization and user audit context; no receiving, inventory, finance posting, approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: price agreement create returned `result` without verifying the insert returned a persisted row.
- Smells deferred: live seeded fixtures for price agreement insert failures; price agreement approval workflow audit review; soft-delete consistency review; transaction design for broader supplier pricing workflows.
- Gates run: focused supplier pricing tests (`4` files, `5` tests); focused ESLint; supplier + purchase-order unit suites (`35` files, `104` tests); TypeScript.
- Gates skipped: browser QA, because this was a server mutation-contract safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage protects the guard placement; live database fixtures would provide stronger proof for actual no-row insert behavior.
