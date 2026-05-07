# Inventory Maintainer Sprint 112: Serial Availability Location Scope

## Status

Closed in commit-ready state.

## Issue 1: Serial Availability Location Joins Were ID-Only

### Problem

`getAvailableSerials` returned location names for serial picker rows, but both canonical serialized-lineage and legacy inventory fallback reads joined `warehouse_locations` by location ID only. Serial selectors are operator decision surfaces during picking/allocation, so location labels must stay inside the authenticated organization boundary.

### Workflow Spine

Order picking serial selector
-> `getAvailableSerials`
-> canonical `serialized_items` or legacy `inventory`
-> active inventory row
-> tenant-scoped `warehouse_locations`
-> available serial options.

### Touched Domains

- Inventory serial availability server function.
- Inventory serial availability location-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Pickers need serial options that show the correct warehouse location. Mis-scoped location labels can cause wrong-bin picks, support churn, fulfillment delays, and inaccurate operational trust in serialized inventory.

### Scope Constraints

- Do not change serial availability filters, ordering, limits, response shape, or fallback behavior.
- Do not change order allocation, shipment finalization, RMA handling, serialized lineage writes, inventory movement writes, valuation, or finance.
- Keep this as a read-scope hardening slice for location labels only.

### Changes

- Added `serialLocationJoinCondition` for tenant-scoped inventory-to-location joins.
- Reused the helper in the canonical serialized-lineage availability read.
- Reused the helper in the legacy inventory fallback availability read.
- Added a focused source contract preventing ID-only location joins from returning to this selector.

### Standards Checked

- Domain ownership: serial picker location enrichment stays inside the serial availability server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read relation scope hardened; consumer contract unchanged.
- Tenant isolation/data integrity: serial rows and location labels are constrained to the authenticated organization.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable, but location labels now require tenant-scoped warehouse metadata.
- Reviewability: one helper, two join replacements, one focused contract, one closeout note.

### Smells Removed

- ID-only location join in the canonical serialized availability read.
- ID-only location join in the legacy serial availability fallback read.

### Deferred

- Broader serial availability decomposition remains separate.
- The canonical-to-legacy fallback behavior remains unchanged.
- Browser QA was not selected because this is a server read-scope hardening slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/serial-availability-location-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint changes serial selector read scoping, not serialized lineage mutation or continuity.

### Residual Risk

Low. Serial rows whose current inventory location is missing or outside the active organization will still return with a null location label because the join is left-joined; that is preferable to displaying another tenant's warehouse metadata.
