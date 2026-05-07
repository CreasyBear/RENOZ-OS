# Inventory Maintainer Sprint 102: Detail Tab Prefetch Honesty

## Status

Closed in commit-ready state.

## Issue 1: Detail Tabs Advertised a Prefetch Path That Did Nothing

### Problem

`InventoryDetailView` wired hover/focus handlers on secondary tabs to a `prefetchTab` callback. The callback intentionally discarded the tab id and contained a no-op placeholder comment. That made the presenter look as if it had a lazy-loading performance contract when no such contract existed.

### Workflow Spine

Inventory item detail route/container
-> `InventoryDetailView`
-> overview, movements, cost layers, quality, and activity tabs
-> tab selection through `activeTab` / `onTabChange`
-> existing tab content rendering and quality read state handling.

### Touched Domains

- Inventory item detail presenter.
- Inventory quality/detail regression test.
- Inventory sprint evidence.

### Business Value Protected

Inventory item details are a high-frequency warehouse and support surface. The code should not imply hidden performance behavior that future maintainers may trust while diagnosing slow or stale detail tabs.

### Scope Constraints

- Do not change tab labels, counts, active tab state, tab content, lazy-loading architecture, quality read policy, movement/cost-layer/activity rendering, or route state.
- Do not introduce a real lazy-loading system in this sprint.
- Keep this as a presenter honesty cleanup.

### Changes

- Removed the no-op `prefetchTab` callback.
- Removed hover/focus handlers that invoked the no-op callback.
- Removed the now-unused `useCallback` import.
- Added a focused regression guard to keep no-op tab prefetch wiring out of the detail presenter.

### Standards Checked

- Domain ownership: detail-tab presentation remains owned by the inventory detail presenter.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged; this sprint touched only presenter wiring and a source contract test.
- Tenant isolation/data integrity: no server function, permission, organization predicate, database write, stock movement, cost layer, or quality inspection behavior changed.
- Query/cache contract: no query keys, invalidations, stale times, or read normalization behavior changed.
- UI states/error handling: tab behavior remains controlled by `activeTab` and `onTabChange`; quality unavailable/degraded states remain covered.
- Reviewability: two-file diff plus closeout; no migration and no broad refactor.

### Smells Removed

- Placeholder prefetch callback that did no work.
- Hover/focus handlers wired to a no-op.
- Unused React import created solely for placeholder wiring.

### Deferred

- Real tab-level lazy loading and prefetch can be designed later if detail payloads become too heavy.
- Browser QA was not selected because this removes inert handlers and does not intentionally change rendered layout or interaction semantics.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-quality.test.tsx` - 1 file, 6 tests.
- Passed: focused ESLint on the inventory detail presenter and quality regression test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. Serialized gates remain retired and were not relevant to this presenter cleanup.

### Residual Risk

Low. The only behavior change is removal of handlers that previously invoked a no-op. If real prefetch becomes necessary, it should be introduced with an actual data-loading contract instead of placeholder wiring.
