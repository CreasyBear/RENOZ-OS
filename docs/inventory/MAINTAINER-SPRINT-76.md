# Inventory Maintainer Sprint 76

This sprint follows Sprint 75's purchase-order schedule-date validation parity. The target is purchase-order create transaction write-result safety: creating a purchase order with line items should prove the header and expected item rows were persisted before logging success.

Status: Closed after Issue 1.

## Business Value

Purchase-order creation is the start of supplier procurement. Operators should not see a successful create path if the header insert or line-item insert did not produce the expected persisted records.

## Workflow Spine

purchase-order create
-> tenant-scoped supplier check
-> schedule-date validation
-> transactional PO header insert
-> header result verification
-> transactional line-item bulk insert
-> line-item count verification
-> activity logging
-> purchase-order query/cache policy
-> procurement readiness.

## Architecture Constraints

- Keep this sprint to create-transaction write-result verification.
- Preserve create payload shape, totals calculation, transaction boundary, RLS context setup, activity logging, query keys, cache behavior, and UI behavior.
- Do not broaden into line-item editing, receiving, supplier pricing, live database fixtures, or UI create-form changes.

## Issue Ledger

### 1. Create Transaction Trusted Header And Line-Item Inserts Without Result Evidence

Problem:

- The create transaction destructured `newPo` from `insert(purchaseOrders).returning()` and immediately used `newPo.id`.
- The line-item bulk insert was not observable, so the transaction did not verify that the expected number of item rows was created.
- Insert failures should normally throw, but the mutation contract was weaker than nearby purchase-order write paths.

Workflow protected:

create PO -> header insert -> header guard -> item bulk insert -> item count guard -> activity logging.

Implemented slice:

- Added an operator-safe validation error if the purchase-order header insert returns no row.
- Made the line-item bulk insert return item ids.
- Added an operator-safe validation error if the returned line-item count does not match the input item count.
- Extended the create tenant-scope contract test to pin the header guard and line-item count guard.

Out of scope:

- Create-form UX.
- Live database insert failure fixtures.
- Receiving/stock movement flows.
- Broader purchase-order transaction redesign.

Closeout:

- Touched domains: purchase-order server function, purchase-order create contract test, inventory sprint evidence.
- Workflow protected: purchase-order create -> tenant-scoped supplier check -> schedule-date validation -> transactional PO header insert -> header result verification -> transactional line-item bulk insert -> line-item count verification -> activity logging -> purchase-order query/cache policy -> procurement readiness.
- Business value protected: operators only get a successful create response after the transaction proves the persisted header and expected item rows exist.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders remain the workflow owner; create now follows the same safe mutation/result-evidence standard as adjacent PO write paths.
- Tenant isolation and data integrity checked: supplier tenant/deleted checks are unchanged; transaction RLS context remains; line items still receive `organizationId` and the returned `newPo.id`; no supplier pricing, receiving, finance posting, approval-record, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: create trusted a possibly empty header `returning()` result and an unobserved line-item bulk insert.
- Smells deferred: live seeded fixtures for insert result anomalies; create-form error surfacing review; broader PO transaction helper extraction.
- Gates run: focused purchase-order tests (`4` files, `9` tests); focused ESLint; supplier + purchase-order unit suites (`42` files, `118` tests); TypeScript.
- Gates skipped: browser QA, because this was a server transaction-boundary safety change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers safe mutation contracts, transactional procurement integrity, tenant isolation, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts pin the guards; live database fixtures would provide stronger evidence for unusual insert/result anomalies.
