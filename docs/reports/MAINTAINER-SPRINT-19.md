# Reports Maintainer Sprint 19

## Status

Closed after Issue 1.

## Issue 1: Target Settings Progress Read-State Honesty

### Problem

The KPI targets settings route ignored `useTargetProgress().error`. If target progress failed to load, the shared `TargetProgressWidget` could receive no progress and no error, rendering the empty "No active targets" state. The adjacent overview card also fell back to `0` achieved.

### Workflow Spine

`/settings/targets`
-> `TargetsSettingsPage`
-> `useTargetProgress`
-> `getTargetProgress`
-> target progress schema / org-scoped active targets
-> target progress widget and overview card
-> unavailable/retry state or real progress.

### Touched Domains

- Reports target progress read contract.
- Settings targets route.
- Dashboard target progress presenter integration.

### Business Value Protected

KPI targets are management signals. Operators should not mistake a failed target progress read for no active targets or zero achieved targets.

### Scope Constraints

- Do not change target CRUD, target schema, server functions, query keys, cache invalidation, or dashboard widget internals.
- Do not change the targets table read state.
- Do not broaden into target mutation toast formatting.

### Changes

- Destructured target progress `error` and `refetch` in the settings route.
- Passed the normalized progress error and retry handler into `TargetProgressWidget`.
- Treated the achieved quick-stat value as unavailable when progress failed cold.
- Added a source contract protecting this route-level read-state wiring.

### Standards Checked

- Domain ownership: reports owns the target progress read hook; the settings route owns whether the management surface renders progress as unavailable or empty.
- Route/page -> hook -> server/schema -> query key/cache policy: route, hook, server function, schema, and centralized progress query key are unchanged.
- Query/cache policy: unchanged; `useTargetProgress` still uses `queryKeys.reports.targets.progress(filters)` and existing mutation invalidations.
- Tenant isolation: unchanged; no server query or organization scope changed.
- Inventory/finance integrity: no inventory, warehouse, finance, stock, valuation, warranty, or RMA write path changed.
- UI state: progress read failure now reaches the widget error state and the overview card shows unavailable rather than zero achieved.
- Error handling: the route uses the normalized hook error and existing retry affordance.
- Diff reviewability: one route wiring change, one source contract, one sprint note.

### Gates Run

- Focused target settings progress and widget contracts: `./node_modules/.bin/vitest run tests/unit/reports/target-settings-progress-read-state-contract.test.ts tests/unit/dashboard/target-progress-widget.test.tsx` passed, 2 files / 2 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 18 files / 45 tests.
- Dashboard unit suite: `./node_modules/.bin/vitest run tests/unit/dashboard` passed, 7 files / 26 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for progress error wiring, retry wiring, unavailable quick-stat state, and normalized target progress read fallback passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is a source-covered read-state wiring slice with no layout redesign.
- Additional reliability, finance, document, release, and deploy gates were not selected because this slice does not touch those contracts.

### Smells Removed

- Target progress read failures in settings no longer render as the empty "No active targets" widget state.
- The settings overview card no longer reports `0` achieved when target progress failed cold.
- The existing retry path on `TargetProgressWidget` is now wired from settings.

### Deferred

- The targets table read state still only distinguishes loading and empty list, and remains outside this progress widget slice.
- Target create/update/delete/bulk-delete mutation toasts still use generic copy and remain a follow-up.
- Browser-level visual confirmation of the progress error state remains deferred.

### Goal Adaptation

- Declined. The standing maintainer process already covers honest UI states, route-to-hook wiring, source contracts, query/cache checks, and evidence-based closeout.

### Residual Risk

- If a background refetch fails while cached progress exists, settings continues showing cached progress through the widget, matching the existing widget behavior.
- Operators now see an unavailable quick stat instead of a numeric fallback when progress fails cold.
