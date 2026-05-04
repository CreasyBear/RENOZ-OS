# Inventory Maintainer Sprint 25

This sprint follows Sprint 24's turnover product-semantics cleanup. The target is turnover summary annualization truth: the analytics page should not annualize an already-annualized server turnover rate a second time.

Status: Closed after Issue 1.

## Business Value

Inventory turnover is used to judge whether battery stock is moving fast enough or tying up working capital. If the UI overstates annualized stock velocity, RENOZ Energy can underreact to slow-moving SKUs, overtrust purchasing decisions, or miss aging cash risk.

## Workflow Spine

inventory analytics turnover tab
-> `AnalyticsPage`
-> `useInventoryTurnover`
-> `getInventoryTurnover`
-> server `cogsForPeriod`, `averageInventoryValue`, and annualized `turnoverRate`
-> `TurnoverReport`
-> period turnover and annualized turnover summary cards
-> existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to turnover summary mapping and report labels.
- Preserve server turnover math, product rows, trend rows, filters, loading/error/degraded states, query keys, cache invalidation, and layout structure.
- Do not broaden into category aggregation, live database fixtures, browser QA, or chart redesign.

## Issue Ledger

### 1. Annualized Turnover Was Annualized Twice in the Analytics UI

Problem:

- `getInventoryTurnover` computes `turnoverRate` from annualized COGS.
- `AnalyticsPage` mapped `annualizedTurnover` as `turnoverRate * 4`, which inflated the annualized card for the 90-day report.
- The report did not distinguish period turnover from annualized turnover, so the summary cards made the finance signal harder to audit.

Workflow protected:

turnover report -> server period COGS and average inventory -> period turnover ratio -> server annualized turnover -> honest summary cards.

Implemented slice:

- Derived `periodTurnoverRatio` from `cogsForPeriod / averageInventoryValue`.
- Mapped `annualizedTurnover` directly from server `turnoverRate`.
- Updated report summary copy to distinguish "Period Turnover" from "Annualized Turnover".
- Moved benchmark rating to the annualized card.
- Added focused tests for the route mapping contract and visible turnover summary copy.

Out of scope:

- Changing server turnover SQL, annualized COGS math, trend windows, product row calculations, query keys, cache invalidation, or UI layout structure.
- Adding live movement timeline fixtures.
- Browser QA.

Closeout:

- Touched domains: inventory analytics route mapping, turnover report component, turnover report/analytics summary tests, inventory sprint evidence.
- Workflow protected: inventory analytics turnover tab -> turnover hook -> server period and annualized values -> honest report summary labels.
- Business value protected: operators no longer see annualized turnover inflated by a second annualization factor.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server functions and schema contracts are unchanged; UI mapping now matches server value semantics.
- Tenant isolation and data integrity checked: no server queries, writes, tenant predicates, inventory mutations, cost layers, serialized lineage, or finance reconciliation paths changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: `annualizedTurnover = turnoverRate * 4`; ambiguous summary labels that hid period-vs-annualized turnover semantics.
- Smells deferred: live movement timeline fixtures; deeper turnover formula review; chart visual QA.
- Gates run: focused analytics turnover summary contract test; focused turnover report render test; focused inventory analytics query-normalization tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a narrow route mapping and summary-copy correction covered by component/source tests.
- Goal adaptations: declined. The standing maintainer goal already requires finance integrity, honest UI states, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: live database fixtures are still needed to prove turnover values against seeded movement timelines; visual layout was not browser-verified.
