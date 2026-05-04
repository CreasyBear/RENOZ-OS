# Inventory Maintainer Sprint 89

This sprint follows Sprint 88's product serialization fanout cleanup. The target is client-side receipt serial duplicate validation: single-PO receiving should detect duplicate serial numbers using the same canonical trim/uppercase semantics used by the server.

Status: Closed after Issue 1.

## Business Value

Serialized battery receipt should catch obvious operator mistakes before submit. If `sn-001` and `SN-001` are treated as different in the dialog, the operator gets delayed server rejection instead of immediate, actionable feedback.

## Workflow Spine

PO detail receive action
-> goods receipt dialog
-> serial number entry
-> quality-step validation
-> normalized duplicate serial check
-> receive-goods mutation.

## Architecture Constraints

- Keep this sprint to single-PO goods receipt client validation.
- Preserve server-side serialized validation as the final source of truth.
- Preserve dialog wizard state, mutation payload shape, query/cache behavior, and bulk receiving behavior.
- Use existing canonical serial normalization semantics from `src/lib/serials.ts`.

## Issue Ledger

### 1. Goods Receipt Duplicate Serial Check Compared Normalized Values Against Raw Input

Problem:

- `GoodsReceiptDialog` checked duplicates with `item.serialNumbers.indexOf(serial.trim().toUpperCase())`.
- The array contains raw operator input, so different casing or surrounding whitespace could bypass the client duplicate check.
- Server validation still rejects duplicates after normalization, but the UI should fail earlier with operator-safe copy.

Workflow protected:

serial entry -> quality validation -> duplicate serial feedback -> receive mutation.

Implemented slice:

- Added `findDuplicateReceiptSerials` in the receive boundary.
- Normalizes serials via `normalizeSerial`, ignores blank values, and returns canonical duplicate serials.
- Rewired `GoodsReceiptDialog` quality-step validation to use the helper.
- Added focused coverage for whitespace/case duplicates and blank serial handling.

Out of scope:

- Bulk receiving duplicate serial validation.
- Cross-line duplicate detection in the single-PO receipt dialog.
- Server validation behavior.
- Browser QA of the full wizard.

Closeout:

- Touched domains: purchase-order goods receipt dialog, receipt serial validation helper, purchase-order serial validation tests, inventory sprint evidence.
- Workflow protected: PO receive -> serial entry -> quality-step validation -> normalized duplicate detection -> receive-goods mutation.
- Business value protected: operators get immediate duplicate serial feedback for canonical duplicates before submitting serialized battery receipt.
- Architecture standards checked: validation helper lives in the receive boundary; dialog remains the UI owner; server receive validation remains authoritative; no schema/database boundaries changed.
- Tenant isolation and data integrity checked: no database predicates, writes, transactions, finance behavior, or serialized inventory server writes changed; client validation now better matches server canonicalization.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: client duplicate serial validation compared normalized values against raw input.
- Smells deferred: bulk receiving duplicate validation; cross-line single-receipt duplicate validation; browser QA of wizard feedback.
- Gates run: focused serial/wrapper/hook tests (`3` files, `16` tests); focused ESLint; procurement + purchase-order + supplier + inventory unit suites (`107` files, `332` tests); TypeScript.
- Gates skipped: browser QA, because this was a validation helper change covered by focused unit tests with no layout changes.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: server remains authoritative; future sprint should assess duplicate serial detection across multiple receipt lines and bulk receiving.
