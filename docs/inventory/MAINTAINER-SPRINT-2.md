# Maintainer Sprint 2: Inventory Schema Ownership

This sprint continues the maintainer process from `docs/reference/maintainer-sprint-process.md` after Sprint 1 closed the first Inventory/Warehouse ownership pass.

Status: Issue 1 implemented.

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

- movement response/helper types, including movement trend aggregation helpers, are exported from `movements.ts`
- `inventory.ts` no longer owns movement response/helper types
- public `@/lib/schemas/inventory` imports remain compatible
- focused movement tests pass
- lint/typecheck evidence is recorded if code paths require it

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

- `MovementWithRelations`, `ListMovementsResult`, `MovementTypeCount`, `ProductMovementAggregation`, `DateGroupAggregation`, and `MovementRecord` lived outside movement schema ownership

Deferred:

- core inventory read/list schemas still live in `src/lib/schemas/inventory/inventory.ts`
- quality/detail helper types still need a later owner decision
- database-backed movement/cost-layer integration coverage remains outside this type-ownership slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/dashboard-schema-ownership.test.ts tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/inventory/movements.ts src/lib/schemas/inventory/dashboard.ts src/lib/schemas/inventory/inventory.ts tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/dashboard-schema-ownership.test.ts`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-1.md docs/inventory/MAINTAINER-SPRINT-2.md src/lib/schemas/inventory/inventory.ts src/lib/schemas/inventory/movements.ts src/lib/schemas/inventory/dashboard.ts tests/unit/inventory/movement-schema-ownership.test.ts tests/unit/inventory/dashboard-schema-ownership.test.ts`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 2 continues the domain-sliced maintainer model after Sprint 1 closeout and corrects Sprint 1's dashboard closeout wording so dashboard ownership no longer claims a movement-trend helper.

Residual risk: this improves movement schema ownership only; it does not prove movement persistence, cost-layer math, serialized lineage, or analytics correctness beyond the existing focused and broad inventory tests.
