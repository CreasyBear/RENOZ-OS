# Communications Maintainer Sprint 35

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Lifecycle Presentation Concentration

### Problem

After Sprint 34, `campaign-detail-panel.tsx` no longer owned action orchestration, but it still carried the full campaign lifecycle/progress presentation inline. The lifecycle band combined stage-index calculation, sending progress calculation, reduced-motion handling, scheduled/sent/sending status copy, progress bar rendering, and stage marker rendering inside the large detail panel. That kept an independent display region coupled to the parent component and made future lifecycle display changes harder to review safely.

### Workflow Spine

Communications campaign detail route
-> `CampaignDetailPanel`
-> campaign detail lifecycle section
-> campaign status config and campaign progress utility
-> operator lifecycle/progress display.

### Touched Domains

- Communications campaign detail panel.
- Communications campaign detail lifecycle presentation.
- Communications lifecycle presentation tests.

### Business Value Protected

Campaign lifecycle state tells an operator whether a campaign is draft, scheduled, sending, or sent. Keeping that display in a campaign-owned component makes the status/progress rules easier to test and review without touching campaign actions, recipients, alerts, or persistence behavior. It reduces the risk that future UI edits accidentally change lifecycle meaning or sending progress copy.

### Scope Constraints

- Do not change route wiring, campaign hooks, server functions, database schema, recipient persistence, provider sending, or query invalidation.
- Do not redesign the campaign detail page or change action availability.
- Do not change lifecycle labels, progress copy, reduced-motion behavior, stage status mapping, or progress calculation.
- Do not broaden into campaign alerts, metrics, recipients, terminal-state suggestions, campaign list actions, analytics, inbox, templates, or provider processing.

### Changes

- Added `campaign-detail-lifecycle-section.tsx` with the campaign lifecycle/progress rendering boundary.
- Moved stage-index calculation, sending progress calculation, reduced-motion handling, lifecycle status copy, progress bar rendering, and stage marker rendering out of `campaign-detail-panel.tsx`.
- Updated `campaign-detail-panel.tsx` to render `<CampaignDetailLifecycleSection campaign={campaign} />`.
- Added `campaign-detail-lifecycle-section.test.tsx` covering scheduled lifecycle stage context, sending percentage progress, terminal failure-state null rendering, and the source boundary.

### Standards Checked

- Domain ownership: lifecycle presentation now lives in a campaign-local component beside the detail panel.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: unchanged. This sprint does not touch hooks, server functions, schemas, database writes, or query keys.
- Query/cache policy: no query keys, invalidation scopes, stale times, or cache behavior changed.
- Tenant isolation/data integrity: no tenant filters, write payload ownership, provider side effects, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: lifecycle rendering behavior is preserved and directly tested for scheduled, sending, and cancelled states.
- Reviewability: `campaign-detail-panel.tsx` dropped from 948 lines to 839 lines; the lifecycle section is now a 131-line component with focused tests.

### Smells Removed

- Inline lifecycle stage rendering inside the large campaign detail panel.
- Inline sending progress calculation in the parent detail component.
- Inline reduced-motion progress styling in the parent detail component.
- Inline terminal lifecycle visibility rule in the parent detail component.
- Untested scheduled/sending/failure lifecycle presentation branches.

### Deferred

- Campaign metrics, error stats, terminal-state suggestions, campaign meta fields, recipient rows, and test-send dialog presentation remain in `campaign-detail-panel.tsx`.
- Campaign detail read-state and action orchestration were not changed beyond preserving their existing boundaries.
- Browser QA is deferred because this sprint preserves markup intent and does not change action behavior or page routing.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communications-mutation-errors.test.ts` - 4 files, 27 tests.
- Passed: targeted ESLint for `campaign-detail-panel.tsx`, `campaign-detail-lifecycle-section.tsx`, `campaign-detail-lifecycle-section.test.tsx`, `campaign-detail-actions.test.ts`, `campaign-detail-read-state.test.tsx`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite, browser QA, production build, deploy, finance gates, and document gates because this sprint is a campaign-local presentational extraction with no route, server, query/cache, persistence, financial, document, deployment, or visible workflow behavior change. Full unit passed in Sprint 34 immediately before this slice.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for lifecycle presentation because focused tests cover scheduled, sending, and terminal failure display behavior while type/lint gates pass. Medium for the broader campaign detail surface because the panel remains 839 lines and still owns multiple presentation regions. Broader build warnings about chunk size and mixed Supabase client static/dynamic imports remain repo-level risks outside this sprint.
