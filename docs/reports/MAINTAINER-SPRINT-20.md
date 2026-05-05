# Reports Maintainer Sprint 20

## Status

Closed in commit-ready state.

## Issue 1: Target Settings Mutation Failure Feedback

### Problem

The KPI targets settings route used generic `Failed to ... target` toast copy for create, update, delete, and bulk delete failures. That discarded server error codes and safe validation messages even though the reports domain already has a mutation formatter pattern for generated, scheduled, and custom reports.

### Workflow Spine

`/settings/targets`
-> `TargetsSettingsPage`
-> target create/update/delete/bulk-delete handlers
-> `useCreateTarget` / `useUpdateTarget` / `useDeleteTarget` / `useBulkDeleteTargets`
-> target server functions and schemas
-> centralized target query keys and progress invalidation
-> operator-safe mutation feedback.

### Touched Domains

- Reports target mutation feedback.
- Settings targets route.

### Business Value Protected

Targets help RENOZ track business and operations performance. Failed target changes should tell operators whether to retry, refresh, fix validation, or check permissions without leaking database/internal details.

### Scope Constraints

- Do not change target CRUD server functions, schemas, permissions, query keys, cache invalidation, or target progress behavior.
- Do not change target form fields, validation schema, table layout, or progress widget.
- Do not broaden into target read-state or dashboard progress work already closed in Sprints 18 and 19.

### Changes

- Added a reports-domain target mutation formatter with target-specific code messages.
- Exported the formatter from the reports hooks barrel.
- Routed create, update, delete, and bulk-delete catches through the formatter.
- Added source and pure formatter coverage for the target settings mutation feedback contract.

### Standards Checked

- Domain ownership: kept the change inside reports target hooks and the settings targets route.
- Workflow spine: route -> page handlers -> target mutation hooks -> target server contracts -> query keys/cache invalidation -> operator feedback.
- Query/cache contract: preserved target detail, list, and progress invalidation in `use-targets`.
- Tenant isolation: no server function, schema, permission, or database path changed.
- Inventory/finance integrity: not touched.
- Serialized lineage: not touched.
- UI states: failure toasts now distinguish permission/auth/rate-limit/safe validation and avoid leaking internals.
- Error handling: removed discarded mutation errors in target settings handlers.
- Diff shape: focused domain-sliced change.

### Smells Removed

- Generic `Failed to ... target` toasts for create, update, delete, and bulk delete.
- Empty `catch {}` handlers that discarded actionable mutation failure context.
- Missing target-specific formatter alongside generated, scheduled, and custom report formatter patterns.

### Deferred

- Target table read-state UX remains outside this slice.
- Browser visual QA was not selected because no layout or interaction structure changed.
- Broader settings mutation patterns outside reports targets remain a future domain audit.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/reports/target-settings-mutation-feedback-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/reports` - 19 files, 47 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted `rg` scan for target formatter wiring, removed generic toasts, removed `catch {}`, and preserved target cache invalidation.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: document/release/deploy gates because this is not a ship or release slice.

### Goal Adaptation

Accepted: serialized gates are no longer routine sprint closeout evidence. Keep serialized lineage as a domain invariant only when a future slice directly changes serialized identity, inventory lineage, or related business flow continuity.

### Residual Risk

The contract test verifies source wiring and formatter behavior, not a live API rejection path. Residual risk is limited to backend error shapes that do not match the existing reports formatter extraction paths.
