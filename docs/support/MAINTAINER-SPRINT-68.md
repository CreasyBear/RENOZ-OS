# Support Maintainer Sprint 68

## Status

Closed in commit-ready state.

## Issue 1: RMA Execution Boundary

### Problem

`orders/rma.ts` carried receive and process execution logic directly inside public ServerFn handlers. `bulkReceiveRma` also called public `receiveRma` inside its loop, creating nested ServerFn dispatch, duplicate auth shape, and a harder-to-review transaction boundary. `processRma` returned a plain `RmaResponse` while neighboring workflow mutations returned serialized mutation envelopes.

### Workflow Spine

RMA receive/process
-> support RMA hooks
-> public ServerFn facade in `orders/rma.ts`
-> internal RMA executor in `_shared/rma-execution.ts`
-> RMA status/execution state
-> inventory movement, cost layer, serialized lineage, finance/remedy artifacts
-> centralized query-key invalidation through existing hooks.

### Touched Domains

- Support RMA workflow ServerFn boundary.
- Orders-owned RMA orchestration module shape.
- Inventory restoration and serialized lineage execution path.
- Finance/remedy artifact execution path for refund, credit, and replacement remedies.
- RMA code traces and source-string workflow contracts.

### Business Value Protected

RMA receive and process are recovery workflows: they put returned battery stock back into a truthful warehouse state and close customer remedies through refunds, credits, replacements, repairs, or no-action outcomes. The boundary change makes that operational recovery path easier to audit before future behavior work touches inventory value, serial identity, or finance artifacts.

### Scope Constraints

- Do not change route, UI, hook call sites, schemas, database tables, or query-key families.
- Do not change receive/process business behavior except removing nested public ServerFn dispatch and normalizing the process mutation envelope.
- Keep public ServerFn exports stable.
- Keep each bulk receive item in its own transaction for partial failure safety.
- Do not widen into pipeline, customers, purchase orders, warranty claims, or other large-file smell targets.

### Changes

- Added `src/server/functions/orders/_shared/rma-execution.ts` with `executeReceiveRma` and `executeProcessRma`.
- Refactored `receiveRma` to authenticate, call `executeReceiveRma`, and wrap the result in `serializedMutationSuccess`.
- Refactored `bulkReceiveRma` to authenticate once and call `executeReceiveRma` directly per RMA instead of calling public `receiveRma`.
- Refactored `processRma` to authenticate, call `executeProcessRma`, and return `SerializedMutationEnvelope<RmaProcessResult>`.
- Moved RMA remedy blocked-state persistence and receive inventory restoration behind the internal execution boundary.
- Updated RMA receive/process traces to describe executor ownership, targeted cache identity, and the process serialized envelope.
- Retargeted source-string contract tests from the public ServerFn monolith to the internal executor where execution logic now lives.

### Standards Checked

- Domain ownership: public ServerFns now own transport/auth/envelope concerns; `_shared/rma-execution.ts` owns receive/process execution.
- Route -> container/page -> hook -> server flow: no route, component, hook, or schema call path changed.
- Query/cache policy: existing `useReceiveRma`, `useBulkReceiveRma`, and `useProcessRma` invalidation behavior is preserved; process envelope remains field-compatible with `RmaResponse`.
- Tenant isolation/data integrity: executor preserves organization predicates and `set_config('app.organization_id', ...)` inside transaction boundaries.
- Inventory/finance integrity: receive still updates RMA status, inventory, movements, cost layers, valuation recompute, serialized lineage, and activities in one transaction; process still executes remedy artifacts inside its transaction and records blocked state on failure.
- Serialized lineage: serialized receive path still normalizes serials, enforces single-unit quantity bounds, upserts serialized item state, and records `rma_received` events.
- Operator-safe errors: bulk receive and remedy blocked messages stay behind formatter helpers.
- Reviewability: `orders/rma.ts` dropped from 1,888 lines to 1,252 lines; execution complexity is isolated in a named internal module.

### Smells Removed

- Nested `bulkReceiveRma -> receiveRma` public ServerFn call.
- Mixed transport/auth/envelope concerns with receive/process transaction internals.
- Inconsistent `processRma` mutation envelope compared with create/receive RMA.
- Stale code traces claiming process returned a plain `RmaResponse` and bulk receive called public `receiveRma`.

### Deferred

- `executeReceiveRma` is still dense at 696 lines because receive genuinely spans RMA state, inventory, movement, valuation, serialized lineage, and activities. Future behavior changes should add DB-backed integration tests before splitting further.
- Fixed `AUD` currency in RMA receipt layers remains deferred as a finance/inventory policy slice.
- DB-backed receive/process integration tests per resolution and serialized/non-serialized branch remain deferred.
- Other large-file smells called out by Plan Eng Review remain separate domain sprints.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/rma-receive-location-contract.test.ts tests/unit/support/rma-workflow-trace-contract.test.ts tests/unit/support/rma-server-result-feedback-contract.test.ts tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/rma-remedy-execution-transaction.test.ts tests/unit/support/rma-remedy-execution-evidence.test.ts tests/unit/orders/order-rma-serialization.test.ts` - 7 files, 40 tests.
- Passed: `npm run test:unit` - 765 files, 2,536 tests, 124.89s.
- Passed: `./node_modules/.bin/eslint src/server/functions/orders/rma.ts src/server/functions/orders/_shared/rma-execution.ts tests/unit/support/rma-receive-location-contract.test.ts tests/unit/support/rma-workflow-trace-contract.test.ts tests/unit/support/rma-server-result-feedback-contract.test.ts tests/unit/orders/order-rma-serialization.test.ts --report-unused-disable-directives`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `git diff --check`.
- Note: direct `./node_modules/.bin/tsc --noEmit --pretty false` without the repo's heap setting hit Node heap limits; the official `npm run typecheck` gate passed with `NODE_OPTIONS=--max-old-space-size=12000`.
- Skipped: browser QA, build, finance sync, deploy, release, and document gates because this slice changed backend RMA execution boundaries and source/docs contracts, not UI rendering, deployment, external accounting sync, or document generation.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-sliced smell drawdown, strict modularity, transactional inventory/finance integrity, serialized lineage continuity, safe mutation/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Moderate. The ServerFn monolith is materially smaller and the boundary is clearer, but the new executor still carries a dense receive transaction because the workflow crosses several real business artifacts. The next risky RMA behavior change should add database-backed integration coverage rather than relying only on source contracts and unit tests.
