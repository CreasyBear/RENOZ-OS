# Inventory Maintainer Sprint 140: Mobile Count Persistence Contract

## Status

Closed in commit-ready state.

## Issue 1: Mobile Counting Reported Sync Without Persisting Counts

### Problem

The mobile cycle-count route built a local count session from inventory rows, updated only local React state, and used a placeholder `setTimeout` as its sync path. Operators could see successful count and sync feedback while no stock-count item was written to the auditable stock-count workflow.

### Workflow Spine

Mobile location selection
-> create stock count
-> start stock count
-> stock-count items from server count sheet
-> barcode verification
-> `updateStockCountItem`
-> centralized stock-count query invalidation
-> desktop review/completion applies inventory adjustments.

### Touched Domains

- Mobile inventory counting route.
- Mobile warehouse action error contract.
- Inventory stock-count hook contract.
- Inventory sprint evidence.

### Business Value Protected

Cycle counts are only useful if counted quantities are persisted into the reviewable stock-count record. This protects warehouse truth, inventory accuracy, variance review, and later inventory/finance adjustment integrity.

### Scope Constraints

- Do not auto-complete stock counts or apply inventory adjustments from the mobile route.
- Do not change stock-count server transaction semantics.
- Do not rewrite the desktop stock-count experience.
- Do not add new offline infrastructure; use the existing mobile queue but bind queued items to stock-count IDs.

### Changes

- Mobile counting now creates and starts a real stock count before presenting count items.
- Mobile counting checks that the selected location has inventory before creating the stock-count record, avoiding orphan draft counts for empty locations.
- Mobile count submissions call `useUpdateStockCountItem` when online.
- Offline mobile count entries now carry `countId` and `countItemId`; sync calls the same stock-count item mutation instead of a placeholder delay.
- Starting a mobile count while offline is blocked so the route does not create unauditable count sessions.
- Added a `startCount` mobile warehouse error fallback.
- Added a contract test that rejects placeholder sync and asserts the mobile counting route is bound to stock-count mutations.

### Standards Checked

- Domain ownership: mobile route owns handheld orchestration; stock-count server functions remain the source of audit truth.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: mobile route now preflights through inventory reads, then flows through stock-count hooks and existing centralized query invalidation.
- Tenant isolation/data integrity: tenant checks remain in existing stock-count server functions; this slice does not introduce new server writes.
- Transactional inventory/finance integrity: mobile only records counts; desktop/server completion still owns adjustment and valuation side effects.
- Serialized lineage continuity: unchanged; count completion remains the existing serialized-aware server path.
- UI states/error handling: offline start is blocked, preflight errors clear the pending location, and count completion copy no longer implies inventory adjustment completion.
- Query/cache contract: `useUpdateStockCountItem` invalidates stock-count detail/items keys.
- Reviewability: route-level orchestration change plus one focused contract test.

### Smells Removed

- Placeholder mobile count sync that could report success without backend persistence.
- Mobile count sessions not anchored to a stock-count ID or stock-count item IDs.
- Empty-location mobile count attempts creating draft counts before failing to start.
- Generic submit-count error fallback reused for start-count failures.

### Deferred

- Completing/applying stock counts from mobile remains deferred because applying inventory and finance adjustments from handheld flow needs a separate review/approval UX decision.
- Legacy queued mobile count entries without count bindings remain unsyncable and are retained as failed queue items.
- The desktop stock-count detail product mapping smell observed during triage is deferred; mobile uses the server's top-level product relation directly.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/mobile-warehouse-action-errors.test.ts`.
- Passed: focused ESLint on touched mobile counting route, shared error contract, and test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This is a direct operator-trust and workflow-spine repair under the standing inventory/warehouse sprint process.

### Residual Risk

Moderate. The route now depends on live stock-count creation before counting, so offline-first session creation is intentionally removed in favor of auditable persistence.
