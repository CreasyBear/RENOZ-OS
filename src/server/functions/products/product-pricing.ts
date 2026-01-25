/**
 * Product Pricing Server Functions
 *
 * Price resolution, tier management, and customer-specific pricing.
 * Implements: Customer-specific -> Volume tier -> Base price resolution order.
 *
 * @see _Initiation/_prd/2-domains/products/products.prd.json for specification
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, lte, gte, or, isNull, asc, desc, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { cache } from 'react';
import { db } from '@/lib/db';
import { products, productPriceTiers, customerProductPrices, priceHistory } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import {
  createPriceTierSchema,
  updatePriceTierSchema,
  createCustomerPriceSchema,
} from '@/lib/schemas/products';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BATCH_SIZE = 500;

// ============================================================================
// TYPES
// ============================================================================

type ProductPriceTier = typeof productPriceTiers.$inferSelect;
type CustomerProductPrice = typeof customerProductPrices.$inferSelect;

interface PriceResolutionResult {
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercent: number;
  source: 'customer' | 'tier' | 'base';
  tier?: ProductPriceTier;
  customerPrice?: CustomerProductPrice;
}

// ============================================================================
// PRICE RESOLUTION
// ============================================================================

/**
 * Resolve the final price for a product based on customer and quantity.
 * Resolution order: Customer-specific -> Volume tier -> Base price
 *
 * @performance Uses React.cache() for automatic request deduplication
 */
const _resolvePrice = cache(
  async (
    data: { productId: string; customerId?: string; quantity: number },
    organizationId: string
  ): Promise<PriceResolutionResult> => {
    const quantity = data.quantity ?? 1;
    const now = new Date();

    // Get the product
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    const basePrice = product.basePrice ?? 0;
    let finalPrice = basePrice;
    let discount = 0;
    let discountPercent = 0;
    let source: PriceResolutionResult['source'] = 'base';
    let appliedTier: ProductPriceTier | undefined;
    let appliedCustomerPrice: CustomerProductPrice | undefined;

    // 1. Check for customer-specific pricing (highest priority)
    if (data.customerId) {
      const [customerPrice] = await db
        .select()
        .from(customerProductPrices)
        .where(
          and(
            eq(customerProductPrices.organizationId, organizationId),
            eq(customerProductPrices.customerId, data.customerId),
            eq(customerProductPrices.productId, data.productId),
            lte(customerProductPrices.validFrom, now),
            or(isNull(customerProductPrices.validTo), gte(customerProductPrices.validTo, now))
          )
        )
        .orderBy(desc(customerProductPrices.createdAt))
        .limit(1);

      if (customerPrice) {
        if (customerPrice.discountPercent) {
          // Apply discount percentage to base price
          finalPrice = basePrice * (1 - customerPrice.discountPercent / 100);
          discountPercent = customerPrice.discountPercent;
        } else {
          // Use fixed customer price
          finalPrice = customerPrice.price ?? basePrice;
        }
        discount = basePrice - finalPrice;
        source = 'customer';
        appliedCustomerPrice = customerPrice;

        return {
          basePrice,
          finalPrice,
          discount,
          discountPercent,
          source,
          customerPrice: appliedCustomerPrice,
        };
      }
    }

    // 2. Check for volume pricing tiers
    const [volumeTier] = await db
      .select()
      .from(productPriceTiers)
      .where(
        and(
          eq(productPriceTiers.organizationId, organizationId),
          eq(productPriceTiers.productId, data.productId),
          eq(productPriceTiers.isActive, true),
          lte(productPriceTiers.minQuantity, quantity),
          or(isNull(productPriceTiers.maxQuantity), gte(productPriceTiers.maxQuantity, quantity))
        )
      )
      .orderBy(desc(productPriceTiers.minQuantity))
      .limit(1);

    if (volumeTier) {
      if (volumeTier.discountPercent) {
        finalPrice = basePrice * (1 - volumeTier.discountPercent / 100);
        discountPercent = volumeTier.discountPercent;
      } else {
        finalPrice = volumeTier.price ?? basePrice;
      }
      discount = basePrice - finalPrice;
      source = 'tier';
      appliedTier = volumeTier;
    }

    return {
      basePrice,
      finalPrice,
      discount,
      discountPercent,
      source,
      tier: appliedTier,
    };
  }
);

export const resolvePrice = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      customerId: z.string().uuid().optional(),
      quantity: z.number().int().positive().default(1),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    return _resolvePrice(data, ctx.organizationId);
  });

// ============================================================================
// PRICE TIER CRUD
// ============================================================================

/**
 * List price tiers for a product.
 */
