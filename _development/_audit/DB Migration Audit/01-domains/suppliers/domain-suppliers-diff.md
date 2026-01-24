# Domain: Suppliers — Diff (PRD vs Drizzle)

## suppliers
- PRD expects `contactName` and single `address` JSONB; Drizzle uses `primaryContactName/Email/Phone` plus separate `billingAddress` and `shippingAddress`.
- PRD expects `supplierCode` unique; Drizzle enforces uniqueness per org (with soft-delete).
- PRD includes constraint `overallRating = (qualityRating + deliveryRating + communicationRating) / 3`; Drizzle does not enforce this formula (range-only checks).
- Drizzle adds lifecycle metrics (`totalPurchaseOrders`, `totalPurchaseValue`, `averageOrderValue`, `firstOrderDate`, `lastOrderDate`) and tags/customFields JSONB not in PRD.

## purchase_orders
- PRD requires `orderedBy` NOT NULL and `approvedAt` required when status != draft; Drizzle allows nullable `orderedBy` and only enforces approvedAt/approvedBy pairing, not status rules.
- Drizzle adds `internalNotes`, `supplierReference`, `internalReference`, and `metadata` beyond PRD.
- PRD does not specify soft delete; Drizzle uses `deletedAt`.

## purchase_order_items
- PRD requires `productId` NOT NULL and `lineTotal = quantity * unitPrice`; Drizzle allows nullable `productId` and does not enforce lineTotal formula.
- Drizzle adds discount/tax fields and receipt tracking fields (`quantityPending`, `actualDeliveryDate`) not in PRD.

## purchase_order_approvals
- PRD approval fields are simpler; Drizzle adds escalation, delegation, due dates, and audit columns.
- Status enum aligns (includes `escalated`).

## purchase_order_approval_rules
- Drizzle adds escalation roles, priority ordering, and audit columns beyond PRD.

## purchase_order_receipts / receipt_items
- Drizzle models inspection requirements, warehouse/bin assignment, and serial/lot tracking beyond PRD.
- PRD specifies `qualityCheckPassed` and `batchNumber`; Drizzle uses `condition`, `rejectionReason`, `qualityNotes`, `lotNumber`, and no explicit `qualityCheckPassed`.

## purchase_order_amendments
- PRD has basic amendment fields; Drizzle adds internal notes and audit columns plus richer status consistency checks.

## purchase_order_costs
- Aligns with PRD concept; Drizzle adds allocation method and inclusion flags.

## supplier_performance_metrics
- PRD schema uses `metricDate` and high-level rate fields (`onTimeDeliveryRate`, `rejectedItemsRate`, `communicationResponsiveness`); Drizzle uses monthly rollups with counts and multiple derived scores.

## supplier_price_lists
- PRD defines core pricing fields; Drizzle adds base/effective price, quantity ranges, discount type/value, status/isActive, and supplier/product denormalized fields.
- Drizzle enforces unique active tier by `(supplierId, productId, minQuantity)`, not specified in PRD.

## price_agreements / price_change_history / supplier_price_history
- Not specified in PRD schema section; Drizzle adds these tables for pricing workflow and audit history.

## Open Questions
- Do we need to enforce the PRD overallRating formula via a computed column or trigger?
- Should `purchase_order_items.productId` be required to match PRD, or keep nullable for non-catalog items?
