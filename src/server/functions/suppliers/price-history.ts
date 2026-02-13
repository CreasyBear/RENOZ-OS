/**
 * Price History Server Functions
 *
 * Audit trail and approval workflow for price changes.
 * Tracks all price modifications with approval requirements.
 *
 * @see drizzle/schema/suppliers/price-change-history.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, asc, sql, count, gte, lte, isNotNull } from 'drizzle-orm';
import {
  cursorPaginationSchema,
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
} from '@/lib/db/pagination';
import { z } from 'zod';
import { db } from '@/lib/db';
import { priceChangeHistory, supplierPriceLists } from 'drizzle/schema/suppliers';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { NotFoundError, ValidationError } from '@/lib/server/errors';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPriceChangeHistorySchema = z.object({
  priceListId: z.string().uuid().optional(),
  agreementId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'applied', 'cancelled']).optional(),
  requestedBy: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'requestedAt', 'effectiveDate', 'status']).default('requestedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const listPriceChangeHistoryCursorSchema = cursorPaginationSchema.merge(
  z.object({
    priceListId: z.string().uuid().optional(),
    agreementId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'applied', 'cancelled']).optional(),
    requestedBy: z.string().uuid().optional(),
  })
);

const createPriceChangeRequestSchema = z.object({
  priceListId: z.string().uuid().optional(),
  agreementId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  previousPrice: z.number().nonnegative().optional(),
  newPrice: z.number().nonnegative(),
  changeReason: z.string().optional(),
  effectiveDate: z.string().optional(), // ISO date
  notes: z.string().optional(),
});

const approvePriceChangeSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

// ============================================================================
// PRICE CHANGE HISTORY
// ============================================================================

/**
 * List price change history with filtering and pagination
 */
