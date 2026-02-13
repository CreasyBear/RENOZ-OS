/**
 * Suppliers Server Functions
 *
 * Complete supplier relationship management operations.
 * Includes CRUD operations, performance tracking, and analytics.
 *
 * @see drizzle/schema/suppliers/suppliers.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, or, ilike, desc, asc, gte, lte, count, isNull, not, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import {
  createSupplierSchema,
  updateSupplierSchema,
  getSupplierSchema,
  listSuppliersSchema,
  listSuppliersCursorSchema,
} from '@/lib/schemas/suppliers';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { suppliers, supplierPerformanceMetrics } from 'drizzle/schema/suppliers';
import { purchaseOrders } from 'drizzle/schema/suppliers';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { createActivityLoggerWithContext } from '@/server/middleware/activity-context';
import { computeChanges } from '@/lib/activity-logger';

// Excluded fields for activity logging (system-managed fields)
const SUPPLIER_EXCLUDED_FIELDS: string[] = [
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'deletedAt',
  'organizationId',
  'version',
];

// ============================================================================
// INPUT SCHEMAS (createSupplierSchema, updateSupplierSchema, getSupplierSchema, listSuppliersSchema from lib)
// ============================================================================

const updateSupplierRatingSchema = z.object({
  id: z.string().uuid(),
  qualityRating: z.number().min(0).max(5),
  deliveryRating: z.number().min(0).max(5),
  communicationRating: z.number().min(0).max(5),
  notes: z.string().optional(),
});

// ============================================================================
// SUPPLIER CRUD OPERATIONS
// ============================================================================

/**
 * List suppliers with filtering, sorting, and pagination
 */
