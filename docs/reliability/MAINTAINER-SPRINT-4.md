# Reliability Maintainer Sprint 4: Persisted Queue Logging

## Status

Closed in commit-ready state.

## Issue 1: Offline Queue Sync Used Raw Console Error Logging

### Problem

`usePersistedState` already used the centralized logger for localStorage read and write failures, but `useOfflineQueue` still logged failed item syncs with `console.error('Failed to sync item:', error)`. That bypassed log-level control and exposed raw error objects from caller-provided sync functions.

### Workflow Spine

Offline queue consumer
-> `useOfflineQueue`
-> caller-provided `syncFn`
-> per-item sync failure
-> bounded structured warning
-> failed item remains queued.

### Touched Domains

- Shared persisted-state/offline-queue hook.
- Shared logging contract test.
- Reliability maintainer closeout docs.

### Business Value Protected

Offline queue persistence protects operator work that needs to survive refreshes or reconnects. Failed syncs should keep items queued and produce reviewable diagnostics without bypassing centralized logging or dumping raw caller errors to the console.

### Scope Constraints

- Do not change queue persistence, add/remove/clear behavior, sync retry behavior, return shape, or localStorage read/write handling.
- Do not change the shared logger implementation.
- Keep this slice limited to sync-failure logging.

### Changes

- Replaced raw `console.error` in `useOfflineQueue` with `logger.warn`.
- Logged bounded context: queue key, optional item ID, and stringified error.
- Added a focused source contract preventing raw console logging from returning in the persisted-state hook.

### Standards Checked

- Domain ownership: shared offline queue logging remains inside the shared persisted-state hook.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: not applicable; this is a shared client persistence helper.
- Tenant isolation/data integrity: unchanged; no server/database behavior changed.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: improved; failed items still remain queued while diagnostics go through the central logger.
- Query/cache contract: not touched.
- Reviewability: one logging replacement, one focused contract, one closeout note.

### Smells Removed

- Raw `console.error` in shared offline queue sync.
- Unbounded raw sync error object logging from caller-provided queue sync functions.

### Deferred

- Broader logger policy still allows some infrastructure paths to log stack-bearing errors; this slice only removes the user-facing hook console call.
- Offline queue UI recovery copy remains domain-specific and is not changed here.
- Browser QA remains deferred because this changes logging only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/shared/persisted-state-logging-contract.test.ts tests/unit/shared/shared-hook-feedback-contract.test.ts tests/unit/shared/useMutation.test.tsx`.
- Passed: `./node_modules/.bin/eslint src/hooks/_shared/use-persisted-state.ts tests/unit/shared/persisted-state-logging-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the standing maintainer goal by replacing raw shared diagnostics with bounded structured logging.

### Residual Risk

Low. Queue behavior is unchanged; only sync-failure diagnostics are routed through the logger.
