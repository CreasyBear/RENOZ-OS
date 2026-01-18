/**
 * Product Server Functions
 *
 * Comprehensive product CRUD operations with search, validation, and org isolation.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, and, sql, desc, asc, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  products,
  categories,
  productPriceTiers,
  productBundles,
  productImages,
  productAttributeValues,
  productRelations,
  customerProductPrices,
} from "../../../../drizzle/schema";
import { withAuth } from "../protected";
import { NotFoundError, ValidationError, ConflictError } from "../errors";
import {
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/schemas/products";
import { recordPriceChange } from "./product-pricing";

// ============================================================================
// TYPES
// ============================================================================

type Product = typeof products.$inferSelect;
type Category = typeof categories.$inferSelect;

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
}

interface ListProductsResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// PRODUCT CRUD
// ============================================================================

/**
 * List products with filtering, sorting, and pagination.
 */
export const listProducts = createServerFn({ method: "GET" })
  .inputValidator(productListQuerySchema)
  .handler(async ({ data }): Promise<ListProductsResult> => {
    const ctx = await withAuth();
    const { page = 1, pageSize = 20, search, sortBy, sortOrder, ...filters } = data;
    const limit = pageSize;

    // Build where conditions
    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
    ];

    // Add search filter
    if (search) {
      conditions.push(
        sql`(
          ${products.name} ILIKE ${`%${search}%`} OR
          ${products.sku} ILIKE ${`%${search}%`} OR
          ${products.description} ILIKE ${`%${search}%`}
        )`
      );
    }

    // Add filter conditions
    if (filters.type) {
      conditions.push(eq(products.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Build order clause
    const orderColumn =
      sortBy === "name"
        ? products.name
        : sortBy === "sku"
          ? products.sku
          : sortBy === "basePrice"
            ? products.basePrice
            : products.createdAt;
    const orderDir = sortOrder === "asc" ? asc : desc;

    // Get products with pagination
    const offset = (page - 1) * limit;
    const productList = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(orderDir(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      products: productList,
      total,
      page,
      limit,
      hasMore: offset + productList.length < total,
    };
  });

/**
 * Get single product with all related data.
 */
export const getProduct = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();

    // Get product
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, data.id),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError("Product not found", "product");
    }

    // Get related data in parallel
    const [category, images, priceTiers, attributeVals, relations, bundleComponents] =
      await Promise.all([
        // Category
        product.categoryId
          ? db
              .select()
              .from(categories)
              .where(eq(categories.id, product.categoryId))
              .limit(1)
              .then((r) => r[0] || null)
          : Promise.resolve(null),
        // Images
        db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, data.id))
          .orderBy(asc(productImages.sortOrder)),
        // Price tiers
        db
          .select()
          .from(productPriceTiers)
          .where(
            and(
              eq(productPriceTiers.productId, data.id),
              eq(productPriceTiers.isActive, true)
            )
          )
          .orderBy(asc(productPriceTiers.minQuantity)),
        // Attribute values
        db
          .select()
          .from(productAttributeValues)
          .where(eq(productAttributeValues.productId, data.id)),
        // Relations
        db
          .select()
          .from(productRelations)
          .where(
            and(
              eq(productRelations.productId, data.id),
              eq(productRelations.isActive, true)
            )
          )
          .orderBy(asc(productRelations.sortOrder)),
        // Bundle components (if bundle type)
        product.type === "bundle"
          ? db
              .select()
              .from(productBundles)
              .where(eq(productBundles.bundleProductId, data.id))
              .orderBy(asc(productBundles.sortOrder))
          : Promise.resolve([]),
      ]);

    return {
      product,
      category,
      images,
      priceTiers,
      attributeValues: attributeVals,
      relations,
      bundleComponents: product.type === "bundle" ? bundleComponents : undefined,
    };
  });

/**
 * Create a new product.
 */
export const createProduct = createServerFn({ method: "POST" })
  .inputValidator(createProductSchema)
  .handler(async ({ data }): Promise<Product> => {
    const ctx = await withAuth({ permission: "product.create" });

    // Check for duplicate SKU
    const existingSku = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          eq(products.sku, data.sku),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (existingSku.length > 0) {
      throw new ConflictError(`Product with SKU "${data.sku}" already exists`);
    }

    // Validate category exists if provided
    if (data.categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (categoryExists.length === 0) {
        throw new ValidationError("Category not found", {
          categoryId: ["Invalid category ID"],
        });
      }
    }

    // Insert product
    // Cast metadata to satisfy Drizzle's typed JSONB (passthrough schema adds index signature)
    const insertData = {
      ...data,
      metadata: data.metadata as typeof products.$inferInsert["metadata"],
      organizationId: ctx.organizationId,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    };

    const [newProduct] = await db
      .insert(products)
      .values(insertData)
      .returning();

    return newProduct;
  });

