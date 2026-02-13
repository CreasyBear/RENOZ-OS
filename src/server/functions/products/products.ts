/**
 * Product Server Functions
 *
 * Comprehensive product CRUD operations with search, validation, and org isolation.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { cache } from 'react';
import { createServerFn } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, sql, desc, asc, isNull, ilike, or, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import {
  products,
  categories,
  productPriceTiers,
  productBundles,
  productImages,
  productAttributeValues,
  productRelations,
  inventory,
} from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError, ConflictError, ServerError } from '@/lib/server/errors';
import {
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  productCursorQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  getProductResponseSchema,
  normalizeProductRow,
  type CategoryWithChildren,
  type ProductWithInventory,
  type ListProductsResult,
  type Category,
} from '@/lib/schemas/products';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { recordPriceChange } from './product-pricing';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

type Product = typeof products.$inferSelect;

// ============================================================================
// PRODUCT CRUD
// ============================================================================

/**
 * List products with filtering, sorting, and pagination.
 */
export const listProducts = createServerFn({ method: 'GET' })
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

    // Add search filter - use ilike helper instead of raw SQL for type safety
    if (search) {
      const searchPattern = containsPattern(search);
      const searchCondition = or(
        ilike(products.name, searchPattern),
        ilike(products.sku, searchPattern),
        ilike(products.description, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
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
    if (filters.minPrice != null) {
      conditions.push(gte(products.basePrice, filters.minPrice));
    }
    if (filters.maxPrice != null) {
      conditions.push(lte(products.basePrice, filters.maxPrice));
    }
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(
        (tag) => sql`${products.tags} @> ${JSON.stringify([tag])}::jsonb`
      );
      conditions.push(sql`(${sql.join(tagConditions, sql` OR `)})`);
    }

    // Build order clause
    const orderColumn =
      sortBy === 'name'
        ? products.name
        : sortBy === 'sku'
          ? products.sku
          : sortBy === 'basePrice'
            ? products.basePrice
            : products.createdAt;
    const orderDir = sortOrder === 'asc' ? asc : desc;
    const offset = (page - 1) * limit;
    const whereClause = and(...conditions);

    // Run count and paginated results in parallel to eliminate waterfall
    const [countResult, productList] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(whereClause),
      db
        .select({
          product: products,
          categoryName: categories.name,
          totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(whereClause)
        .groupBy(products.id, categories.name)
        .orderBy(orderDir(orderColumn))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Map to ProductWithInventory with stock status calculation
    const productsWithInventory: ProductWithInventory[] = productList.map((row) => {
      const product = row.product;
      const totalQty = row.totalQuantity ?? 0;
      const categoryName = row.categoryName ?? null;
      
      // Calculate stock status
      let stockStatus: ProductWithInventory['stockStatus'];
      if (!product.trackInventory) {
        stockStatus = 'not_tracked';
      } else if (totalQty === 0) {
        stockStatus = 'out_of_stock';
      } else if (product.reorderPoint !== null && totalQty <= product.reorderPoint) {
        stockStatus = 'low_stock';
      } else {
        stockStatus = 'in_stock';
      }

      const normalized = normalizeProductRow(product);
      return {
        ...normalized,
        categoryId: normalized.categoryId ?? null,
        categoryName,
        totalQuantity: totalQty,
        stockStatus,
      } as ProductWithInventory;
    });

    return {
      products: productsWithInventory,
      total,
      page,
      limit,
      hasMore: offset + productList.length < total,
    };
  });

/**
 * List products with cursor pagination (recommended for large datasets).
 */
export const listProductsCursor = createServerFn({ method: 'GET' })
  .inputValidator(productCursorQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { cursor, pageSize = 20, sortOrder = 'desc', ...filters } = data;

    const conditions = [
      eq(products.organizationId, ctx.organizationId),
      isNull(products.deletedAt),
    ];

    if (filters.search) {
      const searchPattern = containsPattern(filters.search);
      const searchCondition = or(
        ilike(products.name, searchPattern),
        ilike(products.sku, searchPattern),
        ilike(products.description, searchPattern)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (filters.type) conditions.push(eq(products.type, filters.type));
    if (filters.status) conditions.push(eq(products.status, filters.status));
    if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
    if (filters.isActive !== undefined) conditions.push(eq(products.isActive, filters.isActive));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(products.createdAt, products.id, cursorPosition, sortOrder)
        );
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;

    const productList = await db
      .select({
        product: products,
        categoryName: categories.name,
        totalQuantity: sql<number>`COALESCE(SUM(${inventory.quantityOnHand}), 0)::int`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(and(...conditions))
      .groupBy(products.id, categories.name)
      .orderBy(orderDir(products.createdAt), orderDir(products.id))
      .limit(pageSize + 1);

    const productsWithInventory: ProductWithInventory[] = productList.map((row) => {
      const product = row.product;
      const totalQty = row.totalQuantity ?? 0;
      const categoryName = row.categoryName ?? null;
      let stockStatus: ProductWithInventory['stockStatus'];
      if (!product.trackInventory) stockStatus = 'not_tracked';
      else if (totalQty === 0) stockStatus = 'out_of_stock';
      else if (product.reorderPoint !== null && totalQty <= product.reorderPoint) stockStatus = 'low_stock';
      else stockStatus = 'in_stock';
      const normalized = normalizeProductRow(product);
      return {
        ...normalized,
        categoryId: normalized.categoryId ?? null,
        categoryName,
        totalQuantity: totalQty,
        stockStatus,
      } as ProductWithInventory;
    });

    return buildStandardCursorResponse(productsWithInventory, pageSize);
  });

/**
 * Cached product fetch for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getProductCached = cache(async (id: string, organizationId: string) => {
  const [productResult, images, priceTiers, attributeVals, relations] = await Promise.all([
    db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1),
    db
      .select()
      .from(productImages)
      .where(and(eq(productImages.productId, id), eq(productImages.organizationId, organizationId)))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select()
      .from(productPriceTiers)
      .where(
        and(eq(productPriceTiers.productId, id), eq(productPriceTiers.isActive, true))
      )
      .orderBy(asc(productPriceTiers.minQuantity)),
    db
      .select()
      .from(productAttributeValues)
      .where(and(eq(productAttributeValues.productId, id), eq(productAttributeValues.organizationId, organizationId))),
    db
      .select()
      .from(productRelations)
      .where(and(eq(productRelations.productId, id), eq(productRelations.isActive, true), eq(productRelations.organizationId, organizationId)))
      .orderBy(asc(productRelations.sortOrder)),
  ]);

  const [product] = productResult;
  if (!product) return null;

  const [category, bundleComponents] = await Promise.all([
    product.categoryId
      ? db
          .select()
          .from(categories)
          .where(eq(categories.id, product.categoryId))
          .limit(1)
          .then((r) => r[0] || null)
      : Promise.resolve(null),
    product.type === 'bundle'
      ? db
          .select()
          .from(productBundles)
          .where(eq(productBundles.bundleProductId, id))
          .orderBy(asc(productBundles.sortOrder))
      : Promise.resolve([]),
  ]);

  const normalizedProduct = normalizeProductRow(product);
  const normalizedImages = images.map((img) => ({
    ...img,
    fileSize: img.fileSize ?? null,
  }));
  const normalizedPriceTiers = priceTiers.map((t) => ({
    ...t,
    discountPercent: t.discountPercent ?? null,
  }));

  return getProductResponseSchema.parse({
    product: normalizedProduct,
    category: category ? { ...category, description: category.description ?? undefined, parentId: category.parentId ?? undefined } : null,
    images: normalizedImages,
    priceTiers: normalizedPriceTiers,
    attributeValues: attributeVals,
    relations,
    bundleComponents: product.type === 'bundle' ? bundleComponents : undefined,
  });
});

/**
 * Get single product with all related data.
 */
export const getProduct = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const result = await _getProductCached(data.id, ctx.organizationId);
    if (!result) {
      setResponseStatus(404);
      throw new NotFoundError('Product not found', 'product');
    }
    return result;
  });

/**
 * Create a new product.
 */
export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator(createProductSchema)
  .handler(async ({ data }): Promise<Product> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.create });

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
          and(eq(categories.id, data.categoryId), eq(categories.organizationId, ctx.organizationId))
        )
        .limit(1);

      if (categoryExists.length === 0) {
        throw new ValidationError('Category not found', {
          categoryId: ['Invalid category ID'],
        });
      }
    }

    // Insert product (metadata cast for zod passthrough → drizzle ProductMetadata)
    const insertData = {
      ...data,
      organizationId: ctx.organizationId,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
      metadata: (data.metadata ?? {}) as { [key: string]: string | number | boolean | null | undefined },
    };

    const [newProduct] = await db.insert(products).values(insertData).returning();

    return newProduct;
  });

