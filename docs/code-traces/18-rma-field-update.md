# 18 — RMA field update (`updateRma`)

**Status:** COMPLETE  
**Series order:** 18 (see [README](./README.md))  
**Last updated:** 2026-05-04
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Patch **non-workflow** fields on an existing RMA header: reason, reason details, customer notes, and internal notes — without using the dedicated status transitions (`approveRma`, `receiveRma`, `processRma`, etc.).

**In scope:** `updateRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); input = `updateRmaSchema` + `rmaId` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useUpdateRma`](../../src/hooks/support/use-rma.ts).

**Out of scope:** Line item edits (no API in this handler); status changes; receipt inspection; remedy resolution/execution.

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `rmaId` | Client UUID |
| RMA existence | Org-scoped `returnAuthorizations` |
| Patch payload | Only keys present in `updateRmaSchema` merged into `.set()` |
| `updatedBy` | Always `ctx.user.id` (server) |

**AuthZ:** `withAuth({ permission: PERMISSIONS.support.update })` — aligned with support-owned non-workflow RMA edits and remedy processing.

---

## 2. Contract

[`updateRmaSchema`](../../src/lib/schemas/support/rma.ts) is strict and allows only general RMA header fields. Workflow-owned fields rejected here:

- `inspectionNotes` belongs to `receiveRma`
- `resolution` belongs to `processRma`
- `resolutionDetails` belongs to `processRma`
- `status` belongs to dedicated transition RPCs

The handler still spreads validated `updateData` into Drizzle `set`, so strict schema validation is the workflow boundary.

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant H as useUpdateRma
  participant S as updateRma
  participant DB as Postgres

  H->>S: POST { rmaId, ...updateRmaSchema fields }
  S->>S: withAuth(support.update)
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
| No optimistic locking | Concurrent patches last-write-wins |
| **getRmaByNumber oddity** (separate) | `getRmaByNumber` input schema reuses `orderId` shape for `rmaNumber` — type smell in same file (~L637) |

---

## 8. Verification

- Search `updateRma`, `useUpdateRma` under `tests/`.
- **Guard:** `tests/unit/support/rma-workflow-trace-contract.test.ts` verifies the trace and server stay aligned on `PERMISSIONS.support.update`.
- **Guard:** `tests/unit/support/rma-field-update-boundary.test.ts` verifies general updates remain allowed while workflow-owned fields and status are rejected.
- **Gap:** Add optimistic locking if concurrent RMA header edits become operator-visible.

---

## 9. Follow-up traces

- Dedicated “edit RMA line items” if product adds it.
- Migrate any future direct `updateRma` callers to workflow RPCs if they need inspection or remedy state.