/**
 * Update an existing product.
 */
export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(updateProductSchema))
  .handler(async ({ data }): Promise<Product> => {
    const ctx = await withAuth({ permission: "product.update" });
    const { id, ...updateData } = data;

    // Check product exists
    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Product not found", "product");
    }

    // Check SKU uniqueness if changing
    if (updateData.sku && updateData.sku !== existing.sku) {
      const duplicateSku = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            eq(products.sku, updateData.sku),
            isNull(products.deletedAt)
          )
        )
        .limit(1);

      if (duplicateSku.length > 0) {
        throw new ConflictError(`Product with SKU "${updateData.sku}" already exists`);
      }
    }

    // Validate category if provided
    if (updateData.categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, updateData.categoryId),
            eq(categories.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (categoryExists.length === 0) {
        throw new ValidationError("Category not found", {
          categoryId: ["Invalid category ID"],
        });
      }
    }

    // Update product
    // Cast metadata to satisfy Drizzle's typed JSONB (passthrough schema adds index signature)
    const setData = {
      ...updateData,
      metadata: updateData.metadata as typeof products.$inferInsert["metadata"],
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(products)
      .set(setData)
      .where(eq(products.id, id))
      .returning();

    // Record price changes in history
    const priceChanges: Promise<void>[] = [];

    if (updateData.basePrice !== undefined && updateData.basePrice !== existing.basePrice) {
      priceChanges.push(
        recordPriceChange({
          organizationId: ctx.organizationId,
          productId: id,
          changeType: "base_price",
          previousPrice: existing.basePrice,
          newPrice: updateData.basePrice,
          reason: "Updated via product form",
          changedBy: ctx.user.id,
        })
      );
    }

    if (updateData.costPrice !== undefined && updateData.costPrice !== existing.costPrice) {
      priceChanges.push(
        recordPriceChange({
          organizationId: ctx.organizationId,
          productId: id,
          changeType: "cost_price",
          previousPrice: existing.costPrice,
          newPrice: updateData.costPrice,
          reason: "Updated via product form",
          changedBy: ctx.user.id,
        })
      );
    }

    // Wait for all price history records to be created
    if (priceChanges.length > 0) {
      await Promise.all(priceChanges);
    }

    return updated;
  });

/**
 * Soft delete a product.
 */
export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: "product.delete" });

    // Check product exists
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, data.id),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Product not found", "product");
    }

    const now = new Date();

    // Soft delete product and cascade to related records
    await db.transaction(async (tx) => {
      // Soft delete the product
      await tx
        .update(products)
        .set({
          deletedAt: now,
          updatedBy: ctx.user.id,
          updatedAt: now,
        })
        .where(eq(products.id, data.id));

      // Cascade soft delete to related records
      // Note: productImages, productAttributeValues, productPriceTiers, productBundles, productRelations
      // have FK constraints with onDelete: cascade for hard deletes, but we need explicit soft delete cascade

      // Soft delete product images
      await tx
        .update(productImages)
        .set({ deletedAt: now })
        .where(
          and(
            eq(productImages.productId, data.id),
            isNull(productImages.deletedAt)
          )
        );

      // Soft delete product attribute values
      await tx
        .update(productAttributeValues)
        .set({ deletedAt: now })
        .where(
          and(
            eq(productAttributeValues.productId, data.id),
            isNull(productAttributeValues.deletedAt)
          )
        );

      // Soft delete price tiers
      await tx
        .update(productPriceTiers)
        .set({ deletedAt: now })
        .where(
          and(
            eq(productPriceTiers.productId, data.id),
            isNull(productPriceTiers.deletedAt)
          )
        );

      // Soft delete customer-specific prices
      await tx
        .update(customerProductPrices)
        .set({ deletedAt: now })
        .where(
          and(
            eq(customerProductPrices.productId, data.id),
            isNull(customerProductPrices.deletedAt)
          )
        );

      // Soft delete product bundles (where this product is the parent)
      await tx
        .update(productBundles)
        .set({ deletedAt: now })
        .where(
          and(
            eq(productBundles.productId, data.id),
            isNull(productBundles.deletedAt)
          )
        );

      // Soft delete product relations (both directions)
      await tx
        .update(productRelations)
        .set({ deletedAt: now })
        .where(
          and(
            eq(productRelations.productId, data.id),
            isNull(productRelations.deletedAt)
          )
        );

      await tx
        .update(productRelations)
        .set({ deletedAt: now })
        .where(
          and(
            eq(productRelations.relatedProductId, data.id),
            isNull(productRelations.deletedAt)
          )
        );
    });

    return { success: true };
  });

