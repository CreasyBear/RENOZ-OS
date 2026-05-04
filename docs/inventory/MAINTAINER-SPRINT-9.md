# Inventory Maintainer Sprint 9

This sprint follows Sprint 8's WMS stock-semantics contract. The target is the remaining operator-facing ambiguity: the dashboard must not trend allocatable current alerts against a previous-period signal reconstructed from movement quantities.

Status: Closed after Issue 1.

## Business Value

Alert deltas can influence whether RENOZ operators trust the warehouse situation is improving or worsening. A trend beside "Allocatable Alerts" should only appear when the previous-period alert signal is also allocatable. Otherwise, it makes quarantined, damaged, and saleable-stock semantics look comparable when they are not.

## Workflow Spine

WMS dashboard stock semantics
-> `useWMSDashboard`
-> `UnifiedInventoryDashboard`
-> alert metric trend rendering
-> operator warehouse triage.

## Architecture Constraints

- Keep this sprint to WMS dashboard presentation logic and schema compatibility.
- Use the `stockSemantics` contract added in Sprint 8.
- Do not change alert counts, WMS comparison math, server queries, query keys, cache policy, or alert mutations.
- Permit the schema to represent a future comparable previous-period alert model without changing the current server value.
- Add focused tests for both the source contract and rendered metric behavior.

## Issue Ledger

### 1. Allocatable Alert Trends Need Comparable History

Problem:

- Sprint 8 made current alerts explicitly allocatable and previous-period comparison explicitly movement-reconstructed.
- The dashboard still passed `comparison.alertsChange` into the `Allocatable Alerts` metric.
- That trend implied the current and previous alert signals were comparable even though movement history does not preserve inventory-row status.

Workflow protected:

WMS dashboard semantics -> dashboard metric rendering -> operator alert triage.

Implemented slice:

- Added an `alertsComparisonIsComparable` guard in `UnifiedInventoryDashboard`.
- Suppressed alert metric deltas unless `currentAlerts` and `previousPeriodComparison` share the same semantics.
- Widened `previousPeriodComparison` schema acceptance to allow a future `allocatable_available` history model without changing the current server contract.
- Added focused render coverage for suppressing mismatched alert deltas while preserving other comparable KPI deltas.
- Extended the WMS stock-semantics contract test.

Out of scope:

- Building historical allocatable snapshots.
- Changing current alert counts or historical comparison SQL.
- Changing dashboard query keys, stale times, or cache invalidation.
- Browser QA.

Closeout:

- Touched domains: inventory WMS dashboard UI, inventory dashboard schema, inventory tests, inventory sprint evidence.
- Workflow protected: WMS stock semantics -> dashboard alert metric -> operator warehouse triage.
- Business value protected: operators no longer see a misleading trend for allocatable alerts when history is only movement-reconstructed quantity.
- Architecture standards checked: route/container/hook/server/database/query-key flow is unchanged; the UI consumes the schema-owned semantics contract; no cache or mutation behavior changed.
- Tenant isolation and data integrity checked: no server filtering, database query, transaction, inventory movement, serialized lineage, cost-layer, or valuation behavior changed.
- Query/cache contract checked: no query keys, stale times, invalidations, optimistic updates, or cache mutation helpers changed.
- Smells removed: mismatched current-vs-history stock semantics were still displayed as a trend.
- Smells deferred: the product still lacks status-aware historical inventory snapshots, so alert trend deltas stay hidden under current semantics.
- Gates run: focused WMS/dashboard tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a render-contract change with focused component coverage and no interaction/layout change.
- Goal adaptations: declined. The standing maintainer goal already requires honest UI states, meaningful tests, and reviewable domain slices.
- Residual risk: alert trends remain absent until the warehouse domain gains a true historical allocatable availability model.