export const listSuppliers = createServerFn({ method: 'GET' })
  .inputValidator(listSuppliersSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const {
      search,
      status,
      supplierType,
      ratingMin,
      ratingMax,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20,
    } = data;

    // Build where conditions
    const conditions = [
      eq(suppliers.organizationId, ctx.organizationId),
      isNull(suppliers.deletedAt),
    ];

    if (search) {
      const searchPattern = containsPattern(search);
      const searchCondition = or(
        ilike(suppliers.name, searchPattern),
        ilike(suppliers.supplierCode, searchPattern),
        ilike(suppliers.email, searchPattern),
        ilike(suppliers.primaryContactName, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (status) {
      conditions.push(eq(suppliers.status, status));
    }

    if (supplierType) {
      conditions.push(eq(suppliers.supplierType, supplierType));
    }

    if (ratingMin !== undefined) {
      conditions.push(gte(suppliers.overallRating, ratingMin));
    }

    if (ratingMax !== undefined) {
      conditions.push(lte(suppliers.overallRating, ratingMax));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db.select({ count: count() }).from(suppliers).where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    let orderColumn;
    switch (sortBy) {
      case 'name':
        orderColumn = suppliers.name;
        break;
      case 'status':
        orderColumn = suppliers.status;
        break;
      case 'overallRating':
        orderColumn = suppliers.overallRating;
        break;
      case 'lastOrderDate':
        orderColumn = suppliers.lastOrderDate;
        break;
      case 'createdAt':
      default:
        orderColumn = suppliers.createdAt;
    }

    const items = await db
      .select({
        id: suppliers.id,
        supplierCode: suppliers.supplierCode,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        status: suppliers.status,
        supplierType: suppliers.supplierType,
        primaryContactName: suppliers.primaryContactName,
        overallRating: suppliers.overallRating,
        leadTimeDays: suppliers.leadTimeDays,
        lastOrderDate: suppliers.lastOrderDate,
        totalPurchaseOrders: suppliers.totalPurchaseOrders,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .where(whereClause)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });

/**
 * List suppliers with cursor pagination (recommended for large datasets).
 */
export const listSuppliersCursor = createServerFn({ method: 'GET' })
  .inputValidator(listSuppliersCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', search, status, supplierType, ratingMin, ratingMax } = data;

    const conditions = [eq(suppliers.organizationId, ctx.organizationId), isNull(suppliers.deletedAt)];

    if (search) {
      const searchPattern = containsPattern(search);
      const searchCondition = or(
        ilike(suppliers.name, searchPattern),
        ilike(suppliers.supplierCode, searchPattern),
        ilike(suppliers.email, searchPattern),
        ilike(suppliers.primaryContactName, searchPattern)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (status) conditions.push(eq(suppliers.status, status));
    if (supplierType) conditions.push(eq(suppliers.supplierType, supplierType));
    if (ratingMin !== undefined) conditions.push(gte(suppliers.overallRating, ratingMin));
    if (ratingMax !== undefined) conditions.push(lte(suppliers.overallRating, ratingMax));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(suppliers.createdAt, suppliers.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const items = await db
      .select({
        id: suppliers.id,
        supplierCode: suppliers.supplierCode,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone,
        status: suppliers.status,
        supplierType: suppliers.supplierType,
        primaryContactName: suppliers.primaryContactName,
        overallRating: suppliers.overallRating,
        leadTimeDays: suppliers.leadTimeDays,
        lastOrderDate: suppliers.lastOrderDate,
        totalPurchaseOrders: suppliers.totalPurchaseOrders,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(orderDir(suppliers.createdAt), orderDir(suppliers.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(items, pageSize);
  });

/**
 * Get a single supplier with full details
 */
export const getSupplier = createServerFn({ method: 'GET' })
  .inputValidator(getSupplierSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const result = await db
      .select({
        id: suppliers.id,
        organizationId: suppliers.organizationId,
        supplierCode: suppliers.supplierCode,
        name: suppliers.name,
        legalName: suppliers.legalName,
        email: suppliers.email,
        phone: suppliers.phone,
        website: suppliers.website,
        status: suppliers.status,
        supplierType: suppliers.supplierType,
        taxId: suppliers.taxId,
        registrationNumber: suppliers.registrationNumber,
        primaryContactName: suppliers.primaryContactName,
        primaryContactEmail: suppliers.primaryContactEmail,
        primaryContactPhone: suppliers.primaryContactPhone,
        billingAddress: suppliers.billingAddress,
        shippingAddress: suppliers.shippingAddress,
        paymentTerms: suppliers.paymentTerms,
        currency: suppliers.currency,
        leadTimeDays: suppliers.leadTimeDays,
        minimumOrderValue: suppliers.minimumOrderValue,
        maximumOrderValue: suppliers.maximumOrderValue,
        qualityRating: suppliers.qualityRating,
        deliveryRating: suppliers.deliveryRating,
        communicationRating: suppliers.communicationRating,
        overallRating: suppliers.overallRating,
        ratingUpdatedAt: suppliers.ratingUpdatedAt,
        totalPurchaseOrders: suppliers.totalPurchaseOrders,
        totalPurchaseValue: suppliers.totalPurchaseValue,
        averageOrderValue: suppliers.averageOrderValue,
        firstOrderDate: suppliers.firstOrderDate,
        lastOrderDate: suppliers.lastOrderDate,
        tags: suppliers.tags,
        customFields: suppliers.customFields,
        notes: suppliers.notes,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
        createdBy: suppliers.createdBy,
        updatedBy: suppliers.updatedBy,
        deletedAt: suppliers.deletedAt,
      })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    // Get recent performance metrics (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const performanceMetrics = await db
      .select({
        metricMonth: supplierPerformanceMetrics.metricMonth,
        totalOrdersDelivered: supplierPerformanceMetrics.totalOrdersDelivered,
        onTimeDeliveries: supplierPerformanceMetrics.onTimeDeliveries,
        lateDeliveries: supplierPerformanceMetrics.lateDeliveries,
        averageDeliveryDays: supplierPerformanceMetrics.averageDeliveryDays,
        totalItemsReceived: supplierPerformanceMetrics.totalItemsReceived,
        acceptedItems: supplierPerformanceMetrics.acceptedItems,
        rejectedItems: supplierPerformanceMetrics.rejectedItems,
        defectRate: supplierPerformanceMetrics.defectRate,
        totalSpend: supplierPerformanceMetrics.totalSpend,
        deliveryScore: supplierPerformanceMetrics.deliveryScore,
        qualityScore: supplierPerformanceMetrics.qualityScore,
        overallScore: supplierPerformanceMetrics.overallScore,
      })
      .from(supplierPerformanceMetrics)
      .where(
        and(
          eq(supplierPerformanceMetrics.supplierId, data.id),
          eq(supplierPerformanceMetrics.organizationId, ctx.organizationId),
          gte(supplierPerformanceMetrics.metricMonth, twelveMonthsAgo.toISOString().slice(0, 10))
        )
      )
      .orderBy(desc(supplierPerformanceMetrics.metricMonth))
      .limit(12);

    return {
      ...result[0],
      performanceMetrics,
    };
  });

/**
 * Create a new supplier
 */
export const createSupplier = createServerFn({ method: 'POST' })
  .inputValidator(createSupplierSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.create });

    // Generate supplier code
    const supplierCode = await generateSupplierCode(ctx.organizationId);

    let result: typeof suppliers.$inferSelect[];
    try {
      result = await db
        .insert(suppliers)
        .values({
        organizationId: ctx.organizationId,
        supplierCode,
        name: data.name,
        legalName: data.legalName,
        email: data.email,
        phone: data.phone,
        website: data.website,
        status: data.status,
        supplierType: data.supplierType,
        taxId: data.taxId,
        registrationNumber: data.registrationNumber,
        primaryContactName: data.primaryContactName,
        primaryContactEmail: data.primaryContactEmail,
        primaryContactPhone: data.primaryContactPhone,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        paymentTerms: data.paymentTerms,
        currency: data.currency,
        leadTimeDays: data.leadTimeDays,
        minimumOrderValue: data.minimumOrderValue,
        maximumOrderValue: data.maximumOrderValue,
        tags: data.tags ?? [],
        notes: data.notes,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();
    } catch (err: unknown) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505') {
        if (pgError.constraint?.includes('email')) {
          throw new ValidationError(
            'A supplier with this email address already exists. Use a different email or update the existing supplier.',
            { email: ['Email is already in use.'] }
          );
        }
        if (pgError.constraint?.includes('code')) {
          throw new ValidationError(
            'A supplier code conflict occurred. Please try again.',
            { supplierCode: ['Please retry.'] }
          );
        }
      }
      throw err;
    }

    const supplier = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'supplier',
      entityId: supplier.id,
      action: 'created',
      description: `Created supplier: ${supplier.name}`,
      changes: computeChanges({
        before: null,
        after: supplier,
        excludeFields: SUPPLIER_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        supplierCode: supplier.supplierCode,
        supplierName: supplier.name,
        supplierType: supplier.supplierType ?? undefined,
        status: supplier.status,
      },
    });

    return supplier;
  });

/**
 * Update an existing supplier
 */
export const updateSupplier = createServerFn({ method: 'POST' })
  .inputValidator(getSupplierSchema.merge(updateSupplierSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const { id, ...updateData } = data;

    // Get existing supplier for change tracking
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .limit(1);

    if (!existingSupplier) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedBy: ctx.user.id,
    };

    // Copy all provided fields
    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.legalName !== undefined) updates.legalName = updateData.legalName;
    if (updateData.email !== undefined) updates.email = updateData.email;
    if (updateData.phone !== undefined) updates.phone = updateData.phone;
    if (updateData.website !== undefined) updates.website = updateData.website;
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.supplierType !== undefined) updates.supplierType = updateData.supplierType;
    if (updateData.taxId !== undefined) updates.taxId = updateData.taxId;
    if (updateData.registrationNumber !== undefined)
      updates.registrationNumber = updateData.registrationNumber;
    if (updateData.primaryContactName !== undefined)
      updates.primaryContactName = updateData.primaryContactName;
    if (updateData.primaryContactEmail !== undefined)
      updates.primaryContactEmail = updateData.primaryContactEmail;
    if (updateData.primaryContactPhone !== undefined)
      updates.primaryContactPhone = updateData.primaryContactPhone;
    if (updateData.billingAddress !== undefined) updates.billingAddress = updateData.billingAddress;
    if (updateData.shippingAddress !== undefined)
      updates.shippingAddress = updateData.shippingAddress;
    if (updateData.paymentTerms !== undefined) updates.paymentTerms = updateData.paymentTerms;
    if (updateData.currency !== undefined) updates.currency = updateData.currency;
    if (updateData.leadTimeDays !== undefined) updates.leadTimeDays = updateData.leadTimeDays;
    if (updateData.minimumOrderValue !== undefined)
      updates.minimumOrderValue = updateData.minimumOrderValue;
    if (updateData.maximumOrderValue !== undefined)
      updates.maximumOrderValue = updateData.maximumOrderValue;
    if (updateData.tags !== undefined) updates.tags = updateData.tags;
    if (updateData.notes !== undefined) updates.notes = updateData.notes;

    let result: typeof suppliers.$inferSelect[];
    try {
      result = await db
        .update(suppliers)
        .set(updates)
        .where(
          and(
            eq(suppliers.id, id),
            eq(suppliers.organizationId, ctx.organizationId),
            isNull(suppliers.deletedAt)
          )
        )
        .returning();
    } catch (err: unknown) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505' && pgError.constraint?.includes('email')) {
        throw new ValidationError(
          'A supplier with this email address already exists. Use a different email.',
          { email: ['Email is already in use.'] }
        );
      }
      throw err;
    }

    if (!result[0]) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    const updatedSupplier = result[0];

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'supplier',
      entityId: updatedSupplier.id,
      action: 'updated',
      description: `Updated supplier: ${updatedSupplier.name}`,
      changes: computeChanges({
        before: existingSupplier,
        after: updatedSupplier,
        excludeFields: SUPPLIER_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        supplierCode: updatedSupplier.supplierCode,
        supplierName: updatedSupplier.name,
        changedFields: Object.keys(updateData),
      },
    });

    return updatedSupplier;
  });

