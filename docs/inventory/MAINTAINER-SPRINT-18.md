# Inventory Maintainer Sprint 18

This sprint follows Sprint 17's stock-count lifecycle tenant-hardening. The target is inventory alert lifecycle tenant-hardening: alert rule updates/deletes, triggered timestamp writes, acknowledgements, and computed alert read joins.

Status: Closed after Issue 1.

## Business Value

Inventory alerts are operator-facing exceptions for low stock, out-of-stock, overstock, expiry, and slow-moving inventory. RENOZ Energy relies on these alerts to avoid missed fulfillment, stale stock, and warehouse surprises. Alert rules and triggered alert views must stay tenant-safe when operators edit rules, acknowledge alerts, or inspect computed fallback alerts.

## Workflow Spine

inventory dashboard / alerts page
-> alert hooks
-> `listAlerts`, `getAlert`, `createAlert`, `updateAlert`, `deleteAlert`, `getTriggeredAlerts`, `checkAndTriggerAlerts`, `acknowledgeAlert`, `getAlertAnalytics`
-> inventory read/manage permissions
-> organization-scoped alert rule reads
-> organization-validated product/location ownership
-> organization-scoped alert rule writes
-> organization-bounded computed alert joins
-> existing alert query-key invalidation.

## Architecture Constraints

- Keep this sprint to inventory alert tenant scope and static contract coverage.
- Preserve alert thresholds, severity/message calculations, fallback alert IDs, analytics shape, mutation response shape, query keys, cache invalidation, and UI.
- Do not broaden into alert schema redesign, acknowledgement history tables, Trigger.dev job changes, or browser UX polish.

## Issue Ledger

### 1. Alert Lifecycle Needed Stronger Tenant Boundaries

Problem:

- Alert rule reads were organization-scoped, but update/delete writes used only alert IDs.
- Trigger timestamp writes and acknowledgement writes used only alert IDs.
- Creating an alert validated product/location ownership, but updating `productId` or `locationId` did not.
- Computed/fallback alert queries joined products and locations without explicit organization predicates.
- Slow-moving raw SQL joined products and checked movements without explicit organization predicates on those tables.

Workflow protected:

alert rule lifecycle -> organization-scoped alert rule -> organization-validated product/location -> organization-scoped writes -> computed triggered alerts -> existing alert cache invalidation.

Implemented slice:

- Added organization predicates to alert update, delete, triggered timestamp, and acknowledgement final writes.
- Added organization-scoped product validation when `updateAlert` changes `productId`.
- Added organization-scoped location validation when `updateAlert` changes `locationId`.
- Added organization predicates to computed/fallback alert product and location joins.
- Added organization predicates to slow-moving raw SQL product joins and movement existence checks.
- Added a focused alert tenant-scope contract test covering mutation writes, changed product/location validation, and computed alert joins.

Out of scope:

- Changing alert threshold semantics, fallback alert ID generation, alert copy, severity mapping, analytics aggregation, query keys, cache invalidation, or UI.
- Adding persisted acknowledgement history.
- Refactoring the deprecated direct `checkAndTriggerAlerts` path into Trigger.dev.
- Browser QA.

Closeout:

- Touched domains: inventory alert server functions, inventory alert tenant-scope tests, inventory sprint evidence.
- Workflow protected: alert list/detail/create/update/delete/trigger/acknowledge/analytics -> tenant-scoped reads and writes -> existing alert cache contracts.
- Business value protected: operators can manage and acknowledge alert rules without cross-tenant product/location or alert-row write risk.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions keep explicit inventory permissions; alert rule writes now carry tenant scope; computed alert joins now carry tenant scope.
- Tenant isolation and data integrity checked: alert writes are organization-scoped; changed product/location ownership is validated; computed alert product/location joins and slow-moving movement checks are organization-bounded.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: ID-only alert lifecycle writes; missing update-time product/location ownership validation; unbounded computed alert product/location joins.
- Smells deferred: persisted acknowledgement history; Trigger.dev direct-job cleanup; live multi-tenant alert integration fixtures.
- Gates run: focused alert tenant-scope contract test; focused alert permission/query tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant-scope hardening change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, honest UI states, operator-safe errors, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects source patterns; runtime cross-tenant alert fixtures and full alert acknowledgement history remain future hardening layers.
