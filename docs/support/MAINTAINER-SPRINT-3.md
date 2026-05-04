# Support Maintainer Sprint 3

This sprint follows RMA recovery UI ownership into the broader support issue workflow. The aim is to remove operator-facing support debt where workflow state, action affordances, and dashboard/list truth can drift.

Status: Closed after Issues 1, 2, and 3.

## Business Value

Support issues are the operator workbench for battery OEM support: field faults, warranty triage, RMA readiness, service-system history, and customer follow-up. If the issue detail page shows actions that bypass canonical workflow functions, RENOZ operators can leave stale escalation state behind and the dashboard can keep surfacing work that is no longer currently escalated.

## Workflow Spine

Support issue detail/list/dashboard
-> route container/read-model data
-> `useIssueDetail`, issue query hooks, support metrics hooks
-> `updateIssue`, `escalateIssue`, `deEscalateIssue`, issue list/metrics server functions
-> `issues`, `escalation_history`, SLA tracking
-> support query keys/cache invalidation
-> operator-visible current escalation state, filters, action buttons, and dashboard counts.

## Architecture Constraints

- Keep this sprint support-domain only.
- Treat `status === 'escalated'` as current escalation truth.
- Treat `escalatedAt` / `escalationReason` as execution metadata/history, not a list/dashboard current-state filter.
- Use the dedicated de-escalation workflow when moving an escalated issue back to active work.
- Do not change issue resolution, SLA pause/resume, RMA readiness, or issue anchor semantics in this slice.

## Issue Ledger

### 1. Current Escalation State Contract

Problem:

- `issue-detail-view.tsx` lets an escalated issue trigger `onStatusChange('in_progress')` from sidebar "Start Working", which routes through generic `updateIssue`.
- The dedicated `deEscalateIssue` server function exists and records de-escalation history, but no support hook/detail action uses it.
- Issue list filters and support metrics count escalation via `isNotNull(issues.escalatedAt)`, so historical escalation metadata can pollute current escalation queues after generic status changes.
- The issue detail header presents an "Escalated" badge from `escalatedAt`, which makes current status harder to read.

Workflow protected:

Issue detail/list/dashboard -> issue hook -> escalation server function -> `issues.status`, `issues.escalatedAt`, `escalation_history` -> query invalidation -> current escalation UI.

Planned slice:

- Add a `useDeEscalateIssue` mutation with the same issue detail/list cache invalidation shape as escalation.
- Route issue-detail `escalated -> in_progress` through controlled de-escalation dialog instead of generic issue update.
- Teach the controlled escalation dialog to operate in de-escalation mode.
- Make current escalation UI badges and filters use `status === 'escalated'`.
- Guard the contract with focused UI/static tests.

Out of scope:

- Rewriting the 1,673-line issue detail view.
- Changing resolution requirements.
- Changing SLA pause/resume behavior.
- Adding a full DB-backed escalation integration test.

Closeout:

- Touched domains: support issue detail UI, support escalation dialog, support issue hooks, support issue list filters, support metrics, support UI tests, support workflow contract tests.
- Workflow protected: issue detail/list/dashboard -> issue hook -> `escalateIssue` / `deEscalateIssue` / issue list and metric server reads -> `issues.status`, `issues.escalatedAt`, `escalation_history` -> support query keys/cache invalidation -> operator-visible current escalation state.
- Business value protected: operators can no longer accidentally move an escalated issue back to work through the generic issue update path without de-escalation history; current escalation filters and dashboard counts now reflect current `status === 'escalated'` truth instead of stale historical timestamps.
- Architecture standards checked: route/container boundary unchanged; `IssueDetailContainer` passes hook-owned dialog mode and handlers; `useIssueDetail` owns action routing; `useDeEscalateIssue` owns cache invalidation beside `useEscalateIssue`; server reads use the same current-state invariant; no schema/database changes.
- Tenant isolation and data integrity checked: server functions still use existing org-scoped reads/writes; no tenant predicates, transactions, or schema contracts were weakened.
- Query/cache contract checked: de-escalation invalidates issue detail and issue list families, matching escalation.
- Smells removed: unused de-escalation workflow from issue detail, duplicate current-state truth between timestamp filters and status filters, escalated header badge sourced from metadata instead of current status, generic `escalated -> in_progress` issue update path.
- Smells deferred: `issue-detail-view.tsx` remains large; generic `updateIssue` still accepts broad status changes; a DB-backed escalation/de-escalation integration test remains useful when server test harness coverage is expanded.
- Verification: focused tests `tests/unit/support/escalation-dialog.test.tsx` and `tests/unit/support/issue-escalation-current-state-contract.test.ts` passed; targeted lint passed; `tsc --noEmit` passed; full support suite passed with 28 files / 124 tests.
- Gates skipped: browser QA skipped because this slice changes workflow routing and read filters without redesigning the issue detail layout.
- Goal adaptation: no standing goal change. This is direct execution of the maintainer goal: small support-domain slice, workflow spine protected, cache contract explicit, operator-safe current-state UI.
- Residual risk: Support Sprint 3 should continue with either a narrower extraction of `issue-detail-view.tsx` around related context/sidebar ownership or a server-side issue status transition contract that prevents future generic status bypasses.

