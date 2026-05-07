# Inventory Maintainer Sprint 108: Low-Stock Alert Relation Scope

## Status

Closed in commit-ready state.

## Issue 1: Low-Stock Alert Product And Location Joins Were ID-Only

### Problem

`getLowStockAlerts` scoped inventory rows to the active organization, but joined product and warehouse location details by ID only. That made the read path rely on implicit relational hygiene instead of carrying the tenant boundary through every relation used to render alert rows.

### Workflow Spine

Product/warehouse low-stock alert surface
-> `useLowStockAlerts`
-> `queryKeys.products.stockAlerts`
-> `getLowStockAlerts`
-> `inventory`
-> active `products` and tenant-scoped warehouse `locations`
-> product stock alert rows.

### Touched Domains

- Product inventory server function.
- Product low-stock alert tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Low-stock alerts drive replenishment and warehouse decisions for battery stock. Alert rows should never enrich an organization-scoped inventory row with product or location metadata outside the active tenant, and soft-deleted products should not appear as replenishment candidates.

### Scope Constraints

- Do not change low-stock alert thresholds, response shape, hook/query-key behavior, mutation invalidations, UI layout, or alert copy.
- Do not change inventory writes, movement rows, valuation, finance, or serialized lineage behavior.
- Keep this as a server read-scope hardening slice.

### Changes

- Scoped the `products` join in `getLowStockAlerts` by `ctx.organizationId`.
- Excluded soft-deleted products from low-stock alert rows.
- Scoped the warehouse `locations` join by `ctx.organizationId`.
- Added a focused source contract guarding the low-stock alert relation joins.

### Standards Checked

- Domain ownership: product alert reads now carry tenant scope through product and warehouse metadata joins.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read boundary hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: inventory row scope, joined product scope, and joined location scope all remain under the authenticated organization.
- Query/cache contract: unchanged from Sprint 107; threshold/location alert keys still match the read payload.
- UI states/error handling: alert rows continue to return the same shape, with inaccessible/deleted relation rows excluded by the read query.
- Reviewability: one server read block, one focused contract, one closeout note.

### Smells Removed

- ID-only product join in `getLowStockAlerts`.
- ID-only warehouse location join in `getLowStockAlerts`.
- Soft-deleted products could still enrich low-stock alert rows.

### Deferred

- Broader product inventory read-model joins still deserve a separate pass; this sprint only closes the low-stock alert read path flagged in Sprint 107.
- Browser QA was not selected because this is a server read-scope hardening slice with no intended layout change.

### Gates

- Passed: focused product low-stock alert tenant-scope contract.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low for low-stock alert relation scope. Excluding soft-deleted products may remove stale alert rows that previously appeared through legacy product metadata, which is the intended behavior.
