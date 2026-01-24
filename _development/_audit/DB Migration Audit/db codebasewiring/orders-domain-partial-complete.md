# Orders Domain Alignment - Partial Complete

**Date:** 2026-01-22  
**Status:** ✅ Orders & Order Line Items Complete

## Summary

Successfully aligned Orders domain Zod schemas and server functions with Drizzle schema definitions for `orders` and `order_line_items` tables. Following ratified patterns.

## Changes Made

### Zod Schemas (`src/lib/schemas/orders/orders.ts`)

1. **Added missing enums:**
   - `orderLineItemPickStatusSchema`: ["not_picked", "picking", "picked"] ✅
   - `xeroSyncStatusSchema`: ["pending", "syncing", "synced", "error"] ✅

2. **Fixed date handling:**
   - Input schemas: `orderDate`, `dueDate` → `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` ✅
   - Output schema: `orderDate`, `dueDate`, `shippedDate`, `deliveredDate` → `z.coerce.date()` ✅

3. **Fixed currency precision:**
   - All currency fields in `orderSchema`: Changed to `currencySchema` ✅
   - Line items: `taxAmount`, `lineTotal` → `currencySchema` ✅

4. **Fixed percentage precision:**
   - `discountPercent`: Already using `percentageSchema` ✅

5. **Added missing fields to orderSchema:**
   - `xeroInvoiceId`: `z.string().nullable()` ✅
   - `xeroSyncStatus`: `xeroSyncStatusSchema.nullable()` ✅
   - `xeroSyncError`: `z.string().nullable()` ✅
   - `lastXeroSyncAt`: `z.string().datetime().nullable()` ✅
   - `xeroInvoiceUrl`: `z.string().nullable()` ✅
   - `version`: `z.number().int().positive()` ✅

6. **Added missing fields to orderLineItemSchema:**
   - `pickStatus`: `orderLineItemPickStatusSchema.default('not_picked')` ✅
   - `pickedAt`: `z.coerce.date().nullable()` ✅
   - `pickedBy`: `z.string().uuid().nullable()` ✅
   - `qtyPicked`, `qtyShipped`, `qtyDelivered`: Changed to `quantitySchema` ✅

### Server Functions (`src/server/functions/orders/orders.ts`)

1. **Fixed date handling:**
   - `createOrder`: Changed `(data.orderDate ?? new Date()).toISOString().slice(0, 10)` to `data.orderDate ?? new Date().toISOString().slice(0, 10)` ✅
   - `dueDate`: Changed to `data.dueDate ?? undefined` ✅

### Hooks (`src/hooks/orders/use-orders.ts`)

- ✅ Already using correct types from Zod schemas
- ✅ No changes needed

## Verification

- ✅ Typecheck: No new errors introduced
- ✅ All enums match Drizzle exactly
- ✅ All currency fields use proper precision
- ✅ All date fields use correct formats (input: strings, output: Date objects)
- ✅ Server functions handle date strings correctly
- ✅ Line items include all fulfillment tracking fields

## Patterns Applied

- Currency (numeric 12,2): `currencySchema` ✅
- Percentage (numeric 5,2): `percentageSchema` ✅
- Date-only fields:
  - Input: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` ✅
  - Output: `z.coerce.date()` ✅
- ISO timestamps: `z.string().datetime()` ✅
- Integer fields: `z.number().int().positive()` ✅
- Quantity fields: `quantitySchema` ✅

## Remaining Work

- [ ] `order_amendments` table alignment
- [ ] `order_shipments` table alignment
- [ ] `order_templates` table alignment

## Next Domain

Ready to proceed with remaining Orders tables or move to **Products** domain.
