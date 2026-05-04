# Inventory Maintainer Sprint 10

This sprint follows Sprint 9's alert-trend guard. The target is the next dashboard honesty contract: WMS comparison fields mix percentage changes and count deltas, while the shared `MetricCard` renders every `delta` as a percentage.

Status: Closed after Issue 1.

## Business Value

Warehouse operators should not see count changes formatted as percentages. A change of four alerts is not `4.0%`. When dashboard units are explicit, future UI work can decide how to present each signal without silently misrepresenting operational state.

## Workflow Spine

WMS dashboard comparison math
-> schema-owned comparison units
-> `getWMSDashboard`
-> `useWMSDashboard`
-> dashboard metric rendering
-> operator KPI interpretation.

## Architecture Constraints

- Keep this sprint to WMS dashboard comparison units and alert metric rendering.
- Do not broaden the shared `MetricCard` API across unrelated domains.
- Do not change WMS comparison calculations, alert counts, stock semantics, query keys, cache policy, or mutations.
- Add focused schema/server/UI tests and sprint evidence.

## Issue Ledger

### 1. Count Deltas Must Not Render as Percentage Trends

Problem:

- `totalValueChange` and `totalUnitsChange` are percentages.
- `totalSkusChange`, `alertsChange`, and `locationsChange` are count deltas.
- `MetricCard.delta` renders every value through `TrendIndicator`, which appends `%`.
- Sprint 9 guarded alert trends by stock semantics, but a future comparable alert history would still risk displaying a count as a percentage.

Workflow protected:

WMS comparison math -> dashboard schema contract -> metric trend rendering -> warehouse KPI interpretation.

Implemented slice:

- Added `WMS_DASHBOARD_COMPARISON_UNITS` and `wmsDashboardComparisonUnitsSchema`.
- Returned `comparisonUnits` from `getWMSDashboard`.
- Guarded alert metric trend rendering on both comparable alert semantics and percentage-compatible comparison units.
- Added focused render coverage proving count alert deltas do not render through percentage trend UI even when alert stock semantics are comparable.
- Extended WMS/dashboard schema ownership and static contract tests.

Out of scope:

- Adding count-delta rendering to `MetricCard`.
- Changing WMS comparison math or historical inventory reconstruction.
- Showing alert count trends elsewhere.
- Browser QA.

Closeout:

- Touched domains: inventory WMS dashboard schema/server/UI, inventory tests, inventory sprint evidence.
- Workflow protected: WMS comparison math -> schema units -> dashboard KPI rendering.
- Business value protected: operators avoid misleading percentage labels for count-based warehouse deltas.
- Architecture standards checked: route/container/hook/server/database/query-key flow is unchanged; unit semantics are schema-owned and server-returned; UI uses the contract before rendering a trend.
- Tenant isolation and data integrity checked: no server filters, database queries, transactions, inventory movements, serialized lineage, cost layers, or valuation behavior changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: WMS comparison units were implicit, and count deltas could reach percentage-only trend rendering.
- Smells deferred: `MetricCard` still only supports percentage deltas; count-delta rendering needs a deliberate shared-component design if another domain needs it.
- Gates run: focused WMS/dashboard tests, focused ESLint, full inventory tests, TypeScript, `git diff --check`.
- Gates skipped: browser QA, because this was a schema/render contract with focused component coverage and no interaction/layout change.
- Goal adaptations: declined. The standing maintainer goal already requires honest UI states, explicit contracts, meaningful tests, and reviewable domain slices.
- Residual risk: alert count trends remain hidden until the product has a designed count-delta display or a percentage-based alert comparison.
