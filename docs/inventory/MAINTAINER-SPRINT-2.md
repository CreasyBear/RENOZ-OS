# Maintainer Sprint 2: Inventory Schema Ownership

This sprint continues the maintainer process from `docs/reference/maintainer-sprint-process.md` after Sprint 1 closed the first Inventory/Warehouse ownership pass.

Status: Issues 1, 2, and 3 implemented.

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

Residual risk: `inventory.ts` still owns core inventory read/list, quality, inventory item, adjustment, transfer, and receiving hook-facing misc types.

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

Residual risk: `inventory.ts` still owns core inventory read/list, quality, and inventory item hook-facing misc types; the live receive mutation input remains local to `use-inventory.ts`.
