/**
 * Purchase Order Amendments Schema
 *
 * Change tracking for purchase order modifications.
 * Maintains full audit trail of changes to POs.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for SUPP-PO-MANAGEMENT
 */

import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { amendmentStatusEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { purchaseOrders } from "./purchase-orders";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Structure for tracking individual field changes
 */
export interface AmendmentChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string;
}

/**
 * Snapshot of values before/after amendment
 */
export interface AmendmentSnapshot {
  [key: string]: unknown;
}

// ============================================================================
// PURCHASE ORDER AMENDMENTS TABLE
// ============================================================================

export const purchaseOrderAmendments = pgTable(
  "purchase_order_amendments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to purchase order
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "restrict" }),

    // Amendment identification
    amendmentNumber: integer("amendment_number").notNull(),

    // Status
    status: amendmentStatusEnum("status").notNull().default("requested"),

    // Who requested and why
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    reason: text("reason").notNull(),

    // Approval workflow
    approvedBy: uuid("approved_by")
      .references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by")
      .references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    // Application tracking
    appliedBy: uuid("applied_by")
      .references(() => users.id, { onDelete: "set null" }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),

    // Change tracking (JSONB for flexibility)
    changes: jsonb("changes").$type<AmendmentChange[]>().notNull().default([]),
    originalValues: jsonb("original_values").$type<AmendmentSnapshot>().notNull().default({}),
    newValues: jsonb("new_values").$type<AmendmentSnapshot>().notNull().default({}),

    // Additional notes
    notes: text("notes"),
    internalNotes: text("internal_notes"),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Unique amendment number per PO
    poAmendmentNumberUnique: uniqueIndex("idx_purchase_order_amendments_po_number_unique").on(
      table.purchaseOrderId,
      table.amendmentNumber
    ),

    // Purchase order queries
    purchaseOrderIdx: index("idx_purchase_order_amendments_po").on(
      table.purchaseOrderId
    ),

    orgPurchaseOrderIdx: index("idx_purchase_order_amendments_org_po").on(
      table.organizationId,
      table.purchaseOrderId
    ),

    // Status queries
    orgStatusIdx: index("idx_purchase_order_amendments_org_status").on(
      table.organizationId,
      table.status
    ),

    // Requested by queries (find all amendments by a user)
    requestedByIdx: index("idx_purchase_order_amendments_requested_by").on(
      table.requestedBy
    ),

    // Date queries
    requestedAtIdx: index("idx_purchase_order_amendments_requested_at").on(
      table.requestedAt
    ),

    // Pending approval queries
    orgPendingApprovalIdx: index("idx_purchase_order_amendments_org_pending").on(
      table.organizationId,
      table.status,
      table.requestedAt
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_purchase_order_amendments_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Amendment number must be positive
    amendmentNumberCheck: check(
      "purchase_order_amendments_number_positive",
      sql`${table.amendmentNumber} > 0`
    ),

    // Status and approval consistency
    approvedStatusCheck: check(
      "purchase_order_amendments_approved_status",
      sql`(${table.status} = 'approved' AND ${table.approvedAt} IS NOT NULL AND ${table.approvedBy} IS NOT NULL) OR
          (${table.status} != 'approved' AND ${table.approvedAt} IS NULL AND ${table.approvedBy} IS NULL)`
    ),

    rejectedStatusCheck: check(
      "purchase_order_amendments_rejected_status",
      sql`(${table.status} = 'rejected' AND ${table.rejectedAt} IS NOT NULL AND ${table.rejectedBy} IS NOT NULL) OR
          (${table.status} != 'rejected' AND ${table.rejectedAt} IS NULL AND ${table.rejectedBy} IS NULL)`
    ),

    appliedStatusCheck: check(
      "purchase_order_amendments_applied_status",
      sql`(${table.status} = 'applied' AND ${table.appliedAt} IS NOT NULL AND ${table.appliedBy} IS NOT NULL) OR
          (${table.status} != 'applied' AND ${table.appliedAt} IS NULL AND ${table.appliedBy} IS NULL)`
    ),

    // RLS Policies
    ...standardRlsPolicies("purchase_order_amendments"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const purchaseOrderAmendmentsRelations = relations(
  purchaseOrderAmendments,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderAmendments.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
    requestedByUser: one(users, {
      fields: [purchaseOrderAmendments.requestedBy],
      references: [users.id],
      relationName: "amendmentRequestedBy",
    }),
    approvedByUser: one(users, {
      fields: [purchaseOrderAmendments.approvedBy],
      references: [users.id],
      relationName: "amendmentApprovedBy",
    }),
    rejectedByUser: one(users, {
      fields: [purchaseOrderAmendments.rejectedBy],
      references: [users.id],
      relationName: "amendmentRejectedBy",
    }),
    appliedByUser: one(users, {
      fields: [purchaseOrderAmendments.appliedBy],
      references: [users.id],
      relationName: "amendmentAppliedBy",
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PurchaseOrderAmendment = typeof purchaseOrderAmendments.$inferSelect;
export type NewPurchaseOrderAmendment = typeof purchaseOrderAmendments.$inferInsert;
