# Communications Maintainer Sprint 36

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Metrics Presentation Concentration

### Problem

After Sprint 35, `campaign-detail-panel.tsx` still owned campaign statistic derivation and rendering. Recipient totals, sent/opened/clicked percentages, success/default icon state, bounced/failed issue metrics, and percentage formatting all lived inside the large detail panel. This made an independent display region harder to test and kept engagement metric policy coupled to unrelated detail actions, alerts, recipients, and dialog state.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> campaign detail metrics section
-> campaign percentage utility
-> operator campaign statistics and delivery issue display.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign detail metrics presentation.
- Communications metrics presentation tests.

### Business Value Protected

Campaign metrics help an operator understand whether a customer/dealer communication actually sent, opened, clicked, bounced, or failed. Extracting the metric display keeps those derived values directly testable and reduces the chance that future page work changes engagement percentages or delivery issue visibility accidentally.

### Scope Constraints

- Do not change route wiring, campaign hooks, server functions, database schema, recipient persistence, provider sending, or query invalidation.
- Do not redesign the campaign detail page or change metric labels.
- Do not change percentage calculation, icon tone policy, delivery issue visibility, or action availability.
- Do not broaden into campaign lifecycle, alerts, recipients, terminal-state suggestions, campaign list actions, analytics, inbox, templates, or provider processing.

### Changes

- Added `campaign-detail-metrics-section.tsx` with the campaign statistics and delivery issue metric rendering boundary.
- Moved recipient, sent, opened, clicked, bounced, and failed metric rendering out of `campaign-detail-panel.tsx`.
- Moved campaign percentage formatting and metric icon tone policy out of the parent detail component.
- Updated `campaign-detail-panel.tsx` to render `<CampaignDetailMetricsSection campaign={campaign} />`.
- Added `campaign-detail-metrics-section.test.tsx` covering percentage context, issue metric visibility, warning/error icon tone policy, and the source boundary.

### Standards Checked

- Domain ownership: campaign metrics presentation now lives in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, or cache behavior changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: metric rendering behavior is preserved and directly tested for normal engagement metrics and bounced/failed delivery issue metrics.
- Reviewability: `campaign-detail-panel.tsx` dropped from 839 lines to 735 lines; the metrics section is now a 115-line component with focused tests.

### Smells Removed

- Inline campaign statistic derivation inside the large detail panel.
- Inline percentage display formatting in the parent detail component.
- Inline opened/clicked icon tone policy in the parent detail component.
- Inline bounced/failed issue metric rendering in the parent detail component.
- Untested metric visibility and delivery issue presentation branches.

### Deferred

- Campaign alerts, terminal-state suggestions, campaign meta fields, recipient rows, and the test-send dialog presentation remain in `campaign-detail-panel.tsx`.
- Campaign detail lifecycle, read-state, and action orchestration were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves metric labels/values and does not change action behavior or page routing.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 5 files, 30 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-metrics-section.tsx`, `campaign-detail-metrics-section.test.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite, browser QA, production build, deploy, finance gates, and document gates because this sprint is a campaign-local presentational extraction with no route, server, query/cache, persistence, financial, document, deployment, or visible workflow behavior change. Full unit passed in Sprint 34 immediately before the current presentation extraction series.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for campaign metrics presentation because focused tests cover normal metrics, delivery issue visibility, and icon tone policy while type/lint gates pass. Medium for the broader campaign detail surface because the panel remains 735 lines and still owns multiple presentation regions. Broader build warnings about chunk size and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
