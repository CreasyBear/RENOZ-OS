# Inventory Maintainer Sprint 91

This sprint follows Sprint 90's single-PO cross-line duplicate serial guard. The target is the matching bulk receiving invariant: a serialized product serial should not appear multiple times across selected purchase-order items before a bulk receipt moves to review.

Status: Closed after Issue 1.

## Business Value

Bulk receiving should prevent avoidable serialized battery lineage errors before the operator starts processing. If the same-product serial is entered across selected POs or PO items, the dialog should stop at serial entry with clear copy instead of letting the batch reach a later server-side failure.

## Workflow Spine

Bulk receive selected purchase orders
-> serial number step
-> per-item quantity validation
-> same-product duplicate serial validation
-> review step
-> receive-goods mutation.

## Architecture Constraints

- Keep this sprint to bulk receiving client validation and shared receipt serial validation ownership.
- Match the server invariant in `receiveGoods`: duplicate key is `productId:normalizedSerial`.
- Preserve server-side validation as authoritative.
- Preserve dialog wizard state, mutation payload shape, query/cache behavior, tenant predicates, inventory writes, and finance behavior.
- Avoid adding a second duplicate-serial implementation inside the bulk dialog.

## Issue Ledger

### 1. Bulk Receiving Could Advance Duplicate Same-Product Serials To Review

Problem:

- `BulkReceivingDialog` only checked whether each serialized PO item had the required number of serials.
- The single-PO receipt dialog already caught same-product duplicate serials across receipt lines.
- Bulk receiving could still advance duplicate same-product serials across selected PO items/POs into review, leaving the operator to hit a later mutation failure path.
- The validation helper lived under the purchase-order receive UI folder, which would have made bulk receiving depend on a narrower UI boundary.

Workflow protected:

bulk serial entry -> duplicate serial feedback -> review step -> receive mutation.

Implemented slice:

- Promoted receipt serial validation to `src/lib/receipt-serial-validation.ts`.
- Rewired the single-PO receipt dialog to import the shared helper from the neutral library boundary.
- Added bulk receiving serial-line construction using selected PO number, product id, product name, and entered serials.
- Blocked same-product duplicate normalized serials before the bulk dialog can move from serial entry to review.
- Added dialog-level coverage for duplicate same-product serials across two selected POs.

Out of scope:

- Server receive mutation behavior.
- Query key/cache invalidation behavior after successful bulk receive.
- Browser QA of the wizard display.
- Broader receiving-domain folder consolidation.

Closeout:

- Touched domains: procurement bulk receiving dialog, purchase-order goods receipt dialog import boundary, shared receipt serial validation, procurement and purchase-order unit tests, inventory sprint evidence.
- Workflow protected: bulk PO selection -> serial entry -> same-product duplicate validation -> review -> receive-goods mutation.
- Business value protected: operators get immediate, actionable duplicate serial feedback before starting bulk battery receipt processing.
- Architecture standards checked: shared validation now sits in a neutral library boundary; dialogs own UI state and copy; server validation remains authoritative; no route, hook, schema, database, query key, cache, transaction, or finance changes.
- Tenant isolation and data integrity checked: no database predicates or writes changed; client validation now better mirrors the server's request-level serialized lineage invariant.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: duplicate same-product serials could pass bulk serial entry; shared receipt validation was hidden under a narrower purchase-order UI folder.
- Smells deferred: browser QA of validation display; broader receiving-domain folder consolidation.
- Gates run: focused serial/bulk tests (`2` files, `6` tests); focused ESLint; full lint; reliability guards; procurement + purchase-order + supplier + inventory unit suites (`107` files, `335` tests); TypeScript.
- Gates skipped: browser QA, because this was validation behavior covered by dialog tests and no layout/styling changed.
- Goal adaptations: declined. The standing maintainer goal already covers domain boundaries, serialized lineage continuity, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: server remains authoritative; future receiving cleanup should decide whether purchase-order receiving and procurement receiving should share a clearer first-class domain folder.
