# Inventory Maintainer Sprint 135: Product Allocation Wrapper Tenant Scope

## Status

Closed in commit-ready state.

## Issue 1: Legacy Product Allocation Wrappers Updated Inventory by ID Alone

### Problem

The canonical inventory allocation server already scopes final inventory writes by organization. The legacy product-domain `allocateStock` and `deallocateStock` wrappers still did direct inventory updates using only `inventory.id`.

Those wrappers are not current UI paths, but they remain exported from the product inventory module. Exported stale mutation paths should not carry weaker tenant-scope contracts than the canonical workflow.

### Workflow Spine

Product inventory allocation wrapper
-> tenant-scoped inventory lookup
-> allocation/deallocation validation
-> tenant-scoped final inventory update
-> movement write.

### Touched Domains

- Product inventory server wrapper.
- Product inventory tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Even legacy exported stock wrappers must respect tenant boundaries. Hardening these writes reduces future integration risk and keeps product-domain stock helpers from becoming a bypass around canonical inventory allocation standards.

### Scope Constraints

- Do not refactor wrappers into canonical `allocateInventory`/`deallocateInventory` because their input shape is product/location based and no active call sites were found in current UI/hook paths.
- Do not change allocation quantity semantics, movement shape, validation messages, cache policy, hooks, or UI.
- Do not add serialized lineage behavior to the wrappers in this slice.

### Changes

- Added organization scope to the final `inventory` update inside `allocateStock`.
- Added organization scope to the final `inventory` update inside `deallocateStock`.
- Added a focused product allocation wrapper tenant-scope contract test.

### Standards Checked

- Domain ownership: legacy product-domain wrappers stay in product inventory until a separate consolidation slice removes or delegates them.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server write boundary hardened; route, hook, schema, and cache behavior unchanged.
- Tenant isolation/data integrity: final writes now include both inventory id and organization id.
- Transactional inventory/finance integrity: no finance or cost-layer behavior changed; wrapper remains a simple allocation quantity path.
- Serialized lineage continuity: unchanged and deferred because this wrapper is not the canonical serialized allocation path.
- UI states/error handling: unchanged.
- Query/cache contract: unchanged.
- Reviewability: two predicate changes, one focused contract, one closeout note.

### Smells Removed

- Exported legacy stock wrappers had weaker tenant-scope writes than canonical allocation functions.
- Product-domain allocation/deallocation writes relied on prior lookup scope instead of enforcing scope at write time.

### Deferred

- Consolidating or deleting the legacy wrappers remains a separate architecture slice.
- Adding serialized lineage, activity logging, or cache hooks to these wrappers is deferred because active UI/hook call sites were not found.
- Browser QA was not selected because this is a server predicate slice with no intended UI change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/products/product-allocation-wrapper-tenant-scope-contract.test.ts tests/unit/products/product-location-inventory-tenant-scope-contract.test.ts tests/unit/products/product-movement-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched product inventory server function and allocation wrapper contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint documents serialized lineage as deferred because the wrappers are not canonical serialized allocation paths.

### Residual Risk

Low to moderate. The wrappers still duplicate some allocation behavior and should eventually be delegated or removed.
