# 15 — RMA process (resolution / close)

**Status:** COMPLETE  
**Series order:** 15 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Mark a **received** RMA as **processed** by recording a **resolution** enum (`refund`, `replacement`, `repair`, `credit`, `no_action`) and optional **resolution details** (refund amount, replacement order id, credit note id, notes). Server stamps `resolvedAt` / `resolvedBy`.

**In scope:** `processRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); `processRmaSchema` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useProcessRma`](../../src/hooks/support/use-rma.ts); [`rma-detail-container.tsx`](../../src/components/domain/support/rma/rma-detail-container.tsx).

**Out of scope:** Financial execution (no automatic refund transaction, Xero credit note creation, or replacement order spawn in this handler — fields are **persistence only** unless another job reads them).

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `rmaId` | Client UUID |
| Preconditions | RMA must exist for org; `isValidRmaTransition(existing.status, 'processed')` — implementation requires **`received`** |
| `resolution` | Client enum (`rmaResolutionSchema`) |
| `resolutionDetails` | Optional; server **merges** `resolvedAt` (ISO now) and `resolvedBy` (user id), overwriting any client duplicates in the spread |
| Inventory | **No** further inventory mutation here — stock was adjusted at **receive** ([13](./13-rma-receive-inventory.md)) |

**AuthZ:** `withAuth()` **without** explicit permission — same gap class as `createRma` ([14](./14-rma-create.md)) and contrast with `receiveRma`’s `inventory.receive`.

---

## 2. Entry points

```bash
rg -n "useProcessRma|processRma\(" src/
```

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant UI as RMA detail
  participant H as useProcessRma
  participant S as processRma
  participant DB as Postgres

  UI->>H: mutateAsync(ProcessRmaInput)
  H->>S: POST RPC
  S->>S: withAuth()
  S->>DB: select RMA by id + org
  alt wrong status
    S-->>UI: ValidationError (must be received)
  end
  S->>DB: update return_authorizations processed + resolution + resolutionDetails JSON
  S->>DB: select line items (projection)
  S-->>H: RmaResponse (plain object)
  H->>H: setQueryData detail; invalidate list
```

**Notable:** Handler returns **`RmaResponse` directly** — **not** `serializedMutationSuccess` — unlike `createRma` / `receiveRma` envelope pattern. Clients must not assume `success` / `message` fields on this RPC.

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| RPC | `processRmaSchema`, `ProcessRmaInput` | [`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts) ~L142 |
| Resolution enum | `rmaResolutionSchema` | same ~L37 |
| Details | `rmaResolutionDetailsSchema` | same ~L59 (`refundAmount`, `replacementOrderId`, `creditNoteId`, `notes`) |

**Drift:** `rmaResolutionDetailsSchema` allows client `resolvedAt` / `resolvedBy`; handler overwrites via spread order (`...data.resolutionDetails` then server fields).

---

## 5. Persistence & side effects

| Column / field | Set |
|----------------|-----|
| `status` | `'processed'` |
| `processedAt`, `processedBy` | Now string / user id |
| `resolution` | Enum |
| `resolutionDetails` | JSON blob with audit stamps |

No activity logger call in this handler (unlike some PO/Warranty paths) — verify product expectation.

---

## 6. Failure matrix

| Condition | Error | User-visible |
|-----------|-------|--------------|
| RMA not found | `NotFoundError` | Error toast |
| Not `received` | `ValidationError` | Explicit message |
| Zod reject | Validation | Form |

---

## 7. Cache & read-after-write

`useProcessRma` `onSuccess`: `setQueryData(queryKeys.support.rmaDetail(result.id), result)` + invalidate `rmasList()`.

---

## 8. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| **Resolution is metadata-only** | No downstream trigger in this fn | Ops think “refund” ran money; it did not |
| **Inconsistent mutation envelope** | `processRma` vs `receiveRma` serialized envelope | Client error handling must branch by endpoint |
| **No permission** | Bare `withAuth()` | Anyone authenticated could process if UI reachable |
| **UUID fields unverified** | `replacementOrderId` / `creditNoteId` not joined to real rows | Garbage FKs in JSON |

---

## 9. Verification

- Search `processRma`, `useProcessRma` under `tests/`.
- **Gap:** Reject transition from `approved` (should fail); assert replacement order id optional integrity if product adds FK validation later.

---

## 10. Follow-up traces

- Background jobs or manual SOPs that consume `resolution` / `resolutionDetails`.
- `cancelRma` (uses explicit `support:delete` permission — contrast).
