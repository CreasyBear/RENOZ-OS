/**
 * Warranty Claims Schema
 *
 * Tracks formal warranty claims for cell degradation, BMS faults,
 * inverter failures, and installation defects.
 * Integrates with unified SLA engine for response/resolution tracking.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-006a
 * @see _Initiation/_prd/_meta/remediation-sla-engine.md for SLA integration
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  currencyColumnNullable,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { customers } from "../customers/customers";
import { users } from "../users/users";
import { warranties } from "./warranties";
import { slaTracking } from "../support/sla-tracking";
import { issues } from "../support/issues";

// ============================================================================
// WARRANTY CLAIM STATUS ENUM
// ============================================================================

export const warrantyClaimStatusEnum = pgEnum("warranty_claim_status", [
  "submitted", // Claim submitted, awaiting review
  "under_review", // Being reviewed by warranty team
  "approved", // Claim approved, pending resolution
  "denied", // Claim denied
  "resolved", // Claim resolved (repaired, replaced, refunded, or extended)
]);

// ============================================================================
// WARRANTY CLAIM TYPE ENUM
// ============================================================================

export const warrantyClaimTypeEnum = pgEnum("warranty_claim_type", [
  "cell_degradation", // Battery cell degradation
  "bms_fault", // Battery Management System fault
  "inverter_failure", // Inverter malfunction
  "installation_defect", // Installation workmanship issue
  "other", // Other warranty claims
]);

// ============================================================================
// WARRANTY CLAIM RESOLUTION TYPE ENUM
// ============================================================================

export const warrantyClaimResolutionTypeEnum = pgEnum(
  "warranty_claim_resolution_type",
  [
    "repair", // Unit repaired
    "replacement", // Unit replaced
    "refund", // Money refunded
    "warranty_extension", // Warranty period extended
  ]
);

// ============================================================================
// WARRANTY CLAIMS TABLE
// ============================================================================

export const warrantyClaims = pgTable(
  "warranty_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Unique claim identifier (e.g., "CLM-2026-00001")
    claimNumber: varchar("claim_number", { length: 50 }).notNull(),

    // Link to the warranty being claimed against
    warrantyId: uuid("warranty_id")
      .notNull()
      .references(() => warranties.id, { onDelete: "cascade" }),

    // Customer who owns the warranty (denormalized for easier queries)
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    // Linked support issue (optional)
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),

    // Claim details
    claimType: warrantyClaimTypeEnum("claim_type").notNull(),
    description: text("description").notNull(),

    // Current status
    status: warrantyClaimStatusEnum("status").notNull().default("submitted"),

    // Resolution details (filled when resolved)
    resolutionType: warrantyClaimResolutionTypeEnum("resolution_type"),
    resolutionNotes: text("resolution_notes"),

    // Approval workflow
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    denialReason: text("denial_reason"),

    // Cost tracking
    cost: currencyColumnNullable("cost"),

    // Battery-specific: cycle count at time of claim
    // Helps identify degradation patterns
    cycleCountAtClaim: integer("cycle_count_at_claim"),

    // Timestamps
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    // Assignment for workflow
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // SLA tracking reference (unified SLA engine)
    slaTrackingId: uuid("sla_tracking_id").references(() => slaTracking.id, {
      onDelete: "set null",
    }),

    // Notes
    notes: text("notes"),

    ...auditColumns,
    ...timestampColumns,
  },
  (table) => [
    // Unique claim number per org
    uniqueIndex("idx_warranty_claims_number_org").on(
      table.organizationId,
      table.claimNumber
    ),

    // Quick lookup by org
    index("idx_warranty_claims_org").on(table.organizationId),

    // Warranty lookup (find all claims for a warranty)
    index("idx_warranty_claims_warranty").on(table.warrantyId),

    // Customer lookup (find all claims by customer)
    index("idx_warranty_claims_customer").on(table.customerId),

    // Issue lookup (linked support ticket)
    index("idx_warranty_claims_issue").on(table.issueId),

    // Status lookup for workflow
    index("idx_warranty_claims_status").on(table.organizationId, table.status),

    // Claim type for analytics
    index("idx_warranty_claims_type").on(table.organizationId, table.claimType),

    // SLA tracking lookup
    index("idx_warranty_claims_sla").on(table.slaTrackingId),

    // Assigned user for workload
    index("idx_warranty_claims_assigned").on(table.assignedUserId),

    // Org timeline lookup
    index("idx_warranty_claims_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Submitted date for recent claims
    index("idx_warranty_claims_submitted").on(
      table.organizationId,
      table.submittedAt.desc(),
      table.id.desc()
    ),

    // Standard CRUD RLS policies for org isolation
    pgPolicy("warranty_claims_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("warranty_claims_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("warranty_claims_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("warranty_claims_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const warrantyClaimsRelations = relations(warrantyClaims, ({ one }) => ({
  organization: one(organizations, {
    fields: [warrantyClaims.organizationId],
    references: [organizations.id],
  }),
  warranty: one(warranties, {
    fields: [warrantyClaims.warrantyId],
    references: [warranties.id],
  }),
  customer: one(customers, {
    fields: [warrantyClaims.customerId],
    references: [customers.id],
  }),
  assignedUser: one(users, {
    fields: [warrantyClaims.assignedUserId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  approvedByUser: one(users, {
    fields: [warrantyClaims.approvedByUserId],
    references: [users.id],
    relationName: "approvedBy",
  }),
  slaTracking: one(slaTracking, {
    fields: [warrantyClaims.slaTrackingId],
    references: [slaTracking.id],
  }),
  issue: one(issues, {
    fields: [warrantyClaims.issueId],
    references: [issues.id],
  }),
  createdByUser: one(users, {
    fields: [warrantyClaims.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [warrantyClaims.updatedBy],
    references: [users.id],
    relationName: "updatedBy",
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type WarrantyClaim = typeof warrantyClaims.$inferSelect;
export type NewWarrantyClaim = typeof warrantyClaims.$inferInsert;
export type WarrantyClaimStatus =
  (typeof warrantyClaimStatusEnum.enumValues)[number];
export type WarrantyClaimType =
  (typeof warrantyClaimTypeEnum.enumValues)[number];
export type WarrantyClaimResolutionType =
  (typeof warrantyClaimResolutionTypeEnum.enumValues)[number];
