# Communications Maintainer Sprint 34

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Action Orchestration Concentration

### Problem

`campaign-detail-panel.tsx` still mixed campaign detail presentation with consequence-bearing action orchestration. Send, pause, resume, and test-send logic handled confirmation, recipient preflight, mutation calls, safe error formatting, and toast copy directly inside the large detail component. That made operator action behavior harder to test without rendering the whole panel and kept failure-mode policy tied to presentation code.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> campaign detail action workflow
-> campaign mutation hooks
-> communications server functions
-> campaign send/pause/resume/test-send processing
-> campaign detail/list query invalidation
-> operator success, warning, error, or cancellation feedback.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign detail action workflow.
- Communications campaign action feedback source contract tests.
- Communications campaign detail action unit tests.

### Business Value Protected

Campaign detail actions directly affect customer/dealer communication. Extracting action orchestration makes the send/pause/resume/test-send paths easier to review, proves recipient preflight and cancellation behavior, and keeps raw provider/database errors behind communications-owned feedback copy. Operators keep the same visible action behavior, but the code now exposes the action decision tree as a campaign-owned boundary.

### Scope Constraints

- Do not change campaign route wiring, mutation hook invalidation, server functions, provider sending, database schema, recipient persistence, or query keys.
- Do not redesign the campaign detail panel, change action availability, or alter layout.
- Do not broaden into campaign wizard, campaign list bulk actions, analytics, inbox, scheduled calls, templates, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-detail-actions.ts` with campaign-local workflow functions for:
  - recipient-count preflight before send
  - send confirmation and cancellation
  - send mutation success/failure feedback
  - pause confirmation and cancellation
  - pause mutation success/failure feedback
  - resume mutation success/failure feedback
  - test-send mutation success/failure feedback
- Updated `campaign-detail-panel.tsx` so it delegates action orchestration to the campaign action workflow and only renders returned feedback plus dialog reset behavior.
- Added `campaign-detail-actions.test.ts` covering blocked send, cancelled send, confirmed send, safe send failure, pause success/failure, resume success/failure, test-send success/failure, and source boundary expectations.
- Updated the communications mutation error source contract so safe campaign formatter checks follow the extracted detail action boundary.

### Standards Checked

- Domain ownership: campaign detail actions now live in a campaign-local action workflow module beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: the route, mutation hooks, server functions, schema/database writes, and query invalidation contracts are unchanged.
- Query/cache policy: no query keys, invalidation scopes, stale times, or cache semantics changed.
- Tenant isolation/data integrity: no tenant filters, server functions, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: visible success/error behavior is preserved through returned feedback and directly tested. Cancelled confirmations still do not mutate or toast. Raw provider/database errors remain behind campaign-owned formatter copy.
- Reviewability: action branches are now testable without rendering the full 948-line detail panel. The extracted action boundary is 206 lines with focused tests.

### Smells Removed

- Inline send confirmation, recipient preflight, mutation, and error formatting in the detail panel.
- Inline pause confirmation, mutation, and error formatting in the detail panel.
- Inline resume mutation and error formatting in the detail panel.
- Inline test-send mutation, dialog success reset, and error formatting in the detail panel.
- Source-contract coupling that required safe formatter calls to live inside the presentation component.

### Deferred

- The campaign detail panel remains large. Metrics, lifecycle progress, alert rendering, recipient rows, and terminal-state suggestions are still presentation-heavy and can be split in later sprints.
- The campaign detail read-state boundary was not changed beyond keeping its existing test coverage.
- Campaign list route bulk actions still have their own action orchestration and remain a separate candidate if future communications work touches list actions.
- Browser QA is deferred because this sprint did not intentionally change visible markup, layout, or action availability.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 3 files, 23 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-actions.ts`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `npm run test:unit` - 732 files, 2399 tests.
- Passed: `git diff --check`.
- Skipped: browser QA, production build, deploy, finance gates, and document gates because this sprint did not intentionally change visible markup, build-time behavior, deployment code, financial/document behavior, persistence, or serialized inventory lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, operator-safe errors, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for campaign detail action behavior because focused unit tests cover the extracted branches and full unit/type/lint gates pass. Medium for campaign detail maintainability because the panel remains large and still owns multiple presentation regions. Broader build warnings about chunk size and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
