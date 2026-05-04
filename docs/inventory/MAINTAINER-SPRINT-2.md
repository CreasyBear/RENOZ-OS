# Maintainer Sprint 2: Inventory Schema Ownership

This sprint continues the maintainer process from `docs/reference/maintainer-sprint-process.md` after Sprint 1 closed the first Inventory/Warehouse ownership pass.

Status: Issues 1, 2, 3, 4, 5, and 6 implemented.

## Business Value

Inventory schema ownership should make the codebase easier to reason about when RENOZ Energy operators depend on accurate stock, movement, valuation, serialized lineage, and warehouse state. Schema contracts should live beside the workflow they protect so future changes do not require touching a generic inventory catch-all.

## Workflow Spine

```text
inventory read/list
  -> movement history and analytics
  -> item detail and quality inspection
  -> warehouse, valuation, support/RMA, and fulfillment visibility
```

## Sprint Rule

Do not implement any issue until the slice has:

1. a business value statement,
2. a workflow invariant,
3. affected files,
4. explicit out-of-scope boundaries,
5. focused tests,
6. closeout criteria.

## Issue Ledger

### 1. Movement Response Schema Ownership

Business value: inventory movement history and analytics contracts should live with movement workflow ownership, not in the generic inventory schema file.

Workflow invariant: movement server reads, receiving history, analytics aggregations, and inventory detail movement mapping must keep importing through the public inventory schema barrel while the source of truth moves to `src/lib/schemas/inventory/movements.ts`.

Affected files:

- `src/lib/schemas/inventory/movements.ts`
- `src/lib/schemas/inventory/inventory.ts`
- `src/lib/schemas/inventory/dashboard.ts`
- `tests/unit/inventory/movement-schema-ownership.test.ts`
- `tests/unit/inventory/dashboard-schema-ownership.test.ts`

Out of scope:

- changing movement values or server behavior
- changing analytics calculations
- extracting core inventory read/list schemas
- changing UI movement presentation

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx
```

Closeout criteria:

- movement response/helper types, including movement trend aggregation helpers and hook-facing adjustment/transfer inputs, are exported from `movements.ts`
- `inventory.ts` no longer owns movement response/helper types
- public `@/lib/schemas/inventory` imports remain compatible
- focused movement tests pass
- lint/typecheck evidence is recorded if code paths require it

### 2. Location Attribute Schema Ownership

Business value: warehouse location attribute contracts should live with location workflow ownership so default, negative-stock, description, and address behavior can change without touching the generic inventory schema file.

Workflow invariant: location create/update server logic, location form/list reads, and receive-location availability must keep importing through the public inventory schema barrel while the source of truth moves to `src/lib/schemas/inventory/locations.ts`.

Affected files:

- `src/lib/schemas/inventory/locations.ts`
- `src/lib/schemas/inventory/inventory.ts`
- `src/lib/schemas/inventory/index.ts`
- `src/server/functions/inventory/locations.ts`
- `tests/unit/inventory/location-schema-ownership.test.ts`

Out of scope:

- changing location attribute values or persistence behavior
- changing location hierarchy or warehouse-location schemas
- changing receive-location read policy
- extracting core inventory read/list schemas

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/location-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx
```

Closeout criteria:

- `locationAttributesSchema` and `LocationAttributes` are exported from `locations.ts`
- `inventory.ts` no longer owns location attribute schema/types
- public `@/lib/schemas/inventory` imports remain compatible
- location-focused tests pass
- lint/typecheck evidence is recorded

### 3. Receiving Input Schema Ownership

Business value: receiving hook-facing input contracts should live with receiving workflow ownership so future stock-in changes do not require touching the generic inventory schema file.

Workflow invariant: manual stock-in hooks, receiving route context, and receive-location policy must keep importing through the public inventory schema barrel while the source of truth moves to `src/lib/schemas/inventory/receiving.ts`.

Affected files:

