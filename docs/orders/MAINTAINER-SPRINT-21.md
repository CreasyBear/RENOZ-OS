# Orders Maintainer Sprint 21

## Status

Closed in commit-ready state.

## Issue 1: Fulfillment Import Failure Feedback

### Problem

The fulfillment import workflow wrote raw caught errors into the dialog error state for both CSV parse failures and server import failures. The import dialog is an operator-facing fulfillment tool, so backend errors, file-read exceptions, or infrastructure details should not appear in the alert body.

### Workflow Spine

Fulfillment dashboard
-> fulfillment import dialog
-> `useFulfillmentImportWorkflow`
-> CSV parser and shipment import mutation
-> `importFulfillmentShipments` server function
-> shipment/order/cache invalidation
-> operator-safe preview/import feedback.

### Touched Domains

- Orders fulfillment import workflow hook.
- Orders fulfillment import dialog behavior through existing hook integration.
- Orders unit workflow tests.

### Business Value Protected

Fulfillment import is a warehouse/operator acceleration path for marking shipments as shipped. When an import fails, operators need clear recovery copy and safe row guidance without seeing database, filesystem, or stack details.

### Scope Constraints

- Do not change CSV header mapping, row parsing, row validation, valid-row selection, dry-run behavior, result CSV download, success toasts, or dialog layout.
- Do not change `importFulfillmentShipments`, shipment status transitions, order status behavior, inventory movement, finance persistence, tenant predicates, or cache invalidation.
- Preserve the known safe parse message for missing header/data rows.
- Preserve safe field validation guidance from normalized shipment mutation errors.

### Changes

- Added parse and submit fallback constants in `useFulfillmentImportWorkflow`.
- Added `formatFulfillmentImportParseError` with an allowlist for parser-owned safe messages.
- Added `formatFulfillmentImportSubmitError` through the existing shipment mutation normalizer.
- Replaced raw `error.message` writes in parse and import catches.
- Expanded workflow tests to cover safe parse feedback, safe submit feedback, and dialog-level raw-error suppression.

### Standards Checked

- Domain ownership: fulfillment import failure copy is owned by the Orders workflow hook.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only hook-level failure copy after parse/import failures.
- Query/cache policy: no query keys, invalidations, optimistic behavior, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database write, shipment transition, inventory movement, or finance persistence changed.
- UI states/error handling: import dialog alerts now receive sanitized parse/import copy.
- Reviewability: one hook and one existing workflow test file changed.

### Smells Removed

- Raw parse `error.message` in fulfillment import alerts.
- Raw server import `error.message` in fulfillment import alerts.
- Missing dialog-level coverage proving failed imports do not show backend text.

### Deferred

- Remaining order-specific raw error paths still need separate slices: document-generation action feedback, payment/refund dialog feedback, amendment dialogs, order item draft actions, fulfillment error-boundary display, and Xero sync alert copy.
- Browser QA was deferred because this is failure-copy behavior covered by hook/dialog tests with no visual layout change.

### Gates

- Passed: focused workflow, `./node_modules/.bin/vitest run tests/unit/orders/fulfillment-import-workflow.test.tsx` - 1 file, 6 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 37 files, 137 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is a hook/dialog failure-copy contract with no intended route, interaction, or layout change.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, safe mutation feedback contracts, and risk-selected evidence.

### Residual Risk

Low for fulfillment import parse/submit alert copy. Moderate for the broader Orders domain because several component-specific raw feedback paths remain outside this workflow.
