# Support Maintainer Sprint 3

This sprint follows RMA recovery UI ownership into the broader support issue workflow. The aim is to remove operator-facing support debt where workflow state, action affordances, and dashboard/list truth can drift.

Status: Issue 1 implemented.

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
