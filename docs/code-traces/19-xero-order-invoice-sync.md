# 19 — Xero invoice sync (order → ACCREC)

**Status:** COMPLETE  
**Series order:** 19 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Push a **sales invoice** to **Xero** from an **order** (line items → Xero lines), store `xeroInvoiceId` / URL / sync status on `orders`, short-circuit if already synced, and support **force** resync via wrapper.

**In scope:** `syncInvoiceToXero`, `resyncInvoiceToXero` ([`xero-invoice-sync.ts`](../../src/server/functions/financial/xero-invoice-sync.ts)); `syncInvoiceToXeroSchema`, `resyncInvoiceSchema` ([`lib/schemas/settings/xero-sync.ts`](../../src/lib/schemas/settings/xero-sync.ts)); client hook pattern via [`use-financial.ts`](../../src/hooks/financial/use-financial.ts) (`resyncInvoiceToXero` wired).

**Out of scope:** `handleXeroPaymentUpdate` webhook pipeline (large; separate trace); `getInvoiceXeroStatus` / `listInvoicesBySyncStatus` (read paths); Xero OAuth connection lifecycle (`getXeroSyncReadiness` internals).

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `orderId`, `force` | Client; `force` bypasses “already synced” early return |
| Order / customer / lines | Loaded with `organizationId` + `deletedAt` guards |
| Xero payload | Server builds `ACCREC`, `AUTHORISED`, **AUD**, tax from org settings / defaults |
| `xeroContactId` | **Required** on customer row — otherwise order marked `xeroSyncStatus: error` + message |
| External API | `syncInvoiceWithXero(orgId, payload)` ([`xero-adapter`](../../src/server/functions/financial/xero-adapter.ts)) |
| Duplicate by reference | `findInvoiceByReference(org, order.orderNumber)` — if exists, links id without new POST |

**AuthZ:** `syncInvoiceToXero` uses `withAuth()` **only** — no `PERMISSIONS.financial.*` in handler (~L495).

---

## 2. Preconditions (enforced in handler)

1. **`getXeroSyncReadiness`** — if unavailable, order updated to sync error + returns `{ success: false, integrationAvailable: false }`.
2. Order must exist.
3. **Not** `draft` or `cancelled` — otherwise error return (no Xero call).
4. At least one **line item**.
5. Customer with non-empty **name** and **xeroContactId**.

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant C as Client
  participant S as syncInvoiceToXero
  participant DB as Postgres
  participant X as Xero API

  C->>S: { orderId, force? }
  S->>S: withAuth(); readiness
  alt not ready
    S->>DB: orders xero error
    S-->>C: success false
  end
  S->>DB: load order, customer, lines, org settings
  S->>DB: orders xeroSyncStatus syncing
  alt existing invoice by reference
    S->>DB: mark synced + ids
    S-->>C: success
  else create
    S->>X: syncInvoiceWithXero(payload)
    alt ok
      S->>DB: xeroInvoiceId, synced
      S-->>C: success + url
    else throw
      S->>DB: xeroSyncStatus error + message
      S-->>C: success false (no throw)
    end
  end
```

**Resync:** `resyncInvoiceToXero` → `syncInvoiceToXero({ data: { orderId, force: true } })`.

---

## 4. Contracts

| Symbol | File |
|--------|------|
| `syncInvoiceToXeroSchema` | [`xero-sync.ts`](../../src/lib/schemas/settings/xero-sync.ts) — `orderId`, `force` default false |
| `resyncInvoiceSchema` | same file — `orderId` only |

Return type: `XeroSyncResult` (success flag, status string, optional ids/urls, `integrationAvailable`).

---

## 5. Side effects on `orders`

| Field | Typical values |
|-------|----------------|
| `xeroSyncStatus` | `syncing` → `synced` \| `error` |
| `xeroSyncError` | Cleared on success; populated on failure paths |
| `xeroInvoiceId`, `xeroInvoiceUrl` | Set when synced |
| `lastXeroSyncAt` | ISO string on each attempt |

---

## 6. Failure matrix

| Condition | Behavior |
|-----------|----------|
| Readiness fail | DB error row + structured return |
| Missing customer / name / contact | Return or DB error + message |
| No line items | Return error object |
| Draft/cancelled order | Return error object |
| Xero API error | Caught; `getXeroErrorMessage`; order `error` status; **no throw to client** |
| Already synced | Early success return unless `force` |

UI should use `classifyXeroSyncIssue`-style helpers ([`xero-invoice-sync.ts`](../../src/server/functions/financial/xero-invoice-sync.ts) top) for actionable buttons (reconnect, open settings, etc.).

---

## 7. Cache & read-after-write

[`useResyncXeroInvoice`](../../src/hooks/financial/use-financial.ts) wraps `resyncInvoiceToXero`; `onSuccess` invalidates `queryKeys.financial.xero()`. There is **no** `useServerFn(syncInvoiceToXero)` in `src/` — initial push may be **server/trigger-only** or another entry; confirm product wiring.

---

## 8. Drift & technical debt

| Issue | Evidence |
|-------|----------|
| No fine-grained permission | `withAuth()` only |
| Hardcoded AUD / GST assumptions | Comments + `buildXeroInvoicePayload` / defaults |
| Errors often **returned** not thrown | Client must branch on `success` |
| Duplicate detection by **order number** reference | Collides if reference reused across orgs incorrectly — depends on Xero adapter scope |

---

## 9. Verification

- Search `syncInvoiceToXero`, `xero-invoice-sync` under `tests/`.
- **Gap:** Mock Xero adapter; assert draft order rejected; missing `xeroContactId` path; `force` re-pushes; readiness=false does not call Xero.

---

## 10. Follow-up traces

- `handleXeroPaymentUpdate` + `xeroPaymentEvents` dedupe ([`buildXeroPaymentDedupeKey`](../../src/server/functions/financial/xero-invoice-sync.ts)).
- Order → invoice eligibility rules vs fulfillment status.
