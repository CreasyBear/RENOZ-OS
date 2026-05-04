# Inventory Maintainer Sprint 38

This sprint follows Sprint 37's purchase-order lifecycle scoping cleanup. The target is purchase-order line-item total recalculation tenant scope: line-number selection, totals aggregation, and parent total writes should all carry the active organization boundary inside the same transaction.

Status: Closed after Issue 1.

## Business Value

Draft purchase-order line items determine committed procurement cost before supplier-backed battery stock is ordered and received. Tenant-explicit total recalculation keeps purchase-order financial totals aligned with the right organization before receiving, inventory valuation, and finance closeout depend on them.

## Workflow Spine

purchase-order line-item add/remove
-> purchase-order server function
-> organization-scoped draft PO and item guard
-> transactional line-item insert/delete
-> tenant-scoped total aggregation and parent PO total write
-> purchase-order query/cache policy
-> downstream receiving, inventory, and finance readiness.

## Architecture Constraints

- Keep this sprint to line-item numbering and total recalculation predicates in purchase-order server functions.
- Preserve validation, permissions, activity logging, totals math, response shapes, query keys, cache behavior, and UI behavior.
- Do not broaden into lifecycle status writes, receiving, approval workflows, live database fixtures, or purchase-order UX changes.

## Issue Ledger

### 1. Line-Item Total Recalculation Used PO ID Only

Problem:

- Add/remove line-item flows already read the parent PO or item with the active organization.
- The next-line-number query used PO ID only.
- The total recalculation helper aggregated line items by PO ID only and updated the parent PO totals by PO ID only.
- Sprint 37 fixed lifecycle writes but deliberately deferred this transaction-aware line-item total path.

Workflow protected:

line-item add/remove -> tenant-owned draft PO/item guard -> tenant-scoped line numbering and total recalculation -> procurement financial integrity.

Implemented slice:

- Added organization predicates to the next-line-number query used while inserting draft PO line items.
- Passed `organizationId` through `recalculatePurchaseOrderTotals`.
- Added organization predicates to line-item totals aggregation and parent purchase-order total updates.
- Preserved the existing transaction boundary, totals math, insert/delete behavior, validation, permissions, activity logging, and response shapes.
- Added focused source contract coverage for line numbering, helper callers, helper signature, totals aggregation, and parent total writes.

Out of scope:

- Changing purchase-order validation, permissions, totals math, or activity logging behavior.
- Changing lifecycle status writes, approval workflows, or receiving workflows.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier purchase-order line-item server function, purchase-order line-item totals tenant-scope contract tests, inventory sprint evidence.
- Workflow protected: purchase-order line-item add/remove -> organization-scoped draft PO/item guard -> transactional line-item insert/delete -> tenant-scoped total aggregation and parent PO total write -> purchase-order query/cache policy -> downstream receiving, inventory, and finance readiness.
- Business value protected: draft procurement totals for supplier-backed battery stock now recalculate through tenant-explicit item aggregation and parent PO writes before ordering, receiving, valuation, and finance closeout depend on them.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier purchase orders remain the workflow owner; the line-item helper now carries organization context explicitly through the transaction.
- Tenant isolation and data integrity checked: line numbering, totals aggregation, and parent PO total updates now require PO ID and organization ID; no lifecycle status, approval, receiving, inventory, cost-layer, finance, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: line-item numbering and total recalculation used PO ID only inside an otherwise tenant-scoped transaction.
- Smells deferred: live database fixtures for concurrent draft line-item edits under seeded RLS; purchase-order UX and copy hardening; broader procurement helper extraction if duplication keeps accumulating.
- Gates run: focused line-item totals/lifecycle/receiving/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server tenant/data-integrity predicate correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, transactional integrity, domain ownership, reviewable domain slices, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended predicates stay present; live DB fixtures are still needed to prove concurrent line-item numbering and total recalculation under seeded multi-tenant/RLS conditions.
