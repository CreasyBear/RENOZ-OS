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
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  currencyColumn,
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
    quantityCheck: check(
      "purchase_order_items_quantity_positive",
      sql`${table.quantity} > 0`
    ),

    // Unit price must be non-negative
    unitPriceCheck: check(
      "purchase_order_items_unit_price_non_negative",
      sql`${table.unitPrice} >= 0`
    ),

    // Line total calculation validation
    lineTotalCheck: check(
      "purchase_order_items_line_total_calc",
      sql`${table.lineTotal} = ${table.quantity} * ${table.unitPrice}`
    ),

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
    discountCheck: check(
      "purchase_order_items_discount_range",
      sql`${table.discountPercent} >= 0 AND ${table.discountPercent} <= 100`
    ),

    // Tax rate range
    taxRateCheck: check(
      "purchase_order_items_tax_rate_range",
      sql`${table.taxRate} >= 0 AND ${table.taxRate} <= 100`
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("purchase_order_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("purchase_order_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("purchase_order_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("purchase_order_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
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