/**
 * Delete a supplier (soft delete)
 */
export const deleteSupplier = createServerFn({ method: 'POST' })
  .inputValidator(getSupplierSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.delete });

    // Get existing supplier for logging
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .limit(1);

    if (!existingSupplier) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    // Check if supplier has active purchase orders
    const activeOrders = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.supplierId, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          not(inArray(purchaseOrders.status, ['cancelled', 'closed']))
        )
      );

    if (Number(activeOrders[0]?.count ?? 0) > 0) {
      throw new ValidationError(
        'This supplier has open purchase orders. Close or cancel them first, then try again.'
      );
    }

    const result = await db
      .update(suppliers)
      .set({
        status: 'inactive',
        deletedAt: new Date(),
        updatedBy: ctx.user.id,
      })
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .returning({ id: suppliers.id });

    if (!result[0]) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'supplier',
      entityId: existingSupplier.id,
      action: 'deleted',
      description: `Deleted supplier: ${existingSupplier.name}`,
      changes: computeChanges({
        before: existingSupplier,
        after: null,
        excludeFields: SUPPLIER_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        supplierCode: existingSupplier.supplierCode,
        supplierName: existingSupplier.name,
      },
    });

    return { success: true, id: result[0].id };
  });

// ============================================================================
// SUPPLIER RATINGS
// ============================================================================

