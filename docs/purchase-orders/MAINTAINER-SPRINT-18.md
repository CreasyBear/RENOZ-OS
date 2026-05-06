# Purchase Orders Maintainer Sprint 18

## Status

Closed in commit-ready state.

## Issue 1: Approval Read States Surfaced Raw Errors

### Problem

The approvals dashboard displayed raw query exceptions in its page-level error state, and the approval decision dialog displayed raw line-item read errors when purchase-order details failed to load. These are operator-facing procurement controls, so database, RLS, stack, or runtime messages should not leak into approval review screens.

### Workflow Spine

Approvals route
-> approvals page
-> approval dashboard
-> pending approvals query and selected approval details query
-> approval server functions/schema/database
-> approval query keys/cache invalidation
-> dashboard empty state or decision dialog line-item table.

### Touched Domains

- Purchase-order approvals dashboard read feedback.
- Approval decision dialog detail-read feedback.
- Approval read-error formatter.
- Approval read feedback tests.
- Purchase-order maintainer closeout docs.

### Business Value Protected

Approval review protects purchasing authority, spend control, and supplier-order flow. Failed reads should tell an operator how to recover without exposing internal persistence details or making the approval queue feel unreliable.

### Scope Constraints

- Do not change approval data fetching, approval decision mutations, escalation behavior, authorization, schema validation, query keys, cache invalidation, table layout, or route search behavior.
- Keep this slice to read-state feedback for the approvals dashboard and approval details panel.
- Do not run or list serialized gates; that gate family is complete and no longer part of routine closeout for unrelated approval work.

### Changes

- Added `approval-dashboard-error-messages.ts` with dashboard and line-item read fallback copy.
- Routed the approvals dashboard page-level error state through `getApprovalDashboardReadErrorMessage`.
- Routed approval decision dialog line-item read failures through `getApprovalDetailsReadErrorMessage`.
- Preserved normalized read-query messages while suppressing arbitrary raw thrown errors.
- Added focused helper, render, and source-contract coverage for approval read feedback.

### Standards Checked

- Domain ownership: approval read feedback remains inside `src/components/domain/approvals`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; only UI feedback copy routing changed.
- Tenant isolation/data integrity: unchanged; no server predicates, schema, query, mutation, or database behavior changed.
- Query/cache contract: unchanged; `queryKeys.approvals.all` invalidation and read hooks remain untouched.
- Honest UI states/operator-safe errors: improved for approval queue and selected approval detail read failures.
- Reviewability: bounded diff across one helper, two consumers, one focused test, and this closeout.

### Smells Removed

- Raw `Error.message` fallback in the approvals dashboard read failure state.
- Raw `approvalDetailsError.message` rendering in the approval decision dialog line-item table.
- Missing approval read-feedback contract coverage.

### Deferred

- Approval route mutation handlers still have a separate async propagation/error-copy smell in the decision callbacks; handle that as a mutation lifecycle slice rather than mixing it into this read-state slice.
- Browser QA remains deferred because this slice changes failure-copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/approvals/approval-read-feedback-contract.test.tsx tests/unit/approvals/approval-dialog-feedback-contract.test.ts` (2 files, 6 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed dashboard/detail raw read-error rendering.
- Passed: `git diff --check`.
- Noted during scan: `src/routes/_authenticated/approvals/approvals-page.tsx` still has route-level raw mutation catch descriptions; deferred below as the next mutation lifecycle slice.

### Goal Adaptation

Accepted. Serialized gates are no longer routine evidence for unrelated sprint closeouts. The product invariant remains serialized lineage continuity where a slice actually touches serialized inventory or lineage workflows.

### Residual Risk

Low for approval read feedback. Moderate for approval mutation lifecycle feedback until the route-level decision callback propagation and parent catch-copy path are handled in a separate sprint.
