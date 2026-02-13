/**
 * Product Bundles Schema
 *
 * Bundle definitions linking parent bundle products to component products.
 * Supports optional components and quantity specifications.
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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { products } from "./products";
import { standardRlsPolicies } from "../_shared/patterns";

// ============================================================================
// PRODUCT BUNDLES TABLE
// ============================================================================

/**
 * Product bundle component definitions.
 * Links a bundle product (productType='bundle') to its component products.
 * Components are deducted individually during order fulfillment.
 */
export const productBundles = pgTable(
  "product_bundles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // The parent bundle product (cascade delete when bundle product is deleted)
    bundleProductId: uuid("bundle_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // The component product included in the bundle (cascade delete when component is deleted)
    componentProductId: uuid("component_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // How many of this component per bundle
    quantity: integer("quantity").notNull().default(1),

    // Optional components can be excluded by customer
    isOptional: boolean("is_optional").notNull().default(false),

    // Display order
    sortOrder: integer("sort_order").notNull().default(0),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Unique bundle-component combination per org
    bundleComponentOrgUnique: uniqueIndex("idx_bundles_bundle_component_org").on(
      table.organizationId,
      table.bundleProductId,
      table.componentProductId
    ),

    // Bundle product lookups
    orgBundleIdx: index("idx_bundles_org_bundle").on(
      table.organizationId,
      table.bundleProductId
    ),

    // Component product lookups (to find bundles containing a product)
    orgComponentIdx: index("idx_bundles_org_component").on(
      table.organizationId,
      table.componentProductId
    ),

    // Sort order within bundle
    bundleSortIdx: index("idx_bundles_bundle_sort").on(
      table.bundleProductId,
      table.sortOrder
    ),

    // Quantity must be positive
    quantityPositiveCheck: check(
      "bundle_quantity_positive",
      sql`${table.quantity} > 0`
    ),

    // Bundle cannot contain itself
    notSelfReferenceCheck: check(
      "bundle_not_self_reference",
      sql`${table.bundleProductId} != ${table.componentProductId}`
    ),

    // Standard CRUD RLS policies for org isolation
    ...standardRlsPolicies("product_bundles"),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const productBundlesRelations = relations(productBundles, ({ one }) => ({
  // The bundle product
  bundleProduct: one(products, {
    fields: [productBundles.bundleProductId],
    references: [products.id],
    relationName: "bundleProduct",
  }),
  // The component product
  componentProduct: one(products, {
    fields: [productBundles.componentProductId],
    references: [products.id],
    relationName: "componentProduct",
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProductBundle = typeof productBundles.$inferSelect;
export type NewProductBundle = typeof productBundles.$inferInsert;
