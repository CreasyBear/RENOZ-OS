# Inventory Maintainer Sprint 231: Alert Triggered-Read Boundary

Status: closed and commit-ready.

## Problem

`alerts.ts` was still one of the largest remaining inventory server modules at 1,168 lines. It mixed alert rule CRUD, product/location validation predicates, triggered-alert computation, fallback low-stock read-model generation, scheduled trigger compatibility, acknowledgement behavior, analytics, and recommendation logic.

Inventory alerts are high-leverage for RENOZ Energy because they are the operator's early warning system for battery stock risk. The read model that decides whether stock is low, out, over, expiring, slow-moving, or fallback-computed should be inspectable without making the public server-function file carry every branch.

## Workflow Spine Protected

Triggered inventory alerts
-> `useTriggeredAlerts`
-> `getTriggeredAlerts` server function
-> inventory read permission
-> `getTriggeredInventoryAlerts`
-> tenant-owned active alert rules
-> `checkInventoryAlertTriggered`
-> tenant-owned inventory/product/location joins
-> allocatable low-stock and out-of-stock aggregate policy
-> fallback low-stock read model when no alert rules exist
-> product and location descriptors
-> severity sorting
-> shaped triggered-alert response
-> unchanged query key and cache policy.

Scheduled/compatibility alert trigger
-> `checkAndTriggerAlerts` server function
-> inventory manage permission
-> tenant-owned active alert rules
-> `checkInventoryAlertTriggered`
-> tenant-scoped `lastTriggeredAt` update
-> unchanged compatibility response.

## Touched Domains

- Inventory alert server functions.
- Inventory triggered-alert read model.
- Inventory alert tenant query predicates.
- Inventory alert tenant-scope, permission, and allocatable-stock source contracts.
- Inventory alert hook/query normalization and dashboard alert coverage.
- Sprint evidence.

## Business Value Protected

RENOZ Energy needs alert surfaces that help operators notice stockouts, low stock, expiry risk, and slow-moving stock without lying about unavailable data or cross-tenant product/location descriptors. This slice keeps alert behavior unchanged while making the core triggered-alert read policy easier to audit and evolve.

## Changes

- Added `src/server/functions/inventory/triggered-alerts-read.ts`.
- Added `src/server/functions/inventory/alert-query-conditions.ts`.
- Moved active alert evaluation, fallback low-stock computation, allocatable aggregate use, sample item extraction, severity sorting, and single-alert trigger checks out of `alerts.ts`.
- Kept `getTriggeredAlerts` as the public read-permission server-function facade.
- Kept `checkAndTriggerAlerts` as the public manage-permission compatibility facade while reusing the same alert check helper.
- Reused shared tenant-safe product and location predicates for alert detail and mutation validation.
- Updated source contracts to assert the new ownership boundaries instead of pinning all alert logic to `alerts.ts`.

## Standards Checked

- Domain ownership: triggered-alert read policy now has a named helper.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: unchanged. Alert hooks still call the same public server functions and cache behavior is unchanged.
- Tenant isolation: preserved alert rule organization predicates, product organization and active-product predicates, warehouse location organization predicates, inventory organization predicates, and inventory movement organization predicates.
- Transactional inventory and finance integrity: not applicable; this slice is read-model and alert-rule timestamp compatibility only. No inventory quantity, valuation, finance, or serialized lineage writes changed.
- Serialized lineage continuity: not applicable; alert reads do not mutate serialized lineage.
- Honest UI states and operator-safe errors: preserved unavailable alert states, read-only fallback alert acknowledgement messaging, and safe mutation fallback copy.
- Mutation/cache contracts: unchanged. Alert mutations and reads continue through existing hooks and centralized query keys.
- Tests: source contracts now guard the extracted helper boundary and existing alert hook/dashboard/query tests still pass.

## Smells Removed

- `alerts.ts` no longer owns the full triggered-alert read model inline.
- Reduced `alerts.ts` from 1,168 lines to 573 lines.
- Moved reusable alert product/location predicates into a small shared helper.
- Kept public alert server-function signatures and hook/cache contracts unchanged while isolating the highest-complexity alert read path.

## Smells Deferred

- `triggered-alerts-read.ts` is intentionally still broad at 547 lines. Future sprints can split fallback low-stock generation, per-alert-type evaluation, affected item sampling, and descriptor loading.
- `alerts.ts` still owns alert CRUD, acknowledgement, analytics, and recommendation generation.
- `src/lib/query-keys.ts` remains the largest cross-domain architecture pressure point at 2,444 lines.
- Other inventory pressure points remain: `stock-counts.ts`, `forecasting.ts`, `serialized-items.ts`, and `locations.ts`.
- Live database alert checks remain deferred; this sprint preserves source behavior and contract coverage but does not execute real inventory rows.

## Verification

- `npm run test:vitest -- tests/unit/inventory/alert-tenant-scope-contract.test.ts tests/unit/inventory/alert-permission-contract.test.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx tests/unit/inventory/inventory-dashboard-alerts-section.test.tsx tests/unit/inventory/alert-schema-ownership.test.ts tests/unit/inventory/alert-sorting.test.ts tests/unit/inventory/product-stock-alert-cache-contract.test.ts` passed: 7 files, 29 tests.
- `npm run test:vitest -- tests/unit/inventory/allocatable-aggregate-contract.test.ts tests/unit/inventory/alert-tenant-scope-contract.test.ts tests/unit/inventory/alert-permission-contract.test.ts tests/unit/inventory/query-normalization-wave3-alerts.test.tsx` passed: 4 files, 21 tests.
- `./node_modules/.bin/eslint src/server/functions/inventory/alerts.ts src/server/functions/inventory/triggered-alerts-read.ts src/server/functions/inventory/alert-query-conditions.ts tests/unit/inventory/alert-tenant-scope-contract.test.ts tests/unit/inventory/alert-permission-contract.test.ts --report-unused-disable-directives` passed.
- `./node_modules/.bin/eslint src/server/functions/inventory/alerts.ts src/server/functions/inventory/triggered-alerts-read.ts src/server/functions/inventory/alert-query-conditions.ts tests/unit/inventory/alert-tenant-scope-contract.test.ts tests/unit/inventory/alert-permission-contract.test.ts tests/unit/inventory/allocatable-aggregate-contract.test.ts --report-unused-disable-directives` passed.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test:unit` passed: 765 files, 2,536 tests.

## Skipped

- Production build was skipped because this was a server-side read-model extraction covered by focused contracts, focused lint, typecheck, full source lint, reliability lint, and the full unit suite.
- Browser QA was skipped because no UI rendering or interaction changed.
- Live database alert checks were skipped because no SQL semantics or alert behavior changed beyond extraction.

## Goal Adaptation

The pressure-point list is now the prioritization lens for upcoming sprints: largest shared architecture files, largest server monoliths, remaining inventory modules, large frontend workflow components, then remaining smell markers. This sprint directly reduced one listed inventory pressure point.

## Residual Risk

Low for behavior because the public server functions, permissions, hook contracts, cache contracts, allocatable stock semantics, fallback alert behavior, tenant predicates, severity sort, and operator-safe UI expectations are preserved by focused contracts and the full unit suite. Medium architecture risk remains because the extracted triggered-alert helper is still large and `src/lib/query-keys.ts` remains a cross-domain pressure point.
