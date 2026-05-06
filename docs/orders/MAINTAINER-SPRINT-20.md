# Orders Maintainer Sprint 20

## Status

Closed in commit-ready state.

## Issue 1: Orders List Export Failure Feedback

### Problem

The orders list export action caught export failures in the route and toasted `error.message` directly. A failed export can come from list filtering, server reads, permission failures, or infrastructure errors. Operators should get stable export-specific recovery copy, not raw database or transport details.

### Workflow Spine

Orders route/page
-> filter state and `buildOrderQuery`
-> `listOrders` server function
-> order schema/database read
-> CSV generation/download
-> export success or operator-safe failure feedback.

### Touched Domains

- Orders list route export action.
- Orders export feedback helper.
- Orders unit contract tests.

### Business Value Protected

Order exports support reporting, sales follow-up, fulfillment review, and operational cleanup. Failed exports should tell the operator what to do next without leaking backend detail or making the export workflow feel broken.

### Scope Constraints

- Do not change order listing filters, search params, CSV columns, filename generation, page size, sorting, or empty-export behavior.
- Do not change `listOrders`, order schemas, database queries, tenant predicates, query keys, cache invalidation, or dashboard metrics.
- Do not move export execution out of the existing route action in this slice.

### Changes

- Added `formatOrderExportError` in the Orders domain.
- Mapped known read failure kinds to export-specific recovery copy for auth, permission, validation, and rate-limit failures.
- Defaulted system/unknown/not-found export failures to a stable order export fallback.
- Routed the orders page export catch block through the Orders formatter.
- Added focused contract coverage for unsafe export messages, known failure kinds, and page wiring.

### Standards Checked

- Domain ownership: order export failure copy now lives in the Orders domain instead of inline route logic.
- Route -> container/page -> hook/server -> schema/database -> query key/cache policy: preserved. This slice changes only export failure feedback after the existing route action fails.
- Query/cache policy: no query keys, cache reads, invalidations, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, database read/write, inventory movement, finance persistence, or document generation changed.
- UI states/error handling: export failures now use operator-safe, export-specific copy.
- Reviewability: one small helper, one route call-site, one focused test file, and this closeout note.

### Smells Removed

- Raw `error.message` toast in the orders list export action.
- Inline route-owned export failure copy.
- Missing source/helper coverage for order export failure feedback.

### Deferred

- Remaining order-specific raw error paths still need separate slices: fulfillment import parse/import feedback, document-generation action feedback, payment/refund dialog feedback, amendment dialogs, order item draft actions, and fulfillment error-boundary display.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused contract, `./node_modules/.bin/vitest run tests/unit/orders/order-export-feedback-contract.test.ts` - 1 file, 3 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 37 files, 134 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA because this is an export failure-copy contract with no intended route, interaction, or layout change.

### Goal Adaptation

Declined. The standing maintainer goal and the current risk-selected gate policy already cover this slice.

### Residual Risk

Low for the orders list export failure path. Moderate for the broader Orders domain because the raw-error scan still shows component-specific feedback paths outside this export action.