export const listPriceChangeHistory = createServerFn({ method: 'GET' })
  .inputValidator(listPriceChangeHistorySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const {
      priceListId,
      agreementId,
      supplierId,
      status,
      requestedBy,
      sortBy = 'requestedAt',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = data;

    // Build where conditions
    const conditions = [eq(priceChangeHistory.organizationId, ctx.organizationId)];

    if (priceListId) {
      conditions.push(eq(priceChangeHistory.priceListId, priceListId));
    }

    if (agreementId) {
      conditions.push(eq(priceChangeHistory.agreementId, agreementId));
    }

    if (supplierId) {
      conditions.push(eq(priceChangeHistory.supplierId, supplierId));
    }

    if (status) {
      conditions.push(eq(priceChangeHistory.status, status));
    }

    if (requestedBy) {
      conditions.push(eq(priceChangeHistory.requestedBy, requestedBy));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: count() })
      .from(priceChangeHistory)
      .where(whereClause);

    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    let orderColumn;
    switch (sortBy) {
      case 'createdAt':
        orderColumn = priceChangeHistory.createdAt;
        break;
      case 'effectiveDate':
        orderColumn = priceChangeHistory.effectiveDate;
        break;
      case 'status':
        orderColumn = priceChangeHistory.status;
        break;
      case 'requestedAt':
      default:
        orderColumn = priceChangeHistory.requestedAt;
    }

    const items = await db
      .select({
        id: priceChangeHistory.id,
        priceListId: priceChangeHistory.priceListId,
        agreementId: priceChangeHistory.agreementId,
        supplierId: priceChangeHistory.supplierId,
        previousPrice: priceChangeHistory.previousPrice,
        newPrice: priceChangeHistory.newPrice,
        priceChange: priceChangeHistory.priceChange,
        changePercent: priceChangeHistory.changePercent,
        changeReason: priceChangeHistory.changeReason,
        effectiveDate: priceChangeHistory.effectiveDate,
        status: priceChangeHistory.status,
        requestedBy: priceChangeHistory.requestedBy,
        requestedAt: priceChangeHistory.requestedAt,
        approvedBy: priceChangeHistory.approvedBy,
        approvedAt: priceChangeHistory.approvedAt,
        rejectedBy: priceChangeHistory.rejectedBy,
        rejectedAt: priceChangeHistory.rejectedAt,
        rejectionReason: priceChangeHistory.rejectionReason,
        appliedBy: priceChangeHistory.appliedBy,
        appliedAt: priceChangeHistory.appliedAt,
        notes: priceChangeHistory.notes,
        createdAt: priceChangeHistory.createdAt,
      })
      .from(priceChangeHistory)
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
 * List price change history with cursor pagination (recommended for large datasets).
 * Uses createdAt + id for stable sort.
 */
export const listPriceChangeHistoryCursor = createServerFn({ method: 'GET' })
  .inputValidator(listPriceChangeHistoryCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', priceListId, agreementId, supplierId, status, requestedBy } = data;

    const conditions = [eq(priceChangeHistory.organizationId, ctx.organizationId)];
    if (priceListId) conditions.push(eq(priceChangeHistory.priceListId, priceListId));
    if (agreementId) conditions.push(eq(priceChangeHistory.agreementId, agreementId));
    if (supplierId) conditions.push(eq(priceChangeHistory.supplierId, supplierId));
    if (status) conditions.push(eq(priceChangeHistory.status, status));
    if (requestedBy) conditions.push(eq(priceChangeHistory.requestedBy, requestedBy));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(priceChangeHistory.createdAt, priceChangeHistory.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const items = await db
      .select({
        id: priceChangeHistory.id,
        priceListId: priceChangeHistory.priceListId,
        agreementId: priceChangeHistory.agreementId,
        supplierId: priceChangeHistory.supplierId,
        previousPrice: priceChangeHistory.previousPrice,
        newPrice: priceChangeHistory.newPrice,
        priceChange: priceChangeHistory.priceChange,
        changePercent: priceChangeHistory.changePercent,
        changeReason: priceChangeHistory.changeReason,
        effectiveDate: priceChangeHistory.effectiveDate,
        status: priceChangeHistory.status,
        requestedBy: priceChangeHistory.requestedBy,
        requestedAt: priceChangeHistory.requestedAt,
        approvedBy: priceChangeHistory.approvedBy,
        approvedAt: priceChangeHistory.approvedAt,
        rejectedBy: priceChangeHistory.rejectedBy,
        rejectedAt: priceChangeHistory.rejectedAt,
        rejectionReason: priceChangeHistory.rejectionReason,
        appliedBy: priceChangeHistory.appliedBy,
        appliedAt: priceChangeHistory.appliedAt,
        notes: priceChangeHistory.notes,
        createdAt: priceChangeHistory.createdAt,
      })
      .from(priceChangeHistory)
      .where(and(...conditions))
      .orderBy(orderDir(priceChangeHistory.createdAt), orderDir(priceChangeHistory.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(items, pageSize);
  });

/**
 * Get a single price change record
 */
export const getPriceChangeRecord = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const result = await db
      .select()
      .from(priceChangeHistory)
      .where(
        and(
          eq(priceChangeHistory.id, data.id),
          eq(priceChangeHistory.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!result[0]) {
      throw new NotFoundError('Price change record not found', 'priceChangeRecord');
    }

    return result[0] ?? null;
  });

/**
 * Create a price change request
 */
export const createPriceChangeRequest = createServerFn({ method: 'POST' })
  .inputValidator(createPriceChangeRequestSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Calculate price change and percentage
    const previousPrice = data.previousPrice ?? 0;
    const priceChange = data.newPrice - previousPrice;
    const changePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : null;

    const result = await db
      .insert(priceChangeHistory)
      .values({
        organizationId: ctx.organizationId,
        priceListId: data.priceListId,
        agreementId: data.agreementId,
        supplierId: data.supplierId,
        previousPrice: data.previousPrice ?? null,
        newPrice: data.newPrice,
        priceChange: priceChange,
        changePercent: changePercent,
        changeReason: data.changeReason,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        status: 'pending',
        requestedBy: ctx.user.id,
        requestedAt: new Date(),
        notes: data.notes,
      })
      .returning();

    return result[0] ?? null;
  });

/**
 * Approve or reject a price change request
 */
export const approvePriceChange = createServerFn({ method: 'POST' })
  .inputValidator(approvePriceChangeSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.approve });

    const updates: Record<string, unknown> = {};

    if (data.action === 'approve') {
      updates.status = 'approved';
      updates.approvedBy = ctx.user.id;
      updates.approvedAt = new Date();
    } else {
      updates.status = 'rejected';
      updates.rejectedBy = ctx.user.id;
      updates.rejectedAt = new Date();
      updates.rejectionReason = data.reason;
    }

    const result = await db
      .update(priceChangeHistory)
      .set(updates)
      .where(
        and(
          eq(priceChangeHistory.id, data.id),
          eq(priceChangeHistory.organizationId, ctx.organizationId),
          eq(priceChangeHistory.status, 'pending')
        )
      )
      .returning();

    if (!result[0]) {
      throw new NotFoundError('Price change request not found or not pending', 'priceChangeRequest');
    }

    return result[0] ?? null;
  });

/**
 * Apply an approved price change to the price list
 */
