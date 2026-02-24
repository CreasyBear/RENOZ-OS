# Amendment Lifecycle

End-to-end flow for order amendments from UI to server and back.

**Related:** [FORM-STANDARDS.md](./design-system/FORM-STANDARDS.md), [STANDARDS.md](../STANDARDS.md)

---

## 1. Lifecycle Overview

```
User opens dialog → Form loads → User edits → Submit → Request → Approve → Apply → Refetch → Close
```

| Phase | Component | Responsibility |
|-------|-----------|----------------|
| 1. Open | OrderDetailContainer | Passes `order={detail.order}`, `orderId` |
| 2. Load | AmendmentRequestDialogContainer | Receives order, initializes form via `getFormDefaults(order)` |
| 3. Edit | AmendmentRequestDialog (presenter) | Renders form fields; handlers update via `form.setFieldValue` |
| 4. Submit | Container | `buildChangesFromForm` → `requestAmendment` → `approveAmendment` → `applyAmendment` |
| 5. Server | order-amendments.ts | Create amendment record; apply changes to order |
| 6. Success | Container | `onOpenChange(false)`, `onSuccess()` → `detail.refetch()` |

---

## 2. Data Flow

### Container (data + mutations)

- **Order**: From parent `order={detail.order}` (no duplicate fetch)
- **Product search**: `useSearchProducts` (enabled when `amendmentType === 'item_add'`)
- **Mutations**: `useRequestAmendment`, `useApproveAmendment`, `useApplyAmendment`
- **Form**: `useTanStackForm` with schema, `getFormDefaults(order)` on init

### Presenter (pure UI)

- Receives: form, order, handlers, formatCurrencyDisplay, etc.
- No `useQuery`, `useMutation` (STANDARDS compliance)

---

## 3. Reactive Updates (Totals & Financial Impact)

When the user changes qty or price, the following must update immediately:
- Per-line "New Total" (newQty × newPrice)
- "Estimated Financial Impact" card (subtotal, tax, total, difference)

**Implementation:**
- `form.Subscribe` selector returns `lineItems`, `amendmentType`, shipping/discount fields
- `lineItemsKey`: stringify id:newQty:newPrice:action per item, join — forces re-render when nested values change (shallow eq can miss)
- `computeFinancialImpact(params)` receives values from the Subscribe callback (not `form.state.values`)

**hasChanges (submit button enable):**
- Value-based: `item.newQty !== item.originalQty || item.newPrice !== item.originalPrice` (doesn't rely on `action` timing)
- Schema validation: same logic so submit passes when values have changed

---

## 4. Form Field Paths

**Critical:** `lineItems[index]` must match the form state array.

| Mode | Rendering | Index source | Correct? |
|------|-----------|--------------|----------|
| quantity_change | All items | `lineItems.map((item, index) => ...)` | Index matches form |
| price_change | All items | Same | Index matches form |
| item_remove | All items | Same | Index matches form |
| item_add (items to add) | Filtered add items | `map((item, index) => ...)`, filter, preserve original `index` | Index matches form |

**Implementation:** Use `findIndex(li => li.id === item.id)` when in doubt for robustness.

---

## 5. buildChangesFromForm

**Location:** `amendment-request-dialog-container.tsx`

- Filters `itemChanges` by `amendmentType` (modify/add/remove)
- Uses `item.id` (orderLineItemId) for existing items, never index
- **Derives modify from values**: includes items where `newQty !== originalQty || newPrice !== originalPrice` even if `action` is still "keep" (timing)

---

## 6. Server Handlers

| Handler | File | Purpose |
|---------|------|---------|
| requestAmendment | order-amendments.ts | Create amendment record; store `changes` JSON |
| approveAmendment | order-amendments.ts | Set status to `approved` |
| applyAmendment | order-amendments.ts | Apply itemChanges, shipping, discount to order; version check |

**applyAmendment** uses `orderLineItemId` (not index) for modify/remove. Uses `productId` for add.

---

## 7. Unpick Flow & Refetch

When user reduces qty below `qtyPicked`, they must unpick first. PickItemsDialog `onSuccess`:
- Closes overlay (`setShowPickOverlay(false)`)
- Calls `onSuccess?.()` → parent `detail.refetch()` so form gets fresh `qtyPicked`

---

## 8. Query Invalidation

**useApplyAmendment.onSuccess** invalidates:

- `queryKeys.orders.all`
- `queryKeys.orders.lists()`
- `queryKeys.orders.detail(amendment.orderId)` (includes `withCustomer` sub-key)
- `queryKeys.orders.amendments(amendment.orderId)`
- `queryKeys.orders.amendmentDetail(variables.amendmentId)`

`detail` is a prefix of `withCustomer`, so invalidation cascades correctly.

---

## 9. Standards Compliance

| Standard | Status |
|----------|--------|
| Container/presenter split | Container has data/mutations; presenter is pure UI |
| No useQuery/useMutation in presenter | Presenter receives all via props |
| Order from parent | No duplicate fetch; `order={detail.order}` |
| Form standards | useTanStackForm, FormDialog, form.Subscribe for reactive UI |
| Pending-close guards | createPendingDialogInteractionGuards, handleDialogOpenChange |

---

## 10. Potential Failure Points

1. **Order undefined during refetch**: Handled by `if (!order && open)` loading state.
2. **Index mismatch**: Use `findIndex` by `item.id` when rendering form fields for robustness.
3. **Form field sync (CRITICAL)**: 
   - LineItemQtyField/LineItemPriceField must call **both** `originalHandleChange(val)` and `onQtyChange(...)`.
   - **Never replace the entire `lineItems` array** via `setFieldValue("lineItems", updated)` on qty/price change—this causes items to disappear. Instead: (a) field's `handleChange` updates `newQty`/`newPrice`; (b) `onQtyChange` updates only `lineItems[index].action` via `setFieldValue(\`lineItems[${index}].action\`, action)`.
4. **Unpick guard**: Server throws if `qtyPicked > newQty`; form validation blocks submit.

---

## 11. Schema Alignment

**amendmentChangesSchema** must include all change payload fields:
- `shippingAmount` (shipping_change)
- `discountPercent`, `discountAmount` (discount_change) — **required** or server won't receive them (Zod strips unknown keys)

---

## 12. Testing Checklist

- [ ] quantity_change: change qty to 5, submit, verify order updates
- [ ] price_change: change price, submit
- [ ] item_add: search, add product, submit
- [ ] item_remove: mark item remove, submit
- [ ] shipping_change: enter new amount, submit
- [ ] discount_change: enter percentage/amount, submit
- [ ] Unpick guard: reduce qty below qtyPicked, verify blocked
- [ ] Dialog close on success; form stays open on failure