- `src/lib/schemas/inventory/receiving.ts`
- `src/lib/schemas/inventory/inventory.ts`
- `tests/unit/inventory/manual-receive-serialization-contract.test.ts`

Out of scope:

- changing receiveInventory server behavior
- changing manual receive form validation
- changing receive cache invalidation
- extracting core inventory read/list schemas

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/manual-receive-serialization-contract.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receiving-page-context.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx
```

Closeout criteria:

- `InventoryReceiving` is exported from `receiving.ts`
- `inventory.ts` no longer owns receiving input types
- public `@/lib/schemas/inventory` imports remain compatible
- receiving-focused tests pass
- lint/typecheck evidence is recorded

### 4. Quality Inspection Schema Ownership

Business value: quality inspection contracts should live with quality workflow ownership so operators can trust inspection history and future QA changes do not require editing the generic inventory schema or server-inline validators.

Workflow invariant: quality inspection list/create server functions, quality hooks, inventory detail quality tab, and public inventory schema imports must share the quality schema owner.

Affected files:

- `src/lib/schemas/inventory/quality.ts`
- `src/lib/schemas/inventory/inventory.ts`
- `src/lib/schemas/inventory/index.ts`
- `src/server/functions/inventory/quality.ts`
- `tests/unit/inventory/quality-schema-ownership.test.ts`

Out of scope:

- changing quality inspection persistence behavior
- changing quality detail UI behavior
- changing mutation error copy
- extracting core inventory read/list schemas

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/quality-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-quality.test.tsx
```

Closeout criteria:

- quality list/create schemas are exported from `quality.ts`
- `QualityRecord` is exported from `quality.ts`
- quality server functions import validators from the schema owner instead of declaring inline schemas
- public `@/lib/schemas/inventory` imports remain compatible
- focused quality tests pass
- lint/typecheck evidence is recorded

### 5. Inventory Read Schema Ownership

Business value: inventory browser, quick search, and item detail read contracts should live with the read workflow they protect so operators can trust stock visibility while future list/search/detail changes do not require editing the generic inventory entity schema or server-inline validators.

Workflow invariant: inventory list/search/detail route and hooks, inventory read server functions, public inventory schema imports, and inventory query-key/cache contracts must continue to share one read-owned validation and response contract.

Affected files:

- `src/lib/schemas/inventory/reads.ts`
- `src/lib/schemas/inventory/inventory.ts`
- `src/lib/schemas/inventory/index.ts`
- `src/server/functions/inventory/reads.ts`
- `tests/unit/inventory/read-schema-ownership.test.ts`

Out of scope:

- changing inventory list/search/detail database behavior
- changing inventory browser UI behavior
- changing query-key key shapes or cache invalidation behavior
- changing product/location relation mapping
- changing the physical inventory entity schema

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/read-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory-support/query-normalization-wave6g.test.tsx
```

Closeout criteria:

- inventory list/filter/sort schemas are exported from `reads.ts`
- inventory search/detail input validators are exported from `reads.ts`
- inventory read response and hook-facing types are exported from `reads.ts`
- `inventory.ts` retains base stock-level entity/enums and no longer owns read/list/search/detail contracts
- inventory read server functions import validators from the schema owner instead of declaring inline schemas
- public `@/lib/schemas/inventory` imports remain compatible
- focused read-path tests pass
- lint/typecheck evidence is recorded

### 6. Inventory Query-Key Read Contract

Business value: inventory list/search cache identity should be typed from the same read-owned schema contracts as server validation so operators do not see stale or cross-filter stock visibility when future filters are added.

Workflow invariant: inventory browser filters, inventory hooks, centralized query keys, read server validators, and cache invalidation prefixes must preserve current key shapes while sharing one read contract.

Affected files:

- `src/lib/query-keys.ts`
- `tests/unit/inventory/query-key-read-contract.test.ts`
- `docs/inventory/MAINTAINER-SPRINT-2.md`

Out of scope:

- changing inventory query-key array shapes
- changing invalidation prefixes
- changing inventory list/search server behavior
- changing browser URL search params
- changing serialized inventory query keys

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/query-key-read-contract.test.ts tests/unit/inventory/query-normalization-wave3-browser.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx
```

