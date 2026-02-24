/**
 * Purchase Order Items Schema
 *
 * Individual line items on purchase orders with receipt tracking.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for full specification
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  currencyColumn,
  standardRlsPolicies,
  nonNullableRangeCheck,
  positiveCheck,
  nonNegativeCheck,
} from "../_shared/patterns";
import { purchaseOrders } from "./purchase-orders";
import { products } from "../products/products";
import { organizations } from "../settings/organizations";

// ============================================================================
// PURCHASE ORDER ITEMS TABLE
// ============================================================================

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to purchase order
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),

    // Link to product (optional for non-inventory items)
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "set null" }),

    // Line item number (1, 2, 3, etc.)
    lineNumber: integer("line_number").notNull(),

    // Product information (denormalized for history)
    productName: text("product_name").notNull(),
    productSku: text("product_sku"),
    description: text("description"),

    // Ordering quantities
    quantity: integer("quantity").notNull(),
    unitOfMeasure: text("unit_of_measure").default("each"),

    // Pricing
    unitPrice: currencyColumn("unit_price"),
    discountPercent: integer("discount_percent").default(0),
    taxRate: integer("tax_rate").default(10), // GST default 10%
    lineTotal: currencyColumn("line_total"),

    // Receipt tracking (updated as goods are received)
    quantityReceived: integer("quantity_received").notNull().default(0),
    quantityRejected: integer("quantity_rejected").notNull().default(0),
    quantityPending: integer("quantity_pending").notNull().default(0),

    // Delivery expectations
    expectedDeliveryDate: date("expected_delivery_date"),
    actualDeliveryDate: date("actual_delivery_date"),

    // Additional information
    notes: text("notes"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Purchase order queries
    purchaseOrderIdx: index("idx_purchase_order_items_po").on(
      table.purchaseOrderId
    ),

    orgPurchaseOrderIdx: index("idx_purchase_order_items_org_po").on(
      table.organizationId,
      table.purchaseOrderId
    ),

    // Product queries
    productIdx: index("idx_purchase_order_items_product").on(table.productId),

    // Line ordering
    poLineNumberIdx: index("idx_purchase_order_items_po_line").on(
      table.purchaseOrderId,
      table.lineNumber
    ),

    // Receipt status queries
    orgReceiptStatusIdx: index("idx_purchase_order_items_org_receipt").on(
      table.organizationId,
      table.quantityReceived
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_items_org_created_id").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Quantity must be positive
    quantityCheck: positiveCheck("purchase_order_items_quantity_positive", table.quantity),

    // Unit price must be non-negative
    unitPriceCheck: nonNegativeCheck("purchase_order_items_unit_price_non_negative", table.unitPrice),

    // Note: line_total includes discount and tax (quantity * unitPrice * (1 - discountPercent/100) * (1 + taxRate/100)).
    // No CHECK constraint - application is source of truth; old constraint assumed line_total = quantity * unit_price.

    // Received quantity cannot exceed ordered quantity
    receivedCheck: check(
      "purchase_order_items_received_max",
      sql`${table.quantityReceived} <= ${table.quantity}`
    ),

    // Rejected cannot exceed received
    rejectedCheck: check(
      "purchase_order_items_rejected_max",
      sql`${table.quantityRejected} <= ${table.quantityReceived}`
    ),

    // Pending = quantity - received
    pendingCalcCheck: check(
      "purchase_order_items_pending_calc",
      sql`${table.quantityPending} = ${table.quantity} - ${table.quantityReceived}`
    ),

    // Discount percent range
    discountCheck: nonNullableRangeCheck("purchase_order_items_discount_range", table.discountPercent, 0, 100),

    // Tax rate range
    taxRateCheck: nonNullableRangeCheck("purchase_order_items_tax_rate_range", table.taxRate, 0, 100),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("purchase_order_items"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderItems.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
    product: one(products, {
      fields: [purchaseOrderItems.productId],
      references: [products.id],
    }),
    // Note: receiptItems relation defined in purchase-order-receipt-items.ts
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
