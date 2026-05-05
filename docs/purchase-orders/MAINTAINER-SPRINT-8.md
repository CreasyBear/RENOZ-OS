# Purchase Orders Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Bulk Receiving Row Failure Safety

### Problem

Bulk receive row failures were serialized from raw server `Error.message` values. Those row reasons are shown inside the bulk receiving dialog, so a failed purchase order could expose database, constraint, stack, or internal server copy in the operator-facing failed-row list.

### Workflow Spine

Bulk receiving dialog
-> `useBulkReceiveGoods`
-> `bulkReceiveGoods` server batch processing
-> per-purchase-order `toBulkReceiveFailure`
-> `errors` and `errorsById` batch result
-> failed purchase-order review/retry UI with operator-safe row reasons.

### Touched Domains

- Supplier bulk receive server result formatting.
- Procurement bulk receiving failed-row UI contract.
- Bulk receive row failure tests.

### Business Value Protected

Bulk receiving can partially fail while still processing other purchase orders. Operators need actionable row-level reasons for retry/review, but those reasons must not leak database internals or make warehouse receiving feel unsafe or noisy.

### Scope Constraints

- Do not change `bulkReceiveGoods` batching, prepared receipt flow, serial preflight, `receiveGoods`, schemas, tenant predicates, receipt payloads, quantity math, inventory writes, product cost updates, cache invalidation, or UI retry flow.
- Preserve `invalid_serial_state` row codes so serialized failures still route operators back to serial review.
- Do not run serialized gates for this row-message slice.

### Changes

- Added a row-level bulk receive fallback message.
- Mapped known auth, permission, not-found, and rate-limit server errors to operator-safe row copy.
- Preserved safe validation messages, including serialized validation messages.
- Suppressed unsafe generic/server/validation messages behind the row fallback.
- Expanded `bulk-receive-failure` tests for safe code preservation, known server messages, and unsafe message suppression.

### Standards Checked

- Domain ownership: row result copy is normalized at the supplier bulk receive server boundary before reaching procurement UI.
- Route -> container/page -> hook -> server flow: unchanged; the existing batch result shape still carries `errors` and `errorsById`.
- Query/cache policy: no query keys, invalidations, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no auth boundary, organization predicate, server read/write query, transaction, inventory mutation, product cost update, or tenant assumption changed.
- Inventory/finance integrity: receipt creation and stock-in side effects remain untouched; this slice only changes failed-row copy after caught errors.
- Serialized lineage: `invalid_serial_state` code extraction remains intact; no serial validation, serial preflight, serialized mutation envelope, lineage write, or repair script changed. Focused receive serialization tests were rerun; serialized gates remain retired as routine evidence.
- UI states/error handling: failed bulk receive rows now show safe server-owned messages while preserving retry/review behavior.
- Reviewability: the diff is limited to one server failure helper, its tests, and this closeout note.

### Smells Removed

- Raw `Error.message` in bulk receive row result formatting.
- Unsafe database/constraint/server copy pathway into failed purchase-order rows.
- Missing row-failure coverage for known server errors and unsafe message suppression.

### Deferred

- Generic `Error('Purchase order not found or has no items')` in `bulkReceiveGoods` now falls back to safe generic row copy rather than a more specific not-found/no-items reason; a future server semantics slice can convert that throw to typed errors if operators need finer row guidance.
- Browser QA was not selected because this was server result-copy normalization with existing UI tests and no layout change.

### Gates

- Passed: focused row-failure and receiving contracts, `./node_modules/.bin/vitest run tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/procurement/bulk-receiving-dialog.test.tsx tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx` - 6 files, 28 tests.
- Passed: broader purchase-order/procurement/receive suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts` - 37 files, 112 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `toBulkReceiveFailure`, removed raw row `error.message`, preserved `invalid_serial_state`, preserved `errorsById`, and unsafe string suppression coverage.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was server result-copy normalization with no visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, receiving/inventory awareness, serialized code continuity, meaningful tests, and risk-selected evidence.

### Residual Risk

This is unit/source-covered rather than verified against a live failed bulk receive response. Some safe validation messages still flow through intentionally; if server validation copy becomes inconsistent, a future slice should introduce typed row reason codes instead of relying on message text.
