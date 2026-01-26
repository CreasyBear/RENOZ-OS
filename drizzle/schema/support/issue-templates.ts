/**
 * Issue Templates Schema
 *
 * Pre-configured templates for common battery/inverter issues.
 * Speeds up issue creation with defaults and required fields.
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-004
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  index,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
} from "../_shared/patterns";
import { organizations } from "../settings/organizations";
import { users } from "../users";
import { issuePriorityEnum, issueTypeEnum } from "../_shared/enums";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Required fields configuration for a template
 */
export interface TemplateRequiredFields {
  /** Whether customer selection is required */
  customerId?: boolean;
  /** Whether serial number is required */
  serialNumber?: boolean;
  /** Whether battery model is required */
  batteryModel?: boolean;
  /** Whether inverter error code is required */
  inverterErrorCode?: boolean;
  /** Whether installed date is required */
  installedDate?: boolean;
  /** Custom required field names */
  customFields?: string[];
}

/**
 * Default values for template
 */
export interface TemplateDefaults {
  /** Default tags to apply */
  tags?: string[];
  /** Default metadata values */
  metadata?: Record<string, string | number | boolean>;
}

// ============================================================================
// ISSUE TEMPLATES TABLE
// ============================================================================

export const issueTemplates = pgTable(
  "issue_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template identification
    name: text("name").notNull(),
    description: text("description"),

    // Issue defaults
    type: issueTypeEnum("type").notNull(),
    defaultPriority: issuePriorityEnum("default_priority").default("medium"),
    defaultAssigneeId: uuid("default_assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // Template content
    titleTemplate: text("title_template"), // e.g., "Battery Not Charging - {serialNumber}"
    descriptionPrompt: text("description_prompt"), // Help text for description

    // Configuration
    requiredFields: jsonb("required_fields").$type<TemplateRequiredFields>(),
    defaults: jsonb("defaults").$type<TemplateDefaults>(),

    // Usage tracking
    usageCount: integer("usage_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    // Standard columns
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => [
    index("issue_templates_organization_idx").on(table.organizationId),
    index("issue_templates_type_idx").on(table.type),
    index("issue_templates_usage_idx").on(table.usageCount),
    index("issue_templates_active_idx").on(table.isActive),

    // Standard CRUD RLS policies for org isolation
    pgPolicy("issue_templates_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("issue_templates_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("issue_templates_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    pgPolicy("issue_templates_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const issueTemplatesRelations = relations(issueTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [issueTemplates.organizationId],
    references: [organizations.id],
  }),
  defaultAssignee: one(users, {
    fields: [issueTemplates.defaultAssigneeId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [issueTemplates.createdBy],
    references: [users.id],
    relationName: "templateCreator",
  }),
  updatedByUser: one(users, {
    fields: [issueTemplates.updatedBy],
    references: [users.id],
    relationName: "templateUpdater",
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type IssueTemplate = typeof issueTemplates.$inferSelect;
export type NewIssueTemplate = typeof issueTemplates.$inferInsert;
