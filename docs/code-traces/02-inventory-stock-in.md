# 02 — Inventory “stock in” (increase on-hand)

**Status:** COMPLETE  
**Series order:** 02 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Increase **quantity on hand** (and related valuation layers) for a product at a location, using one of several workflows that all feel like “receive” or “stock in” in the UI.

**In scope:** Ad-hoc receiving (`receiveInventory`), PO goods receipt (`receiveGoods`, bulk wrapper), bulk product receive (`bulkReceiveStock`). AuthZ, canonical Zod contracts, transactions, cache behavior, and failure mapping at a high level per path.

**Out of scope:** **Stock adjustments** (`adjustInventory` — different narrative), **RMA receive** (`receiveRma` — returns path), serial lifecycle beyond receive rules, full line-by-line SQL inside `receiveGoods` (see server comment block in source).

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `organizationId`, actor ids | Server (`withAuth` + RLS `set_config('app.organization_id', …)` inside transactions) |
| Product / location / PO ids | Client sends UUIDs; server verifies row exists **for org** |
| Quantities, unit cost, serial/lot | Client sends; **validated** by per-fn Zod schemas; serialized rules enforced again in handler |
| PO line quantities (receiveGoods) | Client sends accepted qty; server reconciles against PO and updates `quantityReceived` / status |

Client cannot impersonate another org: queries always scoped by `ctx.organizationId` and/or session config.

---

## 2. Entry points (multiple — friction accumulator)

| # | Entry | Route / component | Server function | Permission (handler) |
|---|-------|-------------------|-----------------|------------------------|
| A | **Ad-hoc receiving** | [`receiving-page.tsx`](../../src/routes/_authenticated/inventory/receiving-page.tsx) → [`ReceivingForm`](../../src/components/domain/inventory/receiving/receiving-form.tsx); mobile [`-receiving-page.tsx`](../../src/routes/_authenticated/mobile/-receiving-page.tsx) | `receiveInventory` — [`inventory.ts`](../../src/server/functions/inventory/inventory.ts) | `PERMISSIONS.inventory.receive` |
| B | **PO goods receipt** | [`goods-receipt-dialog.tsx`](../../src/components/domain/purchase-orders/receive/goods-receipt-dialog.tsx) (and related PO UI) | `receiveGoods` — [`receive-goods.ts`](../../src/server/functions/suppliers/receive-goods.ts) | `PERMISSIONS.inventory.receive` |
| C | **Bulk PO receipts** | Callers of bulk receive | `bulkReceiveGoods` — [`bulk-receive-goods.ts`](../../src/server/functions/suppliers/bulk-receive-goods.ts) | delegates per PO to `receiveGoods` |
| D | **Bulk receive (products)** | Product inventory surfaces using batch API | `bulkReceiveStock` — [`product-inventory.ts`](../../src/server/functions/products/product-inventory.ts) | `withAuth()` **only** — no explicit `PERMISSIONS.*` in handler (~L1254) |

**Discovery:**

```bash
rg -n "useReceiveInventory|receiveInventory\(" src/
rg -n "useReceiveGoods|receiveGoods\(" src/
rg -n "bulkReceiveStock|bulkReceiveGoods" src/
```

**Friction:** English “Receive” / “stock in” may map to **different** APIs, preconditions (PO vs not), and permission posture (see path D).

---

## 3. Authoritative contracts

| Path | Canonical Zod | Export / location |
|------|-----------------|-------------------|
| Ad-hoc | `receiveInventorySchema` | [`inventory.ts`](../../src/server/functions/inventory/inventory.ts) ~L1701 (passed to `.inputValidator`) |
| PO receipt | `receiveGoodsSchema` | [`receive-goods.ts`](../../src/server/functions/suppliers/receive-goods.ts) |
| Bulk products | Inline `z.object({ locationId, items, … })` | [`product-inventory.ts`](../../src/server/functions/products/product-inventory.ts) ~L1238 |

**Secondary (UI):** `receivingFormBaseSchema` + `superRefine` in [`receiving-form.tsx`](../../src/components/domain/inventory/receiving/receiving-form.tsx) — **duplicates** serialized rules (serial required, qty = 1) that the server enforces again.

---

## 4. Sequence

### A — `receiveInventory` (ad-hoc)

