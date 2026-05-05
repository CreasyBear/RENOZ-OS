# Inventory Maintainer Sprint 90

This sprint follows Sprint 89's normalized same-line serial duplicate validation. The target is the matching receipt-level invariant: a serialized product serial should not appear on multiple receipt lines for the same product in one single-PO receipt.

Status: Closed after Issue 1.

## Business Value

Battery serial lineage must be unambiguous before inventory is created. If the same serial is entered on two lines for the same product, operators should get immediate client feedback instead of a later server rejection.

## Workflow Spine

PO detail receive action
-> goods receipt dialog
-> serial number entry across receipt lines
-> quality-step validation
-> same-product cross-line duplicate check
-> receive-goods mutation.

## Architecture Constraints

- Keep this sprint to single-PO goods receipt client validation.
- Match the server invariant in `receiveGoods`: duplicate key is `productId:normalizedSerial`.
- Preserve server-side validation as authoritative.
- Preserve dialog wizard state, mutation payload shape, query/cache behavior, and bulk receiving behavior.

## Issue Ledger

### 1. Goods Receipt Did Not Catch Same-Product Duplicate Serials Across Lines

Problem:

- Sprint 89 fixed duplicate detection within a single receipt line.
- `receiveGoods` also rejects the same normalized serial appearing multiple times for the same product across the receipt request.
- The client did not catch that cross-line invariant before submit.

Workflow protected:

serial entry across receipt lines -> quality validation -> duplicate serial feedback -> receive mutation.

Implemented slice:

- Added `findCrossLineDuplicateReceiptSerials`.
- Uses `productId:normalizeSerial(serial)` matching the server invariant.
- Ignores blank serials so existing empty-serial validation remains responsible for blanks.
- Allows matching serial text across different products.
- Rewired `GoodsReceiptDialog` quality-step validation to emit an operator-safe receipt-level duplicate message.
- Added focused coverage for same-product and different-product cross-line behavior.

Out of scope:

- Bulk receiving cross-line duplicate validation.
- Cross-PO duplicate validation in one bulk operation.
- Server receive mutation behavior.
- Browser QA of the wizard validation display.

Closeout:

- Touched domains: purchase-order goods receipt dialog, receipt serial validation helper, purchase-order serial validation tests, inventory sprint evidence.
- Workflow protected: PO receive -> serial entry across lines -> quality-step validation -> same-product duplicate detection -> receive-goods mutation.
- Business value protected: operators get immediate feedback when a battery serial is duplicated across lines for the same product.
- Architecture standards checked: validation helper lives in the receive boundary; dialog owns UI validation; server validation remains authoritative; no schema/database changes.
- Tenant isolation and data integrity checked: no database predicates, writes, transactions, finance behavior, or serialized inventory server writes changed; client now better mirrors server receipt request integrity.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: client validation missed the server's same-product cross-line duplicate serial invariant.
- Smells deferred: bulk receiving cross-line/cross-PO duplicate validation; browser QA of validation display.
- Gates run: focused serial/wrapper/hook tests (`3` files, `18` tests); focused ESLint; procurement + purchase-order + supplier + inventory unit suites (`107` files, `334` tests); TypeScript.
- Gates skipped: browser QA, because this was a validation helper change covered by focused unit tests with no layout changes.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: server remains authoritative; bulk receiving serial duplicate ergonomics still need a separate slice.
