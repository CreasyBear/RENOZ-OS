# Domain: Orders — Diff (PRD vs Drizzle)

## orders

- PRD uses `orderDate` timestamp; Drizzle uses `date` (no time).
- PRD has `promisedShipDate` + `actualShipDate`; Drizzle has `dueDate`, `shippedDate`, `deliveredDate`.
- PRD uses `totalAmount`; Drizzle splits totals into `subtotal`, `taxAmount`, `shippingAmount`, `discountAmount`, `total`.
- PRD default 0 for `taxAmount`, `shippingAmount`, `discountAmount`; Drizzle uses `currencyColumn` (default 0) but also includes `discountPercent`, `paidAmount`, `balanceDue`.
- PRD requires `createdBy`/`updatedBy` NOT NULL; Drizzle audit columns are nullable and add `deletedAt`.
- PRD has `notes`; Drizzle splits into `internalNotes`, `customerNotes`, and `metadata`.
- Drizzle adds payment tracking (`paymentStatus`, `paidAmount`, `balanceDue`) and Xero sync fields not listed in PRD.
- PRD index on `(organizationId, createdAt DESC)`; Drizzle has `(organizationId, orderDate)` and no createdAt index.

## orderItems (PRD `orderItems` vs Drizzle `orderLineItems`)

- PRD requires `productId` NOT NULL; Drizzle allows NULL for custom items.
- PRD includes product snapshot fields (`productNameSnapshot`, `productSkuSnapshot`, `productDescriptionSnapshot`, `unitPriceSnapshot`); Drizzle uses `sku` + `description` but no snapshots.
- PRD expects quantity integer with `quantity > 0` check; Drizzle uses `quantityColumn` with numeric precision and default 0 (no check).
- PRD requires `lineTotal = quantity * unitPrice`; Drizzle has `lineTotal` but no check.
- Drizzle adds discount/tax fields and fulfillment quantities (`qtyPicked`, `qtyShipped`, `qtyDelivered`).

## orderShipments

- PRD requires `carrier` NOT NULL and `trackingNumber` UNIQUE; Drizzle allows both nullable and no unique constraint.
- PRD uses `estimatedDelivery` (date) and `deliveredAt` timestamp; Drizzle uses `estimatedDeliveryAt` timestamp.
- PRD includes `recipientName`, `deliveryNotes`, `signatureUrl`, `photoUrl`; Drizzle stores these in `deliveryConfirmation` JSONB.
- PRD expects `createdBy`/`updatedBy` NOT NULL; Drizzle audit columns are nullable.

## shipmentItems

- PRD uses `orderItemId`; Drizzle uses `orderLineItemId` (rename).
- PRD `quantityShipped` integer with `> 0` check; Drizzle uses `quantityColumn` (numeric, default 0) without check.
- PRD has constraint `quantityShipped <= orderItems.quantity`; Drizzle has no check.
- Drizzle adds serial/lot tracking (`serialNumbers`, `lotNumber`, `expiryDate`).

## orderAmendments

- PRD status enum: `pending|approved|rejected|applied`; Drizzle uses `requested|approved|rejected|applied`.
- PRD fields: `approvedAt`, `approvedBy`, `version`; Drizzle uses `reviewedAt`, `reviewedBy`, `orderVersionBefore/After`.
- PRD expects `createdBy`/`updatedBy` NOT NULL; Drizzle audit columns are nullable and includes soft delete.
- Drizzle adds `amendmentType` enum and `approvalNotes`.

## orderTemplates

- PRD includes `version`; Drizzle does not.
- PRD expects `createdBy` NOT NULL; Drizzle audit columns are nullable and includes soft delete.
- Drizzle adds `isActive`, `isGlobal`, `defaultCustomerId`, `defaultValues`, `metadata`.

## orderTemplateItems

- PRD requires `productId` NOT NULL; Drizzle allows NULL and adds non-product item details.
- PRD has only `quantity` + `notes`; Drizzle adds pricing, discounts, tax type, `sku`, `description`, `lineNumber`, `sortOrder`.

## Open Questions

- Should order totals remain split fields (`subtotal`, `taxAmount`, `shippingAmount`, `discountAmount`, `total`) instead of single `totalAmount` as in PRD?
- Should `orderDate` be `timestamp` (PRD) instead of `date`?
- Do we want line-item snapshot fields for historical pricing consistency?
