# Inventory Maintainer Sprint 139: Mobile Receiving Cost Basis

## Status

Closed in commit-ready state.

## Issue 1: Mobile Receiving Preferred Sell Price Over Cost Price

### Problem

Mobile receiving prefilled unit cost from `basePrice` before `costPrice`. For receiving, the unit cost feeds inventory valuation, movement cost, and cost-layer creation. Preferring sell price can inflate inventory value and distort finance state.

### Workflow Spine

Mobile receiving scan
-> product quick search result
-> unit-cost prefill
-> queue or receive-now action
-> `receiveInventory`
-> inventory movement, cost layer, valuation, and finance metadata.

### Touched Domains

- Mobile inventory receiving route.
- Inventory receiving policy tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse receiving should value inbound stock at cost, not sell price. Correct defaulting reduces operator correction work and protects margin/valuation reporting.

### Scope Constraints

- Do not change server receiving cost-layer math.
- Do not change desktop receiving, PO receiving, product pricing, quick search, or product schemas.
- Do not prevent operators from manually overriding unit cost.
- Do not repair existing receipts created with a sale-price default.

### Changes

- Mobile receiving now defaults `unitCost` from `costPrice` before falling back to `basePrice`.
- Added focused coverage that scanned mobile receive products use cost price as the unit-cost prefill.

### Standards Checked

- Domain ownership: mobile receiving owns scan-time prefill behavior; receiving server remains authoritative for valuation writes.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: route-side defaulting corrected before calling existing mutation; no server/cache contract changed.
- Tenant isolation/data integrity: no tenant query changes.
- Transactional inventory/finance integrity: default unit cost now aligns with inventory valuation semantics before movement/cost-layer writes.
- Serialized lineage continuity: unchanged.
- UI states/error handling: unchanged.
- Query/cache contract: unchanged.
- Reviewability: one expression change, one focused test, one closeout note.

### Smells Removed

- Mobile receive defaulted inbound valuation from product sell price.
- Mobile receiving cost basis diverged from the business meaning of `unitCost`.

### Deferred

- Existing receipts or queued items with incorrect unit cost are not repaired.
- More explicit landed-cost/mobile cost copy is a separate UX polish slice.
- Browser QA was not selected because this is a route defaulting slice covered by focused tests.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/receiving-location-read-policy.test.tsx`.
- Passed: focused ESLint on touched mobile receiving route and receiving policy test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint does not change serialized mutation behavior.

### Residual Risk

Low to moderate. Existing historical/queued mobile receipts remain outside this slice.
