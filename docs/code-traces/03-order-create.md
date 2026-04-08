# 03 — Create order (wizard)

**Status:** COMPLETE  
**Series order:** 03 (see [README](./README.md))  
**Last updated:** 2026-03-26  
**Standard:** [TRACE-STANDARD.md](./TRACE-STANDARD.md)

## 0. Capability & scope

**User capability:** Create an **order** with at least one **line item** for a customer in the current organization, with optional addresses, discounts, shipping, and notes.

**In scope:** Route to order create, `OrderCreationWizard`, `buildOrderSubmitData` / `validateOrderCreationForm`, `createOrder` server fn, idempotency via `clientRequestId`, post-create side effects (search outbox, activity log, quote PDF trigger).

**Out of scope:** Order edit, fulfillment, invoicing, quote-to-order conversion UI, permissions matrix for every role (see AuthZ note).

**Current operator handoff:** Orders created from `New Order` land in `draft`. The operator then opens order detail and clicks `Confirm Order` to move the order into the active fulfillment lifecycle. From there the canonical path is `confirmed -> picking -> picked -> shipped/partially_shipped -> delivered`.

---

## 1. Trust boundary

| Concern | Source of truth |
|---------|-----------------|
| `organizationId`, `createdBy`, `updatedBy` | Server (`ctx` from session + insert) |
| `customerId` | Client UUID; server verifies customer exists for org and not deleted |
| `orderNumber` | Optional from client; else **generated** server-side (`generateOrderNumber`) |
| Line items (product, qty, price, tax, discounts) | Client payload; **validated** by `createOrderSchema`; totals **recomputed** (`calculateLineItemTotals`, `calculateOrderTotals`, `validateInvoiceTotals`) |
| `clientRequestId` | Client-supplied string (min 8 chars after trim); used for **idempotent replay** |

---

## 2. Entry points

| Surface | Path | Trigger |
|---------|------|---------|
| Route | [`src/routes/_authenticated/orders/create.tsx`](../../src/routes/_authenticated/orders/create.tsx) | Navigate to order create |
| Page | [`src/routes/_authenticated/orders/-create-page.tsx`](../../src/routes/_authenticated/orders/-create-page.tsx) | `OrderCreatePage` — builds RPC payload, `clientRequestIdRef` |
| Wizard | [`src/components/domain/orders/creation/order-creation-wizard.tsx`](../../src/components/domain/orders/creation/order-creation-wizard.tsx) | Multi-step UI; calls parent `onSubmit` |
| Form hook | [`src/hooks/orders/use-order-creation-form.ts`](../../src/hooks/orders/use-order-creation-form.ts) | `orderCreationFormSchema`, `buildOrderSubmitData`, `validateOrderCreationForm` |
| Mutation | [`src/hooks/orders/use-orders.ts`](../../src/hooks/orders/use-orders.ts) | `useCreateOrder` |

**Discovery:**

```bash
rg -n "useCreateOrder|createOrder\(" src/
rg -n "OrderCreationWizard" src/
```

---

## 3. Sequence

```mermaid
sequenceDiagram
  participant W as OrderCreationWizard
  participant P as -create-page.tsx
  participant M as useCreateOrder
  participant S as createOrder
  participant DB as Postgres
  participant T as Trigger (quote PDF)

  W->>W: orderCreationFormSchema (TanStack Form)
  W->>W: validateOrderCreationForm (throws)
  W->>P: onSubmit(OrderSubmitData)
  P->>P: format dates ISO date-only
  P->>M: mutateAsync(CreateOrder)
  M->>S: POST RPC
  S->>S: withAuth (no explicit permission — see §5)
  S->>S: replay by clientRequestId?
  S->>S: customer exists?
  S->>S: orderNumber unique?
  S->>S: line totals + validateInvoiceTotals
  S->>DB: tx: orders + line items + search outbox
  S->>T: generateQuotePdf.trigger (fire-and-forget)
  S-->>M: OrderWithLineItems
  M->>M: setQueryData detail; invalidate lists
  P->>P: navigate /orders/$orderId
  P->>P: order detail opens in draft state
  Note over P,S: Operator clicks "Confirm Order" on detail to enter fulfillment
```

