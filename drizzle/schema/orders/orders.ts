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
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  integer,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  orderStatusEnum,
  paymentStatusEnum,
  taxTypeEnum,
  xeroSyncStatusEnum,
  orderLineItemPickStatusEnum,
} from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  quantityColumn,
  percentageColumn,
} from "../_shared/patterns";
import { customers } from "../customers/customers";
import { products } from "../products/products";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

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
  priority?: "normal" | "high" | "urgent";
  assignedTo?: string; // User ID of assigned user
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
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

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

    // Xero integration
    xeroInvoiceId: text("xero_invoice_id"), // Xero invoice ID after sync
    xeroSyncStatus: xeroSyncStatusEnum("xero_sync_status").default("pending"),
    xeroSyncError: text("xero_sync_error"), // Last sync error message
    lastXeroSyncAt: text("last_xero_sync_at"), // ISO timestamp of last sync attempt
    xeroInvoiceUrl: text("xero_invoice_url"), // Deep link to Xero invoice

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
    orgCreatedIdx: index("idx_orders_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Common queries
    customerIdx: index("idx_orders_customer").on(table.customerId),

    // Xero sync queries
    xeroSyncIdx: index("idx_orders_xero_sync").on(
      table.organizationId,
      table.xeroSyncStatus
    ),
    // Portal RLS (customer + subcontractor scope)
    portalSelectPolicy: pgPolicy("orders_portal_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`(
        ${table.organizationId} = current_setting('app.organization_id', true)::uuid
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = ${table.organizationId}
            AND pi.scope = 'customer'
            AND pi.customer_id = ${table.customerId}
        )
        OR EXISTS (
          SELECT 1 FROM portal_identities pi
          JOIN job_assignments ja ON ja.id = pi.job_assignment_id
          WHERE pi.auth_user_id = auth.uid()
            AND pi.status = 'active'
            AND pi.organization_id = ${table.organizationId}
            AND pi.scope = 'subcontractor'
            AND ja.order_id = ${table.id}
        )
      )`,
    }),
  })
);

// ============================================================================
// ORDER LINE ITEMS TABLE
// ============================================================================

export const orderLineItems = pgTable(
  "order_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

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
    pickStatus: orderLineItemPickStatusEnum("pick_status").notNull().default("not_picked"),
    pickedAt: timestamp("picked_at", { withTimezone: true }),
    pickedBy: uuid("picked_by").references(() => users.id, { onDelete: "set null" }),
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
    orgPickStatusIdx: index("idx_order_items_org_pick_status").on(
      table.organizationId,
      table.pickStatus
    ),
    orgCreatedIdx: index("idx_order_items_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    // Portal RLS (customer + subcontractor scope)
    portalSelectPolicy: pgPolicy("order_line_items_portal_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`(
        ${table.organizationId} = current_setting('app.organization_id', true)::uuid
        OR EXISTS (
          SELECT 1 FROM orders o
          WHERE o.id = ${table.orderId}
            AND o.organization_id = ${table.organizationId}
            AND (
              EXISTS (
                SELECT 1 FROM portal_identities pi
                WHERE pi.auth_user_id = auth.uid()
                  AND pi.status = 'active'
                  AND pi.organization_id = ${table.organizationId}
                  AND pi.scope = 'customer'
                  AND pi.customer_id = o.customer_id
              )
              OR EXISTS (
                SELECT 1 FROM portal_identities pi
                JOIN job_assignments ja ON ja.id = pi.job_assignment_id
                WHERE pi.auth_user_id = auth.uid()
                  AND pi.status = 'active'
                  AND pi.organization_id = ${table.organizationId}
                  AND pi.scope = 'subcontractor'
                  AND ja.order_id = o.id
              )
            )
        )
      )`,
    }),
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
  pickedByUser: one(users, {
    fields: [orderLineItems.pickedBy],
    references: [users.id],
    relationName: "pickedBy",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type NewOrderLineItem = typeof orderLineItems.$inferInsert;
