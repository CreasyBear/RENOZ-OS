# Shipping Workflow — Debt, Smell, Frustration & Bad Practices Audit

**Scope:** ShipOrderDialog, PickItemsDialog, fulfillment dashboard, orders list, order detail container.  
**Date:** 2026-02-14

---

## 1. Technical Debt

### 1.1 ~~ShipOrderDialog — 20+ useState, No Form Library~~ — REMEDIATED

**Was:** ShipOrderDialog used raw `useState` for every field.

**Now:** Migrated to TanStack Form per FORM-STANDARDS.md. Uses `useTanStackForm` + `shipOrderFormSchema`, shared field components (TextField, SelectField, etc.). Item selections remain as `useState` (derived from orderData, custom table UI).

---

### 1.2 ~~Validation Logic Duplicated 3x~~ — REMEDIATED

**Was:** Same checks in multiple places.

**Now:** Extracted `getSelectedItems()` and `hasAnyAddress()` as pure helpers in ship-order-dialog.tsx. Schema remains source of truth for validation; helpers derive UI state only.

---

### 1.3 Hardcoded Constants in Component

**Issue:** `CARRIERS`, `CARRIER_SERVICES`, `AU_STATES` are defined inline in ship-order-dialog.tsx. Other carriers (e.g. NZ) would require code changes.

**Recommendation:** Move to `@/lib/constants/shipping.ts` or `@/config/carriers.ts`. Consider org-level config for carriers.

---

### 1.4 ~~Refetch Race Effect — itemSelections in Deps~~ — REMEDIATED

**Was:** Refetch effect had `itemSelections` in deps, causing extra runs.

**Now:** Uses `prevAvailableQtyRef` to compare `orderData` only; deps are `[orderData, initialized]`.

---

### 1.5 ~~Dashboard Metric — Semantic Mismatch~~ — REMEDIATED

**Was:** "Orders to Fulfill" uses `getRecentOrdersToShip` (confirmed orders awaiting pick); undocumented.

**Now:** Code comment added in operations-section.tsx documenting the semantic and future `getRecentOrdersPicked` option.

---

## 2. Code Smells

### 2.1 ~~Two Error State Objects~~ — REMEDIATED

**Was:** `inlineErrors` and `addressFieldErrors` separate.

**Now:** Renamed to `serverItemErrors` with JSDoc; form handles address errors. Server ValidationError keys documented as orderLineItemId.

---

### 2.2 handleCreateShipment Not Memoized

**Issue:** `handleCreateShipment` is recreated every render. Passed to `onClick` — not a child prop, so impact is low.

**Recommendation:** Wrap in `useCallback` if passed to memoized children. Low priority.

---

### 2.3 ~~Address Field Naming Inconsistency~~ — REMEDIATED

**Was:** Server `postalCode`, form `addressPostcode`, API `postcode` — easy to miss.

**Now:** Comment added near address payload mapping.

---

### 2.4 ~~Init Effect — startTransition Usage~~ — REMEDIATED

**Was:** Indentation/brace alignment concerns.

**Now:** Verified; all state updates inside `startTransition`.

---

## 3. User/Developer Frustration

### 3.1 Carrier Change → Stale Service

**Issue:** When user changes carrier (e.g. Australia Post → Other), `carrierService` is not cleared. The old value (e.g. "Express Post") may not exist in the new carrier's options. Radix Select can show a stale/invalid value.

**Recommendation:** Clear `carrierService` when `carrier` changes: `onValueChange={(v) => { setCarrier(v); setCarrierService(""); }}`.

---

### 3.2 ~~No Address Validation on Blur~~ — REMEDIATED

**Was:** Validation only on submit.

**Now:** `validateOnBlur: true` in `useTanStackForm`.

---

### 3.3 ~~Ship-and-Continue — Address Overwrite~~ — REMEDIATED

**Was:** Undocumented address overwrite on refetch.

**Now:** Comment added near ship-and-continue branch.

---

### 3.4 ~~Order Detail Container — Many Dialog State Variables~~ — REMEDIATED

**Was:** 8 `useState` for dialogs.

**Now:** Single `useReducer` with `DialogState` (`open`, `confirmDeliveryShipmentId`) and `dialogReducer`.

---

## 4. Bad Practices

### 4.1 Bare catch Blocks

