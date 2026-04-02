# 18 — RMA field update (`updateRma`)

**Status:** COMPLETE  
**Series order:** 18 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Patch **non-workflow** fields on an existing RMA header: reason text, customer/internal notes, inspection notes JSON, resolution enum, resolution details — **without** using the dedicated status transitions (`approveRma`, `receiveRma`, `processRma`, etc.).

**In scope:** `updateRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); input = `updateRmaSchema` + `rmaId` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useUpdateRma`](../../src/hooks/support/use-rma.ts).

**Out of scope:** Line item edits (no API in this handler); status changes (schema comment says workflow fns own those — see drift).

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `rmaId` | Client UUID |
| RMA existence | Org-scoped `returnAuthorizations` |
| Patch payload | Only keys present in `updateRmaSchema` merged into `.set()` |
| `updatedBy` | Always `ctx.user.id` (server) |

**AuthZ:** `withAuth()` **without** `PERMISSIONS` — same class as `createRma` / `processRma` ([14](./14-rma-create.md), [15](./15-rma-process-resolution.md)).

---

## 2. Contract vs comment drift

[`updateRmaSchema`](../../src/lib/schemas/support/rma.ts) **includes** `resolution`, `resolutionDetails`, `inspectionNotes` (optional/nullable). The file comment says *“Status changes handled by dedicated functions”* but does **not** explicitly forbid mutating `resolution` here. **Handler spreads `updateData` into Drizzle `set`**, so a client **can** send `resolution` / `resolutionDetails` / `inspectionNotes` via this RPC **in parallel** with `processRma` — risk of **two ways** to write the same conceptual data.

**`status` is not** in `updateRmaSchema`, so status cannot be changed through this validator (unless schema regresses).

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant H as useUpdateRma
  participant S as updateRma
  participant DB as Postgres

  H->>S: POST { rmaId, ...updateRmaSchema fields }
  S->>S: withAuth()
  S->>DB: select RMA by id + org
  S->>DB: update return_authorizations set ...updateData, updatedBy
  S->>DB: select rma_line_items (projection)
  S-->>H: RmaResponse
  H->>H: setQueryData detail; invalidate list
```

**Transaction:** None — single update + read line items.

---

## 4. Persistence

- Table: `return_authorizations` only.
- Line items returned for convenience; **not** updated in this fn.

---

## 5. Failure matrix

| Condition | Error |
|-----------|-------|
| RMA missing | `NotFoundError` |
| Zod reject | Validation |

---

## 6. Cache & read-after-write

`useUpdateRma` `onSuccess`: `setQueryData(rmaDetail(result.id), result)` + `invalidateQueries(rmasList)`.

---

## 7. Drift & technical debt

| Issue | Risk |
|-------|------|
| Dual paths for resolution/inspection | `updateRma` vs `processRma` / `receiveRma` |
| No permission | Over-broad access |
| No optimistic locking | Concurrent patches last-write-wins |
| **getRmaByNumber oddity** (separate) | `getRmaByNumber` input schema reuses `orderId` shape for `rmaNumber` — type smell in same file (~L637) |

---

## 8. Verification

- Search `updateRma`, `useUpdateRma` under `tests/`.
- **Gap:** Forbid or document `resolution` on `updateRma` if `processRma` is canonical; contract test that `status` cannot be injected.

---

## 9. Follow-up traces

- Dedicated “edit RMA line items” if product adds it.
- Consolidate resolution writes into one RPC + deprecate fields on `updateRma`.