/**
 * Update an existing product.
 */
export const updateProduct = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(updateProductSchema))
  .handler(async ({ data }): Promise<Product> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });
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
      throw new NotFoundError('Product not found', 'product');
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
        throw new ValidationError('Category not found', {
          categoryId: ['Invalid category ID'],
        });
      }
    }

    // Update product and record price changes atomically
    const setData = {
      ...updateData,
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
      ...(updateData.metadata !== undefined && {
        metadata: updateData.metadata as { [key: string]: string | number | boolean | null | undefined },
      }),
    };

    const updated = await db.transaction(async (tx) => {
      const [result] = await tx
        .update(products)
        .set(setData as Partial<typeof products.$inferInsert>)
        .where(and(eq(products.id, id), eq(products.organizationId, ctx.organizationId), isNull(products.deletedAt)))
        .returning();

      // Record price changes in history
      const priceChanges: Promise<void>[] = [];

      if (updateData.basePrice !== undefined && updateData.basePrice !== existing.basePrice) {
        priceChanges.push(
          recordPriceChange({
            organizationId: ctx.organizationId,
            productId: id,
            changeType: 'base_price',
            previousPrice: existing.basePrice,
            newPrice: updateData.basePrice,
            reason: 'Updated via product form',
            changedBy: ctx.user.id,
            executor: tx as unknown as typeof db,
          })
        );
      }

      if (updateData.costPrice !== undefined && updateData.costPrice !== existing.costPrice) {
        priceChanges.push(
          recordPriceChange({
            organizationId: ctx.organizationId,
            productId: id,
            changeType: 'cost_price',
            previousPrice: existing.costPrice,
            newPrice: updateData.costPrice,
            reason: 'Updated via product form',
            changedBy: ctx.user.id,
            executor: tx as unknown as typeof db,
          })
        );
      }

      // Wait for all price history records to be created
      if (priceChanges.length > 0) {
        await Promise.all(priceChanges);
      }

      return result;
    });

    return updated;
  });

