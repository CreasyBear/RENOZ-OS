# Reports Maintainer Sprint 24: Reports Query Key Catalog Boundary

## Status

Closed and commit-ready.

## Problem

`src/lib/query-keys.ts` remained a shared cache monolith after the dashboard
catalog extraction. The reports section still owned pipeline forecast, velocity,
revenue attribution, win/loss, procurement analytics, scheduled reports, targets,
custom reports, favorites, available metrics, and financial summary cache keys
inline in the aggregate.

That kept report cache identity coupled to a global implementation file instead
of a reports-owned catalog, even though reports hooks already use a stable
`queryKeys.reports.*` public adapter.

## Workflow Spine Protected

Reports routes and hooks -> public `queryKeys.reports` adapter -> extracted
`reportsQueryKeys` catalog -> exact TanStack query tuples -> unchanged scheduled
report, target, custom report, favorite, metrics, win/loss, procurement,
pipeline, and financial summary cache behavior.

## Touched Domains

- Shared query-key aggregate adapter.
- Reports query-key catalog implementation.
- Reports scheduled-report, custom-report, landing, target, win/loss, financial
  summary, and query-key contract tests.

## Business Value Protected

Reports are the management and closeout surface for RENOZ Energy: pipeline
forecasting, procurement insight, win/loss learning, financial summaries, target
progress, scheduled reporting, and custom operational reports. Keeping reports
cache identity exact protects business visibility while making cache ownership
easier to inspect and change.

## Scope Constraints

- No caller syntax changed; callers still use `queryKeys.reports.*`.
- No query tuple shape changed.
- No reports route, hook, server function, schema/database, or UI behavior
  changed.
- No scheduled-report, custom-report, favorite, target, metric, or financial
  summary semantics changed.
- No dashboard query-key catalog behavior changed.

## Changes

- Added `src/lib/query-key-catalog/reports.ts` as the reports cache catalog
  owner.
- Moved reports filter types into the reports catalog and re-exported them
  through `src/lib/query-keys.ts` for compatibility.
- Replaced the inline `queryKeys.reports` aggregate section with the extracted
  catalog adapter.
- Added a reports query-key catalog contract test that pins public adapter
  identity to `reportsQueryKeys`.
- Updated scheduled-report and custom-report cache-policy tests to assert the
  reports-owned catalog instead of the old inline aggregate implementation.
- Added representative tuple assertions for pipeline forecast, scheduled-report
  status, target progress, custom-report results, favorites, and financial
  summaries.

## Standards Checked

- Domain ownership: reports cache contracts now live in a reports-owned catalog.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged; only the shared query-key owner moved.
- Tenant isolation: unchanged; no data access or authorization path changed.
- Transactional inventory and finance integrity: unchanged; reports reads and
  cache keys were preserved.
- Serialized lineage continuity: unchanged; no serialized inventory mutation or
  warranty/RMA continuity path changed.
- Query/cache contracts: public adapter identity and representative reports
  tuple shapes are pinned by tests.
- Honest UI states: unchanged; reports read-state tests stayed in the focused
  gate.
- Operator-safe errors: unchanged; scheduled-report, custom-report, and landing
  feedback contracts stayed in the focused gate.
- Reviewable diff: one catalog extraction, one aggregate adapter replacement,
  and focused source-contract updates.

## Smells Removed

- Reduced `src/lib/query-keys.ts` from 1,834 lines to 1,721 lines.
- Removed the inline reports catalog from the global query-key monolith.
- Removed `queryKeys.reports` self-reference coupling inside reports query-key
  construction.
- Moved reports-specific filter types out of the aggregate file.

## Smells Deferred

- `src/lib/query-keys.ts` still owns remaining inline catalogs for domains such
  as financials, customers, orders, jobs, suppliers, warranty, procurement, and
  approvals.
- Large server monoliths remain outside this reports cache slice.
- Large frontend workflow components remain outside this reports cache slice.
- Reports server functions and analytics pages remain separate workflow slices;
  this sprint intentionally preserved their behavior.

## Gates

- Focused ESLint:
  `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/reports.ts tests/unit/reports/reports-query-key-catalog-contract.test.ts tests/unit/reports/custom-report-feedback-contract.test.ts tests/unit/reports/scheduled-report-management-feedback-contract.test.ts tests/unit/reports/reports-landing-read-feedback-contract.test.ts tests/unit/reports/target-progress-calculation-contract.test.ts tests/unit/reports/win-loss-read-feedback-contract.test.ts tests/unit/reports/financial-summary-read-feedback-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused reports tests:
  `./node_modules/.bin/vitest run tests/unit/reports/reports-query-key-catalog-contract.test.ts tests/unit/reports/custom-report-feedback-contract.test.ts tests/unit/reports/scheduled-report-management-feedback-contract.test.ts tests/unit/reports/reports-landing-read-feedback-contract.test.ts tests/unit/reports/target-progress-calculation-contract.test.ts tests/unit/reports/target-settings-mutation-feedback-contract.test.ts tests/unit/reports/win-loss-read-feedback-contract.test.ts tests/unit/reports/financial-summary-read-feedback-contract.test.ts tests/unit/reports/query-normalization-wave4e.test.tsx tests/unit/reports/report-favorite-button-read-state-contract.test.tsx`
  - Passed, 10 files / 29 tests.
- Full source lint:
  `npm run lint`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 767 files / 2,549 tests.

## Goal Adaptation

No standing goal change. The sprint continues the current product-owner goal:
small domain-sliced monolith reduction, stable workflow protection, explicit
ownership boundaries, and evidence-backed closeout.

## Residual Risk

Low behavior risk because the public adapter name and representative tuple
shapes are pinned, and no runtime caller path changed. Medium architecture risk
remains because the global query-key aggregate is still large and several
non-reports catalogs remain inline.
