# Inventory Maintainer Sprint 36

This sprint follows Sprint 35's approval-driven parent PO status scoping cleanup. The target is approval-record mutation tenant scope: approval actions should update `purchase_order_approvals` with the active organization boundary, not approval ID alone.

Status: Closed after Issue 1.

## Business Value

Purchase-order approval records are the audit trail for whether supplier-backed battery stock can progress toward ordered and receivable states. Tenant-explicit approval writes make delegation, escalation, rejection, and approval history trustworthy before downstream warehouse and finance workflows rely on those decisions.

## Workflow Spine

purchase-order approval action
-> approval server function
-> organization-scoped approval read
-> tenant-scoped approval record update
-> parent PO status/query-cache policy
-> downstream PO receiving readiness.

## Architecture Constraints

- Keep this sprint to approval-record update predicates inside approval workflows.
- Preserve approval authorization behavior, parent PO status writes, rule evaluation logic, response shapes, query keys, and UI behavior.
- Do not broaden into purchase-order edit/delete functions, live database fixtures, approval UX, or query/cache changes.

## Issue Ledger

### 1. Approval-Record Updates Used Approval ID Only

Problem:

- Approval action reads already required the active organization.
- Approval record writes for approve, reject, escalate, delegate, and revoke delegation updated `purchase_order_approvals` by approval ID only.
- Sprint 35 fixed parent PO status writes but deliberately deferred this approval-record half of the same procurement-control workflow.

Workflow protected:

approval action -> tenant-owned approval read -> tenant-scoped approval record update -> procurement approval audit trail.

Implemented slice:

- Added organization predicates to approval-record updates for approve, reject, escalate, delegate, and revoke delegation.
- Preserved the existing organization-scoped approval reads and authorization behavior.
- Preserved parent purchase-order status writes, approval rules, response shapes, query keys, cache behavior, and UI behavior.
- Added focused source contract coverage that counts approval write blocks and rejects approval-ID-only update predicates.

Out of scope:

- Changing approval authorization or delegation/escalation behavior.
- Changing parent purchase-order status writes.
- Changing purchase-order edit/delete functions.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier approval workflow server function, purchase-order approval tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: approval action -> organization-scoped approval read -> tenant-scoped approval record update -> parent PO status/query-cache policy -> downstream PO receiving readiness.
- Business value protected: approval history for supplier-backed battery procurement now mutates through tenant-explicit writes before warehouse and finance workflows rely on approval outcomes.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier approvals remain the domain owner; approval writes now mirror the organization predicates already used by approval reads.
- Tenant isolation and data integrity checked: approve, reject, escalate, delegate, and revoke delegation writes now require approval ID and organization ID; no receiving, inventory, cost-layer, finance, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: approval-record mutations used approval ID only after tenant-scoped reads.
- Smells deferred: purchase-order edit/delete predicates; live database fixtures for approval transitions under seeded RLS/concurrency; approval UX and copy hardening.
- Gates run: focused approval tenant-scope/hardening/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, domain ownership, reviewable domain slices, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended predicates stay present; live DB fixtures are still needed to prove approval transitions under seeded multi-tenant/RLS and concurrent mutation conditions.
