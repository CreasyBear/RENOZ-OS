/**
 * Price Agreements Schema
 *
 * Supplier price agreement contracts with approval workflow.
 * Tracks negotiated pricing agreements with validity periods.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json for SUPP-PRICING-MANAGEMENT
 */

import {
  pgTable,
  pgPolicy,
  pgEnum,
  uuid,
  text,
  integer,
  date,
  timestamp,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  softDeleteColumn,
  currencyColumnNullable,
} from "../_shared/patterns";
import { suppliers } from "./suppliers";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// ENUMS
// ============================================================================

export const priceAgreementStatusEnum = pgEnum("price_agreement_status", [
  "draft",     // Being created
  "pending",   // Awaiting approval
  "approved",  // Approved and active
  "rejected",  // Rejected by approver
  "expired",   // Past expiry date
  "cancelled", // Cancelled by user
]);

// ============================================================================
// PRICE AGREEMENTS TABLE
// ============================================================================

export const priceAgreements = pgTable(
  "price_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to supplier
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),

    // Denormalized for display
    supplierName: text("supplier_name"),

    // Agreement identification
    agreementNumber: text("agreement_number")
      .notNull()
      .default(sql`'PA-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)`),

    // Agreement details
    title: text("title").notNull(),
    description: text("description"),

    // Validity period
    effectiveDate: date("effective_date").notNull(),
    expiryDate: date("expiry_date"),

    // Status
    status: priceAgreementStatusEnum("status").notNull().default("draft"),

    // Financial terms
    currency: text("currency").notNull().default("AUD"),
    discountPercent: integer("discount_percent"),
    minimumOrderValue: currencyColumnNullable("minimum_order_value"),

    // Item tracking (denormalized count)
    totalItems: integer("total_items").notNull().default(0),

    // Workflow
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    approvedBy: uuid("approved_by")
      .references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by")
      .references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    // Additional info
    notes: text("notes"),
    termsAndConditions: text("terms_and_conditions"),

    // Version for optimistic locking
    version: integer("version").notNull().default(1),

    // Audit - updatedBy only (createdBy is explicit above with FK)
    updatedBy: uuid("updated_by"),

    // Tracking
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique agreement number per organization
    agreementNumberOrgUnique: uniqueIndex("idx_price_agreements_number_org_unique")
      .on(table.organizationId, table.agreementNumber)
      .where(sql`${table.deletedAt} IS NULL`),

    // Supplier queries
    supplierIdx: index("idx_price_agreements_supplier").on(table.supplierId),

    orgSupplierIdx: index("idx_price_agreements_org_supplier").on(
      table.organizationId,
      table.supplierId
    ),

    // Status queries
    orgStatusIdx: index("idx_price_agreements_org_status").on(
      table.organizationId,
      table.status
    ),

    // Date queries
    effectiveDateIdx: index("idx_price_agreements_effective_date").on(
      table.effectiveDate
    ),

    expiryDateIdx: index("idx_price_agreements_expiry_date").on(
      table.expiryDate
    ),

    // Active agreements (approved and not expired)
    orgActiveIdx: index("idx_price_agreements_org_active").on(
      table.organizationId,
      table.status,
      table.expiryDate
    ),

    // User queries
    createdByIdx: index("idx_price_agreements_created_by").on(table.createdBy),
    approvedByIdx: index("idx_price_agreements_approved_by").on(table.approvedBy),

    // Cursor pagination
    orgCreatedIdIdx: index("idx_price_agreements_org_created_id").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Date range validation
    dateRangeCheck: check(
      "price_agreements_date_range",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} > ${table.effectiveDate}`
    ),

    // Discount percent range
    discountCheck: check(
      "price_agreements_discount_range",
      sql`${table.discountPercent} IS NULL OR (${table.discountPercent} >= 0 AND ${table.discountPercent} <= 100)`
    ),

    // Approval consistency
    approvalCheck: check(
      "price_agreements_approval_consistency",
      sql`(${table.approvedAt} IS NULL AND ${table.approvedBy} IS NULL) OR
          (${table.approvedAt} IS NOT NULL AND ${table.approvedBy} IS NOT NULL)`
    ),

    // Rejection consistency
    rejectionCheck: check(
      "price_agreements_rejection_consistency",
      sql`(${table.rejectedAt} IS NULL AND ${table.rejectedBy} IS NULL) OR
          (${table.rejectedAt} IS NOT NULL AND ${table.rejectedBy} IS NOT NULL)`
    ),

    // Total items must be non-negative
    totalItemsCheck: check(
      "price_agreements_total_items_non_negative",
      sql`${table.totalItems} >= 0`
    ),

    // RLS Policies
    selectPolicy: pgPolicy("price_agreements_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("price_agreements_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("price_agreements_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("price_agreements_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const priceAgreementsRelations = relations(
  priceAgreements,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [priceAgreements.supplierId],
      references: [suppliers.id],
    }),
    createdByUser: one(users, {
      fields: [priceAgreements.createdBy],
      references: [users.id],
      relationName: "agreementCreatedBy",
    }),
    approvedByUser: one(users, {
      fields: [priceAgreements.approvedBy],
      references: [users.id],
      relationName: "agreementApprovedBy",
    }),
    rejectedByUser: one(users, {
      fields: [priceAgreements.rejectedBy],
      references: [users.id],
      relationName: "agreementRejectedBy",
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type PriceAgreement = typeof priceAgreements.$inferSelect;
export type NewPriceAgreement = typeof priceAgreements.$inferInsert;
export type PriceAgreementStatus = (typeof priceAgreementStatusEnum.enumValues)[number];