// ============================================================================
// PRODUCT SEARCH
// ============================================================================

/**
 * Search products using full-text search.
 */
export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      q: z.string().min(2),
      categoryId: z.string().uuid().optional(),
      limit: z.number().int().positive().default(20),
    })
  )
  .handler(async ({ data }): Promise<{ products: Product[]; total: number }> => {
    const ctx = await withAuth();

    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
      eq(products.isActive, true),
    ];

    // Full-text search on name and SKU
    conditions.push(
      sql`(
        to_tsvector('english', ${products.name}) @@ plainto_tsquery('english', ${data.q}) OR
        to_tsvector('english', ${products.sku}) @@ plainto_tsquery('english', ${data.q}) OR
        ${products.name} ILIKE ${`%${data.q}%`} OR
        ${products.sku} ILIKE ${`%${data.q}%`}
      )`
    );

    if (data.categoryId) {
      conditions.push(eq(products.categoryId, data.categoryId));
    }

    const results = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .limit(data.limit);

    return {
      products: results,
      total: results.length,
    };
  });

// ============================================================================
// CATEGORY CRUD
// ============================================================================

/**
 * List categories with hierarchy support.
 */
export const listCategories = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      parentId: z.string().uuid().nullable().optional(),
      includeInactive: z.boolean().optional(),
    })
  )
  .handler(async ({ data }): Promise<Category[]> => {
    const ctx = await withAuth();

    const conditions = [eq(categories.organizationId, ctx.organizationId)];

    if (data.parentId === null) {
      conditions.push(isNull(categories.parentId));
    } else if (data.parentId) {
      conditions.push(eq(categories.parentId, data.parentId));
    }

    if (!data.includeInactive) {
      conditions.push(eq(categories.isActive, true));
    }

    return db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  });

/**
 * Get category tree (all categories organized by hierarchy).
 */
export const getCategoryTree = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await withAuth();

  const allCategories = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.organizationId, ctx.organizationId),
        eq(categories.isActive, true)
      )
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  // Build tree structure
  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create nodes
  for (const cat of allCategories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  // Second pass: build tree
  for (const cat of allCategories) {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      categoryMap.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
});

/**
 * Create a new category.
 */
export const createCategory = createServerFn({ method: "POST" })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }): Promise<Category> => {
    const ctx = await withAuth({ permission: "product.create" });

    // Validate parent exists if provided
    if (data.parentId) {
      const parentExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.parentId),
            eq(categories.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (parentExists.length === 0) {
        throw new ValidationError("Parent category not found", {
          parentId: ["Invalid parent category ID"],
        });
      }
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .returning();

    return newCategory;
  });

/**
 * Update a category.
 */
export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(updateCategorySchema))
  .handler(async ({ data }): Promise<Category> => {
    const ctx = await withAuth({ permission: "product.update" });
    const { id, ...updateData } = data;

    // Check category exists
    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, id), eq(categories.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Category not found", "category");
    }

    // Prevent circular reference
    if (updateData.parentId === id) {
      throw new ValidationError("Category cannot be its own parent", {
        parentId: ["Cannot set category as its own parent"],
      });
    }

    // Validate new parent if provided
    if (updateData.parentId) {
      const parentExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, updateData.parentId),
            eq(categories.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (parentExists.length === 0) {
        throw new ValidationError("Parent category not found", {
          parentId: ["Invalid parent category ID"],
        });
      }
    }

    const [updated] = await db
      .update(categories)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return updated;
  });

/**
 * Delete a category.
 */
export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: "product.delete" });

    // Check category exists
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, data.id), eq(categories.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Category not found", "category");
    }

    // Check for child categories
    const [childCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.parentId, data.id));

    if ((childCount?.count ?? 0) > 0) {
      throw new ConflictError(
        "Cannot delete category with child categories. Move or delete children first."
      );
    }

    // Check for products in this category
    const [productCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.categoryId, data.id), isNull(products.deletedAt)));

    if ((productCount?.count ?? 0) > 0) {
      throw new ConflictError(
        "Cannot delete category with products. Move products to another category first."
      );
    }

    // Delete category
    await db.delete(categories).where(eq(categories.id, data.id));

    return { success: true };
  });
