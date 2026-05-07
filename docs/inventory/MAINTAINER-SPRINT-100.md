# Inventory Maintainer Sprint 100: Mobile Picking Offline Sync Classifier

## Status

Closed in commit-ready state.

## Issue 1: Route-Level Serialized Sync Error Parsing

### Problem

Sprint 99 moved mobile picking/counting mutation feedback behind `formatMobileWarehouseActionError`, but the mobile picking offline sync path still parsed `err.message` inside the route to detect serialized-pick sync failures. That kept classification logic mixed into the page and made the route harder to audit for raw error handling.

### Workflow Spine

Mobile picking route
-> offline pick queue
-> `syncQueue`
-> `usePickOrderItems`
-> serialized pick failure classification
-> safe desktop recovery error retained in failed queue.

### Touched Domains

- Mobile warehouse picking offline sync.
- Mobile warehouse action error helper.
- Inventory/mobile warehouse feedback contract test.

### Business Value Protected

Warehouse operators may queue picks while offline and sync them later. Serialized battery picks need a clear desktop recovery path when serials cannot be safely synced, while the route should not inspect arbitrary exception text inline.

### Scope Constraints

- Do not change queue persistence, sync counts, failed-item retention, pick payloads, mutation hooks, server functions, query keys, inventory movement behavior, or serialized lineage persistence.
- Preserve the existing serialized-pick desktop recovery message.
- Keep this as route-level classification cleanup, not offline queue redesign.

### Changes

- Added `isSerializedPickSyncFailure` and `SERIALIZED_PICK_SYNC_DESKTOP_MESSAGE` to the mobile warehouse action helper.
- Replaced inline `err.message` parsing in `MobilePickingPage` sync handling with the helper.
- Extended the mobile warehouse feedback contract to cover serialized sync classification and route wiring.

### Standards Checked

- Domain ownership: mobile warehouse sync classification now lives with the route-local mobile warehouse action helper.
- Route -> hook -> server flow: preserved; only the route's local sync error classifier changed.
- Query/cache policy: no query keys, invalidations, stale times, or cache behavior changed.
- Tenant isolation/data integrity: no auth boundary, organization predicate, server mutation, database write, inventory movement, or serialized lineage persistence changed.
- UI states/error handling: the offline failed-count toast remains unchanged; serialized sync recovery still uses the desktop guidance message.
- Reviewability: one helper, one route call site, one focused test update, and this closeout.

### Smells Removed

- Inline `err.message` extraction in the mobile picking route.
- Inline `/serial|Serial/` error-text matching in the route.
- Missing test coverage for serialized offline pick sync classification.

### Deferred

- Offline queue result details are still count-only; richer per-item recovery UI remains a future mobile warehouse UX slice.
- Device/browser QA was not selected because this is source-covered sync classification with no intended visual or interaction change.

### Gates

- Passed: focused mobile warehouse feedback contract, `bun run test:vitest tests/unit/inventory/mobile-warehouse-action-errors.test.ts` - 1 file, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for inline mobile route `err.message` sync parsing and route-level serial regex matching.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. Serialized gates remain retired as routine evidence; this slice protects route cleanliness and operator-safe offline sync classification without changing serialized lineage persistence.

### Residual Risk

Low for route-level raw error handling. Moderate for offline picking UX because failed queued items still surface only aggregate counts.
