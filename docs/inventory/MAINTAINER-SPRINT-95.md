# Inventory Maintainer Sprint 95

This sprint follows Sprint 94's serialized failed-row recovery. The target is the classification contract behind that recovery: bulk receiving should choose serial review from typed failure evidence, not from inferred PO metadata.

Status: Closed after Issue 1.

## Business Value

When a bulk receipt fails, operators need the next action to match the actual failure. Serialized battery failures should route back to serial review, but generic PO or warehouse failures should not pretend serial edits will help. Typed failure rows make that recovery contract explicit and less surprising.

## Workflow Spine

Bulk receive mutation
-> serialized validation or receipt failure
-> typed bulk failure row
-> hook result
-> bulk receiving dialog processing state
-> serial review only for `invalid_serial_state`.

## Architecture Constraints

- Keep this sprint to bulk receive failure classification and the presenter recovery decision.
- Preserve the bulk mutation response shape except for adding an optional row-level `code`.
- Preserve server tenant predicates, receipt transaction behavior, inventory writes, finance behavior, query/cache invalidation, and dialog wizard payload shape.
- Avoid parsing error strings in the UI.

## Issue Ledger

### 1. Serialized Recovery Was Inferred From Failed PO Metadata

Problem:

- Sprint 94 returned failed serialized POs to serial review.
- The dialog decided that from whether the failed PO had serialized items, not from the actual failure kind.
- A serialized PO can fail for non-serial reasons, where sending the operator to serial review is misleading.
- The server already had serialized mutation codes but bulk receive row failures flattened them to message-only rows.

Workflow protected:

server failure -> typed row evidence -> correct operator recovery action.

Implemented slice:

- Added `bulk-receive-failure.ts` to preserve serialized mutation codes from `ValidationError` rows.
- Changed bulk receive serialized validation failures to use `createSerializedMutationError(..., 'invalid_serial_state')`.
- Added `code: 'invalid_serial_state'` to bulk duplicate-serial preflight failures.
- Extended bulk receive hook/container/dialog result types with optional row-level `code`.
- Changed the dialog recovery decision to show `Review Failed Serials` only when a failed row has `code === 'invalid_serial_state'`.
- Added focused coverage for code preservation and updated dialog/preflight tests to assert typed serial failures.

Out of scope:

- Changing `errorsById` from message-only to typed row objects.
- Adding row-level codes to unrelated bulk mutations.
- Browser QA of the dialog footer.
- Full server integration test of `bulkReceiveGoods`.

Closeout:

- Touched domains: supplier bulk receive server mutation, supplier failure/preflight helpers, supplier hook type, procurement bulk receiving dialog/container, supplier and procurement unit tests, inventory sprint evidence.
- Workflow protected: bulk receive server validation -> typed failure row -> hook/container result -> processing footer recovery action.
- Business value protected: operators only get sent back to serial review when the failed row is actually a serialized inventory state failure.
- Architecture standards checked: row-level classification stays in the server boundary; hook/container pass the contract through; presenter owns recovery state; no route, schema, database, query key, cache, transaction, inventory finance, or mutation payload-shape changes beyond optional row code.
- Tenant isolation and data integrity checked: no database predicates or writes changed; serialized mutation error codes now survive bulk wrapping, supporting safer operator recovery without weakening server authority.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: UI recovery inferred serial-review eligibility from PO metadata; bulk receive flattened serialized mutation codes into message-only rows.
- Smells deferred: `errorsById` remains message-only; full server integration coverage remains deferred because existing server functions are not directly unit-harnessed; browser QA remains deferred.
- Gates run: focused failure/preflight/hook/dialog tests (`4` files, `10` tests); focused ESLint; full lint; reliability guards; procurement + purchase-order + supplier + inventory unit suites (`109` files, `342` tests); TypeScript.
- Gates skipped: browser QA, because the changed behavior is a typed result/recovery contract covered by unit tests and no layout restructuring was introduced.
- Goal adaptations: declined. The standing maintainer goal already covers operator-safe recovery, serialized lineage continuity, safe mutation contracts, meaningful tests, and evidence-based closeout.
- Residual risk: `errorsById` still cannot carry typed failure metadata; future bulk mutation contracts should decide whether message maps remain sufficient or whether row objects should become the canonical error surface.
