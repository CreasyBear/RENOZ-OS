/**
 * Product Relations Schema
 *
 * Product relationship definitions for accessories, alternatives, upgrades, etc.
 * Supports bidirectional relationships between products.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  check,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { productRelationTypeEnum } from "../_shared/enums";
import { products } from "./products";

// ============================================================================
// PRODUCT RELATIONS TABLE
// ============================================================================

/**
 * Product relationships linking related products.
 * Used for accessories, alternatives, upgrades, compatible products, etc.
 */
export const productRelations = pgTable(
  "product_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // The source product (cascade delete when product is deleted)
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // The related product (cascade delete when related product is deleted)
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Type of relationship
    relationType: productRelationTypeEnum("relation_type").notNull(),

    // Display order
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
    // Unique relationship (product + related + type) per org
    relationUnique: uniqueIndex("idx_product_relations_unique").on(
      table.organizationId,
      table.productId,
      table.relatedProductId,
      table.relationType
    ),

    // Product relation lookups
    orgProductIdx: index("idx_product_relations_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Related product lookups (reverse lookup)
    orgRelatedIdx: index("idx_product_relations_org_related").on(
      table.organizationId,
      table.relatedProductId
    ),

    // Type queries
    orgTypeIdx: index("idx_product_relations_org_type").on(
      table.organizationId,
      table.relationType
    ),

    // Sort order
    productSortIdx: index("idx_product_relations_product_sort").on(
      table.productId,
      table.sortOrder
    ),

    // Cannot relate to self
    notSelfRelationCheck: check(
      "product_not_self_relation",
      sql`${table.productId} != ${table.relatedProductId}`
    ),
    // RLS Policies
    selectPolicy: pgPolicy("product_relations_select_policy", {
      for: "select",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    insertPolicy: pgPolicy("product_relations_insert_policy", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    updatePolicy: pgPolicy("product_relations_update_policy", {
      for: "update",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
      withCheck: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
    deletePolicy: pgPolicy("product_relations_delete_policy", {
      for: "delete",
      to: "authenticated",
      using: sql`organization_id = (SELECT current_setting('app.organization_id', true)::uuid)`,
    }),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const productRelationsRelations = relations(
  productRelations,
  ({ one }) => ({
    // The source product
    product: one(products, {
      fields: [productRelations.productId],
      references: [products.id],
      relationName: "productRelations",
    }),
    // The related product
    relatedProduct: one(products, {
      fields: [productRelations.relatedProductId],
      references: [products.id],
      relationName: "relatedProducts",
    }),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProductRelation = typeof productRelations.$inferSelect;
export type NewProductRelation = typeof productRelations.$inferInsert;