/**
 * Soft delete a product.
 */
export const deleteProduct = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.delete });

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
      throw new NotFoundError('Product not found', 'product');
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
        .where(
          and(
            eq(products.id, data.id),
            eq(products.organizationId, ctx.organizationId)
          )
        );

      // Note: Related records (productImages, productAttributeValues, productPriceTiers,
      // productBundles, productRelations, customerProductPrices) will be automatically
      // hard deleted via FK cascade when the product is hard deleted.
      // These tables do not have deletedAt columns and rely on database CASCADE.
    });

    return { success: true };
  });

/**
 * Duplicate a product with all its related data.
 * Creates a copy with " (Copy)" suffix and a new SKU.
 */
export const duplicateProduct = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<Product> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.create });

    try {
      return await db.transaction(async (tx) => {
      // Get the original product with all related data
      const [original] = await tx
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

      if (!original) {
        setResponseStatus(404);
        throw new NotFoundError('Product not found', 'product');
      }

      // Get related data - SECURITY: All queries must filter by organizationId
      // PERFORMANCE: Explicit column projection for non-trivial tables (gold standard)
      const [priceTiers, images, attributeValues, bundleComponents, relations] = await Promise.all([
        tx
          .select({
            organizationId: productPriceTiers.organizationId,
            minQuantity: productPriceTiers.minQuantity,
            maxQuantity: productPriceTiers.maxQuantity,
            price: productPriceTiers.price,
            discountPercent: productPriceTiers.discountPercent,
            isActive: productPriceTiers.isActive,
          })
          .from(productPriceTiers)
          .where(and(eq(productPriceTiers.productId, data.id), eq(productPriceTiers.organizationId, ctx.organizationId))),
        tx
          .select({
            organizationId: productImages.organizationId,
            imageUrl: productImages.imageUrl,
            altText: productImages.altText,
            caption: productImages.caption,
            sortOrder: productImages.sortOrder,
            isPrimary: productImages.isPrimary,
            fileSize: productImages.fileSize,
            dimensions: productImages.dimensions,
            uploadedBy: productImages.uploadedBy,
          })
          .from(productImages)
          .where(and(eq(productImages.productId, data.id), eq(productImages.organizationId, ctx.organizationId))),
        tx
          .select({
            organizationId: productAttributeValues.organizationId,
            attributeId: productAttributeValues.attributeId,
            value: productAttributeValues.value,
          })
          .from(productAttributeValues)
          .where(and(eq(productAttributeValues.productId, data.id), eq(productAttributeValues.organizationId, ctx.organizationId))),
        tx
          .select({
            organizationId: productBundles.organizationId,
            componentProductId: productBundles.componentProductId,
            quantity: productBundles.quantity,
            isOptional: productBundles.isOptional,
            sortOrder: productBundles.sortOrder,
          })
          .from(productBundles)
          .where(and(eq(productBundles.bundleProductId, data.id), eq(productBundles.organizationId, ctx.organizationId))),
        tx
          .select({
            organizationId: productRelations.organizationId,
            relatedProductId: productRelations.relatedProductId,
            relationType: productRelations.relationType,
            sortOrder: productRelations.sortOrder,
            isActive: productRelations.isActive,
            createdBy: productRelations.createdBy,
          })
          .from(productRelations)
          .where(and(eq(productRelations.productId, data.id), eq(productRelations.organizationId, ctx.organizationId))),
      ]);

      // Generate new SKU by appending -COPY
      const newSku = `${original.sku}-COPY`;

      // Check if SKU already exists
      const existingSku = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            eq(products.sku, newSku),
            isNull(products.deletedAt)
          )
        )
        .limit(1);

      if (existingSku.length > 0) {
        setResponseStatus(409);
        throw new ConflictError(`Product with SKU "${newSku}" already exists. Please rename the original product first.`);
      }

      // Create the duplicated product (exclude id, sku, timestamps, audit fields)
      const { id: _id, sku: _sku, name: originalName, createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, updatedBy: _updatedBy, deletedAt: _deletedAt, ...productData } = original;

      const [newProduct] = await tx
        .insert(products)
        .values({
          ...productData,
          sku: newSku,
          name: `${originalName} (Copy)`,
          organizationId: ctx.organizationId,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Duplicate related data in parallel
      await Promise.all([
        // Price tiers (projection excludes id, productId, createdAt)
        priceTiers.length > 0
          ? tx.insert(productPriceTiers).values(
              priceTiers.map((tier) => ({
                ...tier,
                productId: newProduct.id,
              }))
            )
          : Promise.resolve(),

        // Images (projection excludes id, productId, createdAt)
        images.length > 0
          ? tx.insert(productImages).values(
              images.map((image) => ({
                ...image,
                productId: newProduct.id,
              }))
            )
          : Promise.resolve(),

        // Attribute values (projection excludes id, productId, createdAt, updatedAt)
        attributeValues.length > 0
          ? tx.insert(productAttributeValues).values(
              attributeValues.map((attr) => ({
                ...attr,
                productId: newProduct.id,
              }))
            )
          : Promise.resolve(),

        // Bundle components (projection excludes id, bundleProductId, createdAt)
        bundleComponents.length > 0
          ? tx.insert(productBundles).values(
              bundleComponents.map((bundle) => ({
                ...bundle,
                bundleProductId: newProduct.id,
              }))
            )
          : Promise.resolve(),

        // Product relations (projection excludes id, productId, createdAt)
        relations.length > 0
          ? tx.insert(productRelations).values(
              relations.map((relation) => ({
                ...relation,
                productId: newProduct.id,
              }))
            )
          : Promise.resolve(),
      ]);

      return newProduct;
    });
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        setResponseStatus(409);
        throw new ConflictError('Duplicate record - a product with this SKU may already exist');
      }
      logger.error('duplicateProduct DB error', error);
      setResponseStatus(500);
      throw new ServerError('Failed to duplicate product', 500, 'INTERNAL_ERROR');
    }
  });

