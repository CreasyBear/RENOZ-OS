# Support Maintainer Sprint 47

This sprint follows Sprint 46's escalation dialog feedback ownership cleanup and stays in the support issues board workflow. The target is issue board mutation feedback: drag/drop status changes and bulk actions should format failed mutation messages before they reach alerts or toasts.

Status: Closed after Issue 1.

## Business Value

The issues board is an operator triage surface. When a move or bulk action fails, operators need retryable, safe, issue-specific feedback without database or infrastructure details. Failed items should remain visible and selected so the operator can recover quickly.

## Workflow Spine

Support issues board route
-> `IssuesBoardPage`
-> `useIssuesWithSlaMetrics` / `useUpdateIssue` / `useDeleteIssue`
-> `getIssuesWithSlaMetrics` / `updateIssue` / `deleteIssue`
-> `queryKeys.support.issuesListFiltered`, `queryKeys.support.issuesList`, and issue detail keys
-> transition and bulk failure alerts, retry action, and selected failed items.

## Architecture Constraints

- Keep this sprint to issues board failed-mutation feedback.
- Do not change issue board routing, filtering, quick filters, drag/drop policy, bulk action semantics, support issue server functions, schemas, tenant predicates, analytics payloads, query keys, cache invalidation, or status transition rules.
- Keep generic escalation/resolution workflow blocks unchanged.
- Sanitize failed transition and bulk messages before display.
- Preserve useful local workflow guidance when the board itself blocks an unsafe bulk action.
- Do not run serialized/reliability gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage.

## Issue Ledger

### 1. Issues Board Failure Feedback Boundary

Problem:

- `issues-board.tsx` imported `sonner` directly instead of the shared toast adapter.
- Drag/drop transition failures surfaced raw `Error.message` text in both the failure alert and toast.
- Bulk failures serialized raw per-issue rejection reasons into alert rows and summary toasts.
- Top-level bulk action failures also surfaced raw `Error.message` text.

Workflow protected:

Support issues board route -> `IssuesBoardPage` -> `useIssuesWithSlaMetrics` / `useUpdateIssue` / `useDeleteIssue` -> support issue server functions -> existing query invalidation -> safe transition and bulk failure feedback.

Implemented slice:

- Added an issues board feedback helper for mutation error formatting, transition failure toasts, and bulk failure summaries.
- Routed transition failure alert/toast messages through the helper.
- Routed per-issue bulk failure rows and summary toasts through the helper.
- Routed top-level bulk action catch feedback through the helper.
- Moved the route to the shared toast adapter.
- Added pure helper tests and a source contract to prevent raw board mutation failures from returning.

Out of scope:

- Refactoring `IssuesBoardPage` into a route/container/hook split.
- Changing issue board data loading, optimistic status updates, selected failed item behavior, retry behavior, analytics, server functions, schemas, or cache invalidation.
- Cleaning new issue creation, knowledge base, CSAT, and issue template feedback debt.

Closeout:

- Touched domains: support issues board route, support issue board feedback helper, support tests, support sprint evidence.
- Workflow protected: support issues board route -> `IssuesBoardPage` -> `useIssuesWithSlaMetrics` / `useUpdateIssue` / `useDeleteIssue` -> `getIssuesWithSlaMetrics` / `updateIssue` / `deleteIssue` -> existing support issue query keys/cache invalidation -> transition and bulk failure alerts/toasts.
- Business value protected: operators now see safe, issue-specific failure messages on board moves and bulk actions, while failed bulk items remain selected for retry.
- Architecture standards checked: route/container/page/hook/server/schema/database/query-key flow unchanged; the board remains the workflow orchestrator; helper owns failed-message formatting; `useUpdateIssue` and `useDeleteIssue` cache contracts unchanged; support issue server functions, validation schemas, generic status blockers, analytics payloads, and query keys unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, transaction, serialized lineage write, or status transition changed. Existing `withAuth`, organization-scoped issue lookups, update/delete behavior, and generic status transition blockers remain unchanged.
- Query/cache contract checked: existing `useUpdateIssue` optimistic update, rollback, issue detail invalidation, and issue list invalidation behavior unchanged; existing `useDeleteIssue` list/detail invalidation unchanged.
- Smells removed: direct `sonner` import from issues board; raw drag/drop mutation error display; raw per-issue bulk rejection display; raw top-level bulk action error display; inline bulk failure summary construction inside the route.
- Smells deferred: `IssuesBoardPage` remains a large route component with mixed view, orchestration, and feedback concerns; new issue creation, knowledge base, CSAT, and issue template workflows still have direct-toast/raw-error patterns; read-state errors still expose some raw query messages in support surfaces.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/issue-board-feedback.test.ts tests/unit/support/issue-board-feedback-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/issue-status-transition-contract.test.ts`; source scan for issue board raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (47 files, 180 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a failed-mutation feedback contract slice with no intended visual layout change; serialized/reliability gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage.
- Goal adaptations: declined. The Sprint 46 adaptation to run serialized gates only when serialized lineage is touched still fits this slice.
- Residual risk: support feedback cleanup remains incomplete outside the board, especially new issue creation, knowledge base article/category dialogs, CSAT link/submission flows, and issue template saving. A later sprint should also split `IssuesBoardPage` into a thinner route/container boundary before adding more behavior.
