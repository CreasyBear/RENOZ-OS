'use server'

/**
 * Custom Reports Server Functions
 *
 * Server functions for user-defined report CRUD operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/reports/custom-reports.ts for validation schemas
 * @see drizzle/schema/reports/custom-reports.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, ilike, desc, asc, sql, gte, lte, ne, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { customReports } from 'drizzle/schema/reports';
import { purchaseOrders, suppliers } from 'drizzle/schema/suppliers';
import {
  createCustomReportSchema,
  updateCustomReportSchema,
  listCustomReportsSchema,
  getCustomReportSchema,
  executeCustomReportSchema,
  type ReportResult,
} from '@/lib/schemas/reports/custom-reports';

// ============================================================================
// CUSTOM REPORTS CRUD
// ============================================================================

/**
 * List custom reports with filtering and pagination.
 */
export const listCustomReports = createServerFn({ method: 'GET' })
  .inputValidator(listCustomReportsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.viewOperations });

    const {
      page = 1,
      pageSize = 20,
      isShared,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = data as typeof data & { sortBy?: string; sortOrder?: 'asc' | 'desc' };

    const conditions = [eq(customReports.organizationId, ctx.organizationId)];

    if (search) {
      conditions.push(ilike(customReports.name, containsPattern(search)));
    }
    if (isShared !== undefined) {
      conditions.push(eq(customReports.isShared, isShared));
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customReports)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    const offset = (page - 1) * pageSize;
    const orderColumn = sortBy === 'name' ? customReports.name : customReports.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const items = await db
      .select()
      .from(customReports)
      .where(whereClause)
      .orderBy(orderDirection(orderColumn))
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
 * Get a single custom report by ID.
 */
export const getCustomReport = createServerFn({ method: 'GET' })
  .inputValidator(getCustomReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.viewOperations });

    const [report] = await db
      .select()
      .from(customReports)
      .where(
        and(
          eq(customReports.id, data.id),
          eq(customReports.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!report) {
      throw new NotFoundError('Custom report not found', 'customReport');
    }

    return report;
  });

/**
 * Create a new custom report.
 */
export const createCustomReport = createServerFn({ method: 'POST' })
  .inputValidator(createCustomReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const [report] = await db
      .insert(customReports)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        isShared: data.isShared ?? false,
        definition: data.definition,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return report;
  });

/**
 * Update an existing custom report.
 */
export const updateCustomReport = createServerFn({ method: 'POST' })
  .inputValidator(updateCustomReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const { id, ...updates } = data;

    const updateValues: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.description !== undefined) updateValues.description = updates.description;
    if (updates.isShared !== undefined) updateValues.isShared = updates.isShared;
    if (updates.definition !== undefined) updateValues.definition = updates.definition;

    const [report] = await db
      .update(customReports)
      .set(updateValues)
      .where(
        and(
          eq(customReports.id, id),
          eq(customReports.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!report) {
      throw new NotFoundError('Custom report not found', 'customReport');
    }

    return report;
  });

/**
 * Delete a custom report (hard delete since schema doesn't have soft delete).
 */
