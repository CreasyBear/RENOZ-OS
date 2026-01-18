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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { timestampColumns, organizationColumnBase } from "./patterns";

// ============================================================================
// CATEGORIES TABLE
// ============================================================================

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ...organizationColumnBase,

    // Category info
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Hierarchy - self-referencing for nested categories
    parentId: uuid("parent_id"),

    // Ordering within same level
    sortOrder: integer("sort_order").notNull().default(0),

    // Status
    isActive: boolean("is_active").notNull().default(true),

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

    // Prevent self-reference
    parentNotSelfCheck: check(
      "category_parent_not_self",
      sql`${table.parentId} IS NULL OR ${table.parentId} != ${table.id}`
    ),
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
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
