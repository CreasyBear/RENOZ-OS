a # 13 — RMA receive (restore inventory)

**Status:** COMPLETE
**Series order:** 13 (see [README](./README.md))
**Last updated:** 2026-03-26
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Move an RMA from **`approved` → `received`** and **put stock back** on hand: inventory movements (`return`), FIFO-style **cost layers** (`createReceiptLayersWithCostComponents`), layer recomputation, optional **serialized** item upsert + events, and `activities` rows for audit.

**In scope:** `receiveRma`, `bulkReceiveRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); `receiveRmaSchema` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useReceiveRma`](../../src/hooks/support/use-rma.ts), [`useBulkReceiveRma`](../../src/hooks/support/use-rma.ts); [`rma-detail-container.tsx`](../../src/components/domain/support/rma/rma-detail-container.tsx).

**Out of scope:** `createRma` (note: uses `withAuth()` **without** explicit permission — audit contrast), `approveRma`, `processRma`, `cancelRma`, full support domain PRD.

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
| Non-serialized **location** | **First** row in `warehouse_locations` for org (`.limit(1)`). **No** `locationId` in `receiveRmaSchema` — operator cannot pick receiving dock in this API |

**Permission:** `withAuth({ permission: PERMISSIONS.inventory.receive })` — aligned with [`receiveInventory`](../../src/server/functions/inventory/inventory.ts) / [`receiveGoods`](../../src/server/functions/suppliers/receive-goods.ts) ([02](./02-inventory-stock-in.md)).

---

## 2. Entry points

**Discovery:**

```bash
rg -n "useReceiveRma|receiveRma\(" src/
```

| Surface | Notes |
|---------|--------|
| RMA detail | Primary UX for single receive |
| `bulkReceiveRma` | Loops `receiveRma({ data: { rmaId, inspectionNotes } })` per id; collects per-id errors |

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant UI as RMA detail
  participant H as useReceiveRma
  participant S as receiveRma
  participant TX as db.transaction
  participant INV as inventory / movements / layers

  UI->>H: mutateAsync({ rmaId, inspectionNotes? })
  H->>S: POST RPC
  S->>S: withAuth(inventory.receive)
  S->>TX: set_config org
  TX->>TX: load RMA; assert transition to received
  TX->>TX: update return_authorizations status received + inspectionNotes JSON
  TX->>TX: load lines + products
  TX->>TX: resolve first warehouse location (non-serial path)
  loop each line
    TX->>INV: serialized: lock row by serial; or non-serial: upsert by product+location
    TX->>INV: insert movement return + receipt layers + recompute value
    TX->>INV: optional serialized item event (rma_received)
    TX->>TX: optional activities insert (dedup by movementId in metadata)
  end
  TX-->>S: RmaResponse + unitsRestored
  S-->>H: serializedMutationSuccess(envelope)
  H->>H: setQueryData rma detail; invalidate rma list; invalidate inventory.all
```

**Transaction scope:** Entire receive runs in **one** `db.transaction` — RMA status and inventory updates commit together or roll back together.

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| RPC input | `receiveRmaSchema`, `ReceiveRmaInput` | [`src/lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts) ~L136 |
| Inspection shape | `rmaInspectionNotesSchema` | same ~L50 (`condition` enum, `notes`, optional `photos` UUIDs) |
| Bulk | `bulkReceiveRmaSchema` | same ~L159 |

**Error helper:** `createSerializedMutationError` returns **`ValidationError`** ([`serialized-mutation-contract.ts`](../../src/lib/server/serialized-mutation-contract.ts)) — used for **transition_blocked** and **invalid_serial_state**; these **throw** out of the transaction like other validation errors (not a soft envelope inside the happy path).

---

## 5. Serialized vs non-serialized branches (high level)

| Branch | Location selection | Extra rules |
|--------|-------------------|-------------|
| **Serialized** | Existing inventory row **by `serialNumber`** + `productId` (`.for('update')`) | Serial required on line; row must exist; `newQty` must not exceed serialized single-unit bound |
| **Non-serialized** | `firstLocation.id`; match row `(productId, locationId, serial IS NULL)` or insert new | Throws if **no** locations when there are lines to process |

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
| No warehouse location (non-serial lines) | `ValidationError` explicit message | Toast / inline |
| Serialized missing serial / bad state | `ValidationError` or `invalid_serial_state` | Same |
| Success | `serializedMutationSuccess` with message | Success + cache refresh |

---

## 8. Cache & read-after-write

`useReceiveRma` `onSuccess`: `setQueryData` for RMA detail, invalidates `queryKeys.support.rmasList()`, **`queryKeys.inventory.all`** (broad — matches comment “lists, details, movements, dashboard”).

`useBulkReceiveRma`: invalidates list + `rmaDetails()` + `inventory.all`.

---

## 9. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| **createRma** auth | `withAuth()` without `PERMISSIONS` | Anyone who can hit the fn might create RMAs if UI is exposed — **asymmetric** with receive’s `inventory.receive` |
| **Fixed AUD** in layers | `currency: 'AUD'` in `createReceiptLayersWithCostComponents` | Wrong for multi-currency orgs |
| **Arbitrary first location** | `.limit(1)` on `warehouse_locations` | Stock lands in wrong bin; operational confusion |
| **bulkReceiveRma** | Calls nested `receiveRma` server fn in a loop | Each call runs full auth + transaction; `withAuth` at bulk start is redundant with per-receive auth inside `receiveRma` |
| **Product `continue`** | `if (!productId) continue` | Silent skip of malformed line linkage — could hide data issues |

---

## 10. Verification

- Search `receiveRma`, `useReceiveRma`, `bulkReceiveRma` under `tests/`.
- **Gap:** Integration test: approved RMA → receive → inventory quantity + movement row; serialized path requires pre-existing serial row; transition_blocked from wrong status; bulk partial failure returns `failed[]` with message.

---

## 11. Follow-up traces

- `processRma` (resolution + financial side effects).
- `createRma` + line validation vs shipped quantities (order linkage).
