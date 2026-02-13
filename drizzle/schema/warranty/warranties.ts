/**
 * Warranties Schema
 *
 * Individual warranty registrations for batteries, inverters, and installations.
 * Tracks warranty lifecycle from registration through expiry.
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 * @see drizzle/schema/warranty-policies.ts for policy configuration
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { customers } from "../customers/customers";
import { products } from "../products/products";
import { users } from "../users/users";
import { warrantyPolicies } from "./warranty-policies";
import { orders } from "../orders/orders";
import { projects } from "../jobs/projects";
import { warrantyItems } from "./warranty-items";

// ============================================================================
// WARRANTY STATUS ENUM
// ============================================================================

export const warrantyStatusEnum = pgEnum("warranty_status", [
  "active", // Warranty is active and valid
  "expiring_soon", // Within 90 days of expiry
  "expired", // Past expiry date or cycle limit reached
  "voided", // Warranty voided (e.g., terms violated)
  "transferred", // Ownership transferred to new customer
]);

// ============================================================================
// WARRANTIES TABLE
// ============================================================================

export const warranties = pgTable(
  "warranties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Unique warranty identifier (e.g., "WRN-2026-00001")
    warrantyNumber: varchar("warranty_number", { length: 50 }).notNull(),

    // Customer who owns the warranty
    customerId: uuid("customer_id").notNull(),

    // Product covered by warranty
    productId: uuid("product_id").notNull(),

    // Serial number of the specific unit (for identification)
    productSerial: varchar("product_serial", { length: 255 }),

    // Warranty policy that defines terms
    warrantyPolicyId: uuid("warranty_policy_id").notNull(),

    // Order this warranty was registered from (if auto-registered from delivery)
    orderId: uuid("order_id"),

    // Optional project link (job-based warranties)
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),

    // Registration and expiry dates
    registrationDate: timestamp("registration_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),

    // Cycle tracking for battery warranties
    // NULL for non-battery warranties
    currentCycleCount: integer("current_cycle_count"),
    lastCycleUpdate: timestamp("last_cycle_update", { withTimezone: true }),

    // Current status
    status: warrantyStatusEnum("status").notNull().default("active"),

    // Assigned sales rep/account manager for internal alerts
    assignedUserId: uuid("assigned_user_id"),

    // Transfer tracking
    originalCustomerId: uuid("original_customer_id"),
    transferredAt: timestamp("transferred_at", { withTimezone: true }),

    // Expiry alert opt-out (DOM-WAR-003d)
    expiryAlertOptOut: boolean("expiry_alert_opt_out").notNull().default(false),
    lastExpiryAlertSent: timestamp("last_expiry_alert_sent", { withTimezone: true }),

    // Certificate URL (populated by DOM-WAR-004)
    certificateUrl: text("certificate_url"),

    // Notes
    notes: text("notes"),

    ...auditColumns,
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique warranty number per org (scoped to active records)
    warrantyNumberOrgUnique: uniqueIndex("idx_warranties_number_org")
      .on(table.organizationId, table.warrantyNumber)
      .where(sql`deleted_at IS NULL`),

    // Unique serial per org (one warranty per serial, scoped to active records)
    serialOrgUnique: uniqueIndex("idx_warranties_serial_org")
      .on(table.organizationId, table.productSerial)
      .where(sql`product_serial IS NOT NULL AND deleted_at IS NULL`),

    // Quick lookup by org
    orgIdx: index("idx_warranties_org").on(table.organizationId),

    // Customer warranties
    customerIdx: index("idx_warranties_customer").on(table.customerId),

    // Product warranties
    productIdx: index("idx_warranties_product").on(table.productId),

    // Policy lookup
    policyIdx: index("idx_warranties_policy").on(table.warrantyPolicyId),

    // Order lookup
    orderIdx: index("idx_warranties_order").on(table.orderId),

    // Status lookup for active warranties
    statusIdx: index("idx_warranties_status").on(table.organizationId, table.status),

    // Expiry date for scheduled alerts (excluding opted-out)
    expiryIdx: index("idx_warranties_expiry").on(
      table.organizationId,
      table.expiryDate,
      table.expiryAlertOptOut
    ),

    // Assigned user for internal alerts
    assignedIdx: index("idx_warranties_assigned").on(table.assignedUserId),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("warranties"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const warrantiesRelations = relations(warranties, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [warranties.organizationId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [warranties.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [warranties.productId],
    references: [products.id],
  }),
  warrantyPolicy: one(warrantyPolicies, {
    fields: [warranties.warrantyPolicyId],
    references: [warrantyPolicies.id],
  }),
  order: one(orders, {
    fields: [warranties.orderId],
    references: [orders.id],
  }),
  project: one(projects, {
    fields: [warranties.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [warranties.assignedUserId],
    references: [users.id],
  }),
  originalCustomer: one(customers, {
    fields: [warranties.originalCustomerId],
    references: [customers.id],
    relationName: "originalCustomer",
  }),
  createdByUser: one(users, {
    fields: [warranties.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  updatedByUser: one(users, {
    fields: [warranties.updatedBy],
    references: [users.id],
    relationName: "updatedBy",
  }),
  items: many(warrantyItems),
}));

// ============================================================================
// TYPES
// ============================================================================

export type Warranty = typeof warranties.$inferSelect;
export type NewWarranty = typeof warranties.$inferInsert;
export type WarrantyStatus = (typeof warrantyStatusEnum.enumValues)[number];
