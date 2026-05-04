# Inventory Maintainer Sprint 75

This sprint follows Sprint 74's purchase-order totals update guard. The target is purchase-order schedule-date integrity: create and update should enforce the same operator-safe required/expected date rule before database constraints or silent bad schedules create procurement confusion.

Status: Closed after Issue 1.

## Business Value

Purchase-order dates drive supplier commitments, overdue procurement work, receiving expectations, and warehouse planning. Operators should get a direct field-level validation error when a draft update sets required or expected delivery dates before the order date.

## Workflow Spine

draft purchase-order create/update
-> tenant-scoped supplier/PO read
-> schedule-date validation against order date
-> compare-and-write mutation
-> activity logging
-> purchase-order query/cache policy
-> procurement scheduling confidence.

## Architecture Constraints

- Keep this sprint to purchase-order schedule-date validation parity.
- Preserve create/update payload shape, update write predicates, activity logging, query keys, cache behavior, and UI behavior.
- Do not broaden into date-picker UI, receiving ETA propagation, supplier SLA modelling, overdue alert redesign, or live database fixtures.

## Issue Ledger

### 1. Draft Purchase-Order Update Could Hit Schedule-Date Integrity Late

Problem:

- Create validated `requiredDate` and `expectedDeliveryDate` against the new `orderDate`.
- Update accepted the same fields but did not validate them against the existing purchase order's `orderDate`.
- That left operators exposed to inconsistent scheduling behavior and possible raw database constraint errors instead of an operator-safe validation response.

Workflow protected:

draft PO update -> tenant-scoped draft read -> schedule-date validation -> compare-and-write update -> activity logging.

Implemented slice:

- Added a small pure purchase-order schedule-date helper.
- Replaced create's inline date checks with the shared helper.
- Added update validation against `existing.po.orderDate` before building the update payload.
- Added focused unit coverage for valid dates, required-date errors, expected-delivery-date errors, and server-function integration with the shared rule.

Out of scope:

- UI date-picker constraints.
- Receiving ETA or overdue alert changes.
- Supplier SLA/date policy modelling.
- Live database fixtures for date constraint failures.

Closeout:

- Touched domains: purchase-order domain helper, purchase-order server function, purchase-order schedule-date unit tests, inventory sprint evidence.
- Workflow protected: draft purchase-order create/update -> tenant-scoped supplier/PO read -> schedule-date validation against order date -> compare-and-write mutation -> activity logging -> purchase-order query/cache policy -> procurement scheduling confidence.
- Business value protected: invalid procurement dates are rejected with field-level validation before they can become confusing schedules or raw database errors.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; purchase orders own the rule through a reusable domain helper; create and update now share one validation path.
- Tenant isolation and data integrity checked: existing organization predicates and draft/not-deleted update predicates are unchanged; validation uses the tenant-scoped existing PO order date; no supplier pricing, receiving, finance posting, approval-record, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: duplicated create-only date validation and update-path reliance on later persistence integrity.
- Smells deferred: UI date-picker constraints; receiving ETA propagation; overdue alert/date policy review; live seeded fixtures for database constraint failure messaging.
- Gates run: focused purchase-order tests (`4` files, `9` tests); focused ESLint; supplier + purchase-order unit suites (`42` files, `117` tests); TypeScript.
- Gates skipped: browser QA, because this was a server validation/domain-helper change with no UI interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers domain ownership, operator-safe errors, data integrity, meaningful tests, and evidence-based closeout.
- Residual risk: server integration is pinned by source-level contract and pure helper tests; browser/date-picker constraints would catch invalid input earlier but were outside this slice.
