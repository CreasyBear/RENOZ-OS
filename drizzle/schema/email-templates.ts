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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns, organizationColumnBase, auditColumns } from "./patterns";
import { users } from "./users";

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
    ...organizationColumnBase,

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
  versions: many(emailTemplates, {
    relationName: "templateVersions",
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
