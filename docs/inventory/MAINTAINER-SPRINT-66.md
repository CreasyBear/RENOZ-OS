# Inventory Maintainer Sprint 66

This sprint follows Sprint 65's supplier price-list audit metadata cleanup. The target is direct supplier price-list upsert result safety: the mutation should never silently return an empty write result to callers.

Status: Closed after Issue 1.

## Business Value

Supplier price lists drive procurement cost decisions. When an operator creates or replaces a supplier price, the workflow should either return the persisted price row or fail with a clear, retryable message. Silent undefined results make hooks and UI states harder to reason about.

## Workflow Spine

direct supplier price-list upsert
-> product resolution
-> existing price-list detection
-> tenant-scoped price-list insert/update
-> persisted row verification
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to the direct supplier price-list upsert result contract.
- Preserve price calculations, product resolution, existing-price detection, tenant predicates, audit metadata, query keys, cache behavior, response shape on success, and UI behavior.
- Do not broaden into import execution, approval-required imports, price history redesign, transaction redesign, live database fixtures, or UI changes.

## Issue Ledger

### 1. Direct Price-List Upsert Could Return No Persisted Row

Problem:

- `createPriceList` handled both insert and existing-row update.
- Both branches assigned the first returned row to `result`.
- Unlike `updatePriceList`, `deletePriceList`, bulk update, and import execution, the upsert did not verify `result` before returning it.

Workflow protected:

direct supplier price-list upsert -> tenant-scoped insert/update -> persisted row verification.

Implemented slice:

- Added an operator-safe `ValidationError` if the direct price-list upsert write returns no row.
- Added focused contract coverage proving the guard exists before `return result`.

Out of scope:

- Changing create/update schemas.
- Changing upsert matching semantics.
- Changing direct price-list UI behavior.
- Changing supplier price import behavior.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier pricing server function, supplier price-list upsert contract tests, inventory sprint evidence.
- Workflow protected: direct supplier price-list upsert -> product resolution -> existing price-list detection -> tenant-scoped price-list insert/update -> persisted row verification -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: direct supplier pricing now fails clearly when persistence does not return a row instead of leaking an undefined success payload.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier pricing remains the domain owner; server mutation result contract is now explicit.
- Tenant isolation and data integrity checked: no tenant predicates changed; direct price-list writes remain organization-scoped; no receiving, inventory, finance posting, approval, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: direct price-list upsert returned `result` without verifying the write returned a persisted row.
- Smells deferred: live seeded fixtures for direct price-list upsert write failures; transaction design for broader supplier price workflows; approval-required import workflow.
- Gates run: focused supplier pricing tests (`3` files, `4` tests); focused ESLint; supplier + purchase-order unit suites (`34` files, `103` tests); TypeScript.
- Gates skipped: browser QA, because this was a server mutation-contract safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage protects the guard placement; live database fixtures would provide stronger proof for actual no-row write behavior.
