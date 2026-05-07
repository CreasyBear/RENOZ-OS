# Inventory Maintainer Sprint 101: Fallback Alert Acknowledgement Honesty

## Status

Closed in commit-ready state.

## Issue 1: Read-Only Fallback Alerts Looked Acknowledgable

### Problem

Inventory fallback alerts are computed from allocatable low-stock conditions when no alert rules exist. They are useful operator signals, but they do not have `inventory_alerts` rows. The UI still exposed acknowledgement actions for those read-only alerts, and the acknowledgement hook showed a success toast even when the server returned `acknowledged: false`.

### Workflow Spine

Inventory dashboard / alerts page
-> `useTriggeredAlerts`
-> computed fallback alert result
-> alert panel / dashboard alert card
-> `useAcknowledgeAlert`
-> `acknowledgeAlert`
-> query key invalidation only when a real alert rule acknowledgement is persisted.

### Touched Domains

- Inventory alert server function.
- Inventory alert hook/cache contract.
- Inventory alerts page mapping.
- Inventory dashboard alert card.
- Inventory alert panel presentation.
- Inventory alert regression tests.

### Business Value Protected

Warehouse operators should not be told that a computed stock condition was acknowledged when nothing was persisted. Read-only fallback alerts now behave honestly: operators can dismiss the dashboard card locally or create an alert rule if they need trackable acknowledgement.

### Scope Constraints

- Do not add a new acknowledgement history table or migration in this sprint.
- Do not change alert threshold calculations, fallback ID generation, triggered alert sorting, inventory quantity semantics, permissions, or tenant predicates.
- Do not change query keys except to preserve existing invalidation for real acknowledgements.
- Keep fallback alerts read-only until an alert rule exists.

### Changes

- Made `acknowledgeAlert` return a clear read-only fallback message without claiming a mutation occurred.
- Reused the same acknowledgement timestamp for the alert rule update and response.
- Changed `useAcknowledgeAlert` to show an info toast and skip cache invalidation when the server returns `acknowledged: false`.
- Hid the Ack action for fallback alerts in `AlertsPanel` and marked them as `Rule required`.
- Passed fallback read-only state into the unified inventory dashboard and made its close button dismiss fallback cards locally without calling the acknowledge mutation.
- Removed route-level logger-only fallback acknowledgement handling; the hook/server contract now owns operator feedback.
- Extracted current-trigger acknowledgement mapping into a small route helper instead of inline timestamp comparison.

### Standards Checked

- Domain ownership: fallback acknowledgement semantics now live in the inventory alert server/hook/presenter path, not ad hoc route logging.
- Route -> page -> hook -> server -> schema/database -> query key/cache policy: preserved and made explicit for real acknowledgements versus computed fallback read models.
- Tenant isolation/data integrity: no organization predicates, permissions, database writes, or stock calculations changed.
- Query/cache contract: triggered alert and analytics invalidation remains for persisted acknowledgements; read-only fallback responses do not pretend cache state changed.
- UI states/error handling: fallback alerts no longer expose an impossible Ack action or success toast.
- Reviewability: small inventory-domain diff with focused tests and no migration.

### Smells Removed

- Success toast for non-persisted fallback acknowledgements.
- Dashboard fallback alert close path calling a mutation that cannot change server state.
- Alerts panel showing Ack for computed read-only alerts.
- Route-level fallback acknowledgement warning that never reached the operator.
- Inline route timestamp comparison for current-trigger acknowledgement state.

### Deferred

- Persisted acknowledgement history remains a future inventory alert workflow if per-trigger audit becomes necessary.
- Alert-rule creation from fallback alerts remains a future UX slice.
- Browser QA was not selected because this sprint changes source-covered alert action semantics with no layout redesign.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-alerts.test.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/alert-tenant-scope-contract.test.ts` - 3 files, 21 tests.
- Passed: focused ESLint on touched inventory alert server/hook/page/components/tests.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted one operating adaptation from the user: serialized gates are retired and are not part of routine sprint closeout. This sprint did not touch serialized lineage.

### Residual Risk

Low for fallback acknowledgement honesty. Moderate for alert operations overall because the current schema still uses alert-rule `updatedAt` as the current-trigger acknowledgement marker instead of a dedicated acknowledgement record.
