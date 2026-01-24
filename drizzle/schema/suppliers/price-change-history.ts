/**
 * Price Change History Schema
 *
 * Approval workflow for price changes with audit trail.
 * Tracks requested price modifications with approval/rejection flow.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for SUPP-PRICING-MANAGEMENT
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  check,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  currencyColumn,
  currencyColumnNullable,
  percentageColumn,
} from "../_shared/patterns";
import { suppliers } from "./suppliers";
import { supplierPriceLists } from "./supplier-price-lists";
import { priceAgreements } from "./price-agreements";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// ENUMS
// ============================================================================

export const priceChangeStatusEnum = pgEnum("price_change_status", [
  "pending",   // Awaiting approval
  "approved",  // Approved
  "rejected",  // Rejected
  "applied",   // Applied to price list
  "cancelled", // Cancelled by requester
]);

// ============================================================================
// PRICE CHANGE HISTORY TABLE (with approval workflow)
// ============================================================================

export const priceChangeHistory = pgTable(
  "price_change_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Links
    priceListId: uuid("price_list_id")
      .references(() => supplierPriceLists.id, { onDelete: "set null" }),
    agreementId: uuid("agreement_id")
      .references(() => priceAgreements.id, { onDelete: "set null" }),
    supplierId: uuid("supplier_id")
      .references(() => suppliers.id, { onDelete: "set null" }),

    // Price change details
    previousPrice: currencyColumnNullable("previous_price"),
    newPrice: currencyColumn("new_price"),
    priceChange: currencyColumnNullable("price_change"),
    changePercent: percentageColumn("change_percent"),

    // Change context
    changeReason: text("change_reason"),
    effectiveDate: timestamp("effective_date", { withTimezone: true }),

    // Workflow status
    status: priceChangeStatusEnum("status").notNull().default("pending"),

    // Requester
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),

    // Approver
    approvedBy: uuid("approved_by")
      .references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    // Rejection
    rejectedBy: uuid("rejected_by")
      .references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    // Application tracking
    appliedBy: uuid("applied_by")
      .references(() => users.id, { onDelete: "set null" }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),

    // Notes
    notes: text("notes"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Price list queries
    priceListIdx: index("idx_price_change_history_price_list").on(
      table.priceListId
    ),

    // Agreement queries
    agreementIdx: index("idx_price_change_history_agreement").on(
      table.agreementId
    ),

    // Supplier queries
    supplierIdx: index("idx_price_change_history_supplier").on(
      table.supplierId
    ),

    orgSupplierIdx: index("idx_price_change_history_org_supplier").on(
      table.organizationId,
      table.supplierId
    ),

    // Status queries
    orgStatusIdx: index("idx_price_change_history_org_status").on(
      table.organizationId,
      table.status
    ),

    // Requester queries
    requestedByIdx: index("idx_price_change_history_requested_by").on(
      table.requestedBy
    ),

    // Date queries
    requestedAtIdx: index("idx_price_change_history_requested_at").on(
      table.requestedAt
    ),

    // Pending approval queries
    orgPendingIdx: index("idx_price_change_history_org_pending").on(
      table.organizationId,
      table.status,
      table.requestedAt
    ),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_price_change_history_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Approval consistency
    approvalCheck: check(
      "price_change_history_approval_consistency",
      sql`(${table.approvedAt} IS NULL AND ${table.approvedBy} IS NULL) OR
          (${table.approvedAt} IS NOT NULL AND ${table.approvedBy} IS NOT NULL)`
    ),

    // Rejection consistency
    rejectionCheck: check(
      "price_change_history_rejection_consistency",
      sql`(${table.rejectedAt} IS NULL AND ${table.rejectedBy} IS NULL) OR
          (${table.rejectedAt} IS NOT NULL AND ${table.rejectedBy} IS NOT NULL)`
    ),

    // Application consistency
    applicationCheck: check(
      "price_change_history_application_consistency",
      sql`(${table.appliedAt} IS NULL AND ${table.appliedBy} IS NULL) OR
          (${table.appliedAt} IS NOT NULL AND ${table.appliedBy} IS NOT NULL)`
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const priceChangeHistoryRelations = relations(
  priceChangeHistory,
  ({ one }) => ({
    priceList: one(supplierPriceLists, {
      fields: [priceChangeHistory.priceListId],
      references: [supplierPriceLists.id],
    }),
    agreement: one(priceAgreements, {
      fields: [priceChangeHistory.agreementId],
      references: [priceAgreements.id],
    }),
    supplier: one(suppliers, {
      fields: [priceChangeHistory.supplierId],
      references: [suppliers.id],
    }),
    requestedByUser: one(users, {
      fields: [priceChangeHistory.requestedBy],
      references: [users.id],
      relationName: "priceChangeRequestedBy",
    }),
    approvedByUser: one(users, {
      fields: [priceChangeHistory.approvedBy],
      references: [users.id],
      relationName: "priceChangeApprovedBy",
    }),
    rejectedByUser: one(users, {
      fields: [priceChangeHistory.rejectedBy],
      references: [users.id],
      relationName: "priceChangeRejectedBy",
    }),
    appliedByUser: one(users, {
      fields: [priceChangeHistory.appliedBy],
      references: [users.id],
      relationName: "priceChangeAppliedBy",
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PriceChangeHistoryRecord = typeof priceChangeHistory.$inferSelect;
export type NewPriceChangeHistoryRecord = typeof priceChangeHistory.$inferInsert;
export type PriceChangeStatus = (typeof priceChangeStatusEnum.enumValues)[number];