// ============================================================================
// PRODUCT SEARCH
// ============================================================================

/**
 * Quick search products using full-text search.
 * For advanced search with facets and analytics, use searchProducts from product-search.ts
 */
export const quickSearchProducts = createServerFn({ method: 'GET' })
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

    // RAW SQL (Phase 11 Keep): Full-text search (to_tsvector/plainto_tsquery). Drizzle cannot express. See PHASE11-RAW-SQL-AUDIT.md
    const searchPattern = containsPattern(data.q);
    conditions.push(
      sql`(
        to_tsvector('english', ${products.name}) @@ plainto_tsquery('english', ${data.q}) OR
        to_tsvector('english', ${products.sku}) @@ plainto_tsquery('english', ${data.q}) OR
        ${products.name} ILIKE ${searchPattern} OR
        ${products.sku} ILIKE ${searchPattern}
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
export const listCategories = createServerFn({ method: 'GET' })
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

    const rows = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    return rows.map((r) => ({ ...r, description: r.description ?? undefined, parentId: r.parentId ?? undefined }));
  });

/**
 * Get category tree (all categories organized by hierarchy).
 */
/**
 * Cached category tree for per-request deduplication.
 * @performance Uses React.cache() for automatic request deduplication
 */
const _getCategoryTreeCached = cache(async (organizationId: string): Promise<CategoryWithChildren[]> => {
  const allCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.organizationId, organizationId), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const categoryMap = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  for (const cat of allCategories) {
    categoryMap.set(cat.id, { ...cat, description: cat.description ?? undefined, parentId: cat.parentId ?? undefined, children: [] });
  }

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

export const getCategoryTree = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await withAuth();
  return _getCategoryTreeCached(ctx.organizationId);
});

/**
 * Create a new category.
 */
export const createCategory = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }): Promise<Category> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.create });

    // Validate parent exists if provided
    if (data.parentId) {
      const parentExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(eq(categories.id, data.parentId), eq(categories.organizationId, ctx.organizationId))
        )
        .limit(1);

      if (parentExists.length === 0) {
        throw new ValidationError('Parent category not found', {
          parentId: ['Invalid parent category ID'],
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

    return { ...newCategory, description: newCategory.description ?? undefined, parentId: newCategory.parentId ?? undefined };
  });

/**
 * Update a category.
 */
export const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(updateCategorySchema))
  .handler(async ({ data }): Promise<Category> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });
    const { id, ...updateData } = data;

    // Check category exists
    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Category not found', 'category');
    }

    // Prevent circular reference
    if (updateData.parentId === id) {
      throw new ValidationError('Category cannot be its own parent', {
        parentId: ['Cannot set category as its own parent'],
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
        throw new ValidationError('Parent category not found', {
          parentId: ['Invalid parent category ID'],
        });
      }
    }

    const [updated] = await db
      .update(categories)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(categories.id, id), eq(categories.organizationId, ctx.organizationId)))
      .returning();

    if (!updated) throw new NotFoundError('Category not found', 'category');
    return { ...updated, description: updated.description ?? undefined, parentId: updated.parentId ?? undefined };
  });

/**
 * Delete a category.
 */
export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.delete });

    // Check category exists
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, data.id), eq(categories.organizationId, ctx.organizationId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Category not found', 'category');
    }

    // Check for child categories - SECURITY: Filter by organizationId
    const [childCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(and(eq(categories.parentId, data.id), eq(categories.organizationId, ctx.organizationId)));

    if ((childCount?.count ?? 0) > 0) {
      throw new ConflictError(
        'Cannot delete category with child categories. Move or delete children first.'
      );
    }

    // Check for products in this category - SECURITY: Filter by organizationId
    const [productCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(eq(products.categoryId, data.id), eq(products.organizationId, ctx.organizationId), isNull(products.deletedAt)));

    if ((productCount?.count ?? 0) > 0) {
      throw new ConflictError(
        'Cannot delete category with products. Move products to another category first.'
      );
    }

    // Delete category
    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, data.id),
          eq(categories.organizationId, ctx.organizationId)
        )
      );

    return { success: true };
  });