export const listPriceTiers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProductPriceTier[]> => {
    const ctx = await withAuth();

    return db
      .select()
      .from(productPriceTiers)
      .where(
        and(
          eq(productPriceTiers.organizationId, ctx.organizationId),
          eq(productPriceTiers.productId, data.productId)
        )
      )
      .orderBy(asc(productPriceTiers.minQuantity));
  });

/**
 * Create a price tier.
 */
export const createPriceTier = createServerFn({ method: 'POST' })
  .inputValidator(createPriceTierSchema)
  .handler(async ({ data }): Promise<ProductPriceTier> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Check for overlapping tiers
    const overlapping = await db
      .select({ id: productPriceTiers.id })
      .from(productPriceTiers)
      .where(
        and(
          eq(productPriceTiers.organizationId, ctx.organizationId),
          eq(productPriceTiers.productId, data.productId),
          eq(productPriceTiers.isActive, true),
          // Check for range overlap
          sql`(
            ${productPriceTiers.minQuantity} <= ${data.maxQuantity ?? 999999999} AND
            (${productPriceTiers.maxQuantity} IS NULL OR ${productPriceTiers.maxQuantity} >= ${data.minQuantity})
          )`
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      throw new ValidationError('Price tier overlaps with existing tier', {
        minQuantity: ['Quantity range overlaps with existing tier'],
      });
    }

    const [tier] = await db
      .insert(productPriceTiers)
      .values({
        ...data,
        organizationId: ctx.organizationId,
      })
      .returning();

    return tier;
  });

/**
 * Update a price tier.
 */
export const updatePriceTier = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(updatePriceTierSchema))
  .handler(async ({ data }): Promise<ProductPriceTier> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });
    const { id, ...updateData } = data;

    const [existing] = await db
      .select()
      .from(productPriceTiers)
      .where(
        and(eq(productPriceTiers.id, id), eq(productPriceTiers.organizationId, ctx.organizationId))
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Price tier not found', 'priceTier');
    }

    const [updated] = await db
      .update(productPriceTiers)
      .set(updateData)
      .where(eq(productPriceTiers.id, id))
      .returning();

    return updated;
  });

/**
 * Delete a price tier.
 */
export const deletePriceTier = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    const [existing] = await db
      .select({ id: productPriceTiers.id })
      .from(productPriceTiers)
      .where(
        and(
          eq(productPriceTiers.id, data.id),
          eq(productPriceTiers.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Price tier not found', 'priceTier');
    }

    await db.delete(productPriceTiers).where(eq(productPriceTiers.id, data.id));

    return { success: true };
  });

/**
 * Bulk set price tiers for a product (replaces all existing).
 */
export const setPriceTiers = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      tiers: z.array(createPriceTierSchema.omit({ productId: true })),
    })
  )
  .handler(async ({ data }): Promise<ProductPriceTier[]> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Delete existing tiers
    await db
      .delete(productPriceTiers)
      .where(
        and(
          eq(productPriceTiers.organizationId, ctx.organizationId),
          eq(productPriceTiers.productId, data.productId)
        )
      );

    if (data.tiers.length === 0) {
      return [];
    }

    // Insert new tiers
    const newTiers = await db
      .insert(productPriceTiers)
      .values(
        data.tiers.map((tier) => ({
          ...tier,
          productId: data.productId,
          organizationId: ctx.organizationId,
        }))
      )
      .returning();

    return newTiers;
  });

// ============================================================================
// CUSTOMER PRICE CRUD
// ============================================================================

/**
 * List customer-specific prices for a product.
 */
export const listCustomerPrices = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid().optional(),
      customerId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }): Promise<CustomerProductPrice[]> => {
    const ctx = await withAuth();

    const conditions = [eq(customerProductPrices.organizationId, ctx.organizationId)];

    if (data.productId) {
      conditions.push(eq(customerProductPrices.productId, data.productId));
    }
    if (data.customerId) {
      conditions.push(eq(customerProductPrices.customerId, data.customerId));
    }

    return db
      .select()
      .from(customerProductPrices)
      .where(and(...conditions))
      .orderBy(desc(customerProductPrices.createdAt));
  });

/**
 * Create or update customer-specific price.
 */
