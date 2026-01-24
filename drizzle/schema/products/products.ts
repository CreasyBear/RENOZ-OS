/**
 * Products Schema
 *
 * Core product catalog for inventory and sales.
 * Enhanced with categorization, SEO, serialization, and Xero integration.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 * @see _Initiation/_prd/1-foundation/patterns/canonical-enums.json for enum values
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { productTypeEnum, productStatusEnum, taxTypeEnum } from "../_shared/enums";
import {
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  currencyColumn,
  currencyColumnNullable,
  quantityColumn,
  fullTextSearchSql,
  numericCasted,
} from "../_shared/patterns";
import { categories } from "./categories";
import { productPriceTiers, customerProductPrices } from "./product-pricing";
import { productBundles } from "./product-bundles";
import { productImages } from "./product-images";
import { productAttributeValues } from "./product-attributes";
import { productRelations } from "./product-relations";
import { warrantyPolicies } from "../warranty/warranty-policies";
import { organizations } from "../settings/organizations";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: "mm" | "cm" | "m" | "in";
}

export interface ProductSpecifications {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProductPricing {
  costPrice?: number;
  markup?: number; // percentage
  minMargin?: number; // minimum margin percentage
}

export interface ProductMetadata {
  manufacturer?: string;
  brand?: string;
  model?: string;
  warranty?: string;
  leadTime?: number; // days
  /** Allow additional properties for extensibility */
  [key: string]: string | number | boolean | null | undefined;
}

// ============================================================================
// PRODUCTS TABLE
// ============================================================================

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Identification
    sku: varchar("sku", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    barcode: text("barcode"),

    // Classification
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: productTypeEnum("type").notNull().default("physical"),
    status: productStatusEnum("status").notNull().default("active"),

    // Serialization tracking
    isSerialized: boolean("is_serialized").notNull().default(false),
    trackInventory: boolean("track_inventory").notNull().default(true),

    // Pricing
    basePrice: currencyColumn("base_price"),
    costPrice: currencyColumnNullable("cost_price"),
    taxType: taxTypeEnum("tax_type").notNull().default("gst"),

    // Physical attributes
    weight: numericCasted("weight", { precision: 8, scale: 3 }),
    dimensions: jsonb("dimensions").$type<ProductDimensions>().default({}),

    // Specifications (custom key-value pairs)
    specifications: jsonb("specifications").$type<ProductSpecifications>().default({}),

    // SEO fields
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),

    // Tags for categorization
    tags: jsonb("tags").$type<string[]>().default([]),

    // External integrations
    xeroItemId: varchar("xero_item_id", { length: 255 }),

    // Legacy pricing fields (kept for backward compat)
    pricing: jsonb("pricing").$type<ProductPricing>().default({}),

    // Inventory thresholds
    reorderPoint: quantityColumn("reorder_point"),
    reorderQty: quantityColumn("reorder_qty"),

    // Extended metadata
    metadata: jsonb("metadata").$type<ProductMetadata>().default({}),

    // Warranty policy assignment (nullable - uses category default or org default if not set)
    warrantyPolicyId: uuid("warranty_policy_id").references(
      () => warrantyPolicies.id,
      { onDelete: "set null" }
    ),

    // Legacy flags
    isActive: boolean("is_active").notNull().default(true),
    isSellable: boolean("is_sellable").notNull().default(true),
    isPurchasable: boolean("is_purchasable").notNull().default(true),

    // Tracking
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumn,
  },
  (table) => ({
    // Unique SKU per organization
    skuOrgUnique: uniqueIndex("idx_products_sku_org_unique")
      .on(table.organizationId, table.sku)
      .where(sql`${table.deletedAt} IS NULL`),

    // Unique barcode per organization
    barcodeOrgUnique: uniqueIndex("idx_products_barcode_org_unique")
      .on(table.organizationId, table.barcode)
      .where(
        sql`${table.barcode} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),

    // Multi-tenant queries
    orgStatusIdx: index("idx_products_org_status").on(
      table.organizationId,
      table.status
    ),
    orgActiveIdx: index("idx_products_org_active").on(
      table.organizationId,
      table.isActive
    ),
    orgCategoryIdx: index("idx_products_org_category").on(
      table.organizationId,
      table.categoryId
    ),
    orgTypeIdx: index("idx_products_org_type").on(
      table.organizationId,
      table.type
    ),

    // Category lookups
    categoryIdx: index("idx_products_category").on(table.categoryId),

    // Warranty policy lookups
    warrantyPolicyIdx: index("idx_products_warranty_policy").on(
      table.warrantyPolicyId
    ),

    // Cursor pagination index (org + createdAt + id)
    orgCreatedIdIdx: index("idx_products_org_created_id").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc()
    ),

    // Full-text search on name and SKU
    nameSearchIdx: index("idx_products_name_search").using(
      "gin",
      fullTextSearchSql(table.name)
    ),
    skuSearchIdx: index("idx_products_sku_search").using(
      "gin",
      fullTextSearchSql(table.sku)
    ),

    // GIN index for tags array queries
    tagsGinIdx: index("idx_products_tags_gin").using("gin", table.tags),

    // Price constraints
    basePriceNonNegativeCheck: check(
      "product_base_price_non_negative",
      sql`${table.basePrice} >= 0`
    ),
    costPriceNonNegativeCheck: check(
      "product_cost_price_non_negative",
      sql`${table.costPrice} IS NULL OR ${table.costPrice} >= 0`
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const productsRelations = relations(products, ({ one, many }) => ({
  // Category relationship
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),

  // Warranty policy relationship
  warrantyPolicy: one(warrantyPolicies, {
    fields: [products.warrantyPolicyId],
    references: [warrantyPolicies.id],
  }),

  // Pricing relationships
  priceTiers: many(productPriceTiers),
  customerPrices: many(customerProductPrices),

  // Bundle relationships
  bundleComponents: many(productBundles, { relationName: "bundleProduct" }),
  includedInBundles: many(productBundles, { relationName: "componentProduct" }),

  // Image gallery
  images: many(productImages),

  // Attribute values
  attributeValues: many(productAttributeValues),

  // Product relations
  relations: many(productRelations, { relationName: "productRelations" }),
  relatedFrom: many(productRelations, { relationName: "relatedProducts" }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
