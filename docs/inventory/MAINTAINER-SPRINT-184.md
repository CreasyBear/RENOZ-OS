# Inventory Maintainer Sprint 184: Manual Receive Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Manual Receive Mutation Logic Lived Inside the Broad Inventory Hook Module

### Problem

`useReceiveInventory` owned a distinct manual stock-in workflow: schema-owned
input, receive server call, scope-aware optimistic patches, rollback, operator
toast feedback, serialized/manual receive cache invalidation, and stock-in trace
documentation. That workflow still lived inside the broad `use-inventory.ts`
module alongside list/detail/movement/dashboard/adjust/transfer hooks.

The behavior was covered, but the ownership boundary was muddy. Manual receive
is central to RENOZ warehouse truth and should be easy to inspect without
reading the whole inventory hook module.

### Workflow Spine

Manual receive route/mobile receive route
-> `useReceiveInventory`
-> `receiveInventory` server function
-> receiving schema/database transaction
-> inventory movement/cost-layer/serialized-lineage writes
-> `invalidateInventoryStockMutationQueries`
-> inventory/product stock query-key families.

### Touched Domains

- Inventory/Warehouse manual receive hook boundary.
- Inventory stock-in trace documentation.
- Inventory receive schema/cache/source contracts.
- Shared activity timeline date grouping, as a full-suite reliability
  remediation exposed during broad verification.

### Business Value Protected

Manual receive is the operator path for adding battery stock outside supplier PO
receiving. Keeping its mutation/cache/rollback contract isolated makes the
warehouse stock-in path easier to reason about, audit, and safely change.

The shared activity timeline fix protects operational history grouping for
operators working near UTC/local-day boundaries.

### Scope Constraints

- No server function, receiving schema, database transaction, tenant predicate,
  cost-layer write, serialized-lineage write, or cache invalidation behavior was
  intentionally changed for manual receive.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export
  for direct imports.
- Do not refactor adjust, transfer, dashboard, movement, or availability hooks.
- Treat the activity timeline change as a narrow broad-gate remediation, not a
  redesign of activity history.

### Changes

- Added `src/hooks/inventory/use-receive-inventory.ts`.
- Moved receive-specific scope matching, optimistic patching, rollback, toast
  feedback, and stock mutation invalidation into the dedicated hook file.
- Left `use-inventory.ts` as a compatibility re-export for
  `useReceiveInventory`.
- Exported `useReceiveInventory` directly from the inventory hook barrel.
- Updated the stock-in trace to point at the dedicated receive hook.
- Updated receive schema/source contracts and hook tests to assert the new
  boundary.
- Fixed `UnifiedActivityTimeline` date grouping to use local date keys instead
  of UTC `toISOString()` splits before applying `Today`/`Yesterday` labels.

### Standards Checked

- Domain ownership: manual receive orchestration now has a dedicated
  inventory-owned hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: unchanged behavior, clearer hook boundary.
- Tenant isolation/data integrity: unchanged; no server reads/writes or
  predicates changed.
- Transactional inventory/finance integrity: unchanged; the existing
  transaction-backed receive path remains canonical.
- Serialized lineage continuity: unchanged; serialized receive invalidation and
  stock-in trace contracts remain covered.
- Query/cache contract: unchanged behavior, clearer ownership around
  `invalidateInventoryStockMutationQueries`.
- Honest UI states/operator-safe errors: receive failure toasts still use the
  inventory mutation formatter; activity timeline date headers now reflect local
  operator calendar days.
- Reviewability: one hook extraction, compatibility exports, source-contract
  updates, trace update, and one narrow shared date grouping fix.

### Smells Removed

- Removed manual receive mutation orchestration from the broad `use-inventory.ts`
  module.
- Removed receive-specific serial/lot scope helpers from the broad inventory
  hook file.
- Reduced `use-inventory.ts` from 571 lines to 449 lines.
- Removed UTC/local-day fragility in grouped activity timeline labels.

### Smells Deferred

- `use-inventory.ts` still owns several unrelated hook families and remains a
  future extraction candidate.
- `UnifiedActivityTimeline` remains a large shared component and should be
  split by presenter/filter/grouping responsibilities in a separate shared
  activity sprint.
- The build still emits the existing large-chunk warning and `bcrypt` native
  dependency trace note.

### Gates

- Focused manual receive and stock-in contracts:
  `npm run test:vitest -- tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts tests/unit/inventory/receive-stock-wrapper-schema-ownership.test.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
  - Passed, 5 files / 23 tests.
- Initial full unit suite:
  `npm run test:unit`
  - Failed 2 tests:
    - `receive-inventory-schema-ownership` still expected
      `ReceiveInventoryInput` in `use-inventory.ts`.
    - `UnifiedActivityTimeline` grouped a local "today" activity under
      `Yesterday` because date grouping used UTC ISO date splits.
  - Remediation: updated the inventory source contract to the dedicated receive
    hook and changed activity date grouping to local date keys.
- Failed-test rerun:
  `npm run test:vitest -- tests/unit/inventory/receive-inventory-schema-ownership.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/stock-in-workflow-trace.test.ts tests/unit/activities/unified-activity-timeline.test.tsx`
  - Passed, 4 files / 21 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-receive-inventory.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts src/components/shared/activity/unified-activity-timeline.tsx tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receive-inventory-schema-ownership.test.ts tests/unit/activities/unified-activity-timeline.test.tsx --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Reliability lint:
  `npm run lint:reliability`
  - Passed.
- Full source lint:
  `npm run lint`
  - Passed.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Full unit suite after remediation:
  `npm run test:unit`
  - Passed, 744 files / 2441 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint follows the goal by using a small
domain-sliced architecture cleanup around a high-value Inventory/Warehouse
workflow and by remediating a real broad-gate failure instead of ignoring it.

### Residual Risk

Low for manual receive behavior because the focused receive/cache/serialization
contracts, typecheck, lint, full unit suite, and build all passed. Medium-low
for the broader hook architecture because `use-inventory.ts` still contains
multiple workflow families. Low for activity date grouping because the failing
grouped timeline test now passes and the fix uses local date keys consistently
for grouping and labels.
