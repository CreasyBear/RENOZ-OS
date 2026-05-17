# Communications Maintainer Sprint 41

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Meta Field Construction Concentration

### Problem

After Sprint 40, `campaign-detail-panel.tsx` still owned campaign timing-field construction and presentation inline. The parent detail panel carried scheduled, started, and completed field selection, icon composition, date formatting, empty-field suppression, and the `DetailGrid`/`DetailSection` rendering branch. That kept another pure display concern coupled to route reads, action handlers, alert state, lifecycle, metrics, recipients, next steps, and test-send dialog state.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> campaign detail meta section
-> campaign timing evidence
-> operator sees scheduled, started, and completed timing context.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign timing/meta presentation.
- Communications campaign meta tests.

### Business Value Protected

Campaign timing fields explain whether an email campaign is scheduled, has started, or has completed. Keeping that evidence in a dedicated section makes timing context directly testable and keeps the parent panel focused on orchestration instead of field formatting.

### Scope Constraints

- Do not change campaign route wiring, campaign hooks, server functions, database schema, provider sending, or query invalidation.
- Do not change timing field labels, date formatting intent, section title, section id, empty-field suppression, or display order.
- Do not broaden into alerts, recipients, lifecycle, metrics, inbox, analytics, templates, test-send behavior, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-detail-meta-section.tsx` with scheduled, started, and completed timing field construction and `DetailGrid` rendering.
- Updated `campaign-detail-panel.tsx` to render `<CampaignDetailMetaSection campaign={campaign} />`.
- Removed date formatting, timing icons, `DetailGrid`, `DetailSection`, and `DetailGridField` ownership from the parent detail component.
- Added `campaign-detail-meta-section.test.tsx` covering timing-field rendering, no-field null rendering, and source-boundary ownership.

### Standards Checked

- Domain ownership: campaign timing/meta presentation now lives in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch routes, hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, cache shape, or fetch enablement changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: timing field rendering, no-field null rendering, and source boundary are directly tested.
- Reviewability: `campaign-detail-panel.tsx` dropped from 482 lines to 432 lines; the meta section is now a 74-line component with focused tests.

### Smells Removed

- Inline campaign timing field construction inside the campaign detail panel.
- Inline timing date formatting and icon composition in the parent detail component.
- Inline `DetailGrid`/`DetailSection` ownership in the parent detail component.
- Untested no-field null-rendering behavior for the campaign meta section.

### Deferred

- Campaign detail header action assembly and skeleton rendering remain in `campaign-detail-panel.tsx`.
- Campaign detail lifecycle, alerts, metrics, read-state, action orchestration, terminal next steps, recipients, and test-send dialog were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves section title/id, timing labels, formatting intent, and read-only display semantics and does not change routing, mutations, or visible workflow semantics.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-meta-section.test.tsx tests/unit/communications/campaign-detail-alerts-section.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 10 files, 46 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-meta-section.tsx`, `campaign-detail-meta-section.test.tsx`, `campaign-detail-alerts-section.tsx`, `campaign-detail-alerts-section.test.tsx`, `campaign-detail-test-send-dialog.tsx`, `campaign-detail-test-send-dialog.test.tsx`, `campaign-detail-recipients-section.tsx`, `campaign-detail-recipients-section.test.tsx`, `campaign-detail-next-steps-section.tsx`, `campaign-detail-next-steps-section.test.tsx`, `campaign-detail-metrics-section.test.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite, production build, browser QA, deploy, finance gates, and document gates because this sprint is a campaign-local timing/meta presentation extraction with no route, server, query/cache, persistence contract, financial, document, deployment, or workflow semantics change. Full unit and production build passed in Sprint 37 immediately before this campaign-detail extraction series.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for campaign meta presentation because focused tests cover timing-field rendering, no-field null rendering, and source-boundary ownership while type/lint/reliability gates pass. Lower medium for the broader campaign detail surface because the panel remains 432 lines and still owns header action assembly and skeleton rendering. Broader build warnings about chunk size, dependency `"use client"` directives, native `bcrypt` deployment architecture, and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
