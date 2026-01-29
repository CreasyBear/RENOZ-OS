/**
 * Email Templates Schema
 *
 * Custom email templates with versioning for business communications.
 * Supports variable substitution and category organization.
 *
 * @see DOM-COMMS-007
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, auditColumns } from "../_shared/patterns";
import { users } from "../users/users";
import { organizations } from "../settings/organizations";

// ============================================================================
// ENUMS
// ============================================================================

export const templateCategoryEnum = pgEnum("template_category", [
  "quotes",
  "orders",
  "installations",
  "warranty",
  "support",
  "marketing",
  "follow_up",
  "custom",
]);

// ============================================================================
// EMAIL TEMPLATES TABLE
// ============================================================================

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Template details
    name: text("name").notNull(),
    description: text("description"),
    category: templateCategoryEnum("category").notNull().default("custom"),

    // Email content
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),

    // Variables that can be substituted (JSON array of variable definitions)
    // e.g., [{ name: "customerName", description: "Customer's full name", defaultValue: "" }]
    variables: jsonb("variables").$type<TemplateVariable[]>().default([]),

    // Versioning
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),

    // Optional: Parent template ID for versions
    parentTemplateId: uuid("parent_template_id"),

    // Timestamps and audit
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    // Organization templates
    orgIdx: index("idx_email_templates_org").on(table.organizationId),

    // Category lookup
    categoryIdx: index("idx_email_templates_category").on(
      table.organizationId,
      table.category
    ),

    // Active templates
    activeIdx: index("idx_email_templates_active").on(
      table.organizationId,
      table.isActive
    ),

    // Version history lookup
    parentIdx: index("idx_email_templates_parent").on(table.parentTemplateId),

    // RLS Policies
    selectPolicy: pgPolicy("email_templates_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("email_templates_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("email_templates_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("email_templates_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// EMAIL TEMPLATE VERSIONS TABLE
// ============================================================================

export const emailTemplateVersions = pgTable(
  "email_template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Link back to the template
    templateId: uuid("template_id")
      .notNull()
      .references(() => emailTemplates.id, { onDelete: "cascade" }),

    // Version tracking
    version: integer("version").notNull(),

    // Snapshot of template content
    name: text("name").notNull(),
    description: text("description"),
    category: templateCategoryEnum("category").notNull().default("custom"),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    variables: jsonb("variables").$type<TemplateVariable[]>().default([]),

    // Audit
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => ({
    templateVersionUnique: uniqueIndex(
      "idx_email_template_versions_template_version"
    ).on(table.templateId, table.version),
    orgTemplateIdx: index("idx_email_template_versions_org_template").on(
      table.organizationId,
      table.templateId
    ),
    templateIdx: index("idx_email_template_versions_template").on(
      table.templateId
    ),
    orgCreatedIdx: index("idx_email_template_versions_org_created").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),
    selectPolicy: pgPolicy("email_template_versions_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("email_template_versions_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("email_template_versions_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [emailTemplates.updatedBy],
    references: [users.id],
  }),
  // Self-referential for versions
  parentTemplate: one(emailTemplates, {
    fields: [emailTemplates.parentTemplateId],
    references: [emailTemplates.id],
    relationName: "templateVersions",
  }),
  versions: many(emailTemplateVersions),
}));

export const emailTemplateVersionsRelations = relations(emailTemplateVersions, ({ one }) => ({
  template: one(emailTemplates, {
    fields: [emailTemplateVersions.templateId],
    references: [emailTemplates.id],
  }),
  createdByUser: one(users, {
    fields: [emailTemplateVersions.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [emailTemplateVersions.updatedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  type?: "text" | "date" | "number" | "currency";
}

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type TemplateCategory = (typeof templateCategoryEnum.enumValues)[number];
export type EmailTemplateVersion = typeof emailTemplateVersions.$inferSelect;
export type NewEmailTemplateVersion = typeof emailTemplateVersions.$inferInsert;
