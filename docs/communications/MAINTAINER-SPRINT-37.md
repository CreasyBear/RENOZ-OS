# Communications Maintainer Sprint 37

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Terminal Next-Step Presentation Concentration

### Problem

After Sprint 36, `campaign-detail-panel.tsx` still owned the terminal "next steps" band for sent campaigns. The parent detail panel carried the sent-only visibility rule, completion copy, analytics/history/create-new buttons, icon composition, and callback routing inline. That kept another independent display region coupled to campaign actions, alerts, metrics, recipients, and dialog state.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> campaign detail next-steps section
-> analytics/history/back callbacks
-> operator terminal campaign follow-up actions.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign detail next-step presentation.
- Communications next-step presentation tests.

### Business Value Protected

When a campaign is sent, operators need clear follow-up choices: inspect analytics, return to campaign creation, or review email history. Extracting this sent-state presentation keeps those terminal actions easy to test and review without touching campaign mutation behavior, metrics, lifecycle, or recipients.

### Scope Constraints

- Do not change route wiring, campaign hooks, server functions, database schema, recipient persistence, provider sending, or query invalidation.
- Do not change terminal-state copy, button labels, button order, action availability, or callback targets.
- Do not broaden into campaign lifecycle, metrics, alerts, recipients, meta fields, campaign list actions, analytics, inbox, templates, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-detail-next-steps-section.tsx` with the sent-campaign next-step rendering boundary.
- Moved terminal completion copy, analytics/create-new/history button rendering, and sent-only visibility rule out of `campaign-detail-panel.tsx`.
- Updated `campaign-detail-panel.tsx` to render `<CampaignDetailNextStepsSection />` with existing analytics, back, and email-history callbacks.
- Added `campaign-detail-next-steps-section.test.tsx` covering terminal rendering, callback routing, non-sent null rendering, and the source boundary.

### Standards Checked

- Domain ownership: terminal next-step presentation now lives in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, or cache behavior changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: sent-state next-step rendering and non-sent null rendering are directly tested. Existing callback targets are preserved through props.
- Reviewability: `campaign-detail-panel.tsx` dropped from 735 lines to 685 lines; the next-step section is now an 81-line component with focused tests.

### Smells Removed

- Inline sent-only next-step presentation inside the campaign detail panel.
- Inline terminal action button composition in the parent detail component.
- Inline create-new callback guard in the parent detail component.
- Untested non-sent null rendering for the terminal next-step band.

### Deferred

- Campaign alerts, campaign meta fields, recipient rows, and the test-send dialog presentation remain in `campaign-detail-panel.tsx`.
- Campaign detail lifecycle, metrics, read-state, and action orchestration were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves terminal next-step labels and callback targets and does not change routing, mutations, or layout intent.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 6 files, 33 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-next-steps-section.tsx`, `campaign-detail-next-steps-section.test.tsx`, `campaign-detail-metrics-section.test.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Passed: `npm run test:unit` - 735 files, 2,409 tests.
- Passed: `npm run build`.
- Skipped: browser QA, deploy, finance gates, and document gates because this sprint is a campaign-local presentational extraction with no route, server, query/cache, persistence, financial, document, deployment, or visible workflow behavior change.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for terminal next-step presentation because focused tests cover sent rendering, callback routing, and non-sent null behavior while type/lint/unit/build gates pass. Medium for the broader campaign detail surface because the panel remains 685 lines and still owns alert, meta, recipient, and dialog presentation. Broader build warnings about chunk size, dependency `"use client"` directives, native `bcrypt` deployment architecture, and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