/**
 * Update supplier ratings
 */
export const updateSupplierRating = createServerFn({ method: 'POST' })
  .inputValidator(updateSupplierRatingSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Get existing supplier for logging
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .limit(1);

    if (!existingSupplier) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    // Calculate overall rating
    const overallRating =
      Math.round(((data.qualityRating + data.deliveryRating + data.communicationRating) / 3) * 10) /
      10;

    const updates: Record<string, unknown> = {
      qualityRating: data.qualityRating,
      deliveryRating: data.deliveryRating,
      communicationRating: data.communicationRating,
      overallRating,
      ratingUpdatedAt: new Date().toISOString(),
      updatedBy: ctx.user.id,
    };

    // Append notes if provided
    if (data.notes) {
      if (existingSupplier.notes) {
        updates.notes = `${existingSupplier.notes}\n\n[${new Date().toISOString()}] Rating update: ${data.notes}`;
      } else {
        updates.notes = `[${new Date().toISOString()}] Rating update: ${data.notes}`;
      }
    }

    const result = await db
      .update(suppliers)
      .set(updates)
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.organizationId, ctx.organizationId),
          isNull(suppliers.deletedAt)
        )
      )
      .returning();

    if (!result[0]) {
      throw new NotFoundError('Supplier not found', 'Supplier');
    }

    // Activity logging
    const logger = createActivityLoggerWithContext(ctx);
    logger.logAsync({
      entityType: 'supplier',
      entityId: existingSupplier.id,
      action: 'updated',
      description: `Updated supplier rating: ${existingSupplier.name}`,
      changes: computeChanges({
        before: existingSupplier,
        after: result[0],
        excludeFields: SUPPLIER_EXCLUDED_FIELDS as never[],
      }),
      metadata: {
        supplierCode: existingSupplier.supplierCode,
        supplierName: existingSupplier.name,
        previousRating: existingSupplier.overallRating ?? undefined,
        newRating: overallRating,
        qualityRating: data.qualityRating,
        deliveryRating: data.deliveryRating,
        communicationRating: data.communicationRating,
      },
    });

    return {
      success: true,
      supplierId: data.id,
      overallRating,
    };
  });

