# Orders Maintainer Sprint 28

## Status

Closed in commit-ready state.

## Issue 1: Orders List Read-State Feedback

### Problem

The Orders list presenter still rendered `error.message` directly in its cold-load error state. The Orders list is the main operational entry point for customer orders, fulfillment intake, support lookup, and issue-to-order workflows. A failed list read can come from tenant predicates, filtering, network failures, or backend errors, so the presenter should only show normalized read-query copy and never arbitrary raw exception text.

### Workflow Spine

Orders list route/container
-> `useOrders` query hook
-> `listOrders` server function
-> query key/cache policy
-> Orders list presenter
-> operator-safe read error state with retry.

### Touched Domains

- Orders list read state.
- Orders read-query error display contract.
- Orders list query contract tests.

### Business Value Protected

The Orders list is the working surface for finding orders, triaging fulfillment, and following customer/support context into order records. When reads fail, operators should see stable recovery copy and a retry action, not database constraints, RLS details, or transport internals.

### Scope Constraints

- Do not change list filters, sorting, pagination, selection, bulk actions, mobile/desktop rendering, query keys, stale time, server request shape, or `useOrders` normalization.
- Preserve normalized read-query messages from the hook because they already encode read-path policy.
- Fall back to stable Orders list copy for arbitrary non-read errors handed to the presenter.

### Changes

- Added `ORDERS_LIST_FALLBACK_MESSAGE`.
- Added `getOrdersListReadErrorMessage` to display normalized read-query messages and suppress arbitrary raw errors.
- Routed Orders list presenter error descriptions through the read-state helper.
- Added focused render/source coverage proving raw list errors do not reach the error state.

### Standards Checked

- Domain ownership: Orders list read failure copy is now owned by an Orders read-state helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This slice changes only presenter display copy after existing reads fail.
- Query/cache policy: no query keys, filters, server request normalization, invalidation, stale-time, or pagination behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database read/write, inventory movement, or finance persistence changed.
- UI states/error handling: cold-load list failures now show operator-safe copy with the existing retry action.
- Reviewability: one helper, one presenter call site, one focused test file, and this closeout note.

### Smells Removed

- Raw Orders list `error.message` rendering.
- Generic `"An unexpected error occurred"` fallback disconnected from the Orders list workflow.
- Missing focused render coverage for Orders list read failure copy.

### Deferred

- Remaining order-specific raw error paths still need separate slices: Xero sync alert copy, list bulk status comparison, fulfillment error-boundary development details, and server result-row messages.
- Browser QA was deferred because this is read-error copy with no visual layout change.

### Gates

- Passed: focused list/read set, `./node_modules/.bin/vitest run tests/unit/orders/order-list-read-state.test.tsx tests/unit/orders/order-list-query-contract.test.tsx tests/unit/orders/query-normalization-wave2.test.tsx` - 3 files, 11 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 44 files, 159 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change routes, guarded read paths beyond list display copy, financial persistence, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, clear domain ownership, query/cache policy preservation, and risk-selected evidence.

### Residual Risk

Low for Orders list read-state feedback. Moderate for the broader Orders domain because Xero sync alerts, list bulk status handling, fulfillment boundary development details, and server result-row messages still need bounded cleanup.
