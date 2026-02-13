/**
 * Purchase Order Costs Schema
 *
 * Additional costs tracking (shipping, duties, insurance, etc.).
 * Supports allocation of costs across line items.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for SUPP-PO-MANAGEMENT
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { costTypeEnum, allocationMethodEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  currencyColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { purchaseOrders } from "./purchase-orders";
import { organizations } from "../settings/organizations";

// ============================================================================
// PURCHASE ORDER COSTS TABLE
// ============================================================================

export const purchaseOrderCosts = pgTable(
  "purchase_order_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to purchase order
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),

    // Cost classification
    costType: costTypeEnum("cost_type").notNull(),
    description: text("description"),

    // Amount
    amount: currencyColumn("amount"),
    currency: text("currency").notNull().default("AUD"),

    // Cost allocation
    allocationMethod: allocationMethodEnum("allocation_method").notNull().default("equal"),
    isIncludedInTotal: boolean("is_included_in_total").notNull().default(true),

    // Reference information
    supplierInvoiceNumber: text("supplier_invoice_number"),
    referenceNumber: text("reference_number"),

    // Additional information
    notes: text("notes"),

    // Version for optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Purchase order queries
    purchaseOrderIdx: index("idx_purchase_order_costs_po").on(
      table.purchaseOrderId
    ),

    orgPurchaseOrderIdx: index("idx_purchase_order_costs_org_po").on(
      table.organizationId,
      table.purchaseOrderId
    ),

    // Cost type queries
    costTypeIdx: index("idx_purchase_order_costs_type").on(table.costType),

    orgCostTypeIdx: index("idx_purchase_order_costs_org_type").on(
      table.organizationId,
      table.costType
    ),

    // Invoice reference queries
    supplierInvoiceIdx: index("idx_purchase_order_costs_supplier_invoice").on(
      table.supplierInvoiceNumber
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_costs_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Amount must be non-negative
    amountCheck: check(
      "purchase_order_costs_amount_non_negative",
      sql`${table.amount} >= 0`
    ),

    // RLS Policies
    ...standardRlsPolicies("purchase_order_costs"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const purchaseOrderCostsRelations = relations(
  purchaseOrderCosts,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderCosts.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrderCost = typeof purchaseOrderCosts.$inferSelect;
export type NewPurchaseOrderCost = typeof purchaseOrderCosts.$inferInsert;
