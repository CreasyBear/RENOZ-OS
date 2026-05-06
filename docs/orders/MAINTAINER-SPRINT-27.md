# Orders Maintainer Sprint 27

## Status

Closed in commit-ready state.

## Issue 1: Order Creation Failure Feedback

### Problem

The order creation wizard still toasted raw submit failures and rendered raw validation field messages from failed create-order mutations. Creating draft orders is a core RENOZ Energy workflow for customer ordering and fulfillment intake, so failed submits need to keep useful local validation while suppressing database, idempotency, and backend implementation details.

### Workflow Spine

Orders create route
-> order creation wizard
-> creation form hook
-> create order mutation
-> create order server function
-> order list/detail cache policy
-> operator-safe field errors, toast, and step recovery.

### Touched Domains

- Orders creation wizard.
- Orders creation form submit feedback.
- Orders mutation client error normalization.
- Orders creation feedback tests.

### Business Value Protected

Order creation is the intake path for battery sales and service orders. Operators should be able to recover from missing customer/items, pricing mistakes, validation failures, conflicts, and backend failures without seeing database constraints or transport internals.

### Scope Constraints

- Do not change form schema, wizard step order, product selection, pricing calculation, address mapping, submit payloads, idempotency behavior, mutation hooks, server functions, or cache invalidation.
- Preserve safe local business-rule validation because it is actionable and tied to wizard step recovery.
- Suppress unsafe field-level messages rather than rendering them in the validation summary.

### Changes

- Added `getOrderCreationSubmitErrorMessage` for create-order submit failures.
- Added `getOrderCreationFieldErrors` to keep safe field messages and drop unsafe backend details before rendering the wizard summary.
- Routed the wizard catch block through the creation formatter instead of reading raw `error.message`.
- Changed fallback step routing to use the safe formatted message rather than the raw caught error.
- Added focused tests for unsafe backend suppression, safe local validation, safe conflict guidance, field-error filtering, and source wiring.

### Standards Checked

- Domain ownership: order creation failure copy is now owned by an Orders creation formatter.
- Route -> page -> wizard -> form hook -> mutation hook -> server -> schema/database -> query key/cache policy: preserved. This slice changes only client feedback after existing submit failures.
- Query/cache policy: no query keys, invalidations, mutation payloads, or stale-time behavior changed.
- Tenant isolation/data integrity: no server function, tenant predicate, idempotency key, database write, inventory movement, or finance persistence changed.
- UI states/error handling: create-order toasts and validation summaries now use safe copy while preserving local validation and step recovery.
- Reviewability: one helper, one wizard catch path, one focused test file, and this closeout note.

### Smells Removed

- Raw create-order submit `error.message` toast.
- Raw caught error text used for wizard step recovery.
- Raw mutation field errors rendered directly in the wizard validation summary.
- Missing focused coverage for order creation failure feedback boundaries.

### Deferred

- Remaining order-specific raw error paths still need separate slices: fulfillment error-boundary display, Xero sync alert copy, list load error copy, list bulk status comparison, and server result-row messages.
- Browser QA was deferred because this is failure-copy behavior with no visual layout change.

### Gates

- Passed: focused creation feedback set, `./node_modules/.bin/vitest run tests/unit/orders/order-creation-feedback-contract.test.ts tests/unit/orders/order-create-page-idempotency.test.tsx tests/unit/orders/order-write-contracts.test.ts tests/unit/orders/order-client-contracts.test.ts` - 4 files, 20 tests.
- Passed: broader orders suite, `./node_modules/.bin/vitest run tests/unit/orders` - 43 files, 156 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader orders suite still emits the existing `--localstorage-file` jsdom warning and one missing Upstash env warning; tests pass.
- Skipped: browser QA, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change routes, guarded read paths, financial persistence, document generation, release packaging, deployment, or visual layout.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, clear domain ownership, safe mutation contracts, and risk-selected evidence.

### Residual Risk

Low for order creation submit feedback. Moderate for the broader Orders domain because fulfillment boundary copy, Xero sync alerts, list load errors, list bulk status handling, and server result-row messages still need bounded cleanup.
