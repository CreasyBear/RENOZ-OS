# Orders Maintainer Sprint 29

## Status

Closed in commit-ready state.

## Issue 1: Order Detail Xero Alert Feedback

### Problem

Order detail Xero sync alerts still displayed raw `xeroIssue.message` values and fell back to the stored `order.xeroSyncError`. Xero sync errors can originate from provider responses, OAuth readiness, account configuration, stored sync failures, or adapter exceptions. The order workspace should show clear recovery guidance without exposing provider internals, tokens, database details, or low-level adapter text.

### Workflow Spine

Order detail container
-> order detail data alerts hook
-> Xero invoice status read hook
-> financial Xero status server function
-> order alert presenter
-> operator-safe Xero recovery message and action.

### Touched Domains

- Orders detail alerts.
- Orders-to-finance Xero sync status display.
- Xero alert feedback tests.

### Business Value Protected

Xero sync alerts tell operators how to recover invoice sync for battery sales orders. The alert needs to preserve the recovery action, such as mapping a customer contact or reconnecting Xero, while keeping raw provider/backend failure text out of the order detail surface.

### Scope Constraints

- Do not change Xero sync status reads, sync commands, issue classification, retry policy, action routing, links, labels, server functions, persistence, or financial data.
- Preserve existing alert titles and actions.
- Change only the order-detail alert message shown to operators.

### Changes

- Added `getOrderXeroAlertMessage` to map known Xero issue categories to stable operator-safe copy.
- Added `ORDER_XERO_ALERT_FALLBACK_MESSAGE` for unknown or missing issue details.
- Routed order detail Xero alert messages through the formatter.
- Removed the raw stored `order.xeroSyncError` fallback from the order detail alert.
- Extracted the formatter into a small helper so the copy contract can be tested without importing unrelated alert-hook dependencies.
- Added focused tests for missing contact mapping, reconnect/auth failures, account settings failures, validation failures, unknown stored errors, and source wiring.

### Standards Checked

- Domain ownership: order-detail Xero alert copy is now owned by an Orders Xero alert formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This slice changes only alert display copy after existing Xero status reads.
- Query/cache policy: no query keys, invalidations, read hooks, stale-time behavior, or sync command behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database write, Xero persistence, inventory movement, or finance posting changed.
- UI states/error handling: order detail Xero alerts now show category-specific recovery copy without raw stored/provider errors.
- Reviewability: one helper, one alert hook call path, one focused test file, and this closeout note.

### Smells Removed

- Raw `xeroIssue.message` rendering in order detail alerts.
- Raw `order.xeroSyncError` fallback in order detail alerts.
- Heavy hook import boundary in the alert feedback test.
- Missing focused coverage for order-detail Xero alert feedback boundaries.

### Deferred

- Remaining order-specific raw error paths still need separate slices: list bulk status comparison, fulfillment error-boundary development details, and server result-row messages.
- Browser QA was deferred because this is alert-copy behavior with no visual layout change.

### Gates

- Passed: focused Orders/Xero feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-xero-alert-feedback-contract.test.ts tests/unit/financial/xero-sync-status.test.tsx tests/unit/financial/xero-sync-contract.test.ts` - 3 files, 6 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 45 files, 162 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, broader finance gates, document, release, and deploy gates because this slice did not change routes, guarded read paths, financial persistence/posting, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, finance integrity preservation, query/cache policy preservation, and risk-selected evidence.

### Residual Risk

Low for order-detail Xero alert feedback. Moderate for the broader Orders domain because list bulk status handling, fulfillment boundary development details, and server result-row messages still need bounded cleanup.
