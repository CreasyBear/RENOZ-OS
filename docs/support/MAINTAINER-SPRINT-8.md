# Support Maintainer Sprint 8

This sprint continues the issue detail ownership cleanup after Sprint 7 extracted sidebar actions. The aim is to give header action assembly a focused support workflow boundary before changing status behavior.

Status: Closed after Issue 1.

## Business Value

The issue detail header is the first operator control surface for support work: start, resolve, close, back navigation, hold, escalate, and de-escalate. If those action labels and status targets stay embedded in the page presenter, future workflow changes can drift away from `IssueDetailActionPolicy` and create unsafe or confusing operator controls.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> `getIssueDetailActionPolicy`
-> `getIssueHeaderActions`
-> `EntityHeader` primary and secondary actions.

## Architecture Constraints

- Keep this sprint support-domain only.
- Do not change action policy semantics, issue hooks, server functions, schemas, database access, cache keys, invalidation, or mutation behavior.
- Preserve current `EntityHeader` labels, disabled states, destructive marking, and status targets.
- Treat this as a behavior-preserving policy-to-presentation extraction.
- Add focused tests for open, resolved, escalated, and pending header action states.

## Issue Ledger

### 1. Header Action Mapper Ownership

Problem:

- `issue-detail-view.tsx` still assembled header primary and secondary actions after sidebar actions were extracted.
- Header actions duplicate the same workflow policy concerns as the sidebar action card, but they were not directly tested.
- Escalated issues must stay on the de-escalation path and mutable actions should respect pending state.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `getIssueDetailActionPolicy` -> header action mapper -> `EntityHeader` primary action and secondary action menu.

Planned slice:

- Extract header action assembly into `getIssueHeaderActions`.
- Keep labels, icons, disabled flags, destructive flags, callbacks, and status targets unchanged.
- Remove header action assembly imports and logic from `issue-detail-view.tsx`.
- Add focused mapper tests for open, resolved, escalated, and pending states.

Out of scope:

- Changing action policy semantics.
- Changing escalation/de-escalation server routing.
- Changing status transition schemas or cache invalidation.
- Redesigning `EntityHeader` or issue detail layout.

Closeout:

- Touched domains: support issue detail UI, support header workflow action mapping, escalation source-contract tests, support UI tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `getIssueDetailActionPolicy` -> `getIssueHeaderActions` -> `EntityHeader` primary and secondary actions.
- Business value protected: operators still see the same header actions for open, resolved, escalated, and pending support issues, with de-escalation kept on the controlled path and mutable actions disabled during updates.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; action policy calculation unchanged; status targets unchanged; query/cache and mutation contracts unchanged; issue detail now delegates header action assembly to a focused mapper.
- Tenant isolation and data integrity checked: no server query, tenant predicate, schema, mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, stale-time, optimistic update, rollback, or cache policy changed.
- Smells removed: header primary and secondary action assembly removed from `issue-detail-view.tsx`; open/resolved/escalated/pending header states now have focused coverage; source-contract escalation test now follows the extracted ownership boundary instead of searching only the page file.
- Smells deferred: `issue-detail-view.tsx` still owns details, SLA, escalation, description, and resolution cards; the page still owns status badge composition and dialog wiring; browser QA remains deferred until visual or workflow behavior changes.
- Verification: focused header/action/action-policy tests passed; escalation source-contract test passed after updating ownership expectations; targeted eslint passed; `tsc --noEmit` passed; full support unit suite passed 35 files / 147 tests; `git diff --check` passed.
- Gates skipped: browser QA skipped because this was a behavior-preserving mapper extraction with no route, layout intent, server, or mutation change.
- Goal adaptation: no standing goal change. This continues the active maintainer goal by removing workflow action assembly from the page presenter and keeping the contract test aligned with actual component ownership.
- Residual risk: the page presenter is now close to a shell but still owns overview/detail cards and alert composition. The next support slice should extract details/SLA/escalation cards or stop support monolith cleanup and switch to a higher-risk product workflow domain if triage surfaces one.

## Sprint Closeout Audit

Completion audit:

- Objective: extract `EntityHeader` action assembly from the issue detail presenter without changing behavior.
- Deliverables checked: sprint artifact, `getIssueHeaderActions`, issue detail integration, focused mapper tests, escalation source-contract update, targeted lint, typecheck, support unit suite, and diff whitespace gate.
- Evidence inspected: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-header-actions.tsx`, `src/components/domain/support/issues/issue-detail-action-policy.ts`, `tests/unit/support/issue-header-actions.test.tsx`, `tests/unit/support/issue-escalation-current-state-contract.test.ts`, and `docs/support/MAINTAINER-SPRINT-8.md`.

Touched domains: support issue detail presentation, support header workflow action mapping, support source-contract tests.

Workflow protected: issue detail action policy -> header action mapper -> start/resolve/close primary actions and back/hold/escalate/de-escalate secondary actions.

Business value protected: RENOZ support operators retain safe first-screen workflow controls for battery support issues while the code becomes easier to reason about.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- domain ownership: header action mapping now has a focused support component owner
- UI honesty: open, resolved, escalated, and pending header action states have focused coverage

Smells removed:

- primary and secondary header action assembly embedded in the issue detail presenter
- de-escalation source-contract test coupled to the old page-file location
- mutable header action pending-state behavior lacked focused coverage

Smells deferred:

- details card remains in `issue-detail-view.tsx`
- SLA, escalation, description, and resolution cards remain in the page presenter
- status badge composition and alert rendering remain in the page presenter
- browser QA remains deferred until behavior or layout changes

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/issue-header-actions.test.tsx tests/unit/support/issue-actions-card.test.tsx tests/unit/support/issue-detail-action-policy.test.ts` passed 3 files / 11 tests
- `./node_modules/.bin/vitest run tests/unit/support/issue-escalation-current-state-contract.test.ts tests/unit/support/issue-header-actions.test.tsx tests/unit/support/issue-actions-card.test.tsx` passed 3 files / 10 tests
- `./node_modules/.bin/eslint src/components/domain/support/issues/issue-detail-view.tsx src/components/domain/support/issues/issue-header-actions.tsx tests/unit/support/issue-header-actions.test.tsx tests/unit/support/issue-escalation-current-state-contract.test.ts src/components/domain/support/issues/issue-detail-action-policy.ts` passed
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `./node_modules/.bin/vitest run tests/unit/support` passed 35 files / 147 tests
- `git diff --check` passed

Gates skipped: browser QA skipped because this extraction preserves UI labels and behavior while changing only code ownership.

Goal adaptations made or declined: no goal text change. The sprint follows the standing process: small support-domain slice, workflow spine protected, focused tests, broader gates, and explicit residual risk.

Residual risk: `IssueDetailView` is 506 lines and easier to reason about, but it still owns several presentational cards. Further support cleanup should be weighed against switching to the next higher-risk business workflow.
