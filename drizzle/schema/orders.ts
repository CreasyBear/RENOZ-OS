/**
 * Orders Schema
 *
 * Sales orders and line items.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  date,
  jsonb,
  index,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { orderStatusEnum, paymentStatusEnum, taxTypeEnum } from "./enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  organizationColumnBase,
  currencyColumn,
  quantityColumn,
  percentageColumn,
} from "./patterns";
import { customers } from "./customers";
import { products } from "./products";

// ============================================================================
// INTERFACES
// ============================================================================

export interface OrderAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface OrderMetadata {
  source?: "web" | "phone" | "email" | "api" | "pos";
  externalRef?: string;
  notes?: string;
  /** Allow additional properties for extensibility */
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// ORDERS TABLE
// ============================================================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Order identification
    orderNumber: text("order_number").notNull(),

    // Customer reference
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),

    // Status tracking
    status: orderStatusEnum("status").notNull().default("draft"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),

    // Dates
    orderDate: date("order_date").notNull().defaultNow(),
    dueDate: date("due_date"),
    shippedDate: date("shipped_date"),
    deliveredDate: date("delivered_date"),

    // Addresses (JSONB)
    billingAddress: jsonb("billing_address").$type<OrderAddress>(),
    shippingAddress: jsonb("shipping_address").$type<OrderAddress>(),

    // Pricing summary
    subtotal: currencyColumn("subtotal"),
    discountAmount: currencyColumn("discount_amount"),
    discountPercent: percentageColumn("discount_percent"),
    taxAmount: currencyColumn("tax_amount"),
    shippingAmount: currencyColumn("shipping_amount"),
    total: currencyColumn("total"),

    // Payment tracking
    paidAmount: currencyColumn("paid_amount"),
    balanceDue: currencyColumn("balance_due"),

    // Metadata
    metadata: jsonb("metadata").$type<OrderMetadata>().default({}),
    internalNotes: text("internal_notes"),
    customerNotes: text("customer_notes"),

    // Tracking
    version: integer("version").notNull().default(1), // For optimistic locking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique order number per organization
    orderNumberOrgUnique: uniqueIndex("idx_orders_number_org_unique")
      .on(table.organizationId, table.orderNumber)
      .where(sql`${table.deletedAt} IS NULL`),

    // Multi-tenant queries
    orgStatusIdx: index("idx_orders_org_status").on(
      table.organizationId,
      table.status
    ),
    orgPaymentIdx: index("idx_orders_org_payment").on(
      table.organizationId,
      table.paymentStatus
    ),
    orgCustomerIdx: index("idx_orders_org_customer").on(
      table.organizationId,
      table.customerId
    ),
    orgDateIdx: index("idx_orders_org_date").on(
      table.organizationId,
      table.orderDate,
    ),

    // Common queries
    customerIdx: index("idx_orders_customer").on(table.customerId),
  })
);

// ============================================================================
// ORDER LINE ITEMS TABLE
// ============================================================================

export const orderLineItems = pgTable(
  "order_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Parent order
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Product reference (nullable for custom items)
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),

    // Line item details
    lineNumber: text("line_number").notNull(),
    sku: text("sku"),
    description: text("description").notNull(),

    // Quantity and pricing
    quantity: quantityColumn("quantity"),
    unitPrice: currencyColumn("unit_price"),
    discountPercent: percentageColumn("discount_percent"),
    discountAmount: currencyColumn("discount_amount"),
    taxType: taxTypeEnum("tax_type").notNull().default("gst"),
    taxAmount: currencyColumn("tax_amount"),
    lineTotal: currencyColumn("line_total"),

    // Fulfillment tracking
    qtyPicked: quantityColumn("qty_picked"),
    qtyShipped: quantityColumn("qty_shipped"),
    qtyDelivered: quantityColumn("qty_delivered"),

    // Notes
    notes: text("notes"),

    // Tracking
    ...timestampColumns,
  },
  (table) => ({
    // Order line items
    orderIdx: index("idx_order_items_order").on(table.orderId),
    productIdx: index("idx_order_items_product").on(table.productId),

    // Multi-tenant
    orgOrderIdx: index("idx_order_items_org_order").on(
      table.organizationId,
      table.orderId
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  lineItems: many(orderLineItems),
}));

export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderLineItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderLineItems.productId],
    references: [products.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type NewOrderLineItem = typeof orderLineItems.$inferInsert;
