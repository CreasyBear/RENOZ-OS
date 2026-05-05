# Inventory Maintainer Sprint 92

This sprint follows Sprint 91's bulk serial duplicate guard. The target is the adjacent honest-state invariant: the bulk receiving dialog must not advance while purchase-order and product serialization details are still loading.

Status: Closed after Issue 1.

## Business Value

Bulk receiving is an operator workflow, not a guessing workflow. If purchase-order item details or product serialization requirements are unresolved, the operator should not be able to move into review with incomplete serial requirements and then hit preventable mutation failures.

## Workflow Spine

Bulk receive launch
-> selected purchase-order detail reads
-> product serialization reads
-> select step
-> serial requirement detection
-> serial entry or review
-> bulk receive mutation.

## Architecture Constraints

- Keep this sprint to the bulk receiving dialog's transition contract.
- Preserve the container's PO/product read ownership and the presenter's local wizard state ownership.
- Preserve server bulk receive behavior, mutation payload shape, query/cache invalidation, tenant predicates, inventory writes, and finance behavior.
- Treat loading as a blocking state before review because serialized requirements are mandatory workflow data.

## Issue Ledger

### 1. Bulk Receiving Could Advance While Required Receiving Details Were Loading

Problem:

- `BulkReceivingDialogContainer` passes `isDataLoading || isLoading` into the presenter while PO detail and product serialization reads resolve.
- The select-step `Next` button was disabled only when no purchase orders were selected.
- During loading, `poDetailsWithSerials` can still be empty or incomplete, so `hasSerializedItems` can be false even when selected POs later require serials.
- An operator could advance into review before the serial requirement contract was known.

Workflow protected:

selected POs -> detail/serialization loading -> select step -> serial requirement detection -> serial entry/review.

Implemented slice:

- Guarded `handleNext` against loading state with operator-safe copy for non-button invocation paths.
- Disabled the select-step `Next` action while `isLoading` is true.
- Rendered the select-step CTA as `Loading...` with the existing spinner icon while blocking.
- Added dialog-level coverage that verifies the workflow stays on the select step while receiving details are loading.

Out of scope:

- Container read policy changes.
- Server bulk receive behavior.
- Query key/cache invalidation behavior.
- Browser QA of the button state.

Closeout:

- Touched domains: procurement bulk receiving dialog, procurement dialog unit tests, inventory sprint evidence.
- Workflow protected: bulk receive launch -> PO/product detail loading -> select step -> serial requirement detection -> serial entry/review -> receive mutation.
- Business value protected: operators cannot proceed with a bulk receipt before the app knows whether selected battery products require serial capture.
- Architecture standards checked: route/container/hook/server/schema/cache boundaries unchanged; container still owns reads; presenter owns wizard transitions; mutation and cache contracts unchanged.
- Tenant isolation and data integrity checked: no database predicates, writes, transactions, finance behavior, or serialized inventory server writes changed; client now blocks an incomplete pre-mutation state.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: select-step transition ignored the loading state for required receiving detail reads; CTA state did not honestly reflect blocking data load.
- Smells deferred: browser QA of the loading button; broader receiving-domain folder consolidation; server-side bulk duplicate preflight remains a future hardening slice.
- Gates run: focused bulk dialog test (`1` file, `3` tests); focused ESLint; full lint; reliability guards; procurement + purchase-order + supplier + inventory unit suites (`107` files, `336` tests); TypeScript.
- Gates skipped: browser QA, because this was a disabled-button/transition contract covered by dialog tests with no layout restructuring.
- Goal adaptations: declined. The standing maintainer goal already covers honest UI states, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: server remains authoritative; bulk receive server preflight can still be hardened to detect self-contradictory batch serial input before sequential processing.
