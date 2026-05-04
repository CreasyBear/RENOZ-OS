# Maintainer Sprint 3: Inventory Mutation and Cache Integrity

This sprint follows Sprint 2's schema-ownership closeout. The focus shifts from contract placement to stock-changing behavior that can mislead operators after mutations.

Status: Issue 1 implemented.

## Business Value

Inventory mutations must keep warehouse, product, serialized, valuation, and support-facing stock views trustworthy after operators receive, adjust, transfer, allocate, or recover lithium-ion battery stock. Optimistic UI should be helpful, but never overstate the wrong lot, serial, location, or product.

## Workflow Spine

```text
stock-changing mutation
  -> optimistic cache patch / rollback
  -> transactional server write
  -> cache invalidation/refetch
  -> operator-visible stock, warehouse, product, valuation, serialized, support/RMA state
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

### 1. Receive Optimistic Patch Lot/Serial Scope

Business value: receiving one lot or serialized battery should not temporarily inflate other cached lots or serial rows at the same product/location while the server refetch is pending.

Workflow invariant: `useReceiveInventory` optimistic list/detail patches must match the same product, location, lot, and serial scope that the receive server uses to find or create the affected inventory row.

Affected files:

- `src/hooks/inventory/use-inventory.ts`
- `tests/unit/inventory/use-receive-inventory.test.tsx`
- `docs/inventory/MAINTAINER-SPRINT-3.md`

Out of scope:

- changing receive server transaction behavior
- changing receive schema validation
- changing broad invalidation prefixes
- changing product receive wrapper behavior
- changing UI form behavior

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receive-inventory-schema-ownership.test.ts
```

Closeout criteria:

- receive optimistic list patch only updates rows matching product/location plus lot/serial scope
- receive optimistic detail patch uses the same scope
- receive without lot/serial does not patch lot-specific or serial-specific cached rows
- receive with a serial does not patch a different serial row
- rollback behavior remains unchanged
- focused receive tests pass
- lint/typecheck evidence is recorded

## Closeout Log

### Issue 1: Receive Optimistic Patch Lot/Serial Scope

Touched domains: inventory receive hook, inventory list/detail optimistic cache patching, manual receive regression coverage.

Workflow protected: `useReceiveInventory` optimistic patch -> manual receive server mutation -> rollback/invalidation -> operator-visible list/detail stock rows.

Business value: receiving one battery lot or serial no longer temporarily overstates other cached lots or serialized rows at the same product/location while the server refetch is pending.

Standards checked:

- added a receive optimistic patch predicate that matches product, location, normalized serial number, and lot number
- receive without a lot/serial now only patches no-lot/no-serial cached rows
- receive with a serial now only patches the matching normalized serial row
- receive with a lot now only patches the matching lot row
- adjustment optimistic patch behavior was preserved after an initial patch placement mistake was caught by focused tests
- rollback and invalidation behavior remain unchanged

Smells removed:

- receive optimistic list/detail patches matched only product/location, so a receive for one lot or serial could patch sibling rows until refetch
- receive optimistic behavior had no regression coverage for lot or serial scope

Deferred:

- receive invalidation remains broad rather than result-aware
- receive server transaction behavior and schema validation are unchanged
- product receive wrapper behavior is unchanged
- database-backed receive integration coverage remains outside this hook/cache slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/use-receive-inventory.test.tsx tests/unit/inventory/receive-inventory-schema-ownership.test.ts`
- `./node_modules/.bin/eslint src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `git diff --check -- docs/inventory/MAINTAINER-SPRINT-2.md docs/inventory/MAINTAINER-SPRINT-3.md src/hooks/inventory/use-inventory.ts tests/unit/inventory/use-receive-inventory.test.tsx`
- `./node_modules/.bin/vitest run tests/unit/inventory tests/unit/inventory-support/query-normalization-wave6g.test.tsx`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. Sprint 3 continues the maintainer goal by moving from schema ownership into stock-changing cache integrity.

Residual risk: receive invalidation is still prefix-broad; adjust/transfer/allocate optimistic patches need the same lot/serial/row-scope scrutiny in later Sprint 3 slices.
