# Inventory Maintainer Sprint 11

This sprint follows Sprint 10's WMS comparison-unit contract. The target is valuation permission hygiene: inventory finance and valuation reads must declare the inventory permission they require instead of relying on authentication-only defaults.

Status: Closed after Issue 1.

## Business Value

Valuation, cost layers, COGS previews, aging, turnover, and finance integrity are business-sensitive inventory surfaces. They support warehouse truth and finance confidence for RENOZ Energy. These reads should be available to users with inventory read access, but they should not be implicit authenticated-user reads.

## Workflow Spine

valuation route/report
-> valuation hook
-> inventory valuation server function
-> explicit permission gate
-> organization-scoped inventory/cost-layer query
-> operator finance/warehouse decision.

## Architecture Constraints

- Keep this sprint to inventory valuation server functions and permission contract tests.
- Use `PERMISSIONS.inventory.read` for valuation reads and simulations.
- Preserve `PERMISSIONS.inventory.manage` for manual cost-layer creation, finance reconciliation, and weighted-average-cost update.
- Do not change SQL, returned shapes, query keys, cache policy, UI, mutations, cost-layer math, or valuation calculations.
- Add focused static tests so future valuation endpoints do not regress to bare `withAuth()`.

## Issue Ledger

### 1. Valuation Reads Need Explicit Inventory Read Permission

Problem:

- Several `valuation.ts` server functions used bare `withAuth()`.
- The queries were organization-scoped, but the permission contract was implicit.
- That is weaker than adjacent inventory read surfaces such as WMS dashboard, forecasting, stock counts, and product cost layers.

Workflow protected:

valuation report/hook -> valuation server function -> permission gate -> tenant-scoped finance inventory read.

Implemented slice:

- Updated valuation read/server-preview functions to use `withAuth({ permission: PERMISSIONS.inventory.read })`.
- Left existing valuation mutation/repair functions on `PERMISSIONS.inventory.manage`.
- Added a focused permission contract test that rejects bare `withAuth()` in valuation and locks expected read/manage permission counts.

Out of scope:

- Changing role-to-permission mappings.
- Changing inventory valuation SQL or finance integrity calculations.
- Broad auth cleanup across orders, support, alerts, or locations.
- UI or browser QA.

Closeout:

- Touched domains: inventory valuation server functions, inventory valuation permission tests, inventory sprint evidence.
- Workflow protected: valuation UI/hook -> valuation server function -> explicit inventory permission -> tenant-scoped cost-layer and finance inventory reads.
- Business value protected: sensitive inventory valuation and finance-integrity data now has an explicit permission gate while preserving read access for authorized inventory users.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; server functions now state their permission contract; organization scoping remains unchanged.
- Tenant isolation and data integrity checked: every touched function already filters by `ctx.organizationId`; no SQL, transactions, cost-layer math, valuation math, serialized lineage, or inventory movement behavior changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: bare authentication-only valuation reads.
- Smells deferred: other domains still have bare `withAuth()` calls and need their own domain-sliced permission audits.
- Gates run: focused valuation permission/schema tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a server permission-contract change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, explicit contracts, meaningful tests, and reviewable domain slices.
- Residual risk: role-permission assignment quality is outside this slice; this only makes the valuation server boundary explicit.
