# Inventory Maintainer Sprint 39

This sprint follows Sprint 38's purchase-order line-item total scoping cleanup. The target is purchase-order cost mutation integrity: landed/additional cost records should update and delete with the active organization boundary and should not be editable after the parent PO is cancelled or closed.

Status: Closed after Issue 1.

## Business Value

Additional purchase-order costs drive landed cost allocation for supplier-backed battery stock. If those costs can be edited by cost ID alone, or changed after procurement closeout, receiving, inventory valuation, and finance review inherit weaker cost truth.

## Workflow Spine

purchase-order cost edit/delete
-> PO cost server function
-> organization-scoped PO cost and parent PO read
-> parent PO closeout guard
-> tenant-scoped PO cost mutation
-> purchase-order cost/allocation query-cache policy
-> receiving, inventory valuation, and finance readiness.

## Architecture Constraints

- Keep this sprint to purchase-order cost update/delete mutation contracts.
- Preserve add-cost behavior, cost allocation math, read queries, hooks, query keys, response shapes, and UI behavior.
- Do not broaden into receiving landed-cost allocation, purchase-order cost UX, live database fixtures, or broader pricing modules.

## Issue Ledger

### 1. PO Cost Update/Delete Used Cost ID Only And Missed Closeout Guard

Problem:

- PO cost reads already required the active organization.
- Adding PO costs already rejected cancelled and closed purchase orders.
- Updating and deleting PO cost records verified the cost by organization but then wrote by cost ID only.
- Updating and deleting PO cost records did not mirror the parent PO cancelled/closed guard used by add.

Workflow protected:

cost edit/delete -> tenant-owned cost and parent PO read -> closeout guard -> tenant-scoped cost mutation -> landed cost integrity.

Implemented slice:

- Updated PO cost edit/delete reads to join the parent purchase order under the active organization and require a non-deleted parent PO.
- Added cancelled/closed parent PO guards to PO cost update and delete, matching the existing add-cost closeout rule.
- Added organization predicates to PO cost update and delete write predicates.
- Preserved add-cost behavior, cost allocation math, read queries, hooks, query keys, response shapes, and UI behavior.
- Added focused source contract coverage for tenant-scoped update/delete predicates and parent PO closeout guards.

Out of scope:

- Changing add-cost behavior, allocation math, or read query behavior.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier PO cost server function, purchase-order cost mutation tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: purchase-order cost edit/delete -> organization-scoped PO cost and parent PO read -> parent PO closeout guard -> tenant-scoped PO cost mutation -> purchase-order cost/allocation query-cache policy -> receiving, inventory valuation, and finance readiness.
- Business value protected: landed/additional procurement costs for supplier-backed battery stock cannot be changed by ID-only writes or after PO closeout/cancellation, improving trust in received stock valuation and finance review.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier PO costs remain the mutation owner; update/delete now mirror the tenant and closeout rules already present in add-cost behavior.
- Tenant isolation and data integrity checked: update/delete reads require cost ID, cost organization ID, parent PO organization ID, and non-deleted parent PO; update/delete writes require cost ID and organization ID; no receiving, allocation math, inventory, cost-layer, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: existing hooks still invalidate `purchaseOrderCosts(poId)` and `purchaseOrderAllocatedCosts(poId)`; no query keys, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: PO cost update/delete used cost ID only for writes and allowed landed-cost mutations after the parent PO was cancelled or closed.
- Smells deferred: UI controls can still present edit/delete affordances until the server rejects the mutation; live database fixtures for PO cost mutation under seeded RLS/closed PO states; broader supplier pricing module predicate review.
- Gates run: focused PO cost/query/receiving tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate and closeout-guard correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, finance integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended predicates and guards stay present; live DB fixtures are still needed to prove mutation behavior under seeded multi-tenant/RLS and closed/cancelled PO conditions.