### 2. Generic Issue Status Transition Boundary

Problem:

- Issue 1 fixed the issue detail route, but `updateIssue` still accepted generic transitions into `escalated` or away from `escalated`.
- The issues board drag/drop route used `useUpdateIssue` directly, so board transitions could still skip escalation/de-escalation reason capture and history writes.
- Bulk status changes already omitted `escalated`, but server behavior should not rely on one UI omitting a workflow-owned status.

Workflow protected:

Issues board/detail/bulk callers -> `useUpdateIssue` or escalation hooks -> `updateIssue` / `escalateIssue` / `deEscalateIssue` -> `issues.status`, escalation metadata, `escalation_history` -> query invalidation -> current support queue state.

Slice:

- Added a shared support-domain transition helper that rejects generic escalation and generic status changes away from escalated state.
- Wired `updateIssue` to raise a serialized `transition_blocked` error when generic callers try to cross the escalation workflow boundary.
- Updated the issues board to route drag/drop escalation to the issue detail escalation dialog and drag/drop de-escalation to issue detail, where the de-escalation workflow captures reason/history.
- Added focused tests for the pure transition helper and static server/board wiring.

Closeout:

- Touched domains: support issue board, support issue server update path, support issue transition helper, support workflow tests, support sprint evidence.
- Workflow protected: board/detail/bulk generic status updates -> server transition guard -> dedicated escalation/de-escalation workflows -> escalation metadata/history -> support query state.
- Business value protected: operators cannot create or clear escalation state without the reason/history path that makes handoffs and priority support review auditable.
- Architecture standards checked: route behavior now points workflow-owned transitions to detail; hook/server boundary remains explicit; server guard is a shared support-domain helper; no schema/database changes; cache behavior unchanged from Issue 1.
- Tenant isolation and data integrity checked: existing org-scoped server reads/writes remain unchanged; the new guard runs after org-scoped issue lookup and before mutation.
- Query/cache contract checked: generic blocked transitions do not mutate caches; dedicated escalation/de-escalation hooks remain the cache invalidation owners.
- Smells removed: generic status mutation no longer owns escalation workflow state; board drag/drop no longer silently skips escalation/de-escalation evidence.
- Smells deferred: generic `updateIssue` still accepts ordinary non-escalation status changes; board does not yet open a de-escalation dialog directly and instead routes to detail; DB-backed transition tests remain deferred.
- Verification: focused `issue-status-transition-contract` test passed; targeted lint and typecheck recorded for the slice; full support suite recorded for the sprint.
- Gates skipped: browser QA skipped because this is workflow guard/routing behavior with focused unit coverage, not layout redesign.
- Goal adaptation: no standing goal change. This slice strengthens the repo-maintainer rule that workflow-owned state transitions must have a single owned path.
- Residual risk: `issue-detail-view.tsx` remains the next support cleanliness candidate, but escalation workflow integrity is now protected both at UI and server boundaries.

### 3. Issue Detail Action Policy Boundary

Problem:

- After Issue 2 hardened the server boundary, `issue-detail-view.tsx` still duplicated header/sidebar action rules.
- Escalated issues could still show generic Resolve or Put On Hold affordances even though those transitions now correctly require de-escalation first.
- Delete visibility, primary action selection, RMA action visibility, and escalation/de-escalation actions were spread through a large presenter.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `useIssueDetail` action handlers -> shared issue-detail action policy -> `IssueDetailView` header/sidebar affordances -> workflow-specific mutation path.

Slice:

- Added `issue-detail-action-policy.ts` as the focused owner of issue detail action availability.
- Updated the detail header and sidebar actions to read from the same policy.
- Hid generic hold/resolve/delete/status affordances for escalated issues so operators are steered through de-escalation first.
- Added focused tests for escalated, active, resolved, and closed action policy states.

Closeout:

- Touched domains: support issue detail UI, issue detail action policy, support UI tests, support sprint evidence.
- Workflow protected: issue status -> action policy -> header/sidebar actions -> `useIssueDetail` status/escalation handlers -> dedicated workflow mutation path.
- Business value protected: escalated support work now presents one honest recovery path, avoiding actions that would fail after server validation and preserving escalation audit history.
- Architecture standards checked: route/container/hook/server boundaries unchanged; UI policy is now a focused pure component-side contract; no schema/database/cache changes.
- Tenant isolation and data integrity checked: no server query, tenant predicate, or persisted data contract changed in this slice.
- Query/cache contract checked: no cache behavior changed; policy only controls operator affordances before mutation.
- Smells removed: duplicated detail header/sidebar status rules, escalated issue actions that contradicted the server transition guard, local delete/RMA visibility derivation inside the sidebar.
- Smells deferred: `issue-detail-view.tsx` is still large because related context and customer sidebar rendering remain in the same file; direct component rendering tests for the full detail view remain deferred because the pure policy now covers the high-risk action matrix.
- Verification: focused `issue-detail-action-policy` test passed; targeted lint and typecheck recorded; full support suite recorded after the slice.
- Gates skipped: browser QA skipped because this is action policy/affordance cleanup with focused tests, not a visual redesign.
- Goal adaptation: no standing goal change. This continues the maintainer goal by extracting workflow policy before further component splitting.
- Residual risk: the next support cleanup should extract related context/customer sidebar rendering from `issue-detail-view.tsx`, now that workflow action policy is protected.

