# Support Maintainer Sprint 32

## Status

Closed in commit-ready state.

## Issue 1: RMA Server Result Feedback

### Problem

RMA bulk receive and remedy execution still made server-side result decisions close to raw caught errors. Bulk receive had inline unsafe-message filtering inside `rma.ts`, and remedy execution persisted raw caught messages as `executionBlockedReason`. Those messages can surface in RMA bulk failure lists and blocked remedy summaries, so the server needs an explicit result-message boundary before persistence or response construction.

### Workflow Spine

Support RMA list/detail
-> bulk receive or execute remedy action
-> RMA server function
-> RMA receive/remedy transaction
-> inventory/finance/order artifact mutation
-> server result or blocked execution state
-> operator-visible RMA feedback.

### Touched Domains

- Support RMA bulk receive feedback.
- Support RMA remedy execution blocked feedback.
- Orders-hosted RMA server functions.
- Support RMA result feedback tests.

### Business Value Protected

RMAs support warranty, replacement, refund, credit, and inventory recovery workflows for battery products. Operators need actionable RMA failure reasons without database, stack, provider, or implementation details being stored or displayed as result rows and blocked execution state.

### Scope Constraints

- Do not change RMA receive, remedy execution, status transitions, inventory restoration, serialized lineage, refund/payment, credit note, replacement order, transaction, permission, or read-model behavior.
- Preserve safe existing RMA receive and remedy reasons where they are operator-actionable.
- Change only server-side result/blocked-message formatting before response or persistence.

### Changes

- Added `formatBulkRmaReceiveFailure` in a dedicated RMA server result message helper.
- Added `formatRmaRemedyBlockedReason` before persisting blocked remedy execution state.
- Restricted pass-through to known safe RMA receive/remedy messages.
- Mapped serialized receive failures to stable serial-review copy.
- Kept unsafe, unknown, and implementation-shaped errors behind stable fallbacks.
- Updated existing RMA bulk feedback source contract to recognize the extracted helper boundary.
- Added focused tests for bulk receive, serialized receive, remedy blocked, unsafe backend, and source wiring behavior.

### Standards Checked

- Domain ownership: RMA server result feedback is now owned by an RMA result-message helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This slice changes only server-side result/blocked-message formatting after existing failures.
- Query/cache policy: no query keys, invalidations, mutation payloads, stale-time behavior, or client cache contracts changed.
- Tenant isolation/data integrity: no server authorization, tenant predicate, transaction, inventory movement, serialized lineage mutation, refund/payment, credit note, replacement order, or read-model behavior changed.
- UI states/error handling: RMA bulk rows and blocked remedy summaries receive safer, category-specific server copy.
- Reviewability: one helper, one server import/call path, two focused test files updated/added, and this closeout note.

### Smells Removed

- Inline RMA bulk receive unsafe-message policy inside the monolithic RMA server file.
- Raw caught remedy execution messages persisted as `executionBlockedReason`.
- Broad safe-looking message pass-through for server result messages.
- Missing focused tests for RMA server result feedback before persistence/display.

### Deferred

- Full RMA server modularization remains deferred; `rma.ts` is still large and should be split by workflow in a future architecture slice.
- Browser QA was deferred because this is server result-copy behavior with no visual layout change.

### Gates

- Passed: focused RMA result set, `./node_modules/.bin/vitest run tests/unit/support/rma-server-result-feedback-contract.test.ts tests/unit/support/rma-bulk-feedback-contract.test.ts tests/unit/support/rma-bulk-feedback.test.ts tests/unit/support/rma-mutation-errors.test.ts tests/unit/support/rma-remedy-execution-evidence.test.ts` - 5 files, 14 tests.
- Passed: broader support suite, `./node_modules/.bin/vitest run tests/unit/support` - 67 files, 204 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, finance, document, release, and deploy gates because this slice did not change visual layout, financial persistence behavior, document generation, release packaging, or deployment.

### Goal Adaptation

Made. Serialized lineage remains a battery-asset invariant when a slice touches serial identity or serial movement, but the old serialized gate pack is closed work and is not routine closeout evidence. This sprint keeps the focused RMA result-feedback evidence only.

### Residual Risk

Low for RMA server result feedback. Moderate for RMA architecture because the monolithic RMA server file still mixes create, approve, receive, remedy execution, cancel, read, inventory, finance, and support concerns.
