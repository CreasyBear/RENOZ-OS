# Inventory Maintainer Sprint 85

This sprint follows Sprint 84's bulk receive selected-intent preservation. The target is serialized receiving safety in the bulk receiving dialog: product serialization requirement reads must fail closed with useful recovery, not degrade into ambiguous purchase-order errors.

Status: Closed after Issue 1.

## Business Value

RENOZ Energy handles lithium-ion battery products where serial capture can be the operational proof of lineage. Bulk receiving must not continue when the app cannot determine whether selected products require serial numbers, and operators need a retry path that refreshes the failed requirement reads.

## Workflow Spine

receiving dashboard selected rows
-> bulk receiving dialog container
-> purchase-order detail reads
-> product serialization requirement reads
-> serialized item detection
-> serial capture/review
-> bulk receive mutation.

## Architecture Constraints

- Keep this sprint to the read/error contract for product serialization requirements in bulk receiving.
- Preserve the container/presenter split, dialog wizard state, server bulk receive behavior, cache invalidation from Sprint 83, and selected-intent behavior from Sprint 84.
- Fail closed when serialization requirements cannot be loaded.
- Use operator-safe copy and retry the read path that actually failed.

## Issue Ledger

### 1. Product Serialization Failures Surfaced As Unknown PO Detail Failures

Problem:

- `useProductSerialization` exposed only `hasErrors`, not the failed product ids, normalized errors, or a retry path.
- `BulkReceivingDialogContainer` combined PO detail errors and product serialization errors into a single "Failed to load purchase order details" state.
- If only product serialization reads failed, the dialog could show "Unknown error" and retry only PO detail queries.
- That is unsafe because serialization requirements determine whether serial-number capture is mandatory.

Workflow protected:

bulk receive dialog open -> PO detail reads -> product serialization reads -> serial requirement detection -> safe serial capture/review.

Implemented slice:

- Normalized product serialization read failures with `normalizeReadQueryError`.
- Exposed product-level errors and `refetchErroredProducts` from `useProductSerialization`.
- Added product-label-aware error messages in `BulkReceivingDialogContainer`.
- Split product serialization failure copy from PO detail failure copy.
- Retried failed product serialization reads from the dialog error state's retry action.
- Added hook-level normalization coverage and consumer-level dialog blocking/retry coverage.

Out of scope:

- Single-PO receiving dialog serialization error handling.
- Browser QA of the full receiving dashboard dialog.
- Server receiving validation or transaction behavior.
- Product detail query-key changes.

Closeout:

- Touched domains: purchase-order product serialization hook, procurement bulk receiving container, purchase-order consumer tests, inventory sprint evidence.
- Workflow protected: selected POs -> PO detail reads -> product serialization requirement reads -> serial requirement detection -> serial capture/review -> bulk receive mutation.
- Business value protected: operators are blocked with actionable recovery when serial requirements cannot be loaded, avoiding accidental non-serialized handling of battery stock that may require lineage.
- Architecture standards checked: route/page/server boundaries unchanged; hook owns read normalization; container owns read composition and presenter error state; centralized `queryKeys.products.detail(productId)` remains the cache contract.
- Tenant isolation and data integrity checked: no database predicates, writes, inventory transactions, finance paths, or serialized lineage server writes changed; this sprint fail-closes the UI before mutation when product serialization metadata is unavailable.
- Query/cache contract checked: product detail query keys and stale time are unchanged; retry now targets failed product requirement reads in addition to failed PO detail reads; no mutation invalidation changed.
- Smells removed: `hasErrors` without error details/retry; product serialization failures collapsed into "Unknown error" purchase-order copy; retry missed the failed product read path.
- Smells deferred: single-PO receiving dialog should get the same product serialization read-error treatment; browser QA of the full dashboard dialog remains useful.
- Gates run: focused hook/container/dialog tests (`3` files, `13` tests); focused ESLint; TypeScript; procurement + purchase-order + supplier + inventory unit suites (`106` files, `328` tests).
- Gates skipped: browser QA, because this was a read/error contract change covered at hook and container levels with no layout behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, operator-safe errors, clear ownership, meaningful tests, and evidence-based closeout.
- Residual risk: single-PO receiving still consumes `useProductSerialization` without reading `hasErrors`; that should be a follow-on sprint before considering receiving serialization fully hardened.
