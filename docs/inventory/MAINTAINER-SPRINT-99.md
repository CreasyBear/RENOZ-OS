# Inventory Maintainer Sprint 99: Mobile Warehouse Action Feedback

## Status

Closed in commit-ready state.

## Issue 1: Mobile Picking and Counting Surfaced Raw Mutation Errors

### Problem

The mobile warehouse picking and counting pages logged failed mutations, then displayed raw `Error.message` text to the operator. These workflows happen at the warehouse floor, where retry guidance needs to be fast and safe. Database, stack, or runtime details should stay out of handheld picking/counting feedback.

### Workflow Spine

Mobile warehouse route
-> barcode/quantity UI
-> pick confirmation or stock count submit handler
-> order picking or inventory counting mutation/offline queue
-> safe mobile warehouse formatter
-> operator toast.

### Touched Domains

- Mobile warehouse picking feedback.
- Mobile warehouse counting feedback.
- Inventory/mobile warehouse feedback contract.
- Inventory maintainer closeout docs.

### Business Value Protected

Picking and counting protect dispatch accuracy and warehouse stock truth. Operators should see clear retry guidance when a pick or count cannot be submitted, while implementation details stay in logs for maintainers.

### Scope Constraints

- Do not change pick payloads, count payloads, offline queue behavior, scanner behavior, quantity validation, mutation hooks, server functions, schemas, database writes, query keys, cache policy, or layout.
- Keep this as route-level feedback wiring only.

### Changes

- Added `formatMobileWarehouseActionError` for mobile pick/count mutation failures.
- Routed mobile pick confirmation failures through the formatter.
- Routed mobile count submission failures through the formatter.
- Added focused coverage for unsafe error suppression, safe validation copy, conflict guidance, and source wiring.

### Standards Checked

- Domain ownership: mobile warehouse route feedback now lives in a small route-local helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; only final operator feedback changed.
- Tenant isolation/data integrity: unchanged; no server function or data write behavior changed.
- Query/cache contract: unchanged; no invalidation or cache-key behavior changed.
- Honest UI states/operator-safe errors: improved for mobile pick and count submission failures.
- Reviewability: bounded diff across two route pages, one helper, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` fallback in mobile pick confirmation feedback.
- Raw `error.message` fallback in mobile count submission feedback.
- Missing mobile warehouse action feedback contract.

### Deferred

- Mobile receiving still uses the existing receiving-specific helper; consolidation can be considered if more mobile warehouse feedback variants appear.
- Browser/device QA remains deferred because this slice changes failure-copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/inventory/mobile-warehouse-action-errors.test.ts tests/unit/inventory/inventory-mutation-errors.test.ts tests/unit/orders/order-client-contracts.test.ts` (3 files, 12 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for mobile formatter wiring and removed raw pick/count error fallbacks.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, honest UI states, workflow spines, meaningful tests, and reviewable diffs.

### Residual Risk

Low for mobile picking/counting mutation feedback. Moderate across mobile warehouse UX because offline sync failure summaries and device-level QA remain separate work.
