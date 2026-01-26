/**
 * Job Templates Schema
 *
 * Pre-configured job templates for battery installation types.
 * Templates store default tasks, BOM, and checklist configuration
 * that get applied when creating a new job from the template.
 *
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-007a
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  jsonb,
  integer,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { checklistTemplates } from "./checklists";
import { slaConfigurations } from "../support/sla-configurations";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Default task structure stored in JSONB.
 * These get expanded into job_tasks when a job is created from the template.
 */
export interface JobTemplateTask {
  /** Unique ID within the template */
  id: string;
  /** Task title */
  title: string;
  /** Task description or instructions */
  description?: string;
  /** Display order (0-based) */
  position: number;
}

/**
 * Default BOM item structure stored in JSONB.
 * These get expanded into job_materials when a job is created from the template.
 */
export interface JobTemplateBOMItem {
  /** Unique ID within the template */
  id: string;
  /** Product ID to add to job */
  productId: string;
  /** Default quantity required */
  quantityRequired: number;
  /** Optional notes about the material */
  notes?: string;
}

// ============================================================================
// JOB TEMPLATES TABLE
// ============================================================================

/**
 * Job Templates Table
 *
 * Reusable job templates for standard installation types.
 * Templates define default tasks, materials, checklist, and optional SLA.
 *
 * Example templates:
 * - Residential Battery Installation (1-2 days, standard BOM)
 * - Commercial Installation (3-5 days, extended BOM, commissioning checklist)
 * - Warranty Service Call (1 day, diagnostic checklist)
 */
export const jobTemplates = pgTable(
  "job_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template identity
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Default tasks stored as JSONB array
    defaultTasks: jsonb("default_tasks")
      .$type<JobTemplateTask[]>()
      .notNull()
      .default([]),

    // Default BOM stored as JSONB array
    defaultBOM: jsonb("default_bom")
      .$type<JobTemplateBOMItem[]>()
      .notNull()
      .default([]),

    // Checklist template to apply (optional)
    checklistTemplateId: uuid("checklist_template_id").references(
      () => checklistTemplates.id,
      { onDelete: "set null" }
    ),

    // Estimated duration in minutes
    estimatedDuration: integer("estimated_duration").notNull().default(120),

    // SLA configuration for job completion targets (optional)
    // When set, jobs created from this template will have SLA tracking
    slaConfigurationId: uuid("sla_configuration_id").references(
      () => slaConfigurations.id,
      { onDelete: "set null" }
    ),

    // Active flag for soft-disable
    isActive: boolean("is_active").notNull().default(true),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Name index (lookup by name)
    orgNameIdx: index("idx_job_templates_org_name").on(
      table.organizationId,
      table.name
    ),

    // Organization + Active index (list active templates)
    orgActiveIdx: index("idx_job_templates_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // Organization + Created index (chronological listing)
    orgCreatedIdx: index("idx_job_templates_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("job_templates_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("job_templates_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("job_templates_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("job_templates_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type JobTemplate = typeof jobTemplates.$inferSelect;
export type NewJobTemplate = typeof jobTemplates.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const jobTemplatesRelations = relations(jobTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobTemplates.organizationId],
    references: [organizations.id],
  }),
  checklistTemplate: one(checklistTemplates, {
    fields: [jobTemplates.checklistTemplateId],
    references: [checklistTemplates.id],
  }),
  slaConfiguration: one(slaConfigurations, {
    fields: [jobTemplates.slaConfigurationId],
    references: [slaConfigurations.id],
  }),
  createdByUser: one(users, {
    fields: [jobTemplates.createdBy],
    references: [users.id],
    relationName: "jobTemplateCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [jobTemplates.updatedBy],
    references: [users.id],
    relationName: "jobTemplateUpdatedBy",
  }),
}));
