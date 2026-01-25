/**
 * Custom Field Values Schema
 *
 * Stores values for custom fields on specific entities.
 * Links custom field definitions to actual entity instances.
 * Table category: business (per column-patterns.json)
 *
 * @see _Initiation/_prd/2-domains/settings/settings.prd.json for requirements
 */

import {
  pgTable,
  uuid,
  jsonb,
  integer,
  index,
  uniqueIndex,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { customFields } from "./custom-fields";
import { users } from "../users/users";

// ============================================================================
// CUSTOM FIELD VALUES TABLE
// ============================================================================

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Reference to the custom field definition
    customFieldId: uuid("custom_field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),

    // The entity this value belongs to (polymorphic reference)
    // Entity type is already known from the custom field definition
    entityId: uuid("entity_id").notNull(),

    // The actual value (JSONB to support any type)
    value: jsonb("value"),

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
    // Unique value per field per entity
    uniqueValue: uniqueIndex("idx_custom_field_values_unique").on(
      table.customFieldId,
      table.entityId
    ),

    // Field lookup
    fieldIdx: index("idx_custom_field_values_field").on(table.customFieldId),

    // Entity lookup (find all custom values for an entity)
    entityIdx: index("idx_custom_field_values_entity").on(table.entityId),

    // Composite for common query pattern
    fieldEntityIdx: index("idx_custom_field_values_field_entity").on(
      table.customFieldId,
      table.entityId
    ),

    // RLS Policies - inherit from custom field's organization
    // Note: This requires a join to custom_fields for org check
    selectPolicy: pgPolicy("custom_field_values_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    insertPolicy: pgPolicy("custom_field_values_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    updatePolicy: pgPolicy("custom_field_values_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
    deletePolicy: pgPolicy("custom_field_values_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`EXISTS (
        SELECT 1 FROM custom_fields cf
        WHERE cf.id = custom_field_id
        AND cf.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
      )`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const customFieldValuesRelations = relations(
  customFieldValues,
  ({ one }) => ({
    customField: one(customFields, {
      fields: [customFieldValues.customFieldId],
      references: [customFields.id],
    }),
    createdByUser: one(users, {
      fields: [customFieldValues.createdBy],
      references: [users.id],
      relationName: "customFieldValueCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [customFieldValues.updatedBy],
      references: [users.id],
      relationName: "customFieldValueUpdatedBy",
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CustomFieldValue = typeof customFieldValues.$inferSelect;
export type NewCustomFieldValue = typeof customFieldValues.$inferInsert;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Custom field value with its field definition.
 * Useful for rendering forms with proper type info.
 */
export interface CustomFieldWithValue {
  field: typeof customFields.$inferSelect;
  value: typeof customFieldValues.$inferSelect | null;
}

/**
 * Map of custom field values by field name.
 * Useful for form state management.
 */
export type CustomFieldValueMap = Record<string, unknown>;
