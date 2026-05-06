# Orders Maintainer Sprint 19

## Status

Closed in commit-ready state.

## Issue 1: Order Mutation Normalized Error Safety

### Problem

The shared orders mutation normalizer classified order and shipment failures, but still copied the raw server message onto the normalized `Error.message` for non-unknown failures. Some order UI reads `mutation.error.message` directly for dialog feedback, so unsafe conflict, retry, not-found, validation, or blocked messages could bypass `getClientErrorMessage` and reach operators.

### Workflow Spine

Order route/container
-> order or shipment domain component
-> order mutation hook
-> order server function
-> schema/database contract
-> query key/cache invalidation or rollback
-> normalized mutation error
-> toast/dialog feedback.

### Touched Domains

- Orders mutation feedback contract.
- Orders shipment feedback contract consumers.
- Orders unit contract tests.

### Business Value Protected

Order edits, status changes, shipment actions, picking, and order detail dialogs are high-frequency fulfillment workflows. Operators need stable recovery copy and safe validation guidance, not database or infrastructure details, especially when an order workflow is blocked mid-fulfillment.

### Scope Constraints

- Do not change order or shipment server functions.
- Do not change order status transitions, shipment transitions, picking behavior, inventory writes, finance persistence, document generation, or tenant predicates.
- Do not change query keys, cache invalidation, optimistic rollback, stale times, or mutation payloads.
- Preserve safe validation field guidance where it helps the operator correct the request.

### Changes

- Added unsafe-message filtering to `src/hooks/orders/order-mutation-client-errors.ts`.
- Normalized order/shipment `Error.message` now carries safe operator copy before any component can read `mutation.error.message`.
- Preserved safe validation field messages for validation/blocked failures.
- Kept raw error payloads available on the normalized `raw` property for debugging.
- Added focused tests covering unsafe conflict sanitization, direct `mutation.error.message` safety, unknown shipment fallback copy, and safe validation guidance.

### Standards Checked

- Domain ownership: orders owns the shared order/shipment mutation feedback contract.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only client-side failure normalization after existing mutations fail.
- Query/cache policy: no query keys, cache writes, invalidations, optimistic rollback, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database write, inventory movement, finance persistence, or document generation changed.
- UI states/error handling: direct `mutation.error.message` consumers now receive safe copy from the normalized error object.
- Reviewability: one shared formatter and one focused contract test file changed.

### Smells Removed

- Raw server messages stored on normalized order/shipment mutation `Error.message`.
- Mutation dialog feedback risk where components read `mutation.error.message` directly.
- Missing tests for unsafe non-unknown order mutation failures.

### Deferred

- Remaining order-specific raw error paths still need separate slices: orders export feedback, fulfillment import parse/import feedback, document-generation action feedback, payment/refund dialog feedback, amendment dialogs, order item draft actions, and fulfillment error-boundary display.
- Browser QA was deferred because this is failure-copy normalization with no visual layout change.

### Gates

- Passed: focused contract, `./node_modules/.bin/vitest run tests/unit/orders/order-client-contracts.test.ts` - 1 file, 6 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 36 files, 131 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is a shared error-normalization contract with no intended route, interaction, or layout change.

### Goal Adaptation

Accepted the gate-policy adjustment from this session: closeout reports risk-selected evidence only, without carrying retired gate tracks as routine skipped evidence.

### Residual Risk

Moderate for the broader Orders domain because the raw-error scan still shows route and component-specific feedback paths outside this shared normalizer. Low for mutation hooks that already route failures through `normalizeOrderMutationError` or `normalizeShipmentMutationError`.
