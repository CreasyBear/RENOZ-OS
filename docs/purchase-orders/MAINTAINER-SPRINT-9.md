# Purchase Orders Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Typed Bulk Receiving Defensive Row Failures

### Problem

The bulk receive preparation loop still had a defensive generic `Error('Purchase order not found or has no items')` branch before row failure normalization. Sprint 8 made row output safe, but generic thrown errors weaken the server contract and make future row-copy behavior harder to reason about.

### Workflow Spine

Bulk receiving dialog
-> `useBulkReceiveGoods`
-> `bulkReceiveGoods` server preparation loop
-> typed `NotFoundError` or `ValidationError`
-> `toBulkReceiveFailure`
-> failed purchase-order review/retry UI.

### Touched Domains

- Supplier bulk receive server preparation path.
- Bulk receive row failure source contract.
- Existing bulk receive row normalizer tests.

### Business Value Protected

Bulk receiving needs row-level failures that are safe and explainable. Defensive preparation failures should enter the same typed server-error pathway as normal receive failures so operators get consistent failed-row guidance and future maintainers can reason about row result semantics.

### Scope Constraints

- Do not change `bulkReceiveGoods` batching, prepared receipt semantics, no-pending skip behavior, serial preflight, `receiveGoods`, schemas, tenant predicates, receipt payloads, quantity math, inventory writes, product cost updates, cache invalidation, or UI retry flow.
- Preserve `invalid_serial_state` row codes and `errorsById`.
- Do not run serialized gates for this defensive row semantics slice.

### Changes

- Replaced the defensive generic bulk receive preparation error with typed `NotFoundError` and `ValidationError` branches.
- Added a source contract to keep defensive row failures typed before `toBulkReceiveFailure` normalizes them.
- Preserved row failure normalizer behavior from Sprint 8.

### Standards Checked

- Domain ownership: supplier bulk receive server preparation now emits typed server errors; row display copy remains owned by `toBulkReceiveFailure`.
- Route -> container/page -> hook -> server flow: unchanged; the existing batch result shape still carries `errors` and `errorsById`.
- Query/cache policy: no query keys, invalidations, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no auth boundary, organization predicate, server read/write query, transaction, inventory mutation, product cost update, or tenant assumption changed.
- Inventory/finance integrity: receipt creation and stock-in side effects remain untouched; this slice only changes defensive thrown error types before row normalization.
- Serialized lineage: no serial validation, serial preflight, serialized mutation envelope, lineage write, or repair script changed. `invalid_serial_state` code continuity remains covered; serialized gates remain retired as routine evidence.
- UI states/error handling: failed-row semantics are easier to reason about because defensive server errors now enter the typed row-normalization path.
- Reviewability: the diff is limited to one server import/branch split, one source contract, and this closeout note.

### Smells Removed

- Generic defensive `Error` in the bulk receive preparation path.
- Ambiguous combined not-found/no-items row failure before typed normalization.
- Missing source contract that defensive row failures remain typed.

### Deferred

- No-pending purchase orders still count as processed, preserving existing behavior. A future product semantics slice can decide whether stale already-received POs should be reported as skipped, processed, or failed.
- Browser QA was not selected because this was server defensive error typing with no UI or layout change.

### Gates

- Passed: focused row failure and receiving contracts, `./node_modules/.bin/vitest run tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/procurement/bulk-receiving-dialog.test.tsx tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx` - 6 files, 25 tests.
- Passed: broader purchase-order/procurement/receive suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/bulk-receive-goods-row-failure-contract.test.ts tests/unit/suppliers/bulk-receive-failure.test.ts tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts` - 38 files, 113 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for typed defensive row errors, removed generic combined throw, preserved `toBulkReceiveFailure`, preserved `invalid_serial_state`, and preserved `errorsById`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was server defensive error typing with no visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers typed server contracts, operator-safe errors, receiving/inventory awareness, serialized code continuity, meaningful tests, and risk-selected evidence.

### Residual Risk

This is source-contracted rather than exercised through a live impossible `getPurchaseOrder` null response. The no-pending row semantics remain unchanged and should be reviewed separately if operators need a clearer skipped-row state.