export const setCustomerPrice = createServerFn({ method: 'POST' })
  .inputValidator(createCustomerPriceSchema)
  .handler(async ({ data }): Promise<CustomerProductPrice> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    // Verify product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, data.productId),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      throw new NotFoundError('Product not found', 'product');
    }

    // Check for existing customer price
    const [existing] = await db
      .select()
      .from(customerProductPrices)
      .where(
        and(
          eq(customerProductPrices.organizationId, ctx.organizationId),
          eq(customerProductPrices.customerId, data.customerId),
          eq(customerProductPrices.productId, data.productId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(customerProductPrices)
        .set({
          price: data.price,
          discountPercent: data.discountPercent,
          validFrom: data.validFrom ?? new Date(),
          validTo: data.validTo,
        })
        .where(eq(customerProductPrices.id, existing.id))
        .returning();

      return updated;
    }

    // Create new
    const [created] = await db
      .insert(customerProductPrices)
      .values({
        ...data,
        organizationId: ctx.organizationId,
        createdBy: ctx.user.id,
        validFrom: data.validFrom ?? new Date(),
      })
      .returning();

    return created;
  });

/**
 * Delete customer-specific price.
 */
export const deleteCustomerPrice = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    const [existing] = await db
      .select({ id: customerProductPrices.id })
      .from(customerProductPrices)
      .where(
        and(
          eq(customerProductPrices.id, data.id),
          eq(customerProductPrices.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Customer price not found', 'customerPrice');
    }

    await db.delete(customerProductPrices).where(eq(customerProductPrices.id, data.id));

    return { success: true };
  });

// ============================================================================
// PRICE HISTORY
// ============================================================================

type PriceHistory = typeof priceHistory.$inferSelect;

/**
 * Record a price change in history.
 * Internal helper - called by other functions when prices change.
 */
export async function recordPriceChange(params: {
  organizationId: string;
  productId: string;
  changeType:
    | 'base_price'
    | 'cost_price'
    | 'tier_created'
    | 'tier_updated'
    | 'tier_deleted'
    | 'customer_price'
    | 'bulk_update';
  previousPrice?: number | null;
  newPrice?: number | null;
  previousDiscountPercent?: number | null;
  newDiscountPercent?: number | null;
  tierId?: string | null;
  customerId?: string | null;
  reason?: string | null;
  changedBy: string;
}): Promise<void> {
  await db.insert(priceHistory).values({
    organizationId: params.organizationId,
    productId: params.productId,
    changeType: params.changeType,
    previousPrice: params.previousPrice ?? null,
    newPrice: params.newPrice ?? null,
    previousDiscountPercent: params.previousDiscountPercent ?? null,
    newDiscountPercent: params.newDiscountPercent ?? null,
    tierId: params.tierId ?? null,
    customerId: params.customerId ?? null,
    reason: params.reason ?? null,
    changedBy: params.changedBy,
  } as typeof priceHistory.$inferInsert);
}

/**
 * Get price history for a product.
 */
export const getPriceHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0),
    })
  )
  .handler(async ({ data }): Promise<{ history: PriceHistory[]; total: number }> => {
    const ctx = await withAuth();

    const [history, countResult] = await Promise.all([
      db
        .select()
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.organizationId, ctx.organizationId),
            eq(priceHistory.productId, data.productId)
          )
        )
        .orderBy(desc(priceHistory.changedAt))
        .limit(data.limit)
        .offset(data.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.organizationId, ctx.organizationId),
            eq(priceHistory.productId, data.productId)
          )
        ),
    ]);

    return {
      history,
      total: countResult[0]?.count ?? 0,
    };
  });

// ============================================================================
// BULK PRICE UPDATES
// ============================================================================

interface BulkPriceUpdateResult {
  success: boolean;
  updated: number;
  failed: Array<{ productId: string; error: string }>;
}

/**
 * Bulk update prices for multiple products.
 * Records price history for each change.
 */