export const applyPriceChange = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    // Wrap price update + status change in a transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Get the price change record
      const changeRecord = await tx
        .select()
        .from(priceChangeHistory)
        .where(
          and(
            eq(priceChangeHistory.id, data.id),
            eq(priceChangeHistory.organizationId, ctx.organizationId),
            eq(priceChangeHistory.status, 'approved')
          )
        )
        .limit(1);

      if (!changeRecord[0]) {
        throw new NotFoundError('Price change record not found or not approved', 'priceChangeRecord');
      }

      const record = changeRecord[0];

      // Apply the price change to the price list if applicable
      if (record.priceListId) {
        await tx
          .update(supplierPriceLists)
          .set({
            price: record.newPrice,
            effectivePrice: record.newPrice,
            lastUpdated: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(
            and(
              eq(supplierPriceLists.id, record.priceListId),
              eq(supplierPriceLists.organizationId, ctx.organizationId)
            )
          );
      }

      // Mark the change as applied
      const [applied] = await tx
        .update(priceChangeHistory)
        .set({
          status: 'applied',
          appliedBy: ctx.user.id,
          appliedAt: new Date(),
        })
        .where(eq(priceChangeHistory.id, data.id))
        .returning();

      return applied;
    });

    return result;
  });

/**
 * Cancel a pending price change request
 */
export const cancelPriceChangeRequest = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.update });

    const result = await db
      .update(priceChangeHistory)
      .set({
        status: 'cancelled',
      })
      .where(
        and(
          eq(priceChangeHistory.id, data.id),
          eq(priceChangeHistory.organizationId, ctx.organizationId),
          eq(priceChangeHistory.status, 'pending'),
          eq(priceChangeHistory.requestedBy, ctx.user.id) // Only requester can cancel
        )
      )
      .returning();

    if (!result[0]) {
      throw new ValidationError('Price change request not found, not pending, or not owned by you');
    }

    return result[0] ?? null;
  });

/**
 * Get pending approval requests for current user's organization
 */
export const getPendingApprovals = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      limit: z.number().int().min(1).max(100).default(50),
    })
  )
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.suppliers.read });

    const items = await db
      .select({
        id: priceChangeHistory.id,
        priceListId: priceChangeHistory.priceListId,
        agreementId: priceChangeHistory.agreementId,
        supplierId: priceChangeHistory.supplierId,
        previousPrice: priceChangeHistory.previousPrice,
        newPrice: priceChangeHistory.newPrice,
        priceChange: priceChangeHistory.priceChange,
        changePercent: priceChangeHistory.changePercent,
        changeReason: priceChangeHistory.changeReason,
        effectiveDate: priceChangeHistory.effectiveDate,
        requestedBy: priceChangeHistory.requestedBy,
        requestedAt: priceChangeHistory.requestedAt,
        notes: priceChangeHistory.notes,
      })
      .from(priceChangeHistory)
      .where(
        and(
          eq(priceChangeHistory.organizationId, ctx.organizationId),
          eq(priceChangeHistory.status, 'pending')
        )
      )
      .orderBy(desc(priceChangeHistory.requestedAt))
      .limit(data.limit);

    return items;
  });

/**
 * Get price change statistics for a supplier
 */
export const getSupplierPriceChangeStats = createServerFn({ method: 'GET' })
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
      eq(priceChangeHistory.organizationId, ctx.organizationId),
      eq(priceChangeHistory.supplierId, data.supplierId),
    ];

    if (data.startDate) {
      conditions.push(gte(priceChangeHistory.requestedAt, new Date(data.startDate)));
    }

    if (data.endDate) {
      conditions.push(lte(priceChangeHistory.requestedAt, new Date(data.endDate)));
    }

    const whereClause = and(...conditions);

    // Get counts by status
    const statusCounts = await db
      .select({
        status: priceChangeHistory.status,
        count: count(),
      })
      .from(priceChangeHistory)
      .where(whereClause)
      .groupBy(priceChangeHistory.status);

    // Get average price change percentage
    const avgChange = await db
      .select({
        avgChangePercent: sql<string>`AVG(CAST(${priceChangeHistory.changePercent} AS DECIMAL))`,
      })
      .from(priceChangeHistory)
      .where(and(whereClause, isNotNull(priceChangeHistory.changePercent)));

    return {
      supplierId: data.supplierId,
      statusCounts: statusCounts.reduce(
        (acc, row) => ({
          ...acc,
          [row.status]: Number(row.count),
        }),
        {} as Record<string, number>
      ),
      averageChangePercent: avgChange[0]?.avgChangePercent
        ? Number(avgChange[0].avgChangePercent)
        : null,
    };
  });
