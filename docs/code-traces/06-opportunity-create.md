# 06 — Create opportunity

**Status:** COMPLETE  
**Series order:** 06 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Create a **pipeline opportunity** linked to a **customer**, with stage, value, probability, optional contact/assignee, and tags/metadata.

**In scope:** `createOpportunity` server fn, `useCreateOpportunity`, primary routes/dialogs that call the mutation.

**Out of scope:** Opportunity update (version locking), activities timeline, win/loss automation, search indexing implementation details beyond mention.

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `organizationId`, `createdBy`, `updatedBy` | Server |
| `customerId` | Client UUID; `verifyCustomerExists(customerId, organizationId)` before insert |
| `probability` | Optional from client; if omitted, server uses `getDefaultProbability(stage)` |
| `weightedValue` | **Computed** server-side from value + actual probability |
| `followUpDate` | Present on **Zod schema** but **not** read in handler destructuring — see §9 |

---

## 2. Entry points

| Surface | Path |
|---------|------|
| Full page | [`src/routes/_authenticated/pipeline/new-opportunity-page.tsx`](../../src/routes/_authenticated/pipeline/new-opportunity-page.tsx) |
| Quick create | [`opportunity-quick-dialog.tsx`](../../src/components/domain/pipeline/opportunities/opportunity-quick-dialog.tsx) |
| Mutation hook | [`useCreateOpportunity`](../../src/hooks/pipeline/use-opportunity-mutations.ts) |

**Discovery:**

```bash
rg -n "useCreateOpportunity|createOpportunity\(" src/
```

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant U as UI (page or dialog)
  participant M as useCreateOpportunity
  participant S as createOpportunity
  participant DB as Postgres

  U->>M: mutateAsync(CreateOpportunity)
  M->>S: POST RPC
  S->>S: withAuth(opportunity.create fallback string)
  S->>S: verifyCustomerExists
  S->>S: default probability + weightedValue
  S->>DB: tx insert opportunities + search outbox
  S->>S: logAsync created
  S-->>M: { opportunity }
  M->>M: setQueryData detail; invalidate lists + metrics
```

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| Canonical RPC | `createOpportunitySchema`, `CreateOpportunity` | [`src/lib/schemas/pipeline/pipeline.ts`](../../src/lib/schemas/pipeline/pipeline.ts) ~L82 |
| Server gate | `.inputValidator(createOpportunitySchema)` | [`createOpportunity`](../../src/server/functions/pipeline/pipeline.ts) ~L690–692 |

**UI:** Page/dialog builds objects compatible with `CreateOpportunity`; no separate exported “form schema” in the same file as customer wizard — validate against field parity when editing forms.

---

## 5. AuthZ

`withAuth({ permission: PERMISSIONS.opportunity?.create ?? 'opportunity:create' })` — fallback string if `PERMISSIONS.opportunity` undefined ([`pipeline.ts`](../../src/server/functions/pipeline/pipeline.ts) ~L693).

---

## 6. Persistence & side effects

| Step | What | Transaction |
|------|------|-------------|
| Insert | `opportunities` row (version 1, `daysInStage: 0`, etc.) | Single `db.transaction` |
| Search | `enqueueSearchIndexOutbox` entity `opportunity` | Same tx |
| Activity | `logger.logAsync` | After tx |

---

## 7. Failure matrix

| Condition | Error | User-visible |
|-----------|-------|--------------|
| Zod reject | Validation | Form / toast depending on caller |
| Customer not accessible | From `verifyCustomerExists` | Mutation error message |
| Permission denied | `PermissionDeniedError` | Standard |

---

## 8. Cache & read-after-write

`useCreateOpportunity` `onSuccess`: `setQueryData(queryKeys.pipeline.opportunity(result.opportunity.id), result)`; invalidates `queryKeys.opportunities.lists()` and `queryKeys.pipeline.metrics()`.

---

## 9. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| **Silent field drop** | `createOpportunitySchema` includes `followUpDate`; handler destructuring omits it — not passed to `insert` | User thinks follow-up was saved; DB stays null |
| Permission fallback | `PERMISSIONS.opportunity?.create ?? 'opportunity:create'` | Typo drift if constants rename |

---

## 10. Verification

- Search `createOpportunity`, `new-opportunity-page` under `tests/`.
- **Gap:** Assert `followUpDate` either persisted or removed from schema; regression test for weighted value calculation.

---

## 11. Follow-up traces

- `updateOpportunity` optimistic locking (`version` required).
- Opportunity activities (`createOpportunityActivity`).
