/**
 * Suppliers Server Functions
 *
 * Complete supplier relationship management operations.
 * Includes CRUD operations, performance tracking, and analytics.
 *
 * @see drizzle/schema/suppliers/suppliers.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, ilike, desc, asc, sql, gte, lte, count, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { currencySchema } from '@/lib/schemas/_shared/patterns';
import { suppliers, supplierPerformanceMetrics } from 'drizzle/schema/suppliers';
import { purchaseOrders } from 'drizzle/schema/suppliers';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listSuppliersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'blacklisted']).optional(),
  supplierType: z
    .enum(['manufacturer', 'distributor', 'retailer', 'service', 'raw_materials'])
    .optional(),
  ratingMin: z.number().min(0).max(5).optional(),
  ratingMax: z.number().min(0).max(5).optional(),
  sortBy: z.enum(['name', 'status', 'overallRating', 'createdAt', 'lastOrderDate']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const getSupplierSchema = z.object({
  id: z.string().uuid(),
});

const createSupplierSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'blacklisted']).default('active'),
  supplierType: z
    .enum(['manufacturer', 'distributor', 'retailer', 'service', 'raw_materials'])
    .optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional(),
  billingAddress: z
    .object({
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      postcode: z.string(),
      country: z.string(),
    })
    .optional(),
  shippingAddress: z
    .object({
      street1: z.string(),
      street2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      postcode: z.string(),
      country: z.string(),
    })
    .optional(),
  paymentTerms: z.enum(['net_15', 'net_30', 'net_45', 'net_60', 'cod', 'prepaid']).optional(),
  currency: z.string().default('AUD'),
  leadTimeDays: z.number().int().min(0).optional(),
  minimumOrderValue: currencySchema.optional(),
  maximumOrderValue: currencySchema.optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

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
      conditions.push(ilike(suppliers.name, containsPattern(search)));
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
 * Get a single supplier with full details
 */
export const getSupplier = createServerFn({ method: 'GET' })
  .inputValidator(getSupplierSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const result = await db
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

    if (!result[0]) {
      throw new Error('Supplier not found');
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

    const result = await db
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

    return result[0];
  });

/**
 * Update an existing supplier
 */
export const updateSupplier = createServerFn({ method: 'POST' })
  .inputValidator(getSupplierSchema.merge(updateSupplierSchema))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const { id, ...updateData } = data;

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

    const result = await db
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

    if (!result[0]) {
      throw new Error('Supplier not found');
    }

    return result[0];
  });

/**
 * Delete a supplier (soft delete)
 */
export const deleteSupplier = createServerFn({ method: 'POST' })
  .inputValidator(getSupplierSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.delete });

    // Check if supplier has active purchase orders
    const activeOrders = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.supplierId, data.id),
          eq(purchaseOrders.organizationId, ctx.organizationId),
          sql`${purchaseOrders.status} NOT IN ('cancelled', 'closed')`
        )
      );

    if (Number(activeOrders[0]?.count ?? 0) > 0) {
      throw new Error('Cannot delete supplier with active purchase orders');
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
      throw new Error('Supplier not found');
    }

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
      const current = await db
        .select({ notes: suppliers.notes })
        .from(suppliers)
        .where(and(eq(suppliers.id, data.id), eq(suppliers.organizationId, ctx.organizationId)))
        .limit(1);

      if (current[0]?.notes) {
        updates.notes = `${current[0].notes}\n\n[${new Date().toISOString()}] Rating update: ${data.notes}`;
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
      throw new Error('Supplier not found');
    }

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
async function generateSupplierCode(organizationId: string): Promise<string> {
  const result = await db
    .select({ count: count() })
    .from(suppliers)
    .where(eq(suppliers.organizationId, organizationId));

  const nextNumber = (Number(result[0]?.count ?? 0) + 1).toString().padStart(4, '0');
  return `SUP${nextNumber}`;
}
