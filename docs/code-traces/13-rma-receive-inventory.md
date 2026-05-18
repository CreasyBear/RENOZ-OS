# 13 — RMA receive (restore inventory)

**Status:** COMPLETE
**Series order:** 13 (see [README](./README.md))
**Last updated:** 2026-05-18
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Move an RMA from **`approved` → `received`** and **put stock back** on hand: inventory movements (`return`), FIFO-style **cost layers** (`createReceiptLayersWithCostComponents`), layer recomputation, optional **serialized** item upsert + events, and `activities` rows for audit.

**In scope:** `receiveRma`, `bulkReceiveRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); `executeReceiveRma` ([`orders/_shared/rma-execution.ts`](../../src/server/functions/orders/_shared/rma-execution.ts)); `receiveRmaSchema` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useReceiveRma`](../../src/hooks/support/use-rma.ts), [`useBulkReceiveRma`](../../src/hooks/support/use-rma.ts); [`rma-detail-container.tsx`](../../src/components/domain/support/rma/rma-detail-container.tsx).

**Out of scope:** `createRma`, `approveRma`, `processRma`, `cancelRma`, full support domain PRD.

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `rmaId` | Client UUID; RMA scoped by `organizationId` |
| Allowed transition | `isValidRmaTransition(existing.status, 'received')` — typically from **`approved`** only |
| Lines to restore | Server reads `rma_line_items` joined to `order_line_items` + `products` — client cannot inject arbitrary SKUs in this RPC |
| Quantities | `quantityReturned` on each line (defaults treated as number, loop uses `Number(... ?? 1)`) |
| Unit cost for layers | `products.costPrice` |
| Inspection payload | Optional `inspectionNotes`; handler **merges** server `inspectedAt` (ISO string) and `inspectedBy` (user id), overwriting any client-supplied mirror fields in the stored JSON |
| Restored inventory **status** | Derived from `inspectionNotes.condition`: `damaged` / `defective` / `missing_parts` ⇒ **`quarantined`**; else **`available`** |
| Non-serialized **location** | `locationId` from `receiveRmaSchema`; if omitted, server accepts only the single-active-location case and otherwise throws. The detail hook/dialog require operator selection before mutation |

**Permission:** `withAuth({ permission: PERMISSIONS.inventory.receive })` — aligned with [`receiveInventory`](../../src/server/functions/inventory/receiving.ts) / [`receiveGoods`](../../src/server/functions/suppliers/receive-goods.ts) ([02](./02-inventory-stock-in.md)).

---

## 2. Entry points

**Discovery:**

```bash
rg -n "useReceiveRma|receiveRma\(" src/
```

| Surface | Notes |
|---------|--------|
| RMA detail | Primary UX for single receive |
| `bulkReceiveRma` | Authenticates once, then loops `executeReceiveRma({ ctx, data: { rmaId, locationId, inspectionNotes } })` per id; collects per-id errors |

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant UI as RMA detail
  participant H as useReceiveRma
  participant S as receiveRma
  participant EX as executeReceiveRma
  participant TX as db.transaction
  participant INV as inventory / movements / layers

  UI->>H: mutateAsync({ rmaId, locationId, inspectionNotes? })
  H->>S: POST RPC
  S->>S: withAuth(inventory.receive)
  S->>EX: executeReceiveRma(ctx, data)
  EX->>TX: set_config org
  TX->>TX: load RMA; assert transition to received
  TX->>TX: update return_authorizations status received + inspectionNotes JSON
  TX->>TX: load lines + products
  TX->>TX: validate explicit receiving location or single active fallback
  loop each line
    TX->>INV: serialized: lock row by serial; or non-serial: upsert by product+location
    TX->>INV: insert movement return + receipt layers + recompute value
    TX->>INV: optional serialized item event (rma_received)
    TX->>TX: optional activities insert (dedup by movementId in metadata)
  end
  TX-->>EX: RmaResponse + unitsRestored + inventory/product mutation identity
  EX-->>S: execution result
  S-->>H: serializedMutationSuccess(envelope)
  H->>H: setQueryData rma detail; invalidate rma list; targeted inventory stock/movement caches
