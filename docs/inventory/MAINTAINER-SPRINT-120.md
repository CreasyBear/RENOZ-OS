# Inventory Maintainer Sprint 120: Alert Active Product Scope

## Status

Closed in commit-ready state.

## Issue 1: Alert Rules and Computed Alerts Could Use Soft-Deleted Products

### Problem

Inventory alert product validation, detail enrichment, fallback low-stock computation, and per-rule trigger checks scoped product reads to the organization but did not require active products. Archived product metadata could still be attached to alert rules and computed alerts.

### Workflow Spine

Inventory alerts
-> alert hooks/cache contract
-> `createAlert`, `updateAlert`, `getAlert`, `getTriggeredAlerts`, `checkAndTriggerAlerts`
-> active tenant-scoped alert product validation/enrichment
-> tenant-scoped inventory and warehouse locations
-> alert rules, fallback alerts, and triggered alert payloads.

### Touched Domains

- Inventory alert server function.
- Inventory alert tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Alerts direct warehouse action. Operators should not create, edit, or receive current low-stock/out-of-stock/expiry/slow-moving alerts that are labeled by archived product metadata.

### Scope Constraints

- Do not change alert thresholds, severity calculations, fallback alert IDs, acknowledgement behavior, analytics, notification behavior, hooks, query keys, or cache policy.
- Do not change inventory writes, movement writes, valuation, finance, or serialized lineage behavior.
- Preserve existing alert response shapes and existing not-found behavior for inaccessible products.

### Changes

- Added `alertProductWhereCondition` for active tenant-scoped product validation/enrichment.
- Added `alertInventoryProductJoinCondition` for active tenant-scoped inventory-to-product alert computations.
- Reused active product validation in alert detail, create, update, and triggered-alert product enrichment.
- Reused active product joins in fallback low-stock groups, affected item samples, low-stock checks, out-of-stock checks, overstock checks, and expiry checks.
- Added active product filtering to the slow-moving raw SQL branch.
- Updated the existing alert tenant-scope contract to guard active product validation and computed alert joins.

### Standards Checked

- Domain ownership: alert product scope policy is local to the alert server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server validation and computed read scopes hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: alert rows and inventory rows remain organization-scoped; product labels now require active same-tenant products.
- Query/cache contract: unchanged; no mutation invalidation behavior changed.
- UI states/error handling: response shape is stable; archived products use the existing not-found path for alert rule changes.
- Reviewability: two helpers, focused validation/enrichment replacements, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc alert product validation predicates.
- Repeated ad hoc alert inventory product joins.
- Soft-deleted products could be selected for alert rules.
- Soft-deleted products could label fallback or triggered inventory alerts.

### Deferred

- Existing alert rules already pointing at archived products remain a data remediation/UX-policy slice.
- Alert analytics active-product filtering remains separate because it summarizes alert rules, not product descriptors.
- Browser QA was not selected because this is a server validation/descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/alert-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Moderate. Existing alert rules may still reference archived product IDs in stored alert rows, but future validation/enrichment and computed alert payloads no longer treat those product records as active descriptors. A later remediation slice should decide whether to deactivate or label those existing rules.