// ============================================================================
// SUPPLIER PERFORMANCE
// ============================================================================

/**
 * Get supplier performance metrics
 */
export const getSupplierPerformance = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      supplierId: z.string().uuid(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const conditions = [
      eq(supplierPerformanceMetrics.supplierId, data.supplierId),
      eq(supplierPerformanceMetrics.organizationId, ctx.organizationId),
    ];

    if (data.startDate) {
      conditions.push(gte(supplierPerformanceMetrics.metricMonth, data.startDate));
    }

    if (data.endDate) {
      conditions.push(lte(supplierPerformanceMetrics.metricMonth, data.endDate));
    }

    const metrics = await db
      .select()
      .from(supplierPerformanceMetrics)
      .where(and(...conditions))
      .orderBy(desc(supplierPerformanceMetrics.metricMonth));

    // Calculate aggregates
    const aggregates = await db
      .select({
        totalOrdersDelivered: sql<number>`SUM(${supplierPerformanceMetrics.totalOrdersDelivered})`,
        totalOnTime: sql<number>`SUM(${supplierPerformanceMetrics.onTimeDeliveries})`,
        totalLate: sql<number>`SUM(${supplierPerformanceMetrics.lateDeliveries})`,
        avgDeliveryDays: sql<number>`AVG(${supplierPerformanceMetrics.averageDeliveryDays})`,
        totalItemsReceived: sql<number>`SUM(${supplierPerformanceMetrics.totalItemsReceived})`,
        totalAccepted: sql<number>`SUM(${supplierPerformanceMetrics.acceptedItems})`,
        totalRejected: sql<number>`SUM(${supplierPerformanceMetrics.rejectedItems})`,
        avgDefectRate: sql<number>`AVG(${supplierPerformanceMetrics.defectRate})`,
        totalSpend: sql<number>`SUM(${supplierPerformanceMetrics.totalSpend})`,
        avgDeliveryScore: sql<number>`AVG(${supplierPerformanceMetrics.deliveryScore})`,
        avgQualityScore: sql<number>`AVG(${supplierPerformanceMetrics.qualityScore})`,
        avgOverallScore: sql<number>`AVG(${supplierPerformanceMetrics.overallScore})`,
      })
      .from(supplierPerformanceMetrics)
      .where(and(...conditions));

    return {
      metrics,
      aggregates: aggregates[0] ?? null,
    };
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique supplier code
 */
async function generateSupplierCode(organizationId: string, maxRetries = 3): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await db
      .select({ count: count() })
      .from(suppliers)
      .where(eq(suppliers.organizationId, organizationId));

    const nextNumber = (Number(result[0]?.count ?? 0) + 1 + attempt).toString().padStart(4, '0');
    const code = `SUP${nextNumber}`;

    // Check for uniqueness before returning
    const [existing] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.organizationId, organizationId),
          eq(suppliers.supplierCode, code)
        )
      )
      .limit(1);

    if (!existing) {
      return code;
    }
  }

  // Fallback: append random suffix to guarantee uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SUP-${randomSuffix}`;
}
