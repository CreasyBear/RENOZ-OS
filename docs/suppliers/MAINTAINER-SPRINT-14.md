# Suppliers Maintainer Sprint 14

## Status

Closed in commit-ready state.

## Issue 1: Approval Page Duplicated Approval Root Refreshes

### Problem

Sprint 13 moved bulk approval hooks off `queryKeys.approvals.all`, but the approval dashboard page still invalidated the approval root for manual refresh, single decisions, and bulk decisions. The page already calls approval hooks that own mutation cache effects, and the manual refresh only needs to refetch the mounted approvals query.

### Workflow Spine

Approvals route
-> `usePendingApprovals`
-> approval decision hooks
-> supplier approval server functions
-> approval list/stats/detail and supplier purchase-order cache families.

### Touched Domains

- Approvals route page.
- Approval mutation lifecycle contract.
- Supplier maintainer closeout docs.

### Business Value Protected

Approvals are procurement control points for RENOZ purchasing. The dashboard can refresh its visible queue and submit decisions without hiding cache effects behind route-level root invalidation. Mutation-owned hooks remain responsible for approval list, stats, detail, pending supplier approval, and purchase-order freshness.

### Scope Constraints

- Do not change approval server functions, schema, decision validation, or mutation transitions.
- Do not change dashboard UI layout, toasts, dialog lifecycle, or rejection reason behavior.
- Do not change hook-level cache policy already covered in Sprint 13.
- Keep this slice limited to route-level duplicate root invalidations.

### Changes

- Removed route-level `useQueryClient` and `queryKeys.approvals.all`.
- Changed the dashboard refresh action to call the mounted `usePendingApprovals` query's `refetch`.
- Removed duplicate page-level approval root invalidations after single and bulk decisions.
- Extended the approval lifecycle source contract to require the route-owned refetch path and reject route-level cache invalidation.

### Standards Checked

- Domain ownership: supplier approval hooks own mutation cache policy; the route owns only its mounted read refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: route refresh now follows the rendered hook instead of bypassing hook cache ownership.
- Tenant isolation/data integrity: no server, auth, tenant, or database behavior changed.
- Transactional inventory/finance integrity: no inventory or finance mutation behavior changed.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: existing formatter-backed dialog failure behavior remains unchanged.
- Query/cache contract: improved and covered by approval route lifecycle contract.
- Reviewability: one route cleanup, one focused contract update, one closeout note.

### Smells Removed

- Manual approval dashboard refresh invalidated the approval root.
- Single approval decision handler duplicated hook-owned root invalidation.
- Bulk approval decision handler duplicated hook-owned root invalidation.

### Deferred

- Purchase-order-specific approval history freshness for bulk approve/reject remains limited by missing purchase-order IDs in bulk hook inputs/results.
- No browser smoke; this was a route cache-contract cleanup with no intended UI change.

### Gates

- Passed: focused approval mutation lifecycle contract.
- Passed: focused approval cache contract.
- Passed: focused approval read/consumer contracts.
- Passed: focused ESLint on touched approval route/test.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the local supplier approval cache cleanup under the standing maintainer goal.

### Residual Risk

Low. Approval mutation freshness remains hook-owned; manual route refresh is now scoped to the currently mounted approval queue query.