export const deleteCustomReport = createServerFn({ method: 'POST' })
  .inputValidator(getCustomReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const [report] = await db
      .delete(customReports)
      .where(
        and(
          eq(customReports.id, data.id),
          eq(customReports.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!report) {
      throw new NotFoundError('Custom report not found', 'customReport');
    }

    return { success: true };
  });

// ============================================================================
// EXECUTION
// ============================================================================

/**
 * Execute a custom report based on its saved definition.
 */
export const executeCustomReport = createServerFn({ method: 'POST' })
  .inputValidator(executeCustomReportSchema)
  .handler(async ({ data }): Promise<ReportResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.viewOperations });

    const [report] = await db
      .select()
      .from(customReports)
      .where(
        and(
          eq(customReports.id, data.id),
          eq(customReports.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!report) {
      throw new NotFoundError('Custom report not found', 'customReport');
    }

    const definition = report.definition ?? { columns: [] };
    const filters = (definition.filters ?? {}) as Record<string, string | number | boolean>;
    const source = filters.source;
    const reportType = filters.reportType;

    if (source === 'procurement') {
      const dateFrom = data.dateFrom
        ? new Date(data.dateFrom)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = data.dateTo ? new Date(data.dateTo) : new Date();

      const baseConditions = [
        eq(purchaseOrders.organizationId, ctx.organizationId),
        isNull(purchaseOrders.deletedAt),
        ne(purchaseOrders.status, 'draft'),
        ne(purchaseOrders.status, 'cancelled'),
        gte(purchaseOrders.orderDate, dateFrom.toISOString().split('T')[0]),
        lte(purchaseOrders.orderDate, dateTo.toISOString().split('T')[0]),
      ];

      if (reportType === 'supplier-performance' || reportType === 'spend-analysis' || reportType === 'cost-savings') {
        const rows = await db
          .select({
            supplierName: suppliers.name,
            totalSpend: sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`,
            totalOrders: sql<number>`COUNT(*)`,
            orderCount: sql<number>`COUNT(*)`,
            avgOrderValue: sql<number>`COALESCE(AVG(${purchaseOrders.totalAmount}), 0)`,
            qualityRating: suppliers.qualityRating,
            deliveryRating: suppliers.deliveryRating,
            leadTimeDays: suppliers.leadTimeDays,
          })
          .from(purchaseOrders)
          .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
          .where(and(...baseConditions))
          .groupBy(
            suppliers.id,
            suppliers.name,
            suppliers.qualityRating,
            suppliers.deliveryRating,
            suppliers.leadTimeDays
          )
          .orderBy(desc(sql<number>`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)`))
          .limit(data.limit);

        const columns = resolveColumns(definition.columns, [
          'supplierName',
          'totalSpend',
          'totalOrders',
          'orderCount',
          'avgOrderValue',
          'qualityRating',
          'deliveryRating',
          'leadTimeDays',
        ]);

        return {
          columns,
          rows: rows.map((row) => pickColumns(row, columns)) as unknown as ReportResult['rows'],
          totalCount: rows.length,
          generatedAt: new Date(),
        };
      }

      if (reportType === 'efficiency') {
        const [metrics] = await db
          .select({
            orderCount: sql<number>`COUNT(*)`,
            fulfilledCount: sql<number>`COUNT(CASE WHEN ${purchaseOrders.status} IN ('received', 'closed') THEN 1 END)`,
            onTimeCount: sql<number>`COUNT(CASE WHEN ${purchaseOrders.actualDeliveryDate} IS NOT NULL AND ${purchaseOrders.expectedDeliveryDate} IS NOT NULL AND ${purchaseOrders.actualDeliveryDate} <= ${purchaseOrders.expectedDeliveryDate} THEN 1 END)`,
            deliveryCount: sql<number>`COUNT(CASE WHEN ${purchaseOrders.actualDeliveryDate} IS NOT NULL AND ${purchaseOrders.expectedDeliveryDate} IS NOT NULL THEN 1 END)`,
            avgApprovalDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${purchaseOrders.approvedAt} - ${purchaseOrders.orderedAt})) / 86400), 0)`,
            avgDeliveryDelayDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${purchaseOrders.actualDeliveryDate}::timestamp - ${purchaseOrders.expectedDeliveryDate}::timestamp)) / 86400), 0)`,
          })
          .from(purchaseOrders)
          .where(and(...baseConditions));

        const orderCount = Number(metrics?.orderCount ?? 0);
        const fulfilledCount = Number(metrics?.fulfilledCount ?? 0);
        const deliveryCount = Number(metrics?.deliveryCount ?? 0);
        const onTimeCount = Number(metrics?.onTimeCount ?? 0);

        const row = {
          orderCount,
          orderFulfillmentRate: orderCount > 0 ? (fulfilledCount / orderCount) * 100 : 0,
          onTimeDeliveryRate: deliveryCount > 0 ? (onTimeCount / deliveryCount) * 100 : 0,
          avgApprovalDays: Number(metrics?.avgApprovalDays ?? 0),
          avgDeliveryDelayDays: Number(metrics?.avgDeliveryDelayDays ?? 0),
        };

        const columns = resolveColumns(definition.columns, [
          'orderCount',
          'orderFulfillmentRate',
          'onTimeDeliveryRate',
          'avgApprovalDays',
          'avgDeliveryDelayDays',
        ]);

        return {
          columns,
          rows: [pickColumns(row, columns)] as unknown as ReportResult['rows'],
          totalCount: 1,
          generatedAt: new Date(),
        };
      }

      const rows = await db
        .select({
          poNumber: purchaseOrders.poNumber,
          supplierName: suppliers.name,
          status: purchaseOrders.status,
          orderDate: purchaseOrders.orderDate,
          expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
          totalAmount: purchaseOrders.totalAmount,
        })
        .from(purchaseOrders)
        .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(and(...baseConditions))
        .orderBy(desc(purchaseOrders.orderDate))
        .limit(data.limit);

      const columns = resolveColumns(definition.columns, [
        'poNumber',
        'supplierName',
        'status',
        'orderDate',
        'expectedDeliveryDate',
        'totalAmount',
      ]);

      return {
        columns,
        rows: rows.map((row) => pickColumns(row, columns)) as unknown as ReportResult['rows'],
        totalCount: rows.length,
        generatedAt: new Date(),
      };
    }

    return {
      columns: definition.columns ?? [],
      rows: [],
      totalCount: 0,
      generatedAt: new Date(),
    };
  });

function resolveColumns(columns: string[] | undefined, fallback: string[]) {
  if (!columns || columns.length === 0) return fallback;
  const allowed = new Set(fallback);
  const filtered = columns.filter((column) => allowed.has(column));
  return filtered.length > 0 ? filtered : fallback;
}

function pickColumns<T extends Record<string, unknown>>(row: T, columns: string[]) {
  return columns.reduce((acc, key) => {
    acc[key] = row[key];
    return acc;
  }, {} as Record<string, unknown>);
}
