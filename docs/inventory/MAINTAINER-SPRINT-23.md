# Inventory Maintainer Sprint 23

This sprint follows Sprint 22's valuation tenant-scope hardening. The target is valuation turnover time-window correctness: previous-period product trends and trend buckets should compare real chronological COGS windows instead of reversed or future-facing date ranges.

Status: Closed after Issue 1.

## Business Value

Inventory turnover is a finance and purchasing signal. It helps RENOZ Energy see whether battery stock is moving, aging, tying up cash, or turning too slowly. Trend signals that silently compare against empty or malformed windows make product movement look stable when the business should see change.

## Workflow Spine

valuation/turnover report
-> valuation hook
-> `getInventoryTurnover`
-> inventory read permission
-> organization-scoped inventory movement and product SQL
-> chronological current, previous, and trend COGS windows
-> existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to turnover SQL date-window correctness and static contract coverage.
- Preserve turnover response shape, period options, product filters, COGS source, current-period math, query keys, cache invalidation, and UI.
- Do not broaden into valuation formula redesign, live database fixtures, trend chart UX, or finance reconciliation behavior.

## Issue Ledger

### 1. Turnover Previous-Period and Trend SQL Used Reversed Date Bounds

Problem:

- Previous-period product COGS used `created_at >= previousPeriodEndDate` and `< previousPeriodStart`, which reversed the older/newer bounds and could produce empty prior-period COGS.
- Trend buckets derived dates from `periodDays - ...`, which could reverse bucket ordering, skip the current window, or create future-facing windows for some period/interval combinations.

Workflow protected:

turnover report -> tenant-scoped movement COGS -> chronological previous/current comparisons -> honest product trend direction.

Implemented slice:

- Replaced previous-period turnover bounds with explicit `previousPeriodStartDate` and `previousPeriodEndDate` variables.
- Replaced trend bucket bounds with explicit `trendWindowStartDate` and `trendWindowEndDate` variables.
- Ordered SQL windows chronologically as `created_at >= older_start` and `created_at < newer_end`.
- Added a focused turnover window contract test covering previous-period bounds and trend bucket bounds.

Out of scope:

- Changing turnover formulas, annualization, trend threshold, product filtering, turnover response shape, query keys, cache invalidation, or UI.
- Adding live database fixtures for movement timelines.
- Browser QA.

Closeout:

- Touched domains: inventory valuation turnover server function, turnover window contract tests, inventory sprint evidence.
- Workflow protected: turnover report -> `useInventoryTurnover` -> `getInventoryTurnover` -> tenant-scoped movement COGS windows -> existing valuation cache contract.
- Business value protected: product turnover trends now compare against real chronological windows, improving purchasing and slow-moving-stock visibility.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; server function keeps explicit inventory read permission; changes are limited to raw SQL window construction.
- Tenant isolation and data integrity checked: existing organization predicates remain in all turnover inventory, movement, and product SQL; no writes, cost layers, serialized lineage, or finance reconciliation paths changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: reversed previous-period date bounds; trend bucket date math that could skip current windows or point into future ranges.
- Smells deferred: live movement timeline fixtures; deeper turnover formula review; trend chart UX semantics.
- Gates run: focused turnover window contract test; focused valuation permission/schema/query tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server turnover SQL correctness change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires finance integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: static contract coverage protects SQL window construction; runtime database fixtures are still needed to prove trend values against seeded movement timelines.
