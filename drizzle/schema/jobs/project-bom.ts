/**
 * Project BOM Schema
 *
 * Project-level bill of materials for estimated materials.
 * Tracks what materials are planned/estimated for a project before
 * actual usage is recorded during site visits.
 *
 * Hierarchy: Project → ProjectBOM → ProjectBOMItems (estimated)
 *              ↓
 *           SiteVisit → JobMaterials (actual)
 *
 * @see _Initiation/_prd/sprints/sprint-03-jobs-domain-restructure.prd.json - Story 003
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  decimal,
  jsonb,
  index,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { projects } from "./projects";
import { products } from "../products/products";

// ============================================================================
// ENUMS
// ============================================================================

export const bomStatusEnum = pgEnum("bom_status", [
  "draft",       // Initial estimate being prepared
  "approved",    // Approved for procurement
  "ordered",     // Purchase orders placed
  "partial",     // Partially received
  "complete",    // All materials received
  "cancelled",   // Cancelled
]);

export const bomItemStatusEnum = pgEnum("bom_item_status", [
  "planned",     // Planned/estimated only
  "ordered",     // Ordered but not received
  "received",    // Received in warehouse
  "allocated",   // Allocated to project
  "installed",   // Installed during site visit
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface BomMetadata {
  /** Currency for all cost fields */
  currency?: string;
  /** Margin percentage applied to costs */
  marginPercent?: number;
  /** Labor cost estimate */
  estimatedLaborCost?: number;
  /** Additional costs */
  additionalCosts?: Array<{
    name: string;
    amount: number;
  }>;
  /** Notes for procurement */
  procurementNotes?: string;
}

// ============================================================================
// PROJECT BOM TABLE
// ============================================================================

export const projectBom = pgTable(
  "project_bom",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to project
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // BOM identification
    bomNumber: varchar("bom_number", { length: 50 }).notNull(),
    revision: integer("revision").notNull().default(1),

    // Status
    status: bomStatusEnum("status").notNull().default("draft"),

    // Description
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // Financial summary (calculated from items)
    estimatedMaterialCost: decimal("estimated_material_cost", {
      precision: 12,
      scale: 2,
    }),
    actualMaterialCost: decimal("actual_material_cost", {
      precision: 12,
      scale: 2,
    }),

    // Metadata
    metadata: jsonb("metadata").$type<BomMetadata>().default({}),

    // Approvals
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestampColumns.createdAt,

    // Versioning
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Project index (main lookup)
    orgProjectIdx: index("idx_project_bom_org_project").on(
      table.organizationId,
      table.projectId
    ),

    // BOM number unique per organization
    orgNumberIdx: index("idx_project_bom_org_number").on(
      table.organizationId,
      table.bomNumber
    ),

    // Status index for filtering
    orgStatusIdx: index("idx_project_bom_org_status").on(
      table.organizationId,
      table.status
    ),

    // RLS policies
    selectPolicy: pgPolicy("project_bom_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("project_bom_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("project_bom_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("project_bom_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// PROJECT BOM ITEMS TABLE
// ============================================================================

export const projectBomItems = pgTable(
  "project_bom_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to BOM header
    bomId: uuid("bom_id")
      .notNull()
      .references(() => projectBom.id, { onDelete: "cascade" }),

    // Link to project (denormalized for easier querying)
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Link to product
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Line item details
    position: integer("position").notNull().default(0),

    // Quantities
    quantityEstimated: decimal("quantity_estimated", {
      precision: 12,
      scale: 4,
    }).notNull(),
    quantityOrdered: decimal("quantity_ordered", {
      precision: 12,
      scale: 4,
    }).default("0"),
    quantityReceived: decimal("quantity_received", {
      precision: 12,
      scale: 4,
    }).default("0"),
    quantityInstalled: decimal("quantity_installed", {
      precision: 12,
      scale: 4,
    }).default("0"),

    // Cost tracking (snapshot at time of estimate)
    unitCostEstimated: decimal("unit_cost_estimated", {
      precision: 12,
      scale: 4,
    }),
    unitCostActual: decimal("unit_cost_actual", {
      precision: 12,
      scale: 4,
    }),

    // Status
    status: bomItemStatusEnum("status").notNull().default("planned"),

    // Specifications
    specifications: jsonb("specifications").$type<Record<string, string>>().default({}),

    // Notes
    notes: text("notes"),

    // Reference to site visit where installed (when applicable)
    siteVisitId: uuid("site_visit_id"),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + BOM index (main lookup)
    orgBomIdx: index("idx_project_bom_items_org_bom").on(
      table.organizationId,
      table.bomId
    ),

    // Organization + Project index (cross-BOM queries)
    orgProjectIdx: index("idx_project_bom_items_org_project").on(
      table.organizationId,
      table.projectId
    ),

    // Product index (find all projects using a product)
    orgProductIdx: index("idx_project_bom_items_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Status index for filtering
    orgStatusIdx: index("idx_project_bom_items_org_status").on(
      table.organizationId,
      table.status
    ),

    // Site visit index
    siteVisitIdx: index("idx_project_bom_items_site_visit").on(table.siteVisitId),

    // RLS policies
    selectPolicy: pgPolicy("project_bom_items_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("project_bom_items_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("project_bom_items_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("project_bom_items_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const projectBomRelations = relations(projectBom, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projectBom.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [projectBom.projectId],
    references: [projects.id],
  }),
  approvedByUser: one(users, {
    fields: [projectBom.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [projectBom.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [projectBom.updatedBy],
    references: [users.id],
  }),
  // One-to-many relations
  items: many(projectBomItems),
}));

export const projectBomItemsRelations = relations(projectBomItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [projectBomItems.organizationId],
    references: [organizations.id],
  }),
  bom: one(projectBom, {
    fields: [projectBomItems.bomId],
    references: [projectBom.id],
  }),
  project: one(projects, {
    fields: [projectBomItems.projectId],
    references: [projects.id],
  }),
  product: one(products, {
    fields: [projectBomItems.productId],
    references: [products.id],
  }),
  // siteVisit will be added when site_visits schema is fully linked
  createdByUser: one(users, {
    fields: [projectBomItems.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [projectBomItems.updatedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProjectBom = typeof projectBom.$inferSelect;
export type NewProjectBom = typeof projectBom.$inferInsert;
export type BomStatus = (typeof bomStatusEnum.enumValues)[number];

export type ProjectBomItem = typeof projectBomItems.$inferSelect;
export type NewProjectBomItem = typeof projectBomItems.$inferInsert;
export type BomItemStatus = (typeof bomItemStatusEnum.enumValues)[number];
