# Purchase Orders Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Receiving Read-State Error Message Safety

### Problem

Receiving read-state helpers trusted raw `Error.message` values. Product serialization requirement failures, bulk receiving purchase-order detail failures, and single receiving purchase-order detail failures could leak internal exception copy if an error escaped the read-path normalizer.

### Workflow Spine

Single or bulk receiving entry
-> purchase-order detail and product serialization requirement reads
-> `normalizeReadQueryError` read-path policy
-> receiving error state
-> retry or blocked receive flow with operator-safe copy.

### Touched Domains

- Purchase-order receiving read-state copy.
- Procurement bulk receiving read-state copy.
- Product serialization requirement error message helper.
- Receiving read-state consumer tests.

### Business Value Protected

Receiving must block safely when purchase-order details or product serialization requirements cannot be loaded. Operators should know whether to refresh/retry without seeing database, Supabase, or constraint text, and the UI must not continue into stock-in when serial requirements are unknown.

### Scope Constraints

- Do not change purchase-order read hooks, product read hooks, query keys, cache policy, server functions, schemas, tenant predicates, serial validation, receiving payloads, inventory writes, product cost updates, or mutation behavior.
- Do not change success, mutation failure, or partial failure toasts from Sprints 5 and 6.
- Do not run serialized gates for this read-state display slice.

### Changes

- Changed product serialization error messages to trust only `ReadQueryError` output from the read-path policy.
- Changed bulk receiving purchase-order detail error display to trust only `ReadQueryError` output.
- Changed single receiving purchase-order detail error display to trust only `ReadQueryError` output.
- Added focused tests for product serialization fallback behavior, normalized not-found copy, bulk receiving raw read-error suppression, and single receiving raw read-error suppression.

### Standards Checked

- Domain ownership: receiving read-state surfaces stay in purchase-order/procurement receiving components; read normalization stays in `normalizeReadQueryError`.
- Route -> container/page -> hook -> server flow: receiving wrappers still use existing hooks and server functions; display helpers now respect read-path policy boundaries.
- Query/cache policy: no query keys, invalidations, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no server read/write path, auth boundary, organization predicate, transaction, inventory mutation, product cost update, or tenant assumption changed.
- Inventory/finance integrity: stock-in behavior remains blocked when required reads fail; no receiving write path changed.
- Serialized lineage: product serialization requirements still block receiving when unavailable; no serial validation, serial preflight, serialized mutation envelope, lineage write, or repair script changed. Focused receive serialization tests were rerun; serialized gates remain retired as routine evidence.
- UI states/error handling: receiving read states now show normalized read-path copy or safe fallbacks instead of arbitrary exception messages.
- Reviewability: the diff is limited to three read display guards, one focused helper test, consumer tests, and this closeout note.

### Smells Removed

- Raw `Error.message` display in product serialization requirement error messages.
- Raw `Error.message` display in bulk receiving purchase-order detail errors.
- Raw `Error.message` display in single receiving purchase-order detail errors.
- Missing regression coverage for unsafe receiving read-error suppression.

### Deferred

- Other domains still contain raw read or mutation error messages outside this receiving/purchase-order slice.
- Browser QA was not selected because this was source-covered read-state copy with no intended layout change.

### Gates

- Passed: focused receiving read-state and receive contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/product-serialization-error-messages.test.ts tests/unit/purchase-orders/query-normalization-wave3d.test.tsx tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx tests/unit/purchase-orders/goods-receipt-mutation-feedback-contract.test.ts tests/unit/procurement/bulk-receiving-dialog.test.tsx tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/receive-goods-serialization.test.ts` - 7 files, 31 tests.
- Passed: broader purchase-order/procurement/receive suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers/use-bulk-receive-goods.test.tsx tests/unit/suppliers/receive-goods.test.ts tests/unit/suppliers/receive-goods-tenant-scope-contract.test.ts tests/unit/suppliers/receive-goods-serialization.test.ts` - 36 files, 108 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `isReadQueryError` guards, read-path normalization, removed raw receiving read-message display, and unsafe string suppression coverage.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this was read-state copy wiring with no visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, read-path contracts, receiving/inventory awareness, and risk-selected evidence.

### Residual Risk

This is unit/source-covered rather than browser-tested against a live rejected read. The helper now intentionally hides non-read errors behind generic fallback copy, which is safer but less specific if a future caller bypasses `normalizeReadQueryError`.
