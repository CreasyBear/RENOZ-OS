# Communications Maintainer Sprint 38

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Recipient Presentation Concentration

### Problem

After Sprint 37, `campaign-detail-panel.tsx` still owned the recipient presentation branch inline. The parent detail panel carried recipient loading, empty-state copy, table markup, row identity display, recipient status badge mapping, activity timestamp priority, and provider-error display. That kept another reviewable display region coupled to route data loading, action handlers, campaign metadata, alerts, and test-send dialog state.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> `useCampaignRecipients`
-> campaign detail recipients section
-> operator recipient delivery/activity inspection.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign recipient presentation.
- Communications recipient presentation tests.

### Business Value Protected

Campaign recipients are the operational proof surface for campaign delivery: who was targeted, what state each recipient reached, and whether a provider-side failure exists. Extracting the table keeps this evidence surface directly testable without touching campaign send processing, recipient reads, query/cache policy, or provider behavior.

### Scope Constraints

- Do not change campaign route wiring, campaign hooks, server functions, database schema, recipient selection, provider sending, or query invalidation.
- Do not change recipient table labels, empty-state copy, row order, row identity fields, activity priority, or action availability.
- Do not broaden into campaign alerts, campaign meta fields, test-send dialog state, lifecycle, metrics, inbox, analytics, templates, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-detail-recipients-section.tsx` with the recipient loading, empty, table, status badge, and activity rendering boundary.
- Updated `campaign-detail-panel.tsx` to pass `recipientCount`, `recipients`, and `recipientsLoading` into `<CampaignDetailRecipientsSection />`.
- Moved skipped-status badge handling into the recipient section while preserving the read path's `skipped` status compatibility.
- Added `campaign-detail-recipients-section.test.tsx` covering recipient row evidence, loading state, empty state, and source-boundary ownership.

### Standards Checked

- Domain ownership: recipient presentation now lives in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch routes, hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, cache shape, or fetch enablement changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: recipient loading, empty, row activity, provider-error display, unknown-name fallback, and panel source boundary are directly tested.
- Reviewability: `campaign-detail-panel.tsx` dropped from 685 lines to 596 lines; the recipient section is now a 151-line component with focused tests.

### Smells Removed

- Inline recipient table rendering inside the campaign detail panel.
- Inline recipient status badge helper in the parent detail component.
- Inline clicked/opened/sent/error/pending activity priority branch in the parent detail component.
- Untested recipient loading and empty-state ownership inside the campaign detail flow.

### Deferred

- Campaign alerts, campaign meta fields, and the test-send dialog presentation remain in `campaign-detail-panel.tsx`.
- Campaign detail lifecycle, metrics, read-state, action orchestration, and terminal next steps were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves recipient table labels, layout intent, hook data, and read-only row behavior and does not change routing, mutations, or visible workflow semantics.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 7 files, 36 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-recipients-section.tsx`, `campaign-detail-recipients-section.test.tsx`, `campaign-detail-next-steps-section.tsx`, `campaign-detail-next-steps-section.test.tsx`, `campaign-detail-metrics-section.test.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite, production build, browser QA, deploy, finance gates, and document gates because this sprint is a campaign-local read-only presentation extraction with no route, server, query/cache, persistence, financial, document, deployment, or workflow semantics change. Full unit and production build passed in Sprint 37 immediately before this extraction.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for recipient presentation because focused tests cover row evidence, loading, empty state, and boundary ownership while type/lint/reliability gates pass. Medium for the broader campaign detail surface because the panel remains 596 lines and still owns alerts, campaign meta fields, and test-send dialog presentation. Broader build warnings about chunk size, dependency `"use client"` directives, native `bcrypt` deployment architecture, and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
