# Inventory Maintainer Sprint 12

This sprint follows Sprint 11's valuation permission cleanup. The target is alert permission hygiene: warehouse alert rules, triggered alerts, and alert analytics should declare their inventory permission boundary instead of relying on authentication-only defaults.

Status: Closed after Issue 1.

## Business Value

Inventory alerts drive operator triage for low stock, out of stock, expiry, overstock, and slow-moving inventory. RENOZ operators need alert reads to be available to inventory readers, while alert-rule mutation and acknowledgement should remain explicit writes. This keeps warehouse monitoring useful without making sensitive operational state an implicit authenticated-user surface.

## Workflow Spine

inventory alert route/panel
-> `useAlerts` / `useTriggeredAlerts` / `useAlertAnalytics`
-> alert server function
-> explicit inventory permission gate
-> organization-scoped alert/product/location query
-> operator warehouse triage.

## Architecture Constraints

- Keep this sprint to inventory alert server permissions and tenant-related detail joins.
- Use `PERMISSIONS.inventory.read` for alert list, detail, triggered-alert, and analytics reads.
- Use `PERMISSIONS.inventory.manage` for alert rule creation/update/delete, scheduled/manual trigger updates, and acknowledgement writes.
- Do not change alert schemas, query keys, cache policy, UI, alert triggering math, allocatable availability semantics, or mutation payloads.
- Add focused static tests so future alert endpoints do not regress to bare `withAuth()`.

## Issue Ledger

### 1. Inventory Alerts Need Explicit Read/Manage Permission Contracts

Problem:

- Several alert server functions used bare `withAuth()`.
- Alert reads and alert acknowledgement did not state whether they were read or write operations at the permission boundary.
- Alert detail lookups for related product/location records used IDs from an organization-scoped alert row, but the related reads did not explicitly include organization filters.

Workflow protected:

alert list/detail/triggered/analytics hooks -> alert server function -> permission gate -> organization-scoped alert context -> warehouse triage.

Implemented slice:

- Updated alert read functions to use `withAuth({ permission: PERMISSIONS.inventory.read })`.
- Updated alert acknowledgement to use `withAuth({ permission: PERMISSIONS.inventory.manage })`.
- Preserved existing manage gates for create/update/delete/manual trigger.
- Added explicit organization filters to alert detail product/location reads and triggered-alert detail product/location reads.
- Added a focused permission contract test for read/manage counts and organization-scoped related reads.

Out of scope:

- Changing role-to-permission mappings.
- Changing alert triggering SQL, allocatable stock semantics, fallback alert behavior, or analytics calculations.
- Broad permission cleanup across orders, support, locations, or other inventory modules.
- UI/browser QA.

Closeout:

- Touched domains: inventory alert server functions, inventory alert permission tests, inventory sprint evidence.
- Workflow protected: inventory alert UI/hook -> alert server function -> explicit inventory permission -> tenant-scoped alert/product/location reads.
- Business value protected: alert monitoring is explicit for authorized inventory readers, while alert acknowledgement remains an intentional write operation.
- Architecture standards checked: route/container/hook/query-key flow is unchanged; server functions now state read/manage permission contracts; organization scoping is explicit on alert-related detail reads.
- Tenant isolation and data integrity checked: alert base queries already filter by `ctx.organizationId`; related product/location detail reads now also include organization filters; no transactions, inventory movement, serialized lineage, cost-layer, valuation, or alert math changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: bare authentication-only alert reads and acknowledgement writes; implicit tenant assumption in alert detail related-record reads.
- Smells deferred: other domains still have bare `withAuth()` calls and need their own domain-sliced permission audits.
- Gates run: focused alert permission/schema/query tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a server permission and tenant-scope contract change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, explicit contracts, meaningful tests, and reviewable domain slices.
- Residual risk: role-permission assignment quality is outside this slice; this only makes the alert server boundary explicit.
