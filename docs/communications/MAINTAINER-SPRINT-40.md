# Communications Maintainer Sprint 40

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Alert Presentation Concentration

### Problem

After Sprint 39, `campaign-detail-panel.tsx` still owned campaign alert generation, dismissal filtering, dismissal routing, optional action rendering, and alert markup inline. That kept a volatile risk/evidence surface coupled to detail route reads, action handlers, campaign metadata, lifecycle, metrics, recipients, terminal next steps, and test-send dialog state.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> campaign detail alerts section
-> `generateCampaignAlerts`
-> alert dismissal persistence
-> operator sees, acts on, or dismisses campaign risk evidence.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign alert presentation and dismissal state.
- Communications campaign alert tests.

### Business Value Protected

Campaign alerts expose operational risk signals such as high bounce rate, failed campaign state, low engagement, and paused campaigns. Keeping alert generation, action rendering, and dismissal persistence in a dedicated component makes that evidence surface easier to test without changing campaign sending, analytics, recipients, or provider behavior.

### Scope Constraints

- Do not change campaign route wiring, campaign hooks, server functions, database schema, provider sending, or query invalidation.
- Do not change alert generation thresholds, alert copy, action labels, alert IDs, dismissal TTL behavior, or action callback semantics.
- Do not broaden into campaign meta fields, recipients, lifecycle, metrics, inbox, analytics, templates, test-send behavior, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-detail-alerts-section.tsx` with campaign alert generation, dismissal filtering, optional action rendering, and alert dismissal behavior.
- Updated `campaign-detail-panel.tsx` to render `<CampaignDetailAlertsSection campaign={campaign} />`.
- Removed alert generation, dismissal hook usage, alert action button markup, and inline dismissal callbacks from the parent detail component.
- Added `campaign-detail-alerts-section.test.tsx` covering generated alert rendering, optional action behavior, dismissal/null rendering, and source-boundary ownership.

### Standards Checked

- Domain ownership: campaign alert presentation and dismissal behavior now live in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch routes, hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, cache shape, or fetch enablement changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: generated alert display, optional action callback, dismissal persistence path, no-alert null rendering, and source boundary are directly tested.
- Reviewability: `campaign-detail-panel.tsx` dropped from 541 lines to 482 lines; the alerts section is now a 74-line component with focused tests.

### Smells Removed

- Inline campaign alert generation inside the campaign detail panel.
- Inline alert dismissal filtering and localStorage-backed dismissal routing in the parent detail component.
- Inline optional alert action button rendering in the parent detail component.
- Untested alert action and dismissal/null-rendering behavior in the campaign detail flow.

### Deferred

- Campaign meta field presentation remains in `campaign-detail-panel.tsx`.
- Campaign detail lifecycle, metrics, read-state, action orchestration, terminal next steps, recipients, and test-send dialog were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves alert copy, action labels, dismissal semantics, and callback behavior and does not change routing, mutations, or visible workflow semantics.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-alerts-section.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 9 files, 43 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-alerts-section.tsx`, `campaign-detail-alerts-section.test.tsx`, `campaign-detail-test-send-dialog.tsx`, `campaign-detail-test-send-dialog.test.tsx`, `campaign-detail-recipients-section.tsx`, `campaign-detail-recipients-section.test.tsx`, `campaign-detail-next-steps-section.tsx`, `campaign-detail-next-steps-section.test.tsx`, `campaign-detail-metrics-section.test.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite, production build, browser QA, deploy, finance gates, and document gates because this sprint is a campaign-local alert presentation/dismissal extraction with no route, server, query/cache, persistence contract, financial, document, deployment, or workflow semantics change. Full unit and production build passed in Sprint 37 immediately before this campaign-detail extraction series.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for campaign alert presentation because focused tests cover generated alert display, optional action behavior, dismissal/null rendering, and source-boundary ownership while type/lint/reliability gates pass. Lower medium for the broader campaign detail surface because the panel remains 482 lines and still owns campaign meta field construction/presentation. Broader build warnings about chunk size, dependency `"use client"` directives, native `bcrypt` deployment architecture, and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
