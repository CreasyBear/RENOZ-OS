/**
 * Product Images Schema
 *
 * Product image gallery with metadata and ordering.
 * Supports primary image selection and sort ordering.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { organizations } from "../settings/organizations";
import { products } from "./products";

// ============================================================================
// TYPES
// ============================================================================

export interface ImageDimensions {
  width: number;
  height: number;
}

// ============================================================================
// PRODUCT IMAGES TABLE
// ============================================================================

/**
 * Product image gallery.
 * Each product can have multiple images with one marked as primary.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // Product reference (cascade delete when product is deleted)
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Image storage
    imageUrl: text("image_url").notNull(), // Supabase Storage URL

    // Metadata
    altText: varchar("alt_text", { length: 255 }),
    caption: text("caption"),

    // Ordering and primary selection
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),

    // File info
    fileSize: integer("file_size"), // bytes
    dimensions: jsonb("dimensions").$type<ImageDimensions>(),

    // Audit
    uploadedBy: uuid("uploaded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Product image lookups
    orgProductIdx: index("idx_product_images_org_product").on(
      table.organizationId,
      table.productId
    ),

    // Sort order within product
    productSortIdx: index("idx_product_images_product_sort").on(
      table.productId,
      table.sortOrder
    ),

    // Primary image lookup
    productPrimaryIdx: index("idx_product_images_product_primary").on(
      table.productId,
      table.isPrimary
    ),

    // File size constraint
    fileSizePositiveCheck: check(
      "image_file_size_positive",
      sql`${table.fileSize} IS NULL OR ${table.fileSize} >= 0`
    ),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
