/**
 * Categories Schema
 *
 * Product categorization with hierarchical relationships.
 * Supports unlimited nesting depth with parent-child structure.
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
  index,
  uniqueIndex,
  check,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns } from "../_shared/patterns";
import { warrantyPolicies } from "../warranty/warranty-policies";
import { organizations } from "../settings/organizations";

// ============================================================================
// CATEGORIES TABLE
// ============================================================================

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Category info
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Hierarchy - self-referencing for nested categories
    parentId: uuid("parent_id"),

    // Ordering within same level
    sortOrder: integer("sort_order").notNull().default(0),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Default warranty policy for products in this category
    defaultWarrantyPolicyId: uuid("default_warranty_policy_id"),

    // Timestamps
    ...timestampColumns,
  },
  (table) => ({
    // Unique name per parent within organization
    nameParentOrgUnique: uniqueIndex("idx_categories_name_parent_org")
      .on(table.organizationId, table.parentId, table.name)
      .where(sql`${table.parentId} IS NOT NULL`),

    // Unique name for root categories (null parent)
    nameRootOrgUnique: uniqueIndex("idx_categories_name_root_org")
      .on(table.organizationId, table.name)
      .where(sql`${table.parentId} IS NULL`),

    // Multi-tenant queries
    orgActiveIdx: index("idx_categories_org_active").on(
      table.organizationId,
      table.isActive
    ),

    // Hierarchy traversal
    parentIdx: index("idx_categories_parent").on(table.parentId),

    // Sort order queries
    orgSortIdx: index("idx_categories_org_sort").on(
      table.organizationId,
      table.sortOrder
    ),

    // Default warranty policy lookup
    warrantyPolicyIdx: index("idx_categories_warranty_policy").on(
      table.defaultWarrantyPolicyId
    ),

    // Prevent self-reference
    parentNotSelfCheck: check(
      "category_parent_not_self",
      sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`
    ),

    // Standard CRUD RLS policies for org isolation
    selectPolicy: pgPolicy("categories_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("categories_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("categories_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("categories_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  // Self-referencing for hierarchy
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }),
  children: many(categories, { relationName: "categoryHierarchy" }),

  // Default warranty policy for products in this category
  defaultWarrantyPolicy: one(warrantyPolicies, {
    fields: [categories.defaultWarrantyPolicyId],
    references: [warrantyPolicies.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
