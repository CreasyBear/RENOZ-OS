/**
 * Custom Fields Schema
 *
 * Dynamic field definitions for extending entity types.
 * Allows organizations to add custom attributes to customers, orders, products, etc.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/settings/settings.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  timestampColumns,
  standardRlsPolicies,
} from "../_shared/patterns";
import { organizations } from "./organizations";
import { users } from "../users/users";

// ============================================================================
// ENUMS (inline for this domain)
// ============================================================================

import { pgEnum } from "drizzle-orm/pg-core";

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
  "textarea",
  "email",
  "url",
  "phone",
  "multiselect",
]);

export const customFieldEntityTypeEnum = pgEnum("custom_field_entity_type", [
  "customer",
  "contact",
  "order",
  "product",
  "supplier",
  "opportunity",
  "issue",
  "job",
]);

// ============================================================================
// INTERFACES
// ============================================================================

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: string;
  isDefault?: boolean;
}

export interface CustomFieldValidation {
  /** Minimum value (for numbers) or length (for text) */
  min?: number;
  /** Maximum value (for numbers) or length (for text) */
  max?: number;
  /** Regex pattern for validation */
  pattern?: string;
  /** Pattern error message */
  patternMessage?: string;
  /** Custom error message */
  errorMessage?: string;
}

export interface CustomFieldMetadata {
  /** Placeholder text for input */
  placeholder?: string;
  /** Help text displayed below field */
  helpText?: string;
  /** Icon name for UI */
  icon?: string;
  /** Whether to show in list/table views */
  showInList?: boolean;
  /** Whether to include in search */
  searchable?: boolean;
  /** Whether to index for performance */
  indexed?: boolean;
  /** Default width in grid columns (1-12) */
  gridWidth?: number;
  /** CSS class to apply */
  cssClass?: string;
  /** Whether field is conditionally shown */
  conditionalVisibility?: boolean;
  /** Condition expression for visibility */
  visibilityCondition?: string;
}

// ============================================================================
// CUSTOM FIELDS TABLE
// ============================================================================

export const customFields = pgTable(
  "custom_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Organization scoping
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Entity type this field applies to
    entityType: customFieldEntityTypeEnum("entity_type").notNull(),

    // Field definition
    name: varchar("name", { length: 100 }).notNull(), // Internal name (snake_case)
    label: varchar("label", { length: 100 }).notNull(), // Display label
    fieldType: customFieldTypeEnum("field_type").notNull(),

    // Options for select/multiselect types
    options: jsonb("options").$type<CustomFieldOption[]>().default([]),

    // Validation
    isRequired: boolean("is_required").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    validationRules: jsonb("validation_rules")
      .$type<CustomFieldValidation>()
      .default({}),

    // Default value (JSONB to support any type)
    defaultValue: jsonb("default_value"),

    // Display ordering
    sortOrder: integer("sort_order").notNull().default(0),

    // Extended metadata
    metadata: jsonb("metadata").$type<CustomFieldMetadata>().default({}),

    // Audit tracking
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Optimistic locking
    version: integer("version").notNull().default(1),

    // Tracking
    ...timestampColumns,
  },
  (table) => ({
    // Unique field name per entity type per org
    uniqueField: uniqueIndex("idx_custom_fields_unique").on(
      table.organizationId,
      table.entityType,
      table.name
    ),

    // Organization queries
    orgIdx: index("idx_custom_fields_org").on(table.organizationId),

    // Entity type queries
    orgEntityIdx: index("idx_custom_fields_org_entity").on(
      table.organizationId,
      table.entityType
    ),

    // Active fields for entity type (common query)
    orgEntityActiveIdx: index("idx_custom_fields_org_entity_active").on(
      table.organizationId,
      table.entityType,
      table.isActive
    ),

    // Sort order for display
    sortOrderIdx: index("idx_custom_fields_sort").on(
      table.organizationId,
      table.entityType,
      table.sortOrder
    ),

    // RLS Policies
    ...standardRlsPolicies("custom_fields"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const customFieldsRelations = relations(customFields, ({ one }) => ({
  organization: one(organizations, {
    fields: [customFields.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [customFields.createdBy],
    references: [users.id],
    relationName: "customFieldCreatedBy",
  }),
  updatedByUser: one(users, {
    fields: [customFields.updatedBy],
    references: [users.id],
    relationName: "customFieldUpdatedBy",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CustomField = typeof customFields.$inferSelect;
export type NewCustomField = typeof customFields.$inferInsert;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum custom fields per entity type per organization.
 * This limit ensures performance and UX quality.
 */
export const MAX_CUSTOM_FIELDS_PER_ENTITY = 50;

/**
 * Field types that support options
 */
export const OPTION_FIELD_TYPES = ["select", "multiselect"] as const;

/**
 * Field types that support min/max validation
 */
export const NUMERIC_FIELD_TYPES = ["number"] as const;

/**
 * Field types that support pattern validation
 */
export const PATTERN_FIELD_TYPES = ["text", "email", "url", "phone"] as const;
