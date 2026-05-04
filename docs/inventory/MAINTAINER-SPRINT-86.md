# Inventory Maintainer Sprint 86

This sprint follows Sprint 85's bulk receiving serialization read hardening. The target is the same invariant in single purchase-order receiving: the receipt dialog must not open when product serialization requirements cannot be loaded.

Status: Closed after Issue 1.

## Business Value

Single-PO receiving is a common warehouse path. If product serialization metadata fails and the dialog treats serialized products as non-serialized, operators could receive battery stock without the serial lineage RENOZ needs for inventory, support, warranty, and RMAs.

## Workflow Spine

purchase-order detail receive action
-> receiving dialog wrapper
-> purchase-order detail read
-> product serialization requirement reads
-> serialized item detection
-> goods receipt dialog
-> receive goods mutation.

## Architecture Constraints

- Keep this sprint to the single-PO receiving wrapper's read/error contract.
- Preserve the shared product serialization hook contract created in Sprint 85.
- Preserve the goods receipt presenter, server receive mutation, route behavior, and cache invalidation.
- Fail closed before rendering `GoodsReceiptDialog` when product serialization requirements are unavailable.

## Issue Ledger

### 1. Single-PO Receiving Ignored Product Serialization Read Errors

Problem:

- `ReceivingDialogWrapper` consumed only `serializationMap` and loading state from `useProductSerialization`.
- If product serialization reads failed, `serializationMap.get(productId) ?? false` could mark a product as not requiring serials.
- The receipt dialog could render even though the app had not proven whether serial capture was required.

Workflow protected:

PO receive action -> PO detail read -> product serialization read -> serial requirement detection -> goods receipt dialog.

Implemented slice:

- Added product serialization error handling to `ReceivingDialogWrapper`.
- Displays product-label-aware operator copy when serialization requirements cannot be loaded.
- Retries the failed product serialization reads through `refetchErroredProducts`.
- Blocks `GoodsReceiptDialog` from rendering while serialization requirements are unavailable.
- Added focused consumer coverage for the fail-closed single-PO receiving path.

Out of scope:

- Visual redesign of the receiving dialog overlay.
- Server-side `receiveGoods` behavior.
- Bulk receiving behavior, already handled in Sprint 85.
- Browser QA of the full PO detail receive action.

Closeout:

- Touched domains: purchase-order receiving wrapper, purchase-order consumer test, inventory sprint evidence.
- Workflow protected: purchase-order receive action -> wrapper read composition -> product serialization requirements -> serial capture gate -> receive mutation.
- Business value protected: single-PO receiving now blocks unsafe receipt when serial requirements are unavailable, protecting battery serial lineage for inventory, support, warranty, and RMA workflows.
- Architecture standards checked: wrapper owns composition/error states; product serialization hook owns read normalization and retry; presenter/server/cache boundaries are unchanged.
- Tenant isolation and data integrity checked: no database predicates, writes, transactions, finance behavior, or serialized inventory writes changed; the UI now fail-closes before mutation when it cannot verify serial requirements.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or rollback behavior changed; retry targets failed product detail serialization reads.
- Smells removed: single-PO receiving treated missing serialization metadata as non-serialized by default.
- Smells deferred: browser QA of PO detail receive; shared helper extraction for duplicate serialization error-copy composition across bulk and single receiving.
- Gates run: focused wrapper/hook/dialog tests (`3` files, `14` tests); focused ESLint; procurement + purchase-order + supplier + inventory unit suites (`106` files, `329` tests); TypeScript.
- Gates skipped: browser QA, because the fail-closed behavior is covered at wrapper/presenter boundary and no layout interaction changed.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, honest UI states, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: a browser dogfood pass should still validate focus management and operator perception for both bulk and single receiving error overlays.
