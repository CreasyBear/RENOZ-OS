# Communications Maintainer Sprint 45: Campaign Detail Loaded-State Boundary

## Status

Closed and commit-ready.

## Problem

After Sprints 42-44, `CampaignDetailPanel` still owned the full loaded campaign
detail layout: header, lifecycle, alerts, metrics, next steps, meta fields,
recipients, and test-send dialog placement. The file was smaller, but it still
mixed container responsibilities with loaded-state presentation. That made the
panel harder to scan when changing campaign data loading, mutation callbacks, or
operator recovery behavior.

## Workflow Spine Protected

Communications campaign detail route -> `CampaignDetailPanel` container ->
campaign/recipient hooks and campaign action callbacks -> `CampaignDetailLoadedState`
presenter -> campaign header, lifecycle, alerts, metrics, next steps, meta,
recipients, and test-send dialog.

## Touched Domains

- Communications campaign detail UI.
- Campaign detail loaded-state layout.
- Campaign detail source-boundary tests.

## Business Value Protected

Campaign detail is an operator command and inspection surface for outbound
customer communications. Splitting the loaded-state presenter from the container
keeps campaign action wiring and read-state orchestration easier to reason about
without weakening the section-level UI contracts operators rely on.

## Scope Constraints

- No route, hook, server function, schema/database, tenant isolation, or
  query/cache behavior changed.
- No mutation semantics changed.
- No campaign action labels, section labels, recipient copy, or test-send dialog
  behavior was intentionally changed.
- No visual redesign was part of this slice.

## Changes

- Added `CampaignDetailLoadedState`, a focused loaded-detail presenter that owns:
  - campaign header placement
  - lifecycle, alerts, metrics, next steps, meta, and recipients section layout
  - test-send dialog placement
  - loaded-state spacing/class application
- Replaced the section layout block in `CampaignDetailPanel` with a single
  `CampaignDetailLoadedState` call.
- Added focused loaded-state coverage for layout rendering, primary action
  routing, and source-boundary separation from the container.
- Updated existing section source-boundary tests so the loaded-state presenter,
  not the container, is the direct section-layout owner.

## Standards Checked

- Domain ownership: campaign detail loaded-state presentation now lives in a
  campaign-owned presenter beside the section components it composes.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged; the panel remains the container for campaign/recipient reads and
  mutation callback assembly.
- Tenant isolation: unchanged; no data access changed.
- Transactional inventory and finance integrity: not applicable to this
  communications presentation slice.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Honest UI states: loading and unavailable states remain separate; loaded
  rendering is only reached when campaign data exists.
- Operator-safe errors: unchanged; unavailable-state behavior from Sprint 44
  remains intact.
- Reviewable diff: one presenter extraction, one focused test file, parent
  import/render cleanup, and source-boundary test updates.

## Smells Removed

- Removed direct section layout ownership from `CampaignDetailPanel`.
- Removed direct imports for the header, lifecycle, alerts, metrics, next steps,
  meta, recipients, and test-send dialog from the parent.
- Reduced `CampaignDetailPanel` from 251 lines to 214 lines.
- Updated source-boundary tests so they reflect the new container -> loaded-state
  presenter boundary instead of the older container -> section boundary.

## Smells Deferred

- `CampaignDetailPanel` still owns campaign action mutation assembly,
  confirmation usage, navigation handlers, toast feedback, and test-send dialog
  open state.
- Bundle chunk size warnings remain broader performance debt.
- The production build still emits the existing `bcrypt` native dependency
  environment note, which should remain part of deployment awareness.

## Gates

- Initial focused campaign detail test run:
  - Failed 8 source-boundary assertions that still expected
    `CampaignDetailPanel` to directly render section components.
  - Remediation: updated those assertions to treat `CampaignDetailLoadedState`
    as the section-layout owner and keep the panel asserted as the container.
- Focused campaign detail tests:
  `npm run test:vitest -- tests/unit/communications/campaign-detail-loaded-state.test.tsx tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/campaign-detail-unavailable-state.test.tsx tests/unit/communications/campaign-detail-skeleton.test.tsx tests/unit/communications/campaign-detail-header.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-alerts-section.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-meta-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/communications-mutation-errors.test.ts`
  - Passed after remediation, 15 files / 60 tests.
- Targeted ESLint:
  `npx eslint src/components/domain/communications/campaigns/campaign-detail-panel.tsx src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx tests/unit/communications/campaign-detail-loaded-state.test.tsx tests/unit/communications/campaign-detail-alerts-section.test.tsx tests/unit/communications/campaign-detail-header.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/campaign-detail-lifecycle-section.test.tsx tests/unit/communications/campaign-detail-metrics-section.test.tsx tests/unit/communications/campaign-detail-meta-section.test.tsx tests/unit/communications/campaign-detail-next-steps-section.test.tsx tests/unit/communications/campaign-detail-recipients-section.test.tsx --report-unused-disable-directives`
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
  - Passed, 743 files / 2436 tests.
- Production build:
  `npm run build`
  - Passed. Build emitted the existing large-chunk warning and native dependency
    trace note for `bcrypt`; neither failed the gate.
- Diff whitespace:
  `git diff --check`
  - Passed.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner posture by
making the campaign detail container/presenter split explicit while preserving
the existing route, hook, mutation, and section contracts.

## Residual Risk

Low for loaded-state rendering because focused campaign detail coverage, source
contracts, full unit suite, lint, typecheck, reliability lint, and build all
passed. Medium-low for the broader campaign detail workflow because action
mutation orchestration and navigation handlers still live in the parent
container.