```

**Transaction scope:** Entire receive runs in **one** `db.transaction` — RMA status and inventory updates commit together or roll back together.

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| RPC input | `receiveRmaSchema`, `ReceiveRmaInput` | [`src/lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts) ~L136; includes optional `locationId` with required-selection validation copy |
| Inspection shape | `rmaInspectionNotesSchema` | same ~L50 (`condition` enum, `notes`, optional `photos` UUIDs) |
| Bulk | `bulkReceiveRmaSchema` | same ~L159 |

**Error helper:** `createSerializedMutationError` returns **`ValidationError`** ([`serialized-mutation-contract.ts`](../../src/lib/server/serialized-mutation-contract.ts)) — used for **transition_blocked** and **invalid_serial_state**; these **throw** out of the transaction like other validation errors (not a soft envelope inside the happy path).

---

## 5. Serialized vs non-serialized branches (high level)

| Branch | Location selection | Extra rules |
|--------|-------------------|-------------|
| **Serialized** | Existing inventory row **by `serialNumber`** + `productId` (`.for('update')`) | Serial required on line; row must exist; `newQty` must not exceed serialized single-unit bound |
| **Non-serialized** | selected `locationId`; match row `(productId, locationId, serial IS NULL)` or insert new | Throws if selected location is invalid, if no active fallback exists, or if more than one active fallback candidate exists |

Both branches: `createReceiptLayersWithCostComponents` + `recomputeInventoryValueFromLayers` with `referenceType: 'rma'`, `costType: 'rma_return'`, currency **`AUD` hardcoded** in handler.

---

## 6. Persistence & side effects

| Artifact | Purpose |
|----------|---------|
| `return_authorizations` | `status`, `receivedAt`, `receivedBy`, `inspectionNotes` JSON |
| `inventory` | Quantity / status / cost updates or new row |
| `inventory_movements` | `movementType: 'return'` |
| Cost layers | Via shared finance helper |
| `serialized_items` / events | When serialized path + `upsertSerializedItemForInventory` |
| `activities` | Entity `inventory`, deduped by `metadata.movementId` |

---

## 7. Failure matrix

| Condition | Mechanism | User-visible |
|-----------|-----------|--------------|
| RMA not found | `NotFoundError` | Mutation error |
| Wrong status | `throw createSerializedMutationError(..., 'transition_blocked')` | Validation-style error |
| Missing/invalid receiving location (non-serial lines) | `ValidationError` explicit message; detail hook blocks missing selection before mutation | Toast / inline |
| Serialized missing serial / bad state | `ValidationError` or `invalid_serial_state` | Same |
| Success | `serializedMutationSuccess` with message | Success + cache refresh |

---

## 8. Cache & read-after-write

`useReceiveRma` `onSuccess`: `setQueryData` for RMA detail, invalidates `queryKeys.support.rmasList()`, then calls `invalidateInventoryStockMutationQueries` with the mutation result and `includeMovements: true`.

`useBulkReceiveRma`: invalidates list + `rmaDetails()`, then calls the same stock mutation helper with aggregate `affectedInventoryIds`, `affectedProductIds`, and `touchesSerializedInventory` returned by successful internal executions.

---

## 9. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| **Fixed AUD** in layers | `currency: 'AUD'` in `createReceiptLayersWithCostComponents` | Wrong for multi-currency orgs |
| **Single-location fallback** | Server allows omitted `locationId` only when exactly one active location exists | API callers outside the detail dialog must still pass location explicitly in multi-location orgs |
| **Execution density** | `executeReceiveRma` owns receive transaction, inventory restoration, cost layers, serialized events, and cache identity metadata | Isolated from the ServerFn facade, but still dense enough to justify future DB-backed integration tests before behavior changes |
| **Integration coverage** | Contract tests guard the explicit receiving location and cache identity shape, but there is no row-level receive integration test | Transactional inventory movement/layer behavior could regress without executable DB proof |

---

## 10. Verification

- Search `receiveRma`, `useReceiveRma`, `bulkReceiveRma` under `tests/`.
- `tests/unit/support/rma-receive-location-contract.test.ts` guards selected-location schema, detail-hook blocking, executor fallback behavior, bulk forwarding through `executeReceiveRma`, and absence of nested public `receiveRma` dispatch.
- **Gap:** Integration test: approved RMA → receive → inventory quantity + movement row; serialized path requires pre-existing serial row; transition_blocked from wrong status; bulk partial failure returns `failed[]` with message.

---

## 11. Follow-up traces

- `processRma` (resolution + financial side effects).
- `createRma` + line validation vs shipped quantities (order linkage).