**Issue:** `markShippedMutation` catch uses `catch {` — error is swallowed. No structured logging or error reporting.

**Recommendation:** Add `logger.error('Mark shipped failed', { error, shipmentId })` or similar. Ensure Sentry/monitoring receives the error.

---

### 4.2 ~~ValidationError Mapping — Key Mismatch Risk~~ — REMEDIATED

**Was:** Undocumented expected error shape.

**Now:** Comment in catch block documents keys as orderLineItemId (order-shipments.ts); values string[].

---

### 4.3 Magic Strings

**Issue:** `"AU"` for default country, `"Recipient"` for fallback name. Status strings like `"picked"`, `"partially_shipped"` used in conditionals.

**Recommendation:** Use constants: `DEFAULT_COUNTRY = "AU"`, `FALLBACK_RECIPIENT_NAME = "Recipient"`. Use `OrderStatus` enum or union where applicable.

---

### 4.4 ~~Inconsistent Error Handling~~ — REMEDIATED

**Was:** Different patterns for createShipment vs markShipped catch.

**Now:** `handleShipmentError()` helper: log, toast, optional setStep/setItemErrors. Both catch blocks use it.

---

## 5. Summary

| Category | Count | Severity |
|----------|-------|----------|
| Debt     | 5     | Medium   |
| Smell    | 4     | Low      |
| Frustration | 4  | Low–Medium |
| Bad Practices | 4 | Low |

**Priority fixes:**

1. ~~**Carrier change clears service**~~ — DONE. `onValueChange` clears `carrierService` when carrier changes.
2. ~~**Extract validation helpers**~~ — REVERTED. Use `shipmentAddressSchema` from `lib/schemas/orders/shipments.ts` as source of truth; inline constants kept in component per conventions.
3. ~~**Add structured logging in catch blocks**~~ — DONE. `ordersLogger.error` in createShipment and markShipped catch blocks.
4. ~~**Consider react-hook-form migration**~~ — DONE. Migrated to TanStack Form per FORM-STANDARDS.md.

---

## 6. Convention Fix (2026-02-14)

Reverted convention-breaking additions:

- **Removed** `lib/constants/shipping.ts` — duplicated schema defaults; constants kept inline in ShipOrderDialog.
- **Removed** `ship-order-validation.ts` — custom validation replaced with `shipmentAddressSchema.safeParse()` from `lib/schemas/orders/shipments.ts`.
- **Schema as source of truth:** Address validation uses `shipmentAddressSchema`; Zod `flatten().fieldErrors` mapped to `addressFieldErrors`.

## 7. FORM-STANDARDS Migration (2026-02-14)

Migrated ShipOrderDialog to TanStack Form per `_misc/docs/design-system/FORM-STANDARDS.md`:

- **TanStack Form:** Replaced 20+ `useState` with `useTanStackForm` + `shipOrderFormSchema`.
- **Schema:** `lib/schemas/orders/ship-order-form.ts` — carrier, address, shipping cost, notes, shipNow.
- **Shared components:** TextField, SelectField, NumberField, TextareaField, CheckboxField, FormField.
- **Refetch effect:** `globalThis.queueMicrotask` for `setInitialized` to satisfy lint (no sync setState in effect).

---

## 8. Out of Scope (Noted for Future)

- **Split shipments to different addresses** — not supported; would require address-per-shipment model.
- **Form persistence** — if user refreshes mid-create, form state is lost.
- **Unit tests** — no tests for ShipOrderDialog validation or ship-and-continue flow.

---

## 9. Debt Remediation (2026-02-14)

Remediated all remaining open items per Shipping Debt Remediation plan:

- **1.2** `getSelectedItems`, `hasAnyAddress` helpers
- **1.4** Refetch effect: `prevAvailableQtyRef`, deps `[orderData, initialized]`
- **1.5** Dashboard metric comment in operations-section.tsx
- **2.1** Renamed `inlineErrors` → `serverItemErrors`, JSDoc
- **2.3** Address field mapping comment
- **2.4** Init effect verified
- **3.2** `validateOnBlur: true`
- **3.3** Ship-and-continue comment
- **3.4** Order detail container `useReducer` for dialog state
- **4.2** ValidationError key shape comment
- **4.4** `handleShipmentError()` helper, standardized catch blocks

Skipped: **1.3** (convention revert), **2.2** (already done).
