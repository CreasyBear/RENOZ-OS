# 12 — Create warranty claim

**Status:** COMPLETE  
**Series order:** 12 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Submit a new **warranty claim** against an **active** (or `expiring_soon`) warranty: server assigns `claimNumber`, creates SLA tracking when configured, queues customer notification, optionally records **serialized item** lineage.

**In scope:** `createWarrantyClaim` ([`warranty-claims.ts`](../../src/server/functions/warranty/claims/warranty-claims.ts)); `createWarrantyClaimSchema` ([`claims.ts`](../../src/lib/schemas/warranty/claims.ts)); [`useCreateWarrantyClaim`](../../src/hooks/warranty/claims/use-warranty-claims.ts); UI [`warranty-claim-form-dialog.tsx`](../../src/components/domain/warranty/dialogs/warranty-claim-form-dialog.tsx) + [`warranty-detail-container.tsx`](../../src/components/domain/warranty/containers/warranty-detail-container.tsx).

**Out of scope:** Approve/deny/resolve/cancel/status transitions (`updateClaimStatus` with idempotency — separate trace); SLA math internals (`@/lib/sla`).

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `organizationId`, `createdBy`, `updatedBy`, `claimNumber` | Server |
| `warrantyId` | Client UUID; server loads warranty + customer + product + policy with **org filter** |
| `customerId` on claim | **Derived** from warranty row — client cannot point claim at arbitrary customer |
| `claimType`, `description`, `notes`, `cycleCountAtClaim` | Client; validated by Zod (`description` min 10 chars) |
| `cycleCountAtClaim` default | Server: `data.cycleCountAtClaim ?? warranty.currentCycleCount` |
| Notification | Trigger.dev `client.sendEvent` — failure is **non-fatal** to claim insert |

---

## 2. Entry points

| Surface | Path |
|---------|------|
| Dialog | `WarrantyClaimFormDialog` — local `claimFormSchema` (claim type + description + optional cycle + notes) |
| Container | `warranty-detail-container` — wires `useCreateWarrantyClaim` → `onSubmit` |

**Discovery:**

```bash
rg -n "useCreateWarrantyClaim|createWarrantyClaim\(" src/
```

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant D as WarrantyClaimFormDialog
  participant H as useCreateWarrantyClaim
  participant S as createWarrantyClaim
  participant DB as Postgres
  participant T as Trigger (warrantyEvents)

  D->>H: mutateAsync(CreateWarrantyClaimInput)
  H->>S: POST RPC
  S->>S: withAuth(warranty.create)
  S->>S: load warranty graph; status in (active, expiring_soon)
  S->>S: generateClaimNumber (prefix CLM-YYYY-)
  S->>DB: tx: set_config, insert claim, optional SLA + link slaTrackingId
  S->>S: optional serialized event (warranty_claimed)
  S->>T: sendEvent claimSubmitted
  alt trigger fails
    T-->>S: error (logged)
    S->>S: notificationQueued = false
  end
  S-->>H: SerializedMutationEnvelope(claim + flags)
  H->>H: invalidate lists + byWarranty; showClaimMutationOutcome
```

**SLA:** If `getWarrantySlaConfig` returns a config, `startSlaTrackingForClaim` runs inside the same transaction, then claim row updated with `slaTrackingId`.

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| Canonical RPC | `createWarrantyClaimSchema`, `CreateWarrantyClaimInput` | [`src/lib/schemas/warranty/claims.ts`](../../src/lib/schemas/warranty/claims.ts) ~L69 |
| UI (dialog) | `claimFormSchema` | [`warranty-claim-form-dialog.tsx`](../../src/components/domain/warranty/dialogs/warranty-claim-form-dialog.tsx) ~L64 — uses `z.literal('')` + refine for claim type; maps to `WarrantyClaimTypeValue` on submit |

**Drift vector:** Dialog hardcodes enum list in `claimFormSchema`; server uses `warrantyClaimTypeSchema` — new server types require dual updates.

---

## 5. AuthZ

`withAuth({ permission: PERMISSIONS.warranty.create })`.

---

## 6. Persistence & side effects

| Step | Stores / effects | Transaction |
|------|------------------|-------------|
| Insert claim | `warranty_claims` (`status: 'submitted'`, `submittedAt`) | Opening `db.transaction` |
| SLA | `sla_tracking`, `sla_events`, update claim `slaTrackingId` | Same tx when config present |
| Serialized | `addSerializedItemEvent` if serial found | After tx (uses `db`, not tx) |
| Activity | `logger.logAsync` warranty_claim created | After tx |
| Notification | Trigger event | After tx; errors swallowed into envelope |

**Idempotency:** Create path does **not** use `hasProcessedIdempotencyKey` (unlike `updateClaimStatus`).

---

## 7. Failure matrix

| Condition | Error / envelope | User-visible |
|-----------|------------------|--------------|
| Warranty not found | `NotFoundError` | Toast via hook `onError` |
| Warranty status not allowed | `ValidationError` | Same |
| Zod reject | Validation | Form |
| Trigger send failure | `serializedMutationSuccess` with `partialFailure` / `notificationQueued: false` | `showClaimMutationOutcome` → warning toast |
| Success + notification OK | Envelope with message | Success toast |

`SerializedMutationEnvelope<T>` is **`T & SerializedMutationResult`** ([`serialized-mutation-contract.ts`](../../src/lib/server/serialized-mutation-contract.ts)) — merged flat shape; `useCreateWarrantyClaim` `onSuccess` uses `result.warrantyId` from the claim row.

---

## 8. Cache & read-after-write

Invalidates `queryKeys.warrantyClaims.lists()` and `queryKeys.warrantyClaims.byWarranty(result.warrantyId)`. Does not prime `detail(claim.id)`.

---

## 9. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| Claim number race | `generateClaimNumber` uses `MAX(claimNumber)` **outside** insert atomicity | Two concurrent creates could collide on number (DB unique constraint would catch; UX retry) |
| Duplicate claim types | Dialog schema vs `warrantyClaimTypeSchema` | New type on server only → client can’t select it |
| Serialized path best-effort | `findSerializedItemBySerial` optional | Missing serial record → no lineage event; claim still created |
| SLA `tx as unknown as typeof db` cast | In `createWarrantyClaim` when starting SLA | Type smell; refactor if SLA helper accepts tx type |

---

## 10. Verification

- Search `createWarrantyClaim`, `WarrantyClaimFormDialog` under `tests/`.
- **Gap:** Notification failure path asserts claim row exists + toast copy; claim number uniqueness under concurrency; contract test dialog output → `createWarrantyClaimSchema.safeParse`.

---

## 11. Follow-up traces

- `updateClaimStatus` + idempotency keys.
- `approveClaim` / `denyClaim` / `resolveClaim` and SLA breach filters.
