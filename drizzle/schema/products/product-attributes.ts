/**
 * Product Attributes Schema
 *
 * Dynamic product attribute definitions and values.
 * Supports category-specific attributes with various data types.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { attributeTypeEnum } from "../_shared/enums";
import { products } from "./products";
import { organizations } from "../settings/organizations";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for select/multiselect attribute types.
 */
export interface AttributeOptions {
  choices?: Array<{
    value: string;
    label: string;
    sortOrder?: number;
  }>;
  min?: number; // For number type
  max?: number; // For number type
  step?: number; // For number type
  placeholder?: string;
  /** Default value for the attribute */
  defaultValue?: string | number | boolean;
  /** Date format string (for date types) */
  dateFormat?: string;
  /** Regex pattern for validation (for text types) */
  pattern?: string;
  /** Whether text input supports multiline */
  multiline?: boolean;
  /** Number of rows for multiline input */
  rows?: number;
  /** Unit of measurement (e.g., "kg", "cm") */
  unit?: string;
}

// ============================================================================
// PRODUCT ATTRIBUTES TABLE (Definitions)
// ============================================================================

/**
 * Attribute definitions that can be assigned to products.
 * Attributes can be category-specific or organization-wide.
 */
export const productAttributes = pgTable(
  "product_attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Attribute info
    name: varchar("name", { length: 100 }).notNull(),
    attributeType: attributeTypeEnum("attribute_type").notNull(),
    description: text("description"),

    // Options for select/multiselect types
    options: jsonb("options").$type<AttributeOptions>().default({}),

    // Validation
    isRequired: boolean("is_required").notNull().default(false),

    // Search/filter behavior
    isFilterable: boolean("is_filterable").notNull().default(false),
    isSearchable: boolean("is_searchable").notNull().default(false),

    // Category assignment (empty array = applies to all categories)
    categoryIds: jsonb("category_ids").$type<string[]>().default([]),

    // Display
    sortOrder: integer("sort_order").notNull().default(0),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Unique name per organization
    nameOrgUnique: uniqueIndex("idx_product_attributes_name_org").on(
      table.organizationId,
      table.name
    ),

    // Multi-tenant queries
    orgActiveIdx: index("idx_product_attributes_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // Type queries
    orgTypeIdx: index("idx_product_attributes_org_type").on(
      table.organizationId,
      table.attributeType
    ),

    // Filterable attributes
    orgFilterableIdx: index("idx_product_attributes_org_filterable").on(
      table.organizationId,
      table.isFilterable
    ),

    // Sort order
    orgSortIdx: index("idx_product_attributes_org_sort").on(
      table.organizationId,
      table.sortOrder
    ),
  })
);

// ============================================================================
// PRODUCT ATTRIBUTE VALUES TABLE
// ============================================================================

/**
 * Attribute values assigned to specific products.
 * Value is stored as JSONB to support all attribute types.
 */
export const productAttributeValues = pgTable(
  "product_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // References (cascade delete when product or attribute is deleted)
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => productAttributes.id, { onDelete: "cascade" }),

    // The attribute value (JSONB to support all types)
    // Type uses {} union for TanStack serialization compatibility
    value: jsonb("value").$type<{ [key: string]: {} } | string | number | boolean | null>().notNull(),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Unique product-attribute combination per org
    productAttributeOrgUnique: uniqueIndex(
      "idx_product_attribute_values_unique"
    ).on(table.organizationId, table.productId, table.attributeId),

    // Product attribute lookups
    orgProductIdx: index("idx_product_attribute_values_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Attribute value lookups (for filtering)
    orgAttributeIdx: index("idx_product_attribute_values_org_attribute").on(
      table.organizationId,
      table.attributeId
    ),

    // Value queries (using GIN for JSONB)
    valueGinIdx: index("idx_product_attribute_values_value").using(
      "gin",
      table.value
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const productAttributesRelations = relations(
  productAttributes,
  ({ many }) => ({
    values: many(productAttributeValues),
  })
);

export const productAttributeValuesRelations = relations(
  productAttributeValues,
  ({ one }) => ({
    product: one(products, {
      fields: [productAttributeValues.productId],
      references: [products.id],
    }),
    attribute: one(productAttributes, {
      fields: [productAttributeValues.attributeId],
      references: [productAttributes.id],
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
export type NewProductAttributeValue = typeof productAttributeValues.$inferInsert;
