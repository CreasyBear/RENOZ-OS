# Orders Maintainer Sprint 31

## Status

Closed in commit-ready state.

## Issue 1: Fulfillment Import Result-Row Feedback

### Problem

Fulfillment import finalization caught per-row shipment errors and copied raw caught `error.message` values into import result rows. Those rows can be shown back to operators in the import dialog. Shipment finalization touches carrier updates, inventory consumption, serialized item resolution, and shipment state, so row-level failures need stable recovery copy without exposing database constraints, stack traces, or backend implementation details.

### Workflow Spine

Fulfillment import dialog
-> import workflow hook
-> fulfillment import server function
-> shipment finalization
-> inventory/serialized lineage mutation
-> per-row import result message
-> operator-visible import results.

### Touched Domains

- Orders fulfillment import.
- Shipment finalization result-row feedback.
- Fulfillment import feedback tests.

### Business Value Protected

Shipment imports help operators finalize shipped orders in bulk from warehouse/carrier data. Failed rows should explain the recovery category, such as missing shipment, already-shipped row, serialized inventory issue, validation failure, or conflict, without leaking server internals.

### Scope Constraints

- Do not change import parsing, shipment lookup, dry-run behavior, mark-shipped behavior, inventory consumption, serialized lineage, idempotency keys, transaction boundaries, or returned result shape.
- Preserve existing successful, skipped, and pre-validation row messages.
- Change only caught exception formatting for failed import result rows.

### Changes

- Added `formatFulfillmentImportResultError` for server-side fulfillment import result rows.
- Mapped known shipment failures to stable operator copy.
- Sanitized unknown, validation, and conflict failures before they enter result rows.
- Routed shipment finalization import catches through the formatter.
- Added focused tests for known shipment errors, serialized inventory errors, unsafe backend errors, validation/conflict handling, and source wiring.

### Standards Checked

- Domain ownership: fulfillment import result-row failure copy is now owned by an Orders shipment import result formatter.
- Route -> dialog -> hook -> server function -> schema/database -> query key/cache policy: preserved. This slice changes only server-side failed row message formatting after existing exceptions.
- Query/cache policy: no query keys, invalidations, mutation payloads, stale-time behavior, or client cache contracts changed.
- Tenant isolation/data integrity: no server function authorization, tenant predicate, transaction, inventory movement, serialized lineage mutation, idempotency key, or finance persistence changed.
- UI states/error handling: import failed rows now receive operator-safe category copy instead of raw exception text.
- Reviewability: one helper, one server catch call site, one focused test file, and this closeout note.

### Smells Removed

- Raw caught `error.message` in fulfillment import result rows.
- Generic `"Unknown error"` result-row fallback.
- Missing focused coverage for import result-row failure feedback boundaries.

### Deferred

- Remaining order-specific raw server result-row paths still need separate slices: RMA bulk receive/remedy result messages.
- Fulfillment error-boundary development details remain deferred because they are DEV-only diagnostic copy rather than a normal operator-facing workflow.
- Browser QA was deferred because this is result-copy behavior with no visual layout change.

### Gates

- Passed: focused fulfillment import result set, `./node_modules/.bin/vitest run tests/unit/orders/fulfillment-import-result-feedback-contract.test.ts tests/unit/orders/fulfillment-import-workflow.test.tsx tests/unit/orders/order-shipment-finalization-serialization.test.ts` - 3 files, 11 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 47 files, 169 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change routes, guarded read paths, financial persistence, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, transaction/inventory integrity preservation, serialized lineage continuity, reviewable diffs, and risk-selected evidence.

### Residual Risk

Low for fulfillment import failed row feedback. Moderate for the broader Orders/Support boundary because RMA bulk server result messages still need bounded cleanup.
