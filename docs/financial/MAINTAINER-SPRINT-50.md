# Financial Maintainer Sprint 50: Financial Query Key Catalog Boundary

## Status

Closed and commit-ready.

## Problem

`src/lib/query-keys.ts` remained a shared cache monolith after the reports
catalog extraction. The financial section still owned AR aging, credit notes,
payment schedules, revenue, dashboard metrics, close readiness, reminders, Xero,
statements, deferred balance, outstanding invoices, revenue recognitions, and
top-customer cache keys inline in the aggregate.

That kept a finance-control cache surface coupled to a global implementation
file instead of a financial-owned catalog.

## Workflow Spine Protected

Financial routes, finance hooks, customer Xero hooks, order payment cache hooks,
and RMA credit-note hooks -> public `queryKeys.financial` adapter -> extracted
`financialQueryKeys` catalog -> exact TanStack query tuples -> unchanged finance
read, invalidation, and reporting-cache behavior.

## Touched Domains

- Shared query-key aggregate adapter.
- Financial query-key catalog implementation.
- Financial query-key, payment-plan, credit-note, reporting, revenue
  recognition, Xero, and finance read-state contract coverage.

## Business Value Protected

Finance cache identity protects closeout surfaces for receivables, credit notes,
payment plans, reminders, statements, deferred revenue, Xero sync, payment
events, revenue recognition, and dashboard reporting. Moving those keys into a
finance-owned catalog keeps accounting cache contracts inspectable without
changing operator workflows.

## Scope Constraints

- No caller syntax changed; callers still use `queryKeys.financial.*`.
- No query tuple shape changed.
- No finance route, hook, server function, schema/database, or UI behavior
  changed.
- No payment schedule, credit note, revenue recognition, Xero, reminder,
  statement, or reporting-cache invalidation semantics changed.
- No inventory, order, support/RMA, or customer behavior changed.

## Changes

- Added `src/lib/query-key-catalog/financial.ts` as the financial cache catalog
  owner.
- Replaced the inline `queryKeys.financial` aggregate section with the extracted
  catalog adapter.
- Added a contract test that pins public adapter identity to
  `financialQueryKeys`.
- Added source-boundary assertions that keep financial cache roots out of the
  aggregate implementation.
- Added representative tuple assertions for credit notes, payment schedules,
  revenue by period, Xero customer mapping, and statement history.

## Standards Checked

- Domain ownership: financial cache contracts now live in a financial-owned
  catalog.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged; only the shared query-key owner moved.
- Tenant isolation: unchanged; no data access or authorization path changed.
- Transactional inventory and finance integrity: unchanged; finance mutation
  semantics and reporting invalidation roots were preserved.
- Serialized lineage continuity: unchanged; no serialized inventory or RMA
  lineage behavior changed.
- Query/cache contracts: public adapter identity and representative financial
  tuple shapes are pinned by tests.
- Honest UI states: unchanged; finance read-state tests stayed in the focused
  gate.
- Operator-safe errors: unchanged; payment-plan, credit-note, revenue, and Xero
  feedback contracts stayed in the focused gate.
- Reviewable diff: one catalog extraction, one aggregate adapter replacement,
  and focused contract-test additions.

## Smells Removed

- Reduced `src/lib/query-keys.ts` from 1,721 lines to 1,640 lines.
- Removed the inline financial catalog from the global query-key monolith.
- Removed `queryKeys.financial` self-reference coupling inside financial
  query-key construction.
- Concentrated finance cache-key maintenance in a financial-owned catalog.

## Smells Deferred

- `src/lib/query-keys.ts` still owns remaining inline catalogs for domains such
  as customers, orders, jobs, suppliers, warranty, procurement, approvals,
  activities, and documents.
- Large financial server files and cross-domain finance/reporting flows remain
  outside this cache slice.
- Large frontend workflow components remain outside this cache slice.
- Any behavior cleanup in payment schedules, Xero, credit notes, or revenue
  recognition should be handled as separate workflow slices.

## Gates

- Focused ESLint:
  `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/financial.ts tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/separation-contract.test.ts tests/unit/financial/revenue-recognition-feedback-contract.test.ts tests/unit/financial/xero-sync-contract.test.ts tests/unit/financial/xero-payment-event-read-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Focused finance tests:
  `./node_modules/.bin/vitest run tests/unit/financial/query-key-contract.test.tsx tests/unit/financial/payment-plan-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/separation-contract.test.ts tests/unit/financial/revenue-recognition-feedback-contract.test.ts tests/unit/financial/revenue-recognition-xero-sync-behavior.test.ts tests/unit/financial/xero-sync-contract.test.ts tests/unit/financial/xero-sync-issue-feedback-contract.test.ts tests/unit/financial/xero-invoice-sync.test.ts tests/unit/financial/xero-invoice-sync-command-behavior.test.ts tests/unit/financial/xero-payment-event-read-contract.test.ts tests/unit/financial/xero-payment-reconciliation-behavior.test.ts tests/unit/finance/query-normalization-wave5d.test.tsx tests/unit/finance-dashboard/query-normalization-wave6f.test.tsx`
  - Passed, 14 files / 61 tests.
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
  - Passed, 767 files / 2,552 tests.

## Goal Adaptation

No standing goal change. The sprint continues the current product-owner goal:
small domain-sliced monolith reduction, stable workflow protection, explicit
ownership boundaries, and evidence-backed closeout.

## Residual Risk

Low behavior risk because the public adapter name and representative tuple
shapes are pinned, and no runtime caller path changed. Medium architecture risk
remains because the global query-key aggregate is still large and several
non-financial catalogs remain inline.