Closeout criteria:

- inventory list query-key filters are typed from `InventoryListQuery`
- inventory search query-key options are typed from `QuickSearchInventoryInput`
- unsupported stale fields are removed from the inventory query-key filter type
- query-key array shapes remain unchanged
- focused cache/read tests pass
- lint/typecheck evidence is recorded

## Closeout Log

### Issue 1: Movement Response Schema Ownership

Touched domains: inventory schema contracts, inventory movement server reads, receiving history, inventory analytics, inventory detail movement mapping, dashboard schema boundary correction.

Workflow protected: movement history and analytics reads -> public inventory schema barrel -> movement-owned response/helper contracts.

Business value: movement history and analytics are easier to maintain because movement response types now live with the movement schema owner instead of the generic inventory schema file.

Standards checked:

- clear schema ownership for movement response/helper types, including movement trend aggregation helpers
- public `@/lib/schemas/inventory` barrel compatibility preserved
- no route, hook, server, database, or query-key behavior changed
- movement-focused ownership guard extended to prevent regression
- dashboard ownership guard kept focused on dashboard contracts, not movement analytics helpers

Smells removed:

- `MovementWithRelations`, `ListMovementsResult`, `MovementTypeCount`, `ProductMovementAggregation`, `DateGroupAggregation`, `MovementRecord`, `InventoryAdjustment`, and `InventoryTransfer` lived outside movement schema ownership

Deferred:

- core inventory read/list schemas still live in `src/lib/schemas/inventory/inventory.ts`
- quality/detail helper types still need a later owner decision
- database-backed movement/cost-layer integration coverage remains outside this type-ownership slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/dashboard-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/stock-action-error-messages.test.ts`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/movements.ts src/lib/schemas/inventory/dashboard.ts src/lib/schemas/inventory/inventory.ts tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/dashboard-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md docs/inventory/MAINTAINER-SPRINT-2.md src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/movements.ts src/lib/schemas/inventory/dashboard.ts tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/dashboard-schema-ownership.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 2 continues the domain-sliced maintainer model after Sprint 1 closeout and corrects Sprint 1's dashboard closeout wording so dashboard ownership no longer claims a movement-trend helper.

Residual risk: this improves movement schema ownership only; it does not prove movement persistence, cost-layer math, serialized lineage, or analytics correctness beyond the existing focused and broad inventory tests.

### Issue 2: Location Attribute Schema Ownership

Touched domains: inventory schema contracts, location schemas, location server update attributes, receive-location read policy tests.

Workflow protected: location create/update attributes -> location server persistence contract -> location list/form reads -> receiving location availability.

Business value: location attribute contracts are easier to maintain because location-specific JSONB attribute shape now lives with the location schema owner instead of the generic inventory schema file.

Standards checked:

- moved `locationAttributesSchema` and `LocationAttributes` into `src/lib/schemas/inventory/locations.ts`
- removed the location attribute schema/type from `src/lib/schemas/inventory/inventory.ts`
- preserved public `@/lib/schemas/inventory` barrel compatibility, including explicit key-type re-export
- updated the server comment that still pointed to `inventory.ts` as the attribute type owner
- extended the location ownership guard to prevent location attributes from drifting back into `inventory.ts`

Smells removed:

- location attribute shape depended on `locationAddressSchema` but lived outside the location schema owner
- location server documentation referenced the old generic inventory schema owner

Deferred:

- core inventory read/list schemas still live in `src/lib/schemas/inventory/inventory.ts`
- location hierarchy and warehouse-location ownership remains separate and unchanged
- database-backed location persistence integration coverage remains outside this schema-ownership slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/location-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/locations.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts src/server/functions/inventory/locations.ts tests/unit/inventory/location-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md src/lib/schemas/inventory/locations.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts src/server/functions/inventory/locations.ts tests/unit/inventory/location-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 2 continues narrowing leftover schema ownership before behavior work.

Residual risk: later Sprint 2 slices narrowed more schema ownership; remaining current residual risk is tracked in the latest closeout.

### Issue 3: Receiving Input Schema Ownership

Touched domains: inventory schema contracts, manual receiving schema helpers, receive hook public input compatibility.

Workflow protected: manual stock-in input contract -> receiving hook/server workflow -> receiving page context and receive-location availability.

Business value: receiving input ownership is easier to maintain because the public hook-facing input type now lives beside manual receiving validation helpers instead of the generic inventory schema file.

Standards checked:

- moved `InventoryReceiving` into `src/lib/schemas/inventory/receiving.ts`
- removed receiving input type ownership from `src/lib/schemas/inventory/inventory.ts`
- preserved public `@/lib/schemas/inventory` barrel compatibility
- extended the manual receiving ownership guard to prevent receiving input types from drifting back into `inventory.ts`
- kept receive server behavior, form validation, and cache invalidation unchanged

Smells removed:

- `InventoryReceiving` lived in the generic inventory schema file even though receiving already had a dedicated schema owner

Deferred:

- the local `ReceiveInventoryInput` hook/server mutation contract remains in `use-inventory.ts`; a later behavior slice should decide whether to centralize the live mutation input type
- core inventory read/list schemas still live in `src/lib/schemas/inventory/inventory.ts`
- database-backed receiving integration coverage remains outside this public type-ownership slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/manual-receive-serialization-contract.test.ts tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receiving-page-context.test.tsx tests/unit/inventory/receiving-location-read-policy.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/receiving.ts src/lib/schemas/inventory/inventory.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md src/lib/schemas/inventory/receiving.ts src/lib/schemas/inventory/inventory.ts tests/unit/inventory/manual-receive-serialization-contract.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 2 continues narrowing leftover schema ownership before behavior work.

Residual risk: later Sprint 2 slices narrowed quality schema ownership; the live receive mutation input remains local to `use-inventory.ts`.

### Issue 4: Quality Inspection Schema Ownership

Touched domains: inventory schema contracts, quality inspection server validators, quality hooks, inventory detail quality tab type compatibility.

Workflow protected: quality inspection list/create validators -> quality server functions -> quality hooks -> inventory detail quality history and degraded/unavailable states.

Business value: quality inspection contracts are easier to maintain because validators and display record types now live in a quality schema owner instead of being split between server-inline schemas and the generic inventory schema file.

Standards checked:

- added `src/lib/schemas/inventory/quality.ts` for quality result values, list/create validators, input types, and `QualityRecord`
- removed `QualityRecord` ownership from `src/lib/schemas/inventory/inventory.ts`
- exported the quality owner through the public `@/lib/schemas/inventory` barrel
- moved quality server validators out of `src/server/functions/inventory/quality.ts`
- added a guard that prevents quality schemas/types from drifting back into `inventory.ts` or server-inline validator declarations

Smells removed:

- quality server functions owned inline zod validators instead of using the schema layer
- `QualityRecord` lived in the generic inventory schema file despite dedicated quality server and hook workflows

Deferred:

- database-backed quality inspection integration coverage remains outside this schema-ownership slice
- quality UI polish remains unchanged
- core inventory read/list schemas still live in `src/lib/schemas/inventory/inventory.ts`

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/quality-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-quality.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/quality.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts src/server/functions/inventory/quality.ts tests/unit/inventory/quality-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md src/lib/schemas/inventory/quality.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts src/server/functions/inventory/quality.ts tests/unit/inventory/quality-schema-ownership.test.ts`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 2 continues narrowing leftover schema ownership before behavior work.

Residual risk: later Sprint 2 work moved read/list ownership out of `inventory.ts`; remaining current residual risk is tracked in the latest closeout.

### Issue 5: Inventory Read Schema Ownership

