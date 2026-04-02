# 14 — Create RMA

**Status:** COMPLETE  
**Series order:** 14 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Open a **return authorization** against an **order**: server assigns `rmaNumber` / `sequenceNumber`, persists header + **line items** linked to `order_line_items`, validates **serialized** lines against **shipped** serials, optionally records **serialized item** events (`rma_requested`).

**In scope:** `createRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); `createRmaSchema` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useCreateRma`](../../src/hooks/support/use-rma.ts); primary UI [`order-detail-container.tsx`](../../src/components/domain/orders/containers/order-detail-container.tsx).

**Out of scope:** Approve/reject/receive/process/cancel ([13](./13-rma-receive-inventory.md) for receive); issue management beyond optional `issueId` FK check.

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `organizationId`, `createdBy`, `updatedBy`, RMA number | Server (`getNextRmaSequence` inside tx + `generateRmaNumber`) |
| `orderId` | Client UUID; order must exist, same org, not deleted |
| `customerId` | Optional override; else **`order.customerId`** |
| `issueId` | Optional; if set, issue must exist for org |
| Line `orderLineItemId` | Must belong to **same** `orderId` (batch validation); mismatch → `ValidationError` |
| `quantityReturned` | Client per line (Zod `int` ≥ 1, default 1) — **no** server check vs qty shipped/ordered in this handler |
| Serialized `serialNumber` | Normalized; must appear in **`shipment_item_serials` ∩ shipments for order ∩ line** or `createSerializedMutationError` (`invalid_serial_state`) |

**AuthZ:** `withAuth()` **only** — **no** `PERMISSIONS.*` ([13](./13-rma-receive-inventory.md) notes same pattern vs `inventory.receive` on receive).

---

## 2. Entry points

**Discovery:**

```bash
rg -n "useCreateRma|createRma\(" src/
```

| Surface | Path |
|---------|------|
| Order detail | `order-detail-container` wires `useCreateRma` |

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant UI as Order detail
  participant H as useCreateRma
  participant S as createRma
  participant TX as db.transaction

  UI->>H: mutateAsync(CreateRmaInput)
  H->>S: POST RPC
  S->>S: withAuth()
  S->>S: load order; optional issue
  S->>TX: set_config org
  TX->>TX: next sequenceNumber; insert return_authorizations status requested
  TX->>TX: validate line ids ⊆ order lines + org
  loop serialized lines
    TX->>TX: query shipped serials for line
    alt no match
      TX-->>S: throw createSerializedMutationError(..., invalid_serial_state)
    end
  end
  TX->>TX: insert rma_line_items
  TX->>TX: optional serialized events rma_requested
  TX-->>S: rma + lineItems
  S-->>H: serializedMutationSuccess(RmaResponse)
  H->>H: invalidate rmasList only
```

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| RPC | `createRmaSchema`, `CreateRmaInput` | [`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts) ~L85 |
| Line | `createRmaLineItemSchema` | same ~L73 |
| Server | `.inputValidator(createRmaSchema)` | [`rma.ts`](../../src/server/functions/orders/rma.ts) ~L117–118 |

---

## 5. Persistence & side effects

| Artifact | Notes |
|----------|--------|
| `return_authorizations` | `status: 'requested'` |
| `rma_line_items` | `quantityReturned`, optional `serialNumber` (normalized) |
| Serialized events | `addSerializedItemEvent` when `findSerializedItemBySerial` finds item |

**Transaction:** Single `db.transaction` covers sequence, header, lines, and serial validation queries.

---

## 6. Failure matrix

| Condition | Error | User-visible |
|-----------|-------|--------------|
| Order / issue not found | `NotFoundError` | Mutation error |
| Invalid line item ids | `ValidationError` | Message lists ids |
| Serialized missing serial / not shipped | `ValidationError` from `createSerializedMutationError` | Serialized code in details |
| Zod reject | Validation | Form |

---

## 7. Cache & read-after-write

`useCreateRma` `onSuccess`: **`invalidateQueries` list only** — does **not** `setQueryData` new RMA detail. User navigating to RMA detail relies on fetch (may flash stale until navigation completes).

---

## 8. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| No explicit permission on create | `withAuth()` | Over-broad if route exposed |
| Quantity vs fulfillment | No assert `quantityReturned` ≤ shipped qty | User can request return > shipped |
| `createSerializedMutationError` returns `ValidationError` | Thrown like generic validation | Clients must parse `code` if present |
| Dual approval paths | Simple PO approve (trace 10) vs multi-level (trace 16) — RMA is separate product surface | Confusion only if docs mix domains |

---

## 9. Verification

- Search `createRma`, `order-detail-container` under `tests/`.
- **Gap:** Serial-not-shipped rejection; invalid line id batch; permission test when `PERMISSIONS.support.create` (or similar) is introduced.

---

## 10. Follow-up traces

- `approveRma` / `rejectRma` (requested → approved/rejected).
- Order shipment linkage model vs return quantities.
