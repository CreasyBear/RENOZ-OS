/**
 * Job Materials Schema
 *
 * Bill of Materials (BOM) tracking for battery installation jobs.
 * Tracks materials required vs used: batteries, inverters, BMS units,
 * mounting hardware, electrical components.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-002a
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  quantityColumn,
  currencyColumn,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { jobAssignments } from "./job-assignments";
import { products } from "../products/products";

// ============================================================================
// JOB MATERIALS TABLE
// ============================================================================

/**
 * Job Materials Table
 *
 * Tracks materials (BOM) for a job assignment.
 * Each row links a product to a job with quantity required and used.
 * Used for:
 * - Material planning before installation
 * - Tracking actual consumption during job
 * - Cost calculation and variance analysis
 */
export const jobMaterials = pgTable(
  "job_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to job assignment
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobAssignments.id, { onDelete: "cascade" }),

    // Link to product catalog (RESTRICT prevents deleting products in use)
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Quantities: required for planning, used for actuals
    quantityRequired: quantityColumn("quantity_required"),
    quantityUsed: quantityColumn("quantity_used"),

    // Unit cost at time of assignment (snapshot for cost tracking)
    unitCost: currencyColumn("unit_cost").notNull(),

    // Notes for installation instructions or special handling
    notes: text("notes"),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Job index (most common query - list materials for a job)
    orgJobIdx: index("idx_job_materials_org_job").on(
      table.organizationId,
      table.jobId
    ),

    // Organization + Product index (find all jobs using a product)
    orgProductIdx: index("idx_job_materials_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Organization + Created (for audit/timeline)
    orgCreatedIdx: index("idx_job_materials_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type JobMaterial = typeof jobMaterials.$inferSelect;
export type NewJobMaterial = typeof jobMaterials.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const jobMaterialsRelations = relations(jobMaterials, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobMaterials.organizationId],
    references: [organizations.id],
  }),
  job: one(jobAssignments, {
    fields: [jobMaterials.jobId],
    references: [jobAssignments.id],
  }),
  product: one(products, {
    fields: [jobMaterials.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [jobMaterials.createdBy],
    references: [users.id],
    relationName: "jobMaterialCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [jobMaterials.updatedBy],
    references: [users.id],
    relationName: "jobMaterialUpdatedBy",
  }),
}));
