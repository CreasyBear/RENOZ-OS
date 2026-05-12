# Suppliers Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: Approval Bulk Mutation Cache Scope

### Problem

Supplier approval bulk mutations and approval-rule evaluation still invalidated `queryKeys.approvals.all`. Single approval, rejection, escalation, delegation, and revocation mutations already named the approval list, stats, detail, and supplier purchase-order surfaces they affect. The remaining root invalidations made bulk and rule-evaluation cache behavior harder to review than the rest of the approval workflow.

### Workflow Spine

Approval dashboard or purchase-order workflow
-> `useBulkApprove`, `useBulkReject`, or `useEvaluateApprovalRules`
-> supplier approval server functions
-> purchase-order approval records
-> approval list, stats, known detail/history, and supplier purchase-order cache families
-> operator-visible approval queues and purchase-order status refresh.

### Touched Domains

- Supplier purchase-order approval hooks.
- Approval query/cache contract tests.
- Supplier maintainer evidence.

### Business Value Protected

Approvals are procurement control points for battery OEM purchasing. Operators need bulk approval/rejection and rule evaluation to refresh approval queues and purchase-order state without hiding the affected surfaces behind a root cache invalidation.

### Scope Constraints

- Do not change supplier approval server functions, schemas, approval transitions, permissions, database writes, tenant predicates, bulk failure formatting, or UI behavior.
- Keep this sprint to cache invalidation for existing bulk/evaluate approval mutations.
- Do not change single approval/rejection/escalation/delegation cache behavior.
- Do not introduce amendment approvals or approval type expansion.

### Changes

- Added a small approval decision cache helper for approval list, stats, and known approval detail keys.
- Replaced `queryKeys.approvals.all` invalidation in `useBulkApprove`, `useBulkReject`, and `useEvaluateApprovalRules`.
- Bulk approve/reject now refresh approval list, stats, known details, and existing supplier purchase-order surfaces.
- Rule evaluation now refreshes approval list, stats, purchase-order approval history, and supplier purchase-order list.
- Added focused cache contract coverage for all three paths.

### Standards Checked

- Domain ownership: approval cache policy remains in `src/hooks/suppliers/use-approvals.ts`.
- Route -> container/page -> hook -> server flow: unchanged; approval pages still call the same hooks and server functions.
- Query/cache policy: bulk/evaluate paths now name the approval surfaces they affect instead of refreshing the approval root.
- Tenant isolation/data integrity: no server function, schema, permission, organization predicate, approval mutation, purchase-order mutation, or database transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, warranty, or customer persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: bulk failure formatting and approval read/error states are unchanged.
- Reviewability: the diff is limited to approval hook cache invalidation, focused tests, and this closeout note.

### Smells Removed

- Approval-root cache invalidation from bulk approve.
- Approval-root cache invalidation from bulk reject.
- Approval-root cache invalidation from approval rule evaluation.

### Deferred

- Jobs, pipeline, dashboard, and customer analytics root invalidations remain separate domain-sliced work.
- Broader supplier/procurement approval UI QA remains deferred because this slice changes cache policy only.
- Approval history invalidation for bulk approve/reject remains limited by missing purchase-order IDs in the bulk hook inputs/results.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/approvals/approval-cache-contract.test.tsx tests/unit/approvals/bulk-reject-failure.test.tsx tests/unit/approvals/query-normalization-wave3e.test.tsx` - 3 files, 10 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/suppliers/use-approvals.ts tests/unit/approvals/approval-cache-contract.test.tsx --report-unused-disable-directives`.
- Passed: targeted source scan showing `queryKeys.approvals.all` only in negative contract assertions for this slice.
- Passed after fixing a test fixture enum mismatch caught by the compiler: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, tenant/data-integrity checks, meaningful tests, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for the narrowed approval cache paths. Moderate for full approval history freshness after bulk approve/reject because those hook inputs/results do not expose purchase-order IDs; the list, stats, known details, and purchase-order list now refresh, but purchase-order-specific approval history remains a future refinement if bulk server results expose those IDs.
