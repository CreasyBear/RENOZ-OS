/**
 * Purchase Order Receipts Schema
 *
 * Goods receipt tracking with quality control.
 * Includes receipt headers and receipt items for detailed line item tracking.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for SUPP-GOODS-RECEIPT
 */

import {
  pgTable,
  pgPolicy,
  uuid,
  text,
  integer,
  timestamp,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { receiptStatusEnum, conditionEnum, rejectionReasonEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
} from "../_shared/patterns";
import { purchaseOrders } from "./purchase-orders";
import { purchaseOrderItems } from "./purchase-order-items";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// PURCHASE ORDER RECEIPTS TABLE (Header)
// ============================================================================

export const purchaseOrderReceipts = pgTable(
  "purchase_order_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to purchase order
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "restrict" }),

    // Receipt identification
    receiptNumber: text("receipt_number")
      .notNull()
      .default(sql`'GRN-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)`),

    // Receipt details
    receivedBy: uuid("received_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),

    // Shipping details
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    deliveryReference: text("delivery_reference"), // Supplier's delivery note number

    // Receipt summary (denormalized for performance)
    totalItemsExpected: integer("total_items_expected").notNull().default(0),
    totalItemsReceived: integer("total_items_received").notNull().default(0),
    totalItemsAccepted: integer("total_items_accepted").notNull().default(0),
    totalItemsRejected: integer("total_items_rejected").notNull().default(0),

    // Status
    status: receiptStatusEnum("status").notNull().default("pending_inspection"),

    // Quality control
    inspectionRequired: text("inspection_required").notNull().default("no"), // yes, no, partial
    inspectionCompletedAt: timestamp("inspection_completed_at", { withTimezone: true }),
    inspectionCompletedBy: uuid("inspection_completed_by")
      .references(() => users.id, { onDelete: "set null" }),
    qualityNotes: text("quality_notes"),

    // Additional information
    notes: text("notes"),

    // Version for optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique receipt number per organization
    receiptNumberOrgUnique: uniqueIndex("idx_purchase_order_receipts_number_org_unique")
      .on(table.organizationId, table.receiptNumber),

    // Purchase order queries
    purchaseOrderIdx: index("idx_purchase_order_receipts_po").on(
      table.purchaseOrderId
    ),

    orgPurchaseOrderIdx: index("idx_purchase_order_receipts_org_po").on(
      table.organizationId,
      table.purchaseOrderId
    ),

    // Status queries
    orgStatusIdx: index("idx_purchase_order_receipts_org_status").on(
      table.organizationId,
      table.status
    ),

    // Date queries
    receivedAtIdx: index("idx_purchase_order_receipts_received_at").on(
      table.receivedAt
    ),

    // User queries
    receivedByIdx: index("idx_purchase_order_receipts_received_by").on(
      table.receivedBy
    ),

    inspectionByIdx: index("idx_purchase_order_receipts_inspection_by").on(
      table.inspectionCompletedBy
    ),

    // Pending inspection queries
    orgPendingInspectionIdx: index("idx_purchase_order_receipts_org_pending_inspection").on(
      table.organizationId,
      table.status,
      table.inspectionCompletedAt
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_receipts_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Item counts must be non-negative
    itemsExpectedCheck: check(
      "purchase_order_receipts_items_expected_non_negative",
      sql`${table.totalItemsExpected} >= 0`
    ),

    itemsReceivedCheck: check(
      "purchase_order_receipts_items_received_non_negative",
      sql`${table.totalItemsReceived} >= 0`
    ),

    itemsAcceptedCheck: check(
      "purchase_order_receipts_items_accepted_non_negative",
      sql`${table.totalItemsAccepted} >= 0`
    ),

    itemsRejectedCheck: check(
      "purchase_order_receipts_items_rejected_non_negative",
      sql`${table.totalItemsRejected} >= 0`
    ),

    // Accepted + rejected = received
    itemsBalanceCheck: check(
      "purchase_order_receipts_items_balance",
      sql`${table.totalItemsAccepted} + ${table.totalItemsRejected} <= ${table.totalItemsReceived}`
    ),

    // Inspection completion consistency
    inspectionCheck: check(
      "purchase_order_receipts_inspection_consistency",
      sql`(${table.inspectionCompletedAt} IS NULL AND ${table.inspectionCompletedBy} IS NULL) OR
          (${table.inspectionCompletedAt} IS NOT NULL AND ${table.inspectionCompletedBy} IS NOT NULL)`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("purchase_order_receipts_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("purchase_order_receipts_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("purchase_order_receipts_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("purchase_order_receipts_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// PURCHASE ORDER RECEIPT ITEMS TABLE (Line items)
// ============================================================================

export const purchaseOrderReceiptItems = pgTable(
  "purchase_order_receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to receipt header
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => purchaseOrderReceipts.id, { onDelete: "cascade" }),

    // Link to PO line item
    purchaseOrderItemId: uuid("purchase_order_item_id")
      .notNull()
      .references(() => purchaseOrderItems.id, { onDelete: "restrict" }),

    // Line number on the receipt
    lineNumber: integer("line_number").notNull(),

    // Quantities
    quantityExpected: integer("quantity_expected").notNull(),
    quantityReceived: integer("quantity_received").notNull(),
    quantityAccepted: integer("quantity_accepted").notNull().default(0),
    quantityRejected: integer("quantity_rejected").notNull().default(0),

    // Quality assessment
    condition: conditionEnum("condition").default("new"),
    rejectionReason: rejectionReasonEnum("rejection_reason"),
    qualityNotes: text("quality_notes"),

    // Storage assignment
    warehouseLocation: text("warehouse_location"),
    binNumber: text("bin_number"),

    // Lot/batch tracking
    lotNumber: text("lot_number"),
    serialNumbers: text("serial_numbers").array().default(sql`'{}'::text[]`),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Receipt queries
    receiptIdx: index("idx_purchase_order_receipt_items_receipt").on(
      table.receiptId
    ),

    orgReceiptIdx: index("idx_purchase_order_receipt_items_org_receipt").on(
      table.organizationId,
      table.receiptId
    ),

    // PO item queries (find all receipts for a line item)
    poItemIdx: index("idx_purchase_order_receipt_items_po_item").on(
      table.purchaseOrderItemId
    ),

    // Line ordering within receipt
    receiptLineIdx: index("idx_purchase_order_receipt_items_receipt_line").on(
      table.receiptId,
      table.lineNumber
    ),

    // Condition queries
    conditionIdx: index("idx_purchase_order_receipt_items_condition").on(
      table.condition
    ),

    // Warehouse location queries
    warehouseIdx: index("idx_purchase_order_receipt_items_warehouse").on(
      table.warehouseLocation
    ),

    // Lot number queries
    lotNumberIdx: index("idx_purchase_order_receipt_items_lot").on(
      table.lotNumber
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_receipt_items_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Quantity must be non-negative
    quantityExpectedCheck: check(
      "purchase_order_receipt_items_qty_expected_non_negative",
      sql`${table.quantityExpected} >= 0`
    ),

    quantityReceivedCheck: check(
      "purchase_order_receipt_items_qty_received_non_negative",
      sql`${table.quantityReceived} >= 0`
    ),

    quantityAcceptedCheck: check(
      "purchase_order_receipt_items_qty_accepted_non_negative",
      sql`${table.quantityAccepted} >= 0`
    ),

    quantityRejectedCheck: check(
      "purchase_order_receipt_items_qty_rejected_non_negative",
      sql`${table.quantityRejected} >= 0`
    ),

    // Accepted + rejected = received
    quantityBalanceCheck: check(
      "purchase_order_receipt_items_qty_balance",
      sql`${table.quantityAccepted} + ${table.quantityRejected} = ${table.quantityReceived}`
    ),

    // Rejection reason required if items rejected
    rejectionReasonCheck: check(
      "purchase_order_receipt_items_rejection_reason",
      sql`${table.quantityRejected} = 0 OR ${table.rejectionReason} IS NOT NULL`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("purchase_order_receipt_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("purchase_order_receipt_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("purchase_order_receipt_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("purchase_order_receipt_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const purchaseOrderReceiptsRelations = relations(
  purchaseOrderReceipts,
  ({ one, many }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderReceipts.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
    receivedByUser: one(users, {
      fields: [purchaseOrderReceipts.receivedBy],
      references: [users.id],
      relationName: "receiptReceivedBy",
    }),
    inspectionCompletedByUser: one(users, {
      fields: [purchaseOrderReceipts.inspectionCompletedBy],
      references: [users.id],
      relationName: "receiptInspectedBy",
    }),
    receiptItems: many(purchaseOrderReceiptItems),
  })
);

export const purchaseOrderReceiptItemsRelations = relations(
  purchaseOrderReceiptItems,
  ({ one }) => ({
    receipt: one(purchaseOrderReceipts, {
      fields: [purchaseOrderReceiptItems.receiptId],
      references: [purchaseOrderReceipts.id],
    }),
    purchaseOrderItem: one(purchaseOrderItems, {
      fields: [purchaseOrderReceiptItems.purchaseOrderItemId],
      references: [purchaseOrderItems.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrderReceipt = typeof purchaseOrderReceipts.$inferSelect;
export type NewPurchaseOrderReceipt = typeof purchaseOrderReceipts.$inferInsert;

export type PurchaseOrderReceiptItem = typeof purchaseOrderReceiptItems.$inferSelect;
export type NewPurchaseOrderReceiptItem = typeof purchaseOrderReceiptItems.$inferInsert;
