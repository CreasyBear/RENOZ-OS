# Communications Maintainer Sprint 44: Campaign Detail Unavailable State Boundary

## Status

Closed and commit-ready.

## Problem

After Sprints 42 and 43, `CampaignDetailPanel` was smaller but still owned the
campaign detail unavailable state directly: alert icons, empty-state container
markup, back-action construction, and communications read-error formatting. That
kept operator-safe read failure presentation inside the route/hook/mutation
orchestration parent.

## Workflow Spine Protected

Communications campaign detail route -> `CampaignDetailPanel` -> `useCampaign`
read state -> `CampaignDetailUnavailableState` for missing or failed campaign
details -> existing back-to-campaigns recovery action.

## Touched Domains

- Communications campaign detail UI.
- Campaign detail read-failure presentation.
- Communications read-error source-boundary tests.

## Business Value Protected

Campaign detail failures should be understandable under pressure without
leaking provider, database, or runtime wording. Extracting the unavailable state
keeps that operator-safe failure contract explicit while leaving the parent
panel focused on campaign data, mutations, navigation, and section assembly.

## Scope Constraints

- No route, hook, server function, schema/database, tenant isolation, or
  query/cache behavior changed.
- No mutation semantics changed.
- No campaign unavailable title, fallback copy, or back-action label was
  intentionally changed.
- No browser QA or visual redesign was part of this slice.

## Changes

- Added `CampaignDetailUnavailableState`, a focused component that owns:
  - campaign not-found title
  - communications-owned read-error formatting
  - fallback campaign-details unavailable copy
  - optional back-to-campaigns primary action
- Replaced the inline unavailable-state block in `CampaignDetailPanel` with the
  new component.
- Moved the communications read-error source-boundary assertion from the panel
  to the new unavailable-state owner.
- Added focused tests for operator-safe failure copy, back action wiring, and
  source-boundary separation from the parent panel.

## Standards Checked

- Domain ownership: campaign detail read-failure UI now lives in a
  campaign-owned component beside the skeleton, header, sections, and actions.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged.
- Tenant isolation: unchanged; no data access changed.
- Transactional inventory and finance integrity: not applicable to this
  communications presentation slice.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Honest UI states: cold campaign detail failures still show an explicit
  unavailable/not-found state instead of fake detail content or raw errors.
- Operator-safe errors: unavailable copy remains communications-owned and raw
  thrown messages are covered against regression.
- Reviewable diff: one extracted component, one focused test file, parent
  import/render cleanup, and one source-contract path update.

## Smells Removed

- Removed inline unavailable-state markup from `CampaignDetailPanel`.
- Removed direct empty-state, alert icon, back icon, and read-error formatter
  imports from the parent panel.
- Reduced `CampaignDetailPanel` from 279 lines to 251 lines.
- Added source-boundary coverage so read-failure presentation stays out of the
  parent.

## Smells Deferred

- `CampaignDetailPanel` still owns campaign detail hook wiring, action
  mutations, navigation handlers, and action feedback.
- Broader campaign detail browser QA was not run; this slice is covered by
  component/unit gates and full static checks.
- Production build was not rerun for this slice; Sprint 43 ran a successful
  production build immediately before this read-state extraction.

## Gates

- Focused communications tests:
  `npm run test:vitest -- tests/unit/communications/campaign-detail-unavailable-state.test.tsx tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/campaign-detail-skeleton.test.tsx tests/unit/communications/campaign-detail-header.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/communications-mutation-errors.test.ts`
  - Passed, 7 files / 35 tests.
- Targeted ESLint:
  `npx eslint src/components/domain/communications/campaigns/campaign-detail-panel.tsx src/components/domain/communications/campaigns/campaign-detail-unavailable-state.tsx tests/unit/communications/campaign-detail-unavailable-state.test.tsx tests/unit/communications/communication-read-error-messages.test.ts --report-unused-disable-directives`
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
  - Passed, 742 files / 2434 tests.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Production build:
  - Skipped. This was a narrow presentational read-state extraction with
    typecheck, full lint, focused communications coverage, and full unit
    coverage. Sprint 43 ran `npm run build` successfully immediately before
    this slice.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner posture by
moving operator-safe read-failure presentation into an explicit campaign detail
boundary without changing data or mutation contracts.

## Residual Risk

Low for campaign unavailable-state behavior because the rendered copy,
back-action wiring, source boundary, existing read-state integration, and full
unit suite all pass. Medium-low for the broader detail panel because mutation
orchestration and navigation handlers remain in the parent.
