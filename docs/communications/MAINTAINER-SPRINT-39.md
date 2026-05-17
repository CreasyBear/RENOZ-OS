# Communications Maintainer Sprint 39

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Test-Send Dialog State Concentration

### Problem

After Sprint 38, `campaign-detail-panel.tsx` still owned the test-send dialog presentation and form behavior inline. The parent detail panel carried dialog markup, pending outside/escape guards, email input state, Enter-key submission, cancel reset, pending button copy, success reset, and the mutation callback. That coupled a small operator validation workflow to the detail page's campaign read state, header actions, alerts, metadata, recipients, metrics, and lifecycle rendering.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> header "Send Test Email" action
-> campaign detail test-send dialog
-> `testSendCampaignFromDetail`
-> `useTestSendCampaign`
-> operator receives success or blocked feedback.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign test-send dialog presentation and form state.
- Communications test-send dialog tests.

### Business Value Protected

Before a real campaign is sent, operators need a reliable preview-validation path that can send a test email, prevent duplicate pending submits, preserve input on blocked sends, and reset only when the test send succeeds or the operator cancels. Extracting this dialog makes that workflow directly testable while keeping the send helper and server mutation contracts unchanged.

### Scope Constraints

- Do not change campaign route wiring, campaign hooks, server functions, database schema, provider sending, or query invalidation.
- Do not change test-send copy, input id, placeholder, submit/cancel labels, pending label, Enter-key behavior, success feedback, blocked feedback, or action availability.
- Do not broaden into campaign alerts, campaign meta fields, recipients, lifecycle, metrics, inbox, analytics, templates, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-detail-test-send-dialog.tsx` with the dialog markup, email input state, pending interaction guards, cancel reset, Enter-key submit, blocked-send preservation, and success reset behavior.
- Updated `campaign-detail-panel.tsx` to keep only the header-driven open state and `testSendCampaignFromDetail` callback.
- Removed inline dialog imports, input state, pending guards, and reset behavior from the parent detail component.
- Added `campaign-detail-test-send-dialog.test.tsx` covering success reset, blocked-send preservation, pending submit guard, cancel reset, and source-boundary ownership.

### Standards Checked

- Domain ownership: test-send dialog presentation and local form state now live in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch routes, hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, cache shape, or fetch enablement changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: success reset, blocked-send preservation, pending button state, cancel reset, and source boundary are directly tested.
- Reviewability: `campaign-detail-panel.tsx` dropped from 596 lines to 541 lines; the test-send dialog is now a 98-line component with focused tests.

### Smells Removed

- Inline test-send dialog rendering inside the campaign detail panel.
- Inline test email input state in the parent detail component.
- Inline pending dialog guard creation in the parent detail component.
- Inline cancel/success reset behavior in the parent detail component.
- Untested blocked-send preservation and pending button behavior for the test-send workflow.

### Deferred

- Campaign alerts and campaign meta field presentation remain in `campaign-detail-panel.tsx`.
- Campaign detail lifecycle, metrics, read-state, action orchestration, terminal next steps, and recipients were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves dialog copy, input id, action labels, pending semantics, and callback behavior and does not change routing, mutations, or visible workflow semantics.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 8 files, 40 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-test-send-dialog.tsx`, `campaign-detail-test-send-dialog.test.tsx`, `campaign-detail-recipients-section.tsx`, `campaign-detail-recipients-section.test.tsx`, `campaign-detail-next-steps-section.tsx`, `campaign-detail-next-steps-section.test.tsx`, `campaign-detail-metrics-section.test.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite, production build, browser QA, deploy, finance gates, and document gates because this sprint is a campaign-local dialog/state extraction with no route, server, query/cache, persistence, financial, document, deployment, or workflow semantics change. Full unit and production build passed in Sprint 37 immediately before this campaign-detail extraction series.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for test-send dialog behavior because focused tests cover success reset, blocked-send preservation, pending submit guard, cancel reset, and source-boundary ownership while type/lint/reliability gates pass. Medium for the broader campaign detail surface because the panel remains 541 lines and still owns campaign alerts and meta field presentation. Broader build warnings about chunk size, dependency `"use client"` directives, native `bcrypt` deployment architecture, and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