## Sprint Closeout Audit

Completion audit:

- Objective: make support issue escalation state and issue-detail workflow affordances consistent, auditable, and easier to reason about.
- Deliverables checked: Sprint 3 issue ledger, escalation/de-escalation hook and dialog changes, issue list/metrics current-state filters, generic status transition guard, board routing, action policy extraction, focused tests, targeted lint, typecheck, and support suite evidence.
- Evidence inspected: `src/hooks/support/use-issue-detail.ts`, `src/hooks/support/use-issues.ts`, `src/components/domain/support/escalation/escalation-dialog.tsx`, `src/components/domain/support/issues/issue-detail-container.tsx`, `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-detail-action-policy.ts`, `src/routes/_authenticated/support/issues-board.tsx`, `src/server/functions/support/issues.ts`, `src/server/functions/support/support-metrics.ts`, `src/lib/support/issue-status-transitions.ts`, and the Sprint 3 support tests.

Touched domains: support issue detail UI, support board workflow routing, support escalation dialog, support issue hooks, support issue server functions, support metrics, support transition helpers, support UI/contract tests.

Workflow protected: issue board/detail/list/dashboard -> route/container -> hook/action policy -> `updateIssue` / `escalateIssue` / `deEscalateIssue` -> `issues.status`, escalation metadata, `escalation_history` -> support query keys/cache invalidation -> current escalation filters, counts, badges, and operator actions.

Business value protected: escalated support work is now auditable and operator-safe. Operators are steered into reason-capturing escalation/de-escalation flows, stale historical escalation timestamps no longer define current queues, and issue detail actions no longer advertise transitions that the server rejects.

Architecture standards checked:

- domain ownership: escalation state, issue status transition policy, and issue detail action policy are now support-domain contracts
- route/container boundary: issue detail container passes hook-owned dialog state; board route redirects workflow-owned drag/drop transitions to detail instead of owning escalation mutation semantics
- hook/server boundary: `useEscalateIssue` / `useDeEscalateIssue` own escalation cache invalidation; `updateIssue` rejects generic escalation boundary crossings
- schema/database boundary: no schema/database changes; existing org-scoped issue and escalation tables remain the source of truth
- query/cache contract: dedicated escalation mutations invalidate issue detail and issue list families; blocked generic transitions do not mutate caches
- tenant isolation: all new server guard behavior runs after the existing org-scoped issue lookup and before mutation
- UI honesty: current badges, filters, metrics, detail header actions, and sidebar actions now follow the same current-state and action-policy contracts

Smells removed:

- `escalatedAt` used as current queue truth instead of `status === 'escalated'`
- issue detail de-escalation path routed through generic issue update
- board drag/drop escalation/de-escalation skipped reason/history capture
- generic `updateIssue` accepted workflow-owned escalation status transitions
- issue detail header/sidebar duplicated action availability rules and exposed actions that contradicted server policy

Smells deferred:

- `issue-detail-view.tsx` remains large because related context, customer context, and sidebar rendering still live in the same file
- board de-escalation routes to detail instead of opening a board-local de-escalation dialog
- DB-backed escalation/de-escalation integration tests remain deferred to a broader server harness slice
- browser QA was skipped and should be used before a visual redesign or release pass over support issue detail

Verification:

- Issue 1 focused tests, targeted lint, typecheck, and support suite evidence recorded above
- Issue 2 focused transition contract test, targeted lint, typecheck, and support suite evidence recorded above
- Issue 3 focused action policy test, targeted lint, typecheck, and support suite evidence recorded above
- Final full support suite after Issue 3: 30 files / 131 tests passed

Gates skipped: browser QA skipped for Sprint 3 because the work changed workflow routing, guards, and affordance policy without visual layout redesign. DB-backed integration tests skipped because current support unit harness covers pure/presentation contracts but not a full transactional issue workflow.

Goal adaptations made or declined: no standing goal change. Sprint 3 reinforces the maintainer goal by converting a discovered UI smell into hook, server, route, policy, and test boundaries.

Residual risk: the next support sprint should extract related context/customer sidebar rendering from `issue-detail-view.tsx` or add DB-backed escalation/de-escalation workflow tests. Do not keep adding issue-detail behavior until the remaining monolith is split around related context ownership.
