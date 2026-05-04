# Inventory Maintainer Sprint 35

This sprint follows Sprint 34's PO receive item/order status scoping cleanup. The target is approval-driven purchase-order status tenant scope: approval actions and approval-rule evaluation should update parent PO status with the active organization boundary.

Status: Closed after Issue 1.

## Business Value

Purchase-order approvals decide whether supplier-backed battery stock can move from draft/pending approval toward ordered and receivable states. If approval status transitions update a purchase order by ID only, procurement control is weaker than the receiving workflow that follows it. Approval-driven status writes should be tenant-explicit so buying, receiving, inventory, and finance closeout stay trustworthy.

## Workflow Spine

purchase-order approval action
-> approval server function
-> organization-scoped approval or PO read
-> tenant-scoped parent PO status update
-> purchase-order query/cache policy
-> downstream PO receiving readiness.

## Architecture Constraints

- Keep this sprint to parent purchase-order status predicates inside approval workflows.
- Preserve approval authorization behavior, approval record updates, rule evaluation logic, response shapes, query keys, and UI behavior.
- Do not broaden into approval-record update predicates, purchase-order edit/delete functions, live database fixtures, or approval UX changes.

## Issue Ledger

### 1. Approval-Driven Parent PO Status Updates Used PO ID Only

Problem:

- Approval reads and parent PO reads were already organization-scoped.
- Final approval status helper checked remaining approval levels without repeating organization scope.
- Final approval, rejection-to-draft, auto-approval, and pending-approval status writes updated `purchase_orders` by ID only.

Workflow protected:

approval action/rule evaluation -> tenant-owned approval or PO read -> tenant-scoped parent PO status update -> procurement control.

Implemented slice:

- Added `organizationId` to `checkAndUpdateFinalApprovalStatus`.
- Added `purchaseOrderApprovals.organizationId = organizationId` to the final-approval remaining-level check.
- Added `purchaseOrders.organizationId` predicates to final approval, rejection-to-draft, auto-approval, and pending-approval parent PO status updates.
- Kept approval authorization, approval-record updates, rule evaluation behavior, response shapes, query keys, and UI behavior unchanged.
- Added focused source contract coverage for approval-driven parent PO status predicates.

Out of scope:

- Changing approval authorization or delegation/escalation behavior.
- Changing approval-record update predicates.
- Changing purchase-order edit/delete functions.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier approval workflow server function, purchase-order approval tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: approval action/rule evaluation -> organization-scoped approval or PO read -> tenant-scoped parent PO status update -> purchase-order query/cache policy -> downstream PO receiving readiness.
- Business value protected: procurement approvals now move parent PO status through tenant-explicit writes before supplier-backed battery stock can be ordered or received.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; approvals remain the approval workflow owner; parent PO status writes now mirror the organization predicates already used by approval/PO reads.
- Tenant isolation and data integrity checked: final approval remaining-level check now includes organization ID; final approved, rejected-to-draft, auto-approved, and pending-approval parent PO status writes now require PO ID and organization ID; no approval authorization, approval-record mutation, receiving, inventory, cost-layer, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, or rollback behavior changed.
- Smells removed: approval-driven parent PO status transitions used purchase-order ID only after tenant-scoped reads.
- Smells deferred: approval-record update predicates; purchase-order edit/delete predicates; live database fixtures for approval status transitions under seeded RLS.
- Gates run: focused approval tenant-scope/hardening/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires tenant isolation, domain ownership, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: source-level contracts verify the predicates; live DB fixtures are still needed to prove approval status transitions under seeded concurrent/RLS conditions.
