# Communications Maintainer Sprint 43: Campaign Detail Skeleton Boundary

## Status

Closed and commit-ready.

## Problem

`CampaignDetailPanel` still owned the campaign detail loading skeleton directly:
placeholder header rows, metric cards, progress card, recipient table headings,
and repeated skeleton table rows. That forced the route/hook/mutation parent to
carry presentational loading markup and UI imports after Sprint 42 had already
extracted the campaign header command surface.

## Workflow Spine Protected

Communications campaign detail route -> `CampaignDetailPanel` -> campaign hooks
and mutations -> `CampaignDetailSkeleton` loading state -> campaign sections
once campaign data is available.

## Touched Domains

- Communications campaign detail UI.
- Campaign detail loading state.
- Communications barrel exports.
- Communications campaign detail tests.

## Business Value Protected

Campaign detail is an operator surface for inspecting and controlling outbound
customer communications. The loading state should remain honest and accessible
while the parent panel becomes smaller, so future changes to send, pause,
resume, read-error, and recipient workflows can be made without parsing
placeholder table markup first.

## Scope Constraints

- No route, hook, server function, schema/database, tenant isolation, or
  query/cache behavior changed.
- No mutation semantics changed.
- No campaign loading labels, table headings, layout, or skeleton counts were
  intentionally changed.
- No browser QA or visual redesign was part of this slice.

## Changes

- Added `CampaignDetailSkeleton` as a focused campaign detail loading component.
- Replaced the inline skeleton block in `CampaignDetailPanel` with
  `<CampaignDetailSkeleton />`.
- Updated communications campaign and domain barrels so the skeleton export
  comes from its own file instead of the panel.
- Added focused tests for accessible loading state and source-boundary
  separation from the parent panel.

## Standards Checked

- Domain ownership: campaign detail loading presentation now lives in a
  campaign-owned component beside the other campaign detail sections.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged.
- Tenant isolation: unchanged; no data access changed.
- Transactional inventory and finance integrity: not applicable to this
  communications presentation slice.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Honest UI states: the loading state still exposes `aria-busy="true"` and the
  campaign detail loading label, with table headings covered by tests.
- Operator-safe errors: unchanged; campaign not-found/read-error handling
  remains in the panel and existing read-state coverage still passes.
- Reviewable diff: one extracted component, one focused test file, parent
  import/render cleanup, and narrow barrel updates.

## Smells Removed

- Removed inline skeleton table/card markup from `CampaignDetailPanel`.
- Removed skeleton, card, and table UI imports from the parent panel.
- Removed the stale skeleton export source from `campaign-detail-panel.tsx`.
- Reduced `CampaignDetailPanel` from 365 lines to 279 lines.
- Added source-boundary coverage so skeleton markup stays out of the parent.

## Smells Deferred

- `CampaignDetailPanel` still owns campaign detail route/hook/mutation
  orchestration, read errors, navigation handlers, and action feedback.
- Broader campaign detail browser QA was not run; this slice is covered by
  component/unit gates and a successful production build.
- Bundle chunk warnings remain a broader performance topic outside this
  communications loading-state extraction.

## Gates

- Focused campaign detail tests:
  `npm run test:vitest -- tests/unit/communications/campaign-detail-skeleton.test.tsx tests/unit/communications/campaign-detail-header.test.tsx tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-alerts-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-meta-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/communications-mutation-errors.test.ts`
  - Passed, 12 files / 54 tests.
- Targeted ESLint:
  `npx eslint src/components/domain/communications/campaigns/campaign-detail-panel.tsx src/components/domain/communications/campaigns/campaign-detail-skeleton.tsx src/components/domain/communications/campaigns/index.ts src/components/domain/communications/index.ts tests/unit/communications/campaign-detail-skeleton.test.tsx --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed. Initial run caught a stale barrel export and was fixed before closeout.
- Reliability lint:
  `npm run lint:reliability`
  - Passed.
- Full source lint:
  `npm run lint`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 741 files / 2432 tests.
- Production build:
  `npm run build`
  - Passed. Build emitted the existing large-chunk warning and native dependency
    trace note for `bcrypt`; neither failed the gate.
- Diff whitespace:
  `git diff --check`
  - Passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner posture by
removing another presentational responsibility from a campaign detail parent
without widening behavior or data contracts.

## Residual Risk

Low for campaign loading behavior because the skeleton is a direct extraction
with accessible loading coverage and full communications/unit gates passing.
Medium-low for the broader detail panel because the parent still owns route,
hook, mutation, navigation, read-state, and action feedback orchestration.
