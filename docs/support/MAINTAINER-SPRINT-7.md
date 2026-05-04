# Support Maintainer Sprint 7

This sprint continues the issue detail ownership cleanup after Sprint 6 extracted remedy readiness. The aim is to give issue workflow actions a focused presentation boundary before changing action policy or support issue behavior.

Status: Closed after Issue 1.

## Business Value

Support issue actions are operator-critical controls: start work, hold, escalate, de-escalate, resolve, close, delete, and launch RMA creation. If those affordances are mixed into the general issue detail presenter, future workflow changes can accidentally expose unsafe transitions or imply an RMA path when the source order is blocked.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> issue read model and action policy
-> `IssueActionsCard`
-> Create RMA affordance, status transition buttons, and delete action.

## Architecture Constraints

- Keep this sprint support-domain only.
- Do not change action policy calculation, issue hooks, RMA hooks, server functions, schemas, database access, cache keys, invalidation, or mutation behavior.
- Preserve current route/search/navigation behavior for Create RMA.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for ready/blocked RMA affordance, active workflow buttons, and escalated de-escalation behavior.

## Issue Ledger

### 1. Issue Actions Card Ownership

Problem:

- `issue-detail-view.tsx` still owned issue action rendering after customer context, related context, and remedy readiness were extracted.
- The action card renders high-impact workflow affordances that must stay aligned with `IssueDetailActionPolicy`.
- Create RMA display is tied to RMA readiness and can mislead operators if blocked states are not explicit.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `getIssueDetailActionPolicy` and `rmaReadiness` -> action card -> Create RMA, status transition, de-escalation, close, and delete affordances.

Planned slice:

- Extract sidebar action rendering into `IssueActionsCard`.
- Keep existing callbacks, status targets, disabled states, and Create RMA link search params unchanged.
- Remove action rendering and related imports from `issue-detail-view.tsx`.
- Add focused component tests for RMA ready, RMA blocked, active workflow, and escalated workflow paths.

Out of scope:

- Changing action policy semantics.
- Changing escalation/de-escalation server routing.
- Changing issue status transition schemas or cache invalidation.
- Redesigning the issue detail page.

Closeout:

- Touched domains: support issue detail UI, support issue action presentation, RMA creation affordance display, support UI tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `getIssueDetailActionPolicy` and `rmaReadiness` -> `IssueActionsCard` -> Create RMA link or blocked copy, workflow buttons, de-escalation, close, and delete affordances.
- Business value protected: operators still see only valid action affordances for the issue state, with blocked RMA creation represented honestly instead of implying a return path that cannot be launched.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; action policy calculation unchanged; status callbacks and Create RMA search params unchanged; query/cache and mutation contracts unchanged; issue detail now delegates sidebar action rendering to a focused component.
- Tenant isolation and data integrity checked: no server query, tenant predicate, schema, mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, stale-time, optimistic update, rollback, or cache policy changed.
- Smells removed: sidebar action rendering, Create RMA affordance logic, delete rendering, and action button status mapping removed from `issue-detail-view.tsx`; focused tests now guard ready/blocked RMA affordance, active workflow buttons, and escalated de-escalation display.
- Smells deferred: header primary/secondary action assembly remains inside `issue-detail-view.tsx`; details/SLA/escalation/description/resolution cards remain local; server-backed issue transition tests remain in existing contract tests rather than this presentational slice.
- Verification: focused action/remedy/action-policy tests passed; targeted eslint passed; `tsc --noEmit` passed; full support unit suite passed 34 files / 143 tests; `git diff --check` passed.
- Gates skipped: browser QA skipped because this was a behavior-preserving presentational extraction with no route, layout intent, server, or mutation change.
- Goal adaptation: no standing goal change. This continues the active maintainer goal by reducing high-impact support workflow action ownership inside the issue detail monolith.
- Residual risk: the page presenter still assembles header primary/secondary actions and owns detail/SLA/escalation cards. The next support slice should either extract details/SLA/escalation cards or consolidate header/action assembly behind a tested policy-to-actions mapper before changing issue workflow behavior.

## Sprint Closeout Audit

Completion audit:

- Objective: extract sidebar issue action rendering from the issue detail presenter without changing behavior.
- Deliverables checked: sprint artifact, `IssueActionsCard`, issue detail integration, focused action card tests, targeted lint, typecheck, support unit suite, and diff whitespace gate.
- Evidence inspected: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-actions-card.tsx`, `src/components/domain/support/issues/issue-detail-action-policy.ts`, `tests/unit/support/issue-actions-card.test.tsx`, and `docs/support/MAINTAINER-SPRINT-7.md`.

Touched domains: support issue detail presentation, support workflow action presentation, RMA action affordance display, support UI tests.

Workflow protected: issue detail read model and action policy -> action card -> Create RMA, blocked RMA copy, start/hold/escalate/de-escalate/resolve/close/delete affordances.

Business value protected: RENOZ support operators retain clear and safe workflow controls while diagnosing battery support issues and deciding whether RMA creation is actually available.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- domain ownership: sidebar action rendering now has a focused support component owner
- UI honesty: ready RMA link, blocked RMA copy, active workflow status targets, and escalated de-escalation path have focused coverage

Smells removed:

- Create RMA ready/blocked rendering embedded in the issue detail presenter
- workflow action button status mapping hidden inside the page component
- delete action rendering mixed with unrelated issue details and context sidebar orchestration

Smells deferred:

- header primary/secondary actions still assemble in `issue-detail-view.tsx`
- issue details card remains in `issue-detail-view.tsx`
- SLA, escalation, description, and resolution cards remain in the page presenter
- browser QA remains deferred until a visual/workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/issue-actions-card.test.tsx tests/unit/support/issue-remedy-card.test.tsx tests/unit/support/issue-detail-action-policy.test.ts` passed 3 files / 10 tests
- `./node_modules/.bin/eslint src/components/domain/support/issues/issue-detail-view.tsx src/components/domain/support/issues/issue-actions-card.tsx tests/unit/support/issue-actions-card.test.tsx src/components/domain/support/issues/issue-detail-action-policy.ts` passed
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `./node_modules/.bin/vitest run tests/unit/support` passed 34 files / 143 tests
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction. Manual QA should be run when action behavior or layout is changed, not for this pure boundary split.

Goal adaptations made or declined: no goal text change. The sprint follows the standing process: small support-domain slice, workflow spine protected, focused tests, broader gates, and explicit residual risk.

Residual risk: `IssueDetailView` is substantially smaller, but it still owns header action assembly and several overview/sidebar cards. Continue extracting by responsibility or add a focused policy-to-header-actions mapper before changing status workflow behavior.
