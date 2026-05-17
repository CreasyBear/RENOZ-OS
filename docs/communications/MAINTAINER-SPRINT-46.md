# Communications Maintainer Sprint 46: Campaign Detail Action Orchestration Boundary

## Status

Closed and commit-ready.

## Problem

The quick repo audit found the current tree red because Sprint 46 had been
interrupted mid-extraction: `campaign-detail-actions.ts` had been moved away
from the campaign detail component directory, but `CampaignDetailPanel`, related
presenters, and tests still imported the old relative component-owned module.

That failure exposed the underlying smell this slice was meant to close:
`CampaignDetailPanel` still owned campaign mutation hook assembly,
confirmation, navigation handlers, toast feedback, and test-send dialog open
state. The panel had become a smaller container after Sprints 42-45, but it
still mixed read orchestration with operator command orchestration.

## Workflow Spine Protected

Communications campaign detail route -> `CampaignDetailPanel` container ->
`useCampaign` / `useCampaignRecipients` read hooks ->
`useCampaignDetailActions` action hook -> communications campaign mutation
hooks and confirmation/toast/navigation adapters ->
`src/lib/communications/campaign-detail-actions.ts` pure action result contract
-> `CampaignDetailLoadedState` presenter.

## Touched Domains

- Communications campaign detail UI/container.
- Communications campaign detail action orchestration hook.
- Communications campaign detail pure action contract.
- Communications mutation error/source-boundary tests.

## Business Value Protected

Campaign detail is an operator command surface for outbound communications.
Send, pause, resume, edit, analytics navigation, email-history navigation, and
test-send behavior now have an explicit hook owner instead of living inside the
data container. That makes command behavior easier to test, reason about, and
change without destabilizing campaign read-state rendering.

## Scope Constraints

- No route, server function, schema/database, tenant isolation, or query/cache
  behavior changed.
- No mutation semantics changed.
- No campaign copy, labels, visual layout, or recipient rendering changed.
- No transactional inventory/finance behavior was touched.
- No broader confirmation architecture refactor was attempted.

## Changes

- Moved campaign detail action result helpers from the component directory to
  `src/lib/communications/campaign-detail-actions.ts`.
- Added `useCampaignDetailActions` to own:
  - campaign action mutation hook wiring
  - confirmation calls for send/pause
  - navigation handlers for edit, analytics, and inbox history
  - toast feedback dispatch
  - test-send dialog open state
- Reduced `CampaignDetailPanel` to read orchestration plus loaded/unavailable
  state selection.
- Updated loaded-state and test-send dialog type imports to the communications
  lib boundary.
- Added hook-level tests for send orchestration, navigation, test-send state,
  null-campaign blocking, and source-boundary ownership.
- Updated existing action and mutation-error source-boundary tests to assert
  panel -> hook -> lib ownership.

## Standards Checked

- Domain ownership: campaign detail command orchestration now lives in a
  communications hook; pure action results live in communications lib.
- Route -> container/page -> hook -> server function -> schema/database flow:
  the campaign detail container now delegates action wiring to a hook while
  preserving existing campaign mutation hooks.
- Tenant isolation: unchanged; no data access path changed.
- Transactional inventory and finance integrity: not applicable to this
  communications slice.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged; existing mutation hooks remain the cache
  contract owner.
- Honest UI states: unavailable/loading/loaded branches remain separated; action
  handlers block when campaign detail data is unavailable.
- Operator-safe errors: action failures continue through communications-owned
  mutation error formatters.
- Reviewable diff: one hook extraction, one lib boundary move, targeted imports,
  and focused tests.

## Smells Removed

- Removed mutation hook assembly from `CampaignDetailPanel`.
- Removed confirmation usage from `CampaignDetailPanel`.
- Removed toast feedback dispatch from `CampaignDetailPanel`.
- Removed action navigation handlers from `CampaignDetailPanel`.
- Removed relative component-directory ownership for reusable campaign detail
  action result helpers.
- Closed the red working tree caused by the interrupted file move.

## Smells Deferred

- `src/lib/communications/campaign-detail-actions.ts` still imports
  `confirmations` from the shared confirmation hook module; a future small slice
  should move preset confirmation definitions to a non-hook shared/lib boundary.
- `CampaignDetailPanel` still owns campaign/recipient read hook selection and
  recipient normalization.
- Bundle chunk size warnings remain broader performance debt.
- The production build still emits the existing `bcrypt` native dependency
  environment note, which remains deployment awareness rather than a new failure.

## Gates

- Initial audit typecheck:
  `npm run typecheck`
  - Failed as expected on stale imports from the interrupted extraction.
  - Remediation: wired panel/presenters/tests to the new hook/lib boundary.
- Focused communications tests:
  `npm run test:vitest -- tests/unit/communications/use-campaign-detail-actions.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/campaign-detail-loaded-state.test.tsx tests/unit/communications/campaign-detail-test-send-dialog.test.tsx tests/unit/communications/communications-mutation-errors.test.ts`
  - Passed, 6 files / 33 tests.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Targeted ESLint:
  `npx eslint src/components/domain/communications/campaigns/campaign-detail-panel.tsx src/hooks/communications/use-campaign-detail-actions.ts src/hooks/communications/index.ts src/lib/communications/campaign-detail-actions.ts src/components/domain/communications/campaigns/campaign-detail-loaded-state.tsx src/components/domain/communications/campaigns/campaign-detail-test-send-dialog.tsx tests/unit/communications/use-campaign-detail-actions.test.tsx tests/unit/communications/campaign-detail-actions.test.ts tests/unit/communications/communications-mutation-errors.test.ts tests/unit/communications/campaign-detail-test-send-dialog.test.tsx --report-unused-disable-directives`
  - Passed.
- Reliability lint:
  `npm run lint:reliability`
  - Passed.
- Full source lint:
  `npm run lint`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 744 files / 2440 tests.
- Production build:
  `npm run build`
  - Passed. Build emitted the existing large-chunk warning and native dependency
    trace note for `bcrypt`; neither failed the gate.
- Diff whitespace:
  `git diff --check`
  - Passed.

## Goal Adaptation

No standing goal change. The sprint reinforces the current product-owner goal:
small domain-sliced remediation, explicit ownership boundaries, operator-safe
error behavior, and evidence-backed closeout.

## Residual Risk

Low for campaign detail action orchestration because focused tests, typecheck,
targeted ESLint, reliability lint, full lint, full unit suite, build, and diff
whitespace all passed. Medium-low for broader communications command behavior
because confirmation preset ownership still crosses from lib into a hook module
and should be cleaned up in a future slice.
