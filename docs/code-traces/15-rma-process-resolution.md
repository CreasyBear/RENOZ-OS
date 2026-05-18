# 15 — RMA process (resolution / close)

**Status:** COMPLETE  
**Series order:** 15 (see [README](./README.md))  
**Last updated:** 2026-05-18
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Execute the selected remedy for a **received** RMA and close it only when the remedy artifact is created or confirmed. Refund creates a refund payment, credit creates a credit note, replacement creates a draft replacement order, and repair / no-action complete without a finance or replacement artifact.

**In scope:** `processRma` ([`orders/rma.ts`](../../src/server/functions/orders/rma.ts)); `executeProcessRma` ([`orders/_shared/rma-execution.ts`](../../src/server/functions/orders/_shared/rma-execution.ts)); `processRmaSchema` ([`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts)); [`useProcessRma`](../../src/hooks/support/use-rma.ts); [`rma-detail-container.tsx`](../../src/components/domain/support/rma/rma-detail-container.tsx).

**Out of scope:** External accounting sync and payment-provider settlement. This handler creates local operational artifacts; downstream sync remains separate.

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `rmaId` | Client UUID |
| Preconditions | RMA must exist for org; `isValidRmaTransition(existing.status, 'processed')` — implementation requires **`received`** |
| `resolution` | Client enum (`rmaResolutionSchema`) |
| Remedy execution | Internal executor calls `executeRmaRemedy` in the same transaction before completing the RMA |
| `resolutionDetails` | Server-built execution details; linked artifact IDs on the RMA are the canonical proof of what executed |
| Inventory | **No** further inventory mutation here — stock was adjusted at **receive** ([13](./13-rma-receive-inventory.md)) |

**AuthZ:** `withAuth({ permission: PERMISSIONS.support.update })` — support-owned remedy execution after inventory-owned receive.

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
  participant EX as executeProcessRma
  participant DB as Postgres

  UI->>H: mutateAsync(ProcessRmaInput)
  H->>S: POST RPC
  S->>S: withAuth(support.update)
  S->>EX: executeProcessRma(ctx, data)
  EX->>DB: select RMA by id + org
  alt wrong status
    EX-->>UI: ValidationError (must be received)
  end
  EX->>DB: tx + set_config org
  EX->>DB: executeRmaRemedy(refund / credit / replacement / repair / no_action)
  EX->>DB: update return_authorizations execution state + artifact ids
  EX-->>S: RmaResponse
  S-->>H: serializedMutationSuccess(RmaResponse envelope)
  H->>H: setQueryData detail; invalidate list
```

**Notable:** `processRma` now returns `SerializedMutationEnvelope<RmaProcessResult>`. The envelope preserves the existing `RmaResponse` fields while adding the same `success` / `message` mutation metadata pattern used by `createRma` and `receiveRma`.

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| RPC | `processRmaSchema`, `ProcessRmaInput` | [`lib/schemas/support/rma.ts`](../../src/lib/schemas/support/rma.ts) ~L142 |
| Resolution enum | `rmaResolutionSchema` | same ~L37 |
| Details | `rmaResolutionDetailsSchema` | same ~L59 (`refundAmount`, `replacementOrderId`, `creditNoteId`, `notes`) |

`processRmaSchema` is now discriminated by resolution. Refund requires source payment + amount, credit requires amount + reason, replacement requires explicit confirmation, and repair/no-action need only notes.

---

## 5. Persistence & side effects

| Resolution | Local artifact / effect |
|------------|-------------------------|
| `refund` | Requires source payment + amount; creates or reuses refund `order_payments` row linked to the source payment; stores `refundPaymentId` |
| `credit` | Requires amount + reason; creates or reuses `credit_notes` row and optional application metadata; stores `creditNoteId` |
| `replacement` | Requires explicit confirmation; creates or reuses draft replacement order and line items; stores `replacementOrderId` |
| `repair` | Completes execution without finance/replacement artifact; stores completed execution state |
| `no_action` | Completes execution without finance/replacement artifact; stores completed execution state |

The RMA stores execution state, linked artifact IDs, `processedAt` / `processedBy`, and server-built `resolutionDetails`. If execution throws, `processRma` stores a blocked execution state and leaves the RMA in `received`.

Artifact links on the RMA row are canonical. `resolutionDetails` can carry useful operator notes and legacy display values, but UI proof of execution should read `execution.refundPayment`, `execution.creditNote`, and `execution.replacementOrder` from the read model.

---

## 6. Failure matrix

| Condition | Error | User-visible |
|-----------|-------|--------------|
| RMA not found | `NotFoundError` | Error toast |
| Not `received` | `ValidationError` | Explicit message |
| Remedy execution blocked | Blocked execution state; RMA remains `received` | UI can show blocked reason |
| Zod reject | Validation | Form |

---

## 7. Cache & read-after-write

`useProcessRma` `onSuccess`: `setQueryData(queryKeys.support.rmaDetail(result.id), result)` + invalidate `rmasList()`. The serialized envelope is field-compatible with `RmaResponse`, so cache keys still read `result.id`, `result.orderId`, `result.creditNoteId`, `result.replacementOrderId`, and linked issue/customer fields directly.

---

## 8. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| **Trace/implementation drift** | Old trace described label-only closeout | Guarded by `rma-workflow-trace-contract.test.ts` |
| **External sync boundary** | Local credit/refund artifacts may still need accounting/payment sync | Operators need artifact status visibility |
| **Integration coverage** | Unit and source-contract tests cover payloads, remedy execution wiring, and cache invalidation; no DB-backed per-resolution process test | Artifact persistence could regress without executable database proof |

---

## 9. Verification

- Search `processRma`, `useProcessRma` under `tests/`.
- **Guard:** `tests/unit/support/rma-workflow-trace-contract.test.ts` verifies trace, ServerFn facade, internal executor, `PERMISSIONS.support.update`, and `executeRmaRemedy` stay aligned.
- **Guard:** `tests/unit/support/rma-remedy-execution-evidence.test.ts` verifies resolution-specific payload requirements, no-artifact remedies, artifact-link projection, and blocked-state payloads.
- **Gap:** Database-backed process integration per resolution type; blocked execution UI state coverage beyond current dialog/state helpers.

---

## 10. Follow-up traces

- Background jobs or manual SOPs that consume `resolution` / `resolutionDetails`.
- `cancelRma` (uses explicit `support:delete` permission — contrast).
