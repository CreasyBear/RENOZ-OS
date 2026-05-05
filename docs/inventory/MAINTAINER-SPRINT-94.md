# Inventory Maintainer Sprint 94

This sprint follows Sprint 93's server-side bulk serial preflight. The target is the matching operator recovery path: after a serialized bulk receipt failure, the dialog should return operators to serial review instead of immediately retrying the same failed payload.

Status: Closed after Issue 1.

## Business Value

Serialized receiving failures often require correction, not another blind submit. If a battery serial already exists or a server-side serial preflight rejects a failed PO, the operator needs a path back to the entered serials so they can fix the payload and retry deliberately.

## Workflow Spine

Bulk receive dialog
-> serial entry
-> review
-> processing
-> failed serialized PO result
-> serial review for failed POs
-> corrected review/retry.

## Architecture Constraints

- Keep this sprint to the bulk receiving presenter recovery contract.
- Preserve the container, hook, server mutation, schema/database, tenant predicates, inventory writes, finance behavior, and query/cache invalidation.
- Preserve immediate retry for non-serialized failed POs.
- Preserve entered serial state when returning failed serialized POs to review.

## Issue Ledger

### 1. Serialized Bulk Receive Failures Could Only Retry The Same Payload

Problem:

- Bulk receiving showed `Retry Failed` after processing failures.
- For serialized failures, immediate retry resubmits the same serial payload.
- Operators could see the exact failed PO/reason but had no in-dialog path back to the failed serial entry step.

Workflow protected:

processing failure -> failed row evidence -> failed serialized PO review -> corrected serial submit.

Implemented slice:

- Added `handleReviewFailed` to select failed POs and return to serial review when failed POs include serialized items.
- Preserved entered serial numbers when returning to serial review.
- Kept immediate retry for failed non-serialized POs.
- Added dialog coverage for a serialized failure returning to serial review without calling `onConfirm` again.

Out of scope:

- Server mutation behavior.
- Hook cache invalidation behavior.
- Redesigning the processing result view.
- Browser QA of the dialog footer state.

Closeout:

- Touched domains: procurement bulk receiving dialog, procurement dialog unit tests, inventory sprint evidence.
- Workflow protected: serial entry -> review -> processing failure -> failed serialized PO review -> corrected retry.
- Business value protected: operators can correct failed serialized battery receipt inputs in place instead of blindly resubmitting a known-bad payload.
- Architecture standards checked: presenter owns wizard recovery state; container/hook/server/schema/database/query/cache boundaries unchanged; server remains authoritative.
- Tenant isolation and data integrity checked: no database predicates, writes, transactions, finance behavior, or serialized inventory server writes changed; the client recovery path now better supports server-side lineage failures.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: serialized failed-row recovery only offered immediate retry with the same payload.
- Smells deferred: browser QA of footer button layout; richer per-failure classification; broader receiving-domain folder consolidation.
- Gates run: focused bulk receiving and supplier serial tests (`3` files, `8` tests); focused ESLint; full lint; reliability guards; procurement + purchase-order + supplier + inventory unit suites (`108` files, `340` tests); TypeScript.
- Gates skipped: browser QA, because the change is a presenter transition contract covered by dialog tests and no layout restructuring was introduced.
- Goal adaptations: declined. The standing maintainer goal already covers honest UI states, operator-safe recovery, serialized lineage continuity, meaningful tests, and evidence-based closeout.
- Residual risk: failed serialized recovery is still inferred from failed PO metadata, not typed server error classifications; richer failure codes would allow more precise recovery actions.
