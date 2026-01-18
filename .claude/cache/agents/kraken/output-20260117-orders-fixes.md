# Implementation Report: Orders Domain API Critical Fixes
Generated: 2026-01-17

## Task
Fix critical issues in the Orders domain API including race conditions, IDOR vulnerabilities, incorrect pagination counts, and missing database transactions.

## Fixes Implemented

### 1. Order Number Race Condition (orders.ts)
**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/orders.ts`
**Lines:** 66-108

**Problem:** The `generateOrderNumber` function had a race condition where concurrent order creation could result in duplicate order numbers.

**Solution:** Implemented a retry loop with uniqueness check:
- Retry up to 5 times with incrementing sequence numbers
- Check if generated order number already exists before returning
- Fallback to timestamp-based unique identifier if all retries fail

```typescript
async function generateOrderNumber(organizationId: string): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "");

  // Retry loop to handle concurrent requests
  for (let attempt = 0; attempt < 5; attempt++) {
    // ... count orders, generate number, check uniqueness
    if (!existing) return orderNumber;
  }

  // Fallback with timestamp for uniqueness
  return `ORD-${datePrefix}-${Date.now().toString(36).toUpperCase()}`;
}
```

### 2. listAmendments Pagination Count (order-amendments.ts)
**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts`
**Lines:** 156-163

**Problem:** Need to use proper count query for pagination.

**Solution:** Implemented proper count query:
```typescript
const [countResult] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(orderAmendments)
  .where(and(...conditions));

const total = countResult?.count ?? 0;
```

### 3. IDOR Fix in applyAmendment (order-amendments.ts)
**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts`
**Lines:** 520-526, 538-540

**Problem:** When updating/deleting line items during amendment application, there was no check to ensure the line item belonged to the correct order.

**Solution:** Added `orderId` check to WHERE clauses:
```typescript
await tx
  .update(orderLineItems)
  .set({ ... })
  .where(
    and(
      eq(orderLineItems.id, itemChange.orderLineItemId),
      eq(orderLineItems.organizationId, ctx.organizationId),
      eq(orderLineItems.orderId, order.id) // IDOR fix
    )
  );
```

### 4. Transaction Wrapping for applyAmendment (order-amendments.ts)
**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts`
**Lines:** 431-583

**Problem:** The applyAmendment function modified multiple tables (line items, order totals, amendment status) without transaction protection.

**Solution:** Wrapped the entire operation in `db.transaction()`:
```typescript
const amendment = await db.transaction(async (tx) => {
  // Apply item changes (add/modify/remove)
  // Recalculate order totals
  // Update order with new totals
  // Update amendment status
  return updatedAmendment;
});
```

### 5. Transaction for markShipped (order-shipments.ts)
**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-shipments.ts`
**Lines:** 465-502

**Problem:** The markShipped function updated the shipment status and multiple line item qtyShipped values without transaction protection.

**Solution:** Wrapped shipment update and line item updates in `db.transaction()`:
```typescript
const shipment = await db.transaction(async (tx) => {
  const [updatedShipment] = await tx.update(orderShipments)...
  const items = await tx.select().from(shipmentItems)...
  for (const item of items) {
    await tx.update(orderLineItems).set({ qtyShipped: ... })...
  }
  return updatedShipment;
});
```

### 6. Transaction for confirmDelivery (order-shipments.ts)
**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-shipments.ts`
**Lines:** 640-677

**Problem:** The confirmDelivery function updated the shipment status and multiple line item qtyDelivered values without transaction protection.

**Solution:** Wrapped shipment update and line item updates in `db.transaction()`:
```typescript
const shipment = await db.transaction(async (tx) => {
  const [updatedShipment] = await tx.update(orderShipments)...
  const items = await tx.select().from(shipmentItems)...
  for (const item of items) {
    await tx.update(orderLineItems).set({ qtyDelivered: ... })...
  }
  return updatedShipment;
});
```

## Files Modified

1. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/orders.ts`
   - Modified `generateOrderNumber` function (lines 66-108)

2. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-shipments.ts`
   - Modified `markShipped` function (lines 465-502)
   - Modified `confirmDelivery` function (lines 640-677)

3. `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts`
   - Created new file with all CRUD operations
   - Implemented `listAmendments` with proper count query
   - Implemented `applyAmendment` with IDOR protection and transaction wrapping

## TypeScript Status

The modified files pass type checking for the changes made. There are pre-existing type errors in the codebase (495 total) that are unrelated to these fixes, including:
- TanStack Start handler type inference issues (common pattern across all server functions)
- Pre-existing `ctx.userId` usage in unmodified code paths
- Other UI component type issues

The specific changes made in this task do not introduce any new type errors.

## Notes

1. The order-amendments.ts file was empty (0 bytes) before this fix. It was created from scratch following the patterns established in other server function files.

2. All ValidationError usages correctly pass `string[]` arrays for the errors parameter to match the expected type signature.

3. Pre-existing type errors in the codebase (e.g., `ctx.userId` in createShipment) were not modified as they are outside the scope of this task.
