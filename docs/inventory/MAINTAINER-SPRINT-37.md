# Inventory Maintainer Sprint 37

This sprint follows Sprint 36's approval-record mutation scoping cleanup. The target is purchase-order lifecycle tenant scope: top-level purchase-order status and soft-delete writes should update `purchase_orders` with the active organization boundary, not purchase order ID alone.

Status: Closed after Issue 1.

## Business Value

Purchase-order lifecycle transitions decide whether supplier-backed battery stock can be drafted, submitted, approved, ordered, cancelled, closed, or removed from active operator views. Tenant-explicit lifecycle writes keep procurement control trustworthy before warehouse receiving, inventory valuation, and finance closeout rely on those states.

## Workflow Spine

purchase-order lifecycle action
-> purchase-order server function
-> organization-scoped PO read/status guard
-> tenant-scoped PO lifecycle write
-> purchase-order query/cache policy
-> downstream receiving and inventory readiness.

## Architecture Constraints

- Keep this sprint to top-level purchase-order lifecycle/status and soft-delete write predicates.
- Preserve validation, permissions, activity logging, response shapes, query keys, cache behavior, and UI behavior.
- Do not broaden into line-item total recalculation, receiving, approval-record workflows, live database fixtures, or purchase-order UX changes.

## Issue Ledger

### 1. Purchase-Order Lifecycle Writes Used PO ID Only

Problem:

- Lifecycle reads already required the active organization and status/deleted guards.
- Soft delete, bulk soft delete, submit, approve, reject, mark ordered, cancel, and close writes updated `purchase_orders` by PO ID only.
- Prior approval and receiving sprints had already made adjacent procurement writes tenant-explicit, leaving this lifecycle surface inconsistent.

Workflow protected:

purchase-order action -> tenant-owned PO read/status guard -> tenant-scoped PO lifecycle write -> procurement lifecycle integrity.

Implemented slice:

- Added organization predicates to soft delete, bulk soft delete, submit, approve, reject, mark ordered, cancel, and close purchase-order writes.
- Preserved the existing organization-scoped lifecycle reads, status guards, deleted guards, validation, permissions, activity logging, and response shapes.
- Added focused source contract coverage for single-order lifecycle writes and bulk-delete lifecycle writes.

Out of scope:

- Changing purchase-order validation, permissions, or activity logging behavior.
- Changing approval-record or receiving workflows.
- Changing line-item total recalculation predicates.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier purchase-order lifecycle server function, purchase-order lifecycle tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: purchase-order lifecycle action -> organization-scoped PO read/status guard -> tenant-scoped PO lifecycle write -> purchase-order query/cache policy -> downstream receiving and inventory readiness.
- Business value protected: procurement lifecycle state changes now require the active tenant boundary before battery stock can move into ordering, receiving, closure, cancellation, or deletion states.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier purchase orders remain the workflow owner; lifecycle writes now mirror the organization predicates already used by lifecycle reads.
- Tenant isolation and data integrity checked: delete, bulk delete, submit, approve, reject, mark ordered, cancel, and close writes now require PO ID and organization ID; no receiving, approval-record, inventory, cost-layer, finance, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: top-level purchase-order lifecycle writes used PO ID only after tenant-scoped reads.
- Smells deferred: line-item total recalculation still updates `purchase_orders` by PO ID only and needs its own transaction-aware slice; live database fixtures for lifecycle transitions under seeded RLS/concurrency; purchase-order UX and copy hardening.
- Gates run: focused lifecycle/approval/receiving/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, domain ownership, reviewable domain slices, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended lifecycle predicates stay present; live DB fixtures are still needed to prove status transitions under seeded multi-tenant/RLS and concurrent mutation conditions.