Touched domains: inventory schema contracts, inventory read server validators, inventory browser route search validation, inventory list/search/detail hooks, inventory availability consumers.

Workflow protected: inventory browser/search/detail route -> inventory hooks -> list/search/detail server functions -> read-owned validators and response types -> inventory query-key/cache consumers.

Business value: stock visibility contracts are easier to maintain because list filters, sort fields, quick search input, detail params, and read response shapes now live with the inventory read workflow instead of being split between the generic inventory entity schema and server-inline validators.

Standards checked:

- added `src/lib/schemas/inventory/reads.ts` for list/filter/sort validators, quick search validator, detail params, hook-facing read filters, and read response types
- left `src/lib/schemas/inventory/inventory.ts` focused on base stock-level entity/enums/default threshold
- exported the read owner through the public `@/lib/schemas/inventory` barrel
- moved quick search and detail server validators out of `src/server/functions/inventory/reads.ts`
- added a guard that prevents read/list/search/detail contracts from drifting back into `inventory.ts` or server-inline zod declarations

Smells removed:

- inventory list/search/detail contracts lived in a generic catch-all schema file despite a dedicated read server module
- quick search and detail validators were declared inline in the server read function module
- `inventory.ts` file header still claimed location and movement ownership after those concerns had been extracted

Deferred:

- inventory database read behavior, relation mapping, and UI behavior are unchanged
- query-key cache key shapes are unchanged
- `src/lib/query-keys.ts` still has an independently declared `InventoryFilters` type that does not fully mirror `InventoryListQuery`
- the live receive mutation input remains local to `use-inventory.ts`

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/read-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/reads.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts src/server/functions/inventory/reads.ts tests/unit/inventory/read-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md src/lib/schemas/inventory/reads.ts src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/index.ts src/server/functions/inventory/reads.ts tests/unit/inventory/read-schema-ownership.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 2 continues narrowing ownership and cache-contract risk before behavior work.

Residual risk: later Sprint 2 work aligned inventory read query-key typing with read schemas; receiving mutation input ownership remains a later receiving hook/server-contract cleanup.

### Issue 6: Inventory Query-Key Read Contract

Touched domains: centralized query keys, inventory list/search cache identity, inventory read schema contracts, inventory browser/list read hooks.

Workflow protected: inventory browser filters -> `useInventory`/`useInventorySearch` query keys -> centralized inventory list/search cache identity -> read-owned server validators.

Business value: inventory cache typing now follows the read schema contract, reducing the chance that future stock visibility filters validate on the server but drift out of cache identity typing.

Standards checked:

- typed `queryKeys.inventory.list` filters from `Partial<InventoryListQuery>`
- typed `queryKeys.inventory.search` options from `QuickSearchInventoryInput`
- removed stale unsupported `category` and `cursor` fields from the inventory query-key filter type
- preserved existing inventory list/search query-key array shapes
- added a guard that keeps the inventory query-key contract tied to read-owned schema inputs

Smells removed:

- inventory query-key filters were declared independently from inventory read schemas
- the query-key filter type omitted active read filters like `locationId`, `qualityStatus`, ranges, and sort fields
- the query-key filter type advertised unsupported `category` and `cursor` fields

Deferred:

- broader non-inventory query-key type cleanup remains outside this inventory slice
- inventory serialized, movements, alerts, valuation, WMS, and availability query keys still use their existing contracts
- receiving mutation input ownership remains local to `use-inventory.ts`

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/query-key-read-contract.test.ts tests/unit/inventory/query-normalization-wave3-browser.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx`
- `./node_modules/.bin/eslint src/lib/query-keys.ts tests/unit/inventory/query-key-read-contract.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md src/lib/query-keys.ts tests/unit/inventory/query-key-read-contract.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. The slice reinforces the existing cache-contract standard in the maintainer goal.

Residual risk: mutation input ownership and cache invalidation precision for inventory stock-changing flows remain the next high-value maintenance area.
