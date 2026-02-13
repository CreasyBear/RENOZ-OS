/**
 * Purchase Orders Schema
 *
 * Complete purchase order lifecycle management database schema.
 * Includes purchase orders with full financial and tracking capabilities.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for full specification
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  date,
  timestamp,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { purchaseOrderStatusEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  numericCasted,
  standardRlsPolicies,
  sqlCurrentDate,
} from "../_shared/patterns";
import { suppliers, type SupplierAddress } from "./suppliers";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Flexible metadata for purchase orders (JSONB column)
 */
export interface PurchaseOrderMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// PURCHASE ORDERS TABLE
// ============================================================================

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // PO number (auto-generated, unique per org)
    poNumber: text("po_number")
      .notNull()
      .default(sql`'PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)`),

    // Link to supplier
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),

    // Status and dates
    status: purchaseOrderStatusEnum("status").notNull().default("draft"),
    orderDate: date("order_date").notNull().default(sqlCurrentDate()),
    requiredDate: date("required_date"),
    expectedDeliveryDate: date("expected_delivery_date"),
    actualDeliveryDate: date("actual_delivery_date"),

    // Addresses (JSONB for flexibility, can override supplier defaults)
    shipToAddress: jsonb("ship_to_address").$type<SupplierAddress>(),
    billToAddress: jsonb("bill_to_address").$type<SupplierAddress>(),

    // Financial amounts
    subtotal: currencyColumn("subtotal"),
    taxAmount: currencyColumn("tax_amount"),
    shippingAmount: currencyColumn("shipping_amount"),
    discountAmount: currencyColumn("discount_amount"),
    totalAmount: currencyColumn("total_amount"),

    // Business terms
    currency: text("currency").notNull().default("AUD"),
    exchangeRate: numericCasted("exchange_rate", { precision: 12, scale: 6 }), // 1 PO currency = X org currency
    exchangeDate: date("exchange_date"), // Date rate was applied
    paymentTerms: text("payment_terms"),

    // Order workflow - who created and ordered
    orderedBy: uuid("ordered_by")
      .references(() => users.id, { onDelete: "set null" }),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),

    // Approval workflow
    approvedBy: uuid("approved_by")
      .references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvalNotes: text("approval_notes"),

    // Closure/cancellation
    closedBy: uuid("closed_by")
      .references(() => users.id, { onDelete: "set null" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedReason: text("closed_reason"),

    // Reference numbers
    supplierReference: text("supplier_reference"), // Supplier's order number
    internalReference: text("internal_reference"), // Internal project/job reference

    // Additional information
    notes: text("notes"),
    internalNotes: text("internal_notes"), // Not visible to supplier
    metadata: jsonb("metadata").$type<PurchaseOrderMetadata>().default({}),

    // Version for optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique PO number per organization
    poNumberOrgUnique: uniqueIndex("idx_purchase_orders_po_number_org_unique")
      .on(table.organizationId, table.poNumber)
      .where(sql`${table.deletedAt} IS NULL`),

    // Multi-tenant queries
    orgStatusIdx: index("idx_purchase_orders_org_status").on(
      table.organizationId,
      table.status
    ),

    orgSupplierIdx: index("idx_purchase_orders_org_supplier").on(
      table.organizationId,
      table.supplierId
    ),

    // Supplier queries
    supplierIdx: index("idx_purchase_orders_supplier").on(table.supplierId),
    supplierStatusIdx: index("idx_purchase_orders_supplier_status").on(
      table.supplierId,
      table.status
    ),

    // Date queries
    orderDateIdx: index("idx_purchase_orders_order_date").on(table.orderDate),
    requiredDateIdx: index("idx_purchase_orders_required_date").on(
      table.requiredDate
    ),
    expectedDeliveryIdx: index("idx_purchase_orders_expected_delivery").on(
      table.expectedDeliveryDate
    ),

    // Status and date composite for filtering
    orgStatusOrderDateIdx: index("idx_purchase_orders_org_status_order_date").on(
      table.organizationId,
      table.status,
      table.orderDate
    ),

    // Cursor pagination index (org + createdAt + id for deterministic ordering)
    orgCreatedIdIdx: index("idx_purchase_orders_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // User queries (who created, approved, etc.)
    orderedByIdx: index("idx_purchase_orders_ordered_by").on(table.orderedBy),
    approvedByIdx: index("idx_purchase_orders_approved_by").on(table.approvedBy),

    // Financial validation
    totalCalcCheck: check(
      "purchase_orders_total_calc",
      sql`${table.totalAmount} = ${table.subtotal} + ${table.taxAmount} + ${table.shippingAmount} - ${table.discountAmount}`
    ),

    // Status-based validation
    approvedCheck: check(
      "purchase_orders_approved_status",
      sql`(${table.approvedAt} IS NULL AND ${table.approvedBy} IS NULL) OR
          (${table.approvedAt} IS NOT NULL AND ${table.approvedBy} IS NOT NULL)`
    ),

    closedCheck: check(
      "purchase_orders_closed_status",
      sql`(${table.closedAt} IS NULL AND ${table.closedBy} IS NULL) OR
          (${table.closedAt} IS NOT NULL AND ${table.closedBy} IS NOT NULL)`
    ),

    // Required date must be after or equal to order date
    dateOrderCheck: check(
      "purchase_orders_date_order",
      sql`${table.requiredDate} IS NULL OR ${table.requiredDate} >= ${table.orderDate}`
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("purchase_orders"),
  })
);

// ============================================================================
// RELATIONS (defined after all tables to avoid circular references)
// ============================================================================

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  orderedByUser: one(users, {
    fields: [purchaseOrders.orderedBy],
    references: [users.id],
    relationName: "purchaseOrderOrderedBy",
  }),
  approvedByUser: one(users, {
    fields: [purchaseOrders.approvedBy],
    references: [users.id],
    relationName: "purchaseOrderApprovedBy",
  }),
  closedByUser: one(users, {
    fields: [purchaseOrders.closedBy],
    references: [users.id],
    relationName: "purchaseOrderClosedBy",
  }),
  // Note: items, approvals, receipts, amendments, costs relations defined in their respective files
}));

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