export const bulkUpdatePrices = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      updates: z
        .array(
          z.object({
            productId: z.string().uuid(),
            basePrice: z.number().min(0).optional(),
            costPrice: z.number().min(0).optional(),
          })
        )
        .min(1)
        .max(100),
      reason: z.string().max(500).optional(),
    })
  )
  .handler(async ({ data }): Promise<BulkPriceUpdateResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    // Validate batch size
    if (data.updates.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size exceeds limit of ${MAX_BATCH_SIZE} items. Please split into smaller batches.`,
        { updates: [`Maximum ${MAX_BATCH_SIZE} updates allowed, received ${data.updates.length}`] }
      );
    }

    const result: BulkPriceUpdateResult = {
      success: true,
      updated: 0,
      failed: [],
    };

    // Batch fetch all products upfront to avoid N+1 queries
    const productIds = data.updates.map((u) => u.productId);
    const allProducts = await db
      .select({
        id: products.id,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      );

    // Create a Map for O(1) lookups
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    // Process each update
    for (const update of data.updates) {
      try {
        // Get current product from the pre-fetched map
        const product = productMap.get(update.productId);

        if (!product) {
          result.failed.push({ productId: update.productId, error: 'Product not found' });
          continue;
        }

        // Build update object
        const updateData: Partial<typeof products.$inferInsert> = {};

        if (update.basePrice !== undefined && update.basePrice !== product.basePrice) {
          // Record base price change
          await recordPriceChange({
            organizationId: ctx.organizationId,
            productId: update.productId,
            changeType: 'bulk_update',
            previousPrice: product.basePrice,
            newPrice: update.basePrice,
            reason: data.reason,
            changedBy: ctx.user.id,
          });
          updateData.basePrice = update.basePrice;
        }

        if (update.costPrice !== undefined && update.costPrice !== product.costPrice) {
          // Record cost price change
          await recordPriceChange({
            organizationId: ctx.organizationId,
            productId: update.productId,
            changeType: 'cost_price',
            previousPrice: product.costPrice,
            newPrice: update.costPrice,
            reason: data.reason,
            changedBy: ctx.user.id,
          });
          updateData.costPrice = update.costPrice;
        }

        // Apply update if there are changes
        if (Object.keys(updateData).length > 0) {
          await db.update(products).set(updateData).where(eq(products.id, update.productId));
          result.updated++;
        }
      } catch (error) {
        result.failed.push({
          productId: update.productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.failed.length === 0;
    return result;
  });

/**
 * Apply percentage price adjustment to multiple products.
 * Useful for across-the-board price increases/decreases.
 */
export const applyPriceAdjustment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      productIds: z.array(z.string().uuid()).min(1).max(100),
      adjustmentPercent: z.number().min(-100).max(1000), // -100% to +1000%
      applyTo: z.enum(['base', 'cost', 'both']).default('base'),
      roundTo: z.number().int().min(0).max(4).default(2), // Decimal places
      reason: z.string().max(500).optional(),
    })
  )
  .handler(async ({ data }): Promise<BulkPriceUpdateResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.product.update });

    // Validate batch size
    if (data.productIds.length > MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size exceeds limit of ${MAX_BATCH_SIZE} items. Please split into smaller batches.`,
        {
          productIds: [
            `Maximum ${MAX_BATCH_SIZE} products allowed, received ${data.productIds.length}`,
          ],
        }
      );
    }

    const result: BulkPriceUpdateResult = {
      success: true,
      updated: 0,
      failed: [],
    };

    const multiplier = 1 + data.adjustmentPercent / 100;
    const roundFactor = Math.pow(10, data.roundTo);

    // Batch fetch all products upfront to avoid N+1 query
    const allProducts = await db
      .select({
        id: products.id,
        basePrice: products.basePrice,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, data.productIds),
          eq(products.organizationId, ctx.organizationId),
          isNull(products.deletedAt)
        )
      );

    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    for (const productId of data.productIds) {
      try {
        const product = productMap.get(productId);

        if (!product) {
          result.failed.push({ productId, error: 'Product not found' });
          continue;
        }

        const updateData: Partial<typeof products.$inferInsert> = {};

        // Apply to base price
        if ((data.applyTo === 'base' || data.applyTo === 'both') && product.basePrice) {
          const newBasePrice =
            Math.round(product.basePrice * multiplier * roundFactor) / roundFactor;

          await recordPriceChange({
            organizationId: ctx.organizationId,
            productId,
            changeType: 'bulk_update',
            previousPrice: product.basePrice,
            newPrice: newBasePrice,
            reason:
              data.reason ??
              `${data.adjustmentPercent > 0 ? '+' : ''}${data.adjustmentPercent}% adjustment`,
            changedBy: ctx.user.id,
          });

          updateData.basePrice = newBasePrice;
        }

        // Apply to cost price
        if ((data.applyTo === 'cost' || data.applyTo === 'both') && product.costPrice) {
          const newCostPrice =
            Math.round(product.costPrice * multiplier * roundFactor) / roundFactor;

          await recordPriceChange({
            organizationId: ctx.organizationId,
            productId,
            changeType: 'cost_price',
            previousPrice: product.costPrice,
            newPrice: newCostPrice,
            reason:
              data.reason ??
              `${data.adjustmentPercent > 0 ? '+' : ''}${data.adjustmentPercent}% adjustment`,
            changedBy: ctx.user.id,
          });

          updateData.costPrice = newCostPrice;
        }

        if (Object.keys(updateData).length > 0) {
          await db.update(products).set(updateData).where(eq(products.id, productId));
          result.updated++;
        }
      } catch (error) {
        result.failed.push({
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.failed.length === 0;
    return result;
  });
