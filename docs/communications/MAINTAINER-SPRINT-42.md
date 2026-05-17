# Communications Maintainer Sprint 42: Campaign Detail Header Boundary

## Status

Closed and commit-ready.

## Problem

`CampaignDetailPanel` still owned the campaign header command surface directly:
status-driven primary actions, edit availability, secondary actions, pending
disabled rules, status badge mapping, and template subtitle/type-badge
formatting. That kept high-consequence campaign actions embedded in the same
component that also owns data loading, mutations, read errors, recipients, and
section orchestration.

## Workflow Spine Protected

Communications campaign detail route -> `CampaignDetailPanel` -> campaign hooks
and mutations -> `CampaignDetailHeader` -> operator campaign actions.

## Touched Domains

- Communications campaign detail UI.
- Campaign header action matrix.
- Communications campaign detail tests.

## Business Value Protected

Campaign detail is an operator command surface for sending, pausing, resuming,
testing, and auditing customer communications. The action matrix needs to be
small enough to test directly so RENOZ operators do not see unsafe or confusing
campaign actions during live outbound work.

## Scope Constraints

- No route, hook, server function, schema/database, tenant isolation, or
  query/cache behavior changed.
- No mutation semantics changed; send, pause, resume, and test-send still flow
  through the existing detail action helpers.
- No campaign action labels or status availability rules were intentionally
  changed.
- Skeleton and campaign data orchestration remain in `CampaignDetailPanel`.

## Changes

- Added `CampaignDetailHeader`, a focused component that owns:
  - campaign identity subtitle/type badge formatting
  - status badge variant mapping
  - draft/scheduled/paused send or resume primary action
  - sending pause primary action
  - sent analytics primary action
  - draft/scheduled edit availability
  - back, test-send, and email-history secondary actions
  - send/resume/pause pending disable rules and zero-recipient send disable
- Replaced the inline `EntityHeader` action assembly in `CampaignDetailPanel`
  with a narrow `CampaignDetailHeader` call.
- Added focused tests for draft, zero-recipient, paused, sending, sent, and
  source-boundary behavior.

## Standards Checked

- Domain ownership: campaign detail header action policy now lives in a
  campaign-owned component beside the rest of the campaign detail sections.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged.
- Tenant isolation: unchanged; no data access changed.
- Transactional inventory and finance integrity: not applicable to this
  communications presentation slice.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Honest UI states: header actions now have focused coverage for disabled
  zero-recipient send, pending-aware pause/send/resume wiring, and terminal
  sent actions.
- Operator-safe errors: unchanged; campaign not-found/read-error handling
  remains in the panel and existing read-state coverage still passes.
- Reviewable diff: one extracted component, one focused test file, parent
  import/render cleanup.

## Smells Removed

- Removed the inline campaign header action matrix from `CampaignDetailPanel`.
- Removed direct `EntityHeader`, `Badge`, campaign status variant, and campaign
  command icon ownership from the panel.
- Reduced `CampaignDetailPanel` from 432 lines to 365 lines.
- Added source-boundary coverage so header labels and status mapping stay out
  of the parent panel.

## Smells Deferred

- `CampaignDetailPanel` still owns the loading skeleton and route/hook/mutation
  orchestration.
- The skeleton is still inline and can be extracted later if the panel remains
  hard to scan.
- Broader campaign detail browser QA was not run; this slice is covered by
  component and unit gates.

## Gates

- Focused campaign detail tests:
  `npm run test:vitest -- tests/unit/communications/campaign-detail-header.test.tsx tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-alerts-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-meta-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/communications-mutation-errors.test.ts`
  - Passed, 11 files / 52 tests.
- Targeted ESLint:
  `npx eslint src/components/domain/communications/campaigns/campaign-detail-panel.tsx src/components/domain/communications/campaigns/campaign-detail-header.tsx tests/unit/communications/campaign-detail-header.test.tsx --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Reliability lint:
  `npm run lint:reliability`
  - Passed.
- Full source lint:
  `npm run lint`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 740 files / 2430 tests.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Production build:
  - Skipped. This was a presentational component extraction with typecheck,
    full lint, focused communications coverage, and full unit coverage. The
    build gate passed in Sprints 50 and 51 immediately before this domain slice.

## Goal Adaptation

No goal text changed. This sprint continues the standing goal by reducing a
campaign detail monolith through a domain-owned, testable boundary.

## Residual Risk

Low for header action behavior because the status/action matrix is directly
covered and existing campaign action/read-state tests still pass. Medium-low
for the broader detail panel because skeleton and route/hook/mutation
orchestration remain in the parent, though the panel is materially smaller and
easier to scan.