```mermaid
sequenceDiagram
  participant P as ReceivingPage
  participant F as ReceivingForm
  participant H as useReceiveInventory
  participant S as receiveInventory
  participant DB as Postgres

  P->>F: product + location + qty + cost
  F->>F: receivingFormBaseSchema + superRefine
  F->>H: mutateAsync(payload)
  H->>H: optimistic patch lists/details
  H->>S: POST RPC
  S->>S: withAuth(inventory.receive)
  S->>S: serialized rules
  S->>DB: tx + row lock, balances, movements, layers
  S-->>H: result
  H->>H: invalidate lists, details, lowStock; movements on settled
```

**Concurrency:** Handler uses **row lock** when loading/updating inventory (`for('update')` pattern in same file) to reduce lost updates.

### B — `receiveGoods` (PO)

High-level pipeline (see file header comment in [`receive-goods.ts`](../../src/server/functions/suppliers/receive-goods.ts) ~L100–108): receipt header → lines → movements (`purchase_in`) → cost layers → balance updates → PO line `quantityReceived` / pending → PO status → optional `product.costPrice` weighted average. **Single transaction** from handler entry.

### C — `bulkReceiveStock`

Handler runs **one** `db.transaction` that batch-validates products, reads existing `inventory` rows for the shared `locationId`, then **bulk inserts/updates** inventory and builds movement rows in-process (separate code path from `receiveInventory` — not a thin wrapper).

---

## 5. Persistence & side effects

| Path | Primary tables / domains | Transaction |
|------|---------------------------|-------------|
| `receiveInventory` | `inventory`, movements, cost layers (per implementation in handler) | Single `db.transaction` |
| `receiveGoods` | PO receipt + inventory + layers + PO lines + product cost | Single `db.transaction` |
| `bulkReceiveStock` | Multiple products at one location | Single `db.transaction` |

Side effects outside row writes: toasts from [`useReceiveInventory`](../../src/hooks/inventory/use-inventory.ts); PO list invalidation typically via callers of `useReceiveGoods` (trace separately if tightening).

---

## 6. Failure matrix

| Condition | Typical error | User-visible (ad-hoc path) | Notes |
|-----------|---------------|----------------------------|--------|
| Zod reject (bad UUID, qty) | Validation | Depends on caller; form should pre-validate | Server is final gate |
| Product not found | `NotFoundError` | Generic receive failure toast | `receiveInventory` ~L1730 |
| Serialized rules | `ValidationError` | Same | serial required, qty ≠ 1, serial on non-serialized |
| Location not found | `NotFoundError` | Same | inside tx |
| Mutation failure after optimistic update | — | `toast.error('Failed to receive inventory')` + **rollback** cached lists | `useReceiveInventory` `onError` |
| PO wrong status / over-receive | Serialized mutation error envelope | PO UI mapping | `receiveGoods` uses `createSerializedMutationError` in several branches |

---

## 7. Cache / read-after-write (`receiveInventory`)

[`useReceiveInventory`](../../src/hooks/inventory/use-inventory.ts): **optimistic** update of `queryKeys.inventory.lists()` and `details()` on mutate; **rollback** on error; **invalidate** lists, details, `lowStock()` on success; **invalidate** `movementsAll()` on settled.

**Stale window:** Brief inconsistency if server rejects after optimistic patch until `onError` restores prior cache.

---

## 8. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| Duplicate serialized rules | UI `superRefine` + server checks | UX/server mismatch if one side changes |
| Permission inconsistency | `bulkReceiveStock` uses `withAuth()` without `PERMISSIONS.inventory.receive` | Any authenticated user may bulk receive if route exposed |
| “Stock in” vocabulary | Adjust vs receive vs RMA | Wrong operator training; wrong API for support |

---

## 9. Verification

- **Tests:** Search `receiveInventory`, `receiveGoods`, `ReceivingForm` under `tests/`.
- **Gaps:** Contract test that UI serialized rules and server errors stay aligned; integration test for optimistic rollback on forced failure.

---

## 10. Follow-up traces

- `adjustInventory` vs receive: when to use which (support doc).
- `receiveRma` return-to-stock path.
- `bulkReceiveStock` call sites vs ad-hoc receiving (product admin flows).
