# Reports Maintainer Sprint 23: Target Progress Console Hygiene

## Status

Closed in commit-ready state.

## Issue 1: Target Progress Hook Logged Raw Server Payloads

### Problem

`useTargetProgress` normalized target-progress read failures for operator-facing UI, but still logged the raw server result in development. Target progress can include tenant-scoped sales, procurement, support, and operational KPI data. Even dev-only raw payload logging makes the hook noisier than the reports read boundary should be and weakens the contract that data flows through typed query results and safe UI states.

### Workflow Spine

Settings targets page / dashboard target widget
-> `useTargetProgress`
-> `getTargetProgress`
-> metric aggregator and reports target schemas
-> `queryKeys.reports.targets.progress(filters)`
-> honest progress, unavailable, or retry UI.

### Touched Domains

- Reports target-progress hook.
- Reports target-progress read-state contract test.
- Reports maintainer closeout docs.

### Business Value Protected

Target progress is a management signal for RENOZ Energy. Operators should get useful progress or clear unavailable states without raw server payloads being dumped into the browser console while iterating on the app.

### Scope Constraints

- Do not change target CRUD, progress calculations, schemas, permissions, tenant predicates, query keys, cache invalidation, dashboard layout, settings layout, or metric aggregation behavior.
- Preserve the always-shaped read policy and existing target-progress unavailable UI.

### Changes

- Removed the dev-only `console.debug` raw-result log from `useTargetProgress`.
- Removed stale backup-implementation commentary from the hook.
- Strengthened the target-progress read-state source contract to reject `console.debug` and `raw-result` in the hook.

### Standards Checked

- Domain ownership: target-progress read behavior remains owned by the reports hook and reports server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this sprint tightens the hook boundary without changing behavior.
- Tenant isolation/data integrity: unchanged; no database predicates, writes, or metric calculations changed.
- Query/cache policy: unchanged; `queryKeys.reports.targets.progress(filters)`, stale time, invalidations, and retry/refetch behavior remain intact.
- UI states/error handling: preserved existing unavailable/retry states while removing raw diagnostic output.
- Reviewability: one hook cleanup, one focused source-contract expansion, and this closeout note.

### Smells Removed

- Raw target-progress result logging inside a production hook.
- Stale backup-pattern comment that described implementation history instead of the domain contract.

### Deferred

- Broader reports read-message formatter audit remains a separate slice.
- Browser QA was not selected because this slice has no intended visual or interaction change.

### Gates

- Passed: focused target-progress reports contracts.
- Passed: focused ESLint on touched hook and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted the runtime process update that serialized gates are retired and no longer part of routine closeout evidence.

### Residual Risk

Low. This removes a debug leak and adds a source contract; it does not alter target-progress behavior, persistence, or UI rendering.
