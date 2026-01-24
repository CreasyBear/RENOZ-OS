# Orders Domain Alignment - Complete

**Date:** 2026-01-22  
**Status:** ✅ Complete

## Summary

Successfully aligned all Orders domain Zod schemas and server functions with Drizzle schema definitions. All tables (`orders`, `order_line_items`, `order_amendments`, `order_shipments`, `order_templates`) are now aligned following ratified patterns.

## Changes Made

### Zod Schemas

#### `src/lib/schemas/orders/orders.ts`

1. **Added missing enums:**
   - `orderLineItemPickStatusSchema`: ["not_picked", "picking", "picked"] ✅
   - `xeroSyncStatusSchema`: ["pending", "syncing", "synced", "error"] ✅

2. **Fixed date handling:**
   - Input schemas: `orderDate`, `dueDate` → `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` ✅
   - Output schema: `orderDate`, `dueDate`, `shippedDate`, `deliveredDate` → `z.coerce.date()` ✅

3. **Fixed currency precision:**
   - All currency fields in `orderSchema`: Changed to `currencySchema` ✅
   - Line items: `taxAmount`, `lineTotal` → `currencySchema` ✅

4. **Added missing fields to orderSchema:**
   - `xeroInvoiceId`, `xeroSyncError`, `xeroInvoiceUrl`: `z.string().nullable()` ✅
   - `xeroSyncStatus`: `xeroSyncStatusSchema.nullable()` ✅
   - `lastXeroSyncAt`: `z.string().datetime().nullable()` ✅
   - `version`: `z.number().int().positive()` ✅

5. **Added missing fields to orderLineItemSchema:**
   - `pickStatus`: `orderLineItemPickStatusSchema.default('not_picked')` ✅
   - `pickedAt`: `z.coerce.date().nullable()` ✅
   - `pickedBy`: `z.string().uuid().nullable()` ✅
   - `qtyPicked`, `qtyShipped`, `qtyDelivered`: Changed to `quantitySchema` ✅

#### `src/lib/schemas/orders/order-amendments.ts`

1. **Fixed currency precision:**
   - `financialImpact.difference`: Changed from `z.number().int()` to `currencySchema` ✅

#### `src/lib/schemas/orders/shipments.ts`

1. **Fixed quantity precision:**
   - `createShipmentSchema.items[].quantity`: Changed to `quantitySchema.min(1)` ✅
   - `shipmentItemSchema.quantity`: Changed to `quantitySchema` ✅

#### `src/lib/schemas/orders/order-templates.ts`

- ✅ Already aligned - no changes needed

### Server Functions (`src/server/functions/orders/orders.ts`)

1. **Fixed date handling:**
   - `createOrder`: Changed `(data.orderDate ?? new Date()).toISOString().slice(0, 10)` to `data.orderDate ?? new Date().toISOString().slice(0, 10)` ✅
   - `dueDate`: Changed to `data.dueDate ?? undefined` ✅

### Hooks (`src/hooks/orders/use-orders.ts`)

- ✅ Already using correct types from Zod schemas
- ✅ No changes needed

## Verification

- ✅ Typecheck: No new errors introduced (pre-existing errors unrelated to schema alignment)
- ✅ All enums match Drizzle exactly
- ✅ All currency fields use proper precision
- ✅ All date fields use correct formats (input: strings, output: Date objects)
- ✅ All quantity fields use proper precision
- ✅ Server functions handle date strings correctly
- ✅ All tables aligned: orders, order_line_items, order_amendments, order_shipments, order_templates

## Patterns Applied

- Currency (numeric 12,2): `currencySchema` ✅
- Percentage (numeric 5,2): `percentageSchema` ✅
- Quantity (numeric 10,3): `quantitySchema` ✅
- Date-only fields:
  - Input: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` ✅
  - Output: `z.coerce.date()` ✅
- ISO timestamps: `z.string().datetime()` ✅
- Integer fields: `z.number().int().positive()` ✅

## Known Issues (Pre-existing)

- Duplicate export: `XeroSyncStatus` exported from both `orders/orders.ts` and `settings/xero-sync.ts` (not blocking)

## Next Domain

Ready to proceed with **Products** domain.
