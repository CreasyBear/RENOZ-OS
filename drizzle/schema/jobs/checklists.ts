/**
 * Checklists Schema
 *
 * Checklist templates and job checklists for commissioning verification.
 * Table category: business (per column-patterns.json)
 *
 * Three tables:
 * - checklistTemplates: Reusable checklist templates with items as JSONB
 * - jobChecklists: Instance of a template applied to a job
 * - jobChecklistItems: Individual items within a job checklist
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004a
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
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users/users";
import { jobAssignments } from "./job-assignments";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Template item structure stored in JSONB.
 */
export interface ChecklistTemplateItem {
  /** Unique ID within the template */
  id: string;
  /** Display text for the checklist item */
  text: string;
  /** Optional description or instructions */
  description?: string;
  /** Whether photo attachment is required */
  requiresPhoto?: boolean;
  /** Display order (0-based) */
  position: number;
}

// ============================================================================
// CHECKLIST TEMPLATES TABLE
// ============================================================================

/**
 * Checklist Templates Table
 *
 * Reusable checklist templates that can be applied to jobs.
 * Items are stored as JSONB array for flexibility.
 *
 * Example templates:
 * - Battery Installation Commissioning
 * - Safety Verification Checklist
 * - Pre-Installation Site Assessment
 */
export const checklistTemplates = pgTable(
  "checklist_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template identity
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Items stored as JSONB array
    items: jsonb("items").$type<ChecklistTemplateItem[]>().notNull().default([]),

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
    orgNameIdx: index("idx_checklist_templates_org_name").on(
      table.organizationId,
      table.name
    ),

    // Organization + Active index (list active templates)
    orgActiveIdx: index("idx_checklist_templates_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("checklist_templates"),
  })
);

// ============================================================================
// JOB CHECKLISTS TABLE
// ============================================================================

/**
 * Job Checklists Table
 *
 * Instance of a checklist applied to a specific job.
 * Links to the template it was created from (nullable - template may be deleted).
 */
export const jobChecklists = pgTable(
  "job_checklists",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to job
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobAssignments.id, { onDelete: "cascade" }),

    // Link to template (nullable - template may be deleted)
    templateId: uuid("template_id")
      .references(() => checklistTemplates.id, { onDelete: "set null" }),

    // Snapshot of template name at application time
    templateName: varchar("template_name", { length: 255 }),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Job index (get checklists for a job)
    orgJobIdx: index("idx_job_checklists_org_job").on(
      table.organizationId,
      table.jobId
    ),

    // Organization + Template index (find jobs using a template)
    orgTemplateIdx: index("idx_job_checklists_org_template").on(
      table.organizationId,
      table.templateId
    ),

    // Organization + Created index (chronological listing)
    orgCreatedIdx: index("idx_job_checklists_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Unique constraint: one checklist per job (can be relaxed if needed)
    // Commenting out for now - jobs may need multiple checklists
    // uniqueJobIdx: uniqueIndex("idx_job_checklists_unique_job").on(
    //   table.organizationId,
    //   table.jobId
    // ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("job_checklists"),
  })
);

// ============================================================================
// JOB CHECKLIST ITEMS TABLE
// ============================================================================

/**
 * Job Checklist Items Table
 *
 * Individual items within a job checklist.
 * Tracks completion status, photos, and notes for each item.
 */
export const jobChecklistItems = pgTable(
  "job_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Multi-tenant organization (with FK constraint)
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link to job checklist
    checklistId: uuid("checklist_id")
      .notNull()
      .references(() => jobChecklists.id, { onDelete: "cascade" }),

    // Item details
    itemText: varchar("item_text", { length: 500 }).notNull(),
    itemDescription: text("item_description"),
    requiresPhoto: boolean("requires_photo").notNull().default(false),
    position: integer("position").notNull().default(0),

    // Completion tracking
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by")
      .references(() => users.id, { onDelete: "set null" }),

    // Notes and photo attachment
    notes: text("notes"),
    photoUrl: text("photo_url"),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization + Checklist index (list items for a checklist)
    orgChecklistIdx: index("idx_job_checklist_items_org_checklist").on(
      table.organizationId,
      table.checklistId
    ),

    // Organization + Completed index (filter by completion status)
    orgCompletedIdx: index("idx_job_checklist_items_org_completed").on(
      table.organizationId,
      table.isCompleted
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("job_checklist_items"),
  })
);

// ============================================================================
// TYPES
// ============================================================================

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type NewChecklistTemplate = typeof checklistTemplates.$inferInsert;

export type JobChecklist = typeof jobChecklists.$inferSelect;
export type NewJobChecklist = typeof jobChecklists.$inferInsert;

export type JobChecklistItem = typeof jobChecklistItems.$inferSelect;
export type NewJobChecklistItem = typeof jobChecklistItems.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const checklistTemplatesRelations = relations(checklistTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [checklistTemplates.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [checklistTemplates.createdBy],
    references: [users.id],
    relationName: "templateCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [checklistTemplates.updatedBy],
    references: [users.id],
    relationName: "templateUpdatedBy",
  }),
  jobChecklists: many(jobChecklists),
}));

export const jobChecklistsRelations = relations(jobChecklists, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [jobChecklists.organizationId],
    references: [organizations.id],
  }),
  job: one(jobAssignments, {
    fields: [jobChecklists.jobId],
    references: [jobAssignments.id],
  }),
  template: one(checklistTemplates, {
    fields: [jobChecklists.templateId],
    references: [checklistTemplates.id],
  }),
  createdByUser: one(users, {
    fields: [jobChecklists.createdBy],
    references: [users.id],
    relationName: "checklistCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [jobChecklists.updatedBy],
    references: [users.id],
    relationName: "checklistUpdatedBy",
  }),
  items: many(jobChecklistItems),
}));

export const jobChecklistItemsRelations = relations(jobChecklistItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobChecklistItems.organizationId],
    references: [organizations.id],
  }),
  checklist: one(jobChecklists, {
    fields: [jobChecklistItems.checklistId],
    references: [jobChecklists.id],
  }),
  completedByUser: one(users, {
    fields: [jobChecklistItems.completedBy],
    references: [users.id],
    relationName: "itemCompletedBy",
  }),
  createdByUser: one(users, {
    fields: [jobChecklistItems.createdBy],
    references: [users.id],
    relationName: "itemCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [jobChecklistItems.updatedBy],
    references: [users.id],
    relationName: "itemUpdatedBy",
  }),
}));