**Idempotency:** If `getOrderByClientRequestId` finds a row, handler **returns existing** order. On unique violation (`23505`), handler attempts same lookup and returns existing if found ([`order-write.ts`](../../src/server/functions/orders/order-write.ts)).

---

## 4. Contracts

| Layer | Symbol | File |
|-------|--------|------|
| Wizard / form | `orderCreationFormSchema`, `OrderCreationFormValues` | [`src/lib/schemas/orders/order-creation-form.ts`](../../src/lib/schemas/orders/order-creation-form.ts) |
| Submit DTO (typed) | `OrderSubmitData` | same file (interface) |
| Canonical RPC | `createOrderSchema`, type `CreateOrder` | [`src/lib/schemas/orders/orders.ts`](../../src/lib/schemas/orders/orders.ts) ~L119 |
| Server gate | `.inputValidator(createOrderSchema)` | [`createOrder`](../../src/server/functions/orders/order-write.ts) ~L51–52 |

**Business rules (client, pre-RPC):** `validateOrderCreationForm` — line discount mutual exclusion, discount cap, `validateOrderBusinessRules` on calculated total. **Server** still runs its own total reconciliation (`validateInvoiceTotals`).

---

## 5. AuthZ

- `createOrder` calls `withAuth()` **without** `{ permission: … }` ([`order-write.ts`](../../src/server/functions/orders/order-write.ts) ~L54). Any authenticated session with a valid org context can create orders unless gated elsewhere (route loader not traced here).
- **Drift vs** `createProduct` / `createSupplier` / `receiveInventory`, which pass explicit `PERMISSIONS.*`.

---

## 6. Persistence & side effects

| Step | What | Transaction |
|------|------|-------------|
| Insert | `orders` + `order_line_items` | Single `db.transaction`; `set_config` for org |
| Search | `enqueueSearchIndexOutbox` entity `order` | Same tx |
| PDF | `generateQuotePdf.trigger` | After tx; errors logged, not thrown to client |
| Activity | `logger.logAsync` order created | After tx |

---

## 7. Failure matrix

| Condition | Error | User-visible |
|-----------|-------|--------------|
| `clientRequestId` too short | `ValidationError` | `normalizeOrderMutationError` in `useCreateOrder` |
| Customer missing / wrong org | `ValidationError` | Same |
| Duplicate `orderNumber` | `ConflictError` | Same |
| Totals don’t reconcile | `ValidationError` | Same |
| Double submit same `clientRequestId` | Success (replay) | Navigates to same order |
| PDF trigger fails | Logged only | No user-facing error |

---

## 8. Cache & read-after-write

`useCreateOrder` `onSuccess` ([`use-orders.ts`](../../src/hooks/orders/use-orders.ts)): `setQueryData(queryKeys.orders.detail(result.id), result)`; `invalidateQueries` on `queryKeys.orders.lists()` and `queryKeys.orders.byCustomer(customerId)` when present.

---

## 9. Drift & technical debt

| Issue | Evidence | Risk |
|-------|----------|------|
| No explicit create permission | `withAuth()` only on `createOrder` | Over-broad access if UI is reachable |
| Parallel validation | Form `validateOrderCreationForm` + server totals check | Divergence if formulas change in one place |
| Draft persistence disabled | Comment in `useOrderCreationForm` | UX/product expectation mismatch |

## 10. Current lifecycle reminder

Today the expected operator flow after create is:

1. Create order from `New Order`
2. Land on order detail in `draft`
3. Click `Confirm Order`
4. Pick items
5. Create shipment / ship remaining
6. Confirm delivery
7. Generate commercial and operational documents from order detail as needed

---

## 11. Verification

- Search `createOrder`, `OrderCreationWizard`, `validateOrderCreationForm` under `tests/`.
- **Gap:** Idempotent replay test (same `clientRequestId` twice returns same id); permission test once `PERMISSIONS.order.create` (or equivalent) exists.

---

## 12. Follow-up traces

- Add line item / edit order line flows.
- Quote PDF pipeline (`generateQuotePdf`) failure modes and retries.
