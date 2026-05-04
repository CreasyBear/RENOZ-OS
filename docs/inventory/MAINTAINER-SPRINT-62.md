# Inventory Maintainer Sprint 62

This sprint follows Sprint 61's supplier price import quantity-window validation cleanup. The target is supplier price import execute re-resolution: execution should derive supplier/product identities inside the authenticated server function instead of trusting submitted validation payload IDs.

Status: Closed after Issue 1.

## Business Value

Supplier price import execution writes procurement cost data. Validated-row payloads can be stale or client-mutated, so execution should use fresh organization-scoped supplier/product resolution before inserting or updating price-list records.

## Workflow Spine

validated supplier price import rows
-> execute import server function
-> tenant-scoped row re-resolution
-> resolved identity assertion
-> tenant-scoped price-list insert/update
-> optional price-change audit request
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to execute-import supplier/product re-resolution and write-value trust boundaries.
- Preserve CSV parsing, preview validation, row normalization, row defaults, numeric/date/discount validation, response shape keys, query keys, cache behavior, and UI behavior.
- Do not broaden into live database fixtures, transaction redesign, approval-required flow changes, or supplier/product seed data.

## Issue Ledger

### 1. Execute Import Trusted Submitted Resolution IDs

Problem:

- Sprint 55 asserted that submitted resolution IDs were present.
- Execution still used client-submitted `supplierId`, `productId`, and `existingPriceListId`.
- A stale or mutated validation payload could carry identities that no longer match current organization-scoped resolution.

Workflow protected:

validated rows -> execute import server function -> tenant-scoped row re-resolution -> resolved identity assertion -> tenant-scoped price-list insert/update.

Implemented slice:

- Re-resolves each import row inside `executePriceImport` using `ctx.organizationId`, supplier code, product SKU/name, and effective date.
- Fails unresolved execution rows with operator-safe validation errors.
- Builds write values, update target, and result action from the fresh execution resolution.
- Updated focused source contract coverage so execution identity usage is no longer tied to submitted row resolution IDs.

Out of scope:

- Reworking preview validation.
- Adding a transaction around the full import batch.
- Changing approval-required behavior.
- Adding live database fixtures for seeded execute-import validation.

Closeout:

- Touched domains: supplier price import server function, supplier price import execute contract tests, inventory sprint evidence.
- Workflow protected: validated supplier price import rows -> execute import server function -> tenant-scoped row re-resolution -> resolved identity assertion -> tenant-scoped price-list insert/update -> optional price-change audit request -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: supplier price import execution now derives fresh organization-scoped supplier/product identities before procurement cost writes.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier price imports remain the workflow owner; execute writes now use server-side re-resolution rather than trusting client-submitted identity payloads.
- Tenant isolation and data integrity checked: re-resolution uses `ctx.organizationId`; tenant-scoped update predicates remain unchanged; insert/update values use asserted fresh supplier/product IDs; no receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: execute import trusted submitted resolution IDs after validation.
- Smells deferred: full-batch transaction behavior; live database fixtures for seeded execute-import validation; approval-required import semantics.
- Gates run: focused supplier price import tests; focused ESLint; supplier + purchase-order unit suites (`32` files, `98` tests); TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server mutation-boundary hardening change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, tenant/data integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contract coverage proves the re-resolution boundary is present; live seeded execute-import tests remain needed to prove full DB behavior under realistic supplier/product data.
