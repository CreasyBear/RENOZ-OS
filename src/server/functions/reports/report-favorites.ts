'use server'

/**
 * Report Favorites Server Functions
 *
 * Server functions for user report favorites CRUD operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/reports/report-favorites.ts for validation schemas
 * @see drizzle/schema/reports/report-favorites.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { reportFavorites, customReports, scheduledReports } from 'drizzle/schema/reports';
import {
  createReportFavoriteSchema,
  listReportFavoritesSchema,
  deleteReportFavoriteSchema,
  bulkDeleteReportFavoritesSchema,
  type ReportFavoriteWithDetails,
} from '@/lib/schemas/reports/report-favorites';

// ============================================================================
// FAVORITES CRUD
// ============================================================================

/**
 * List report favorites with optional filtering.
 */
export const listReportFavorites = createServerFn({ method: 'GET' })
  .inputValidator(listReportFavoritesSchema)
  .handler(async ({ data }): Promise<{ items: ReportFavoriteWithDetails[]; pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.viewOperations });

    const { page = 1, pageSize = 50, reportType } = data;

    const conditions = [
      eq(reportFavorites.organizationId, ctx.organizationId),
      eq(reportFavorites.userId, ctx.user.id),
    ];

    if (reportType) {
      conditions.push(eq(reportFavorites.reportType, reportType));
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reportFavorites)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    const offset = (page - 1) * pageSize;

    const rows = await db
      .select({
        id: reportFavorites.id,
        organizationId: reportFavorites.organizationId,
        userId: reportFavorites.userId,
        reportType: reportFavorites.reportType,
        reportId: reportFavorites.reportId,
        createdAt: reportFavorites.createdAt,
        customReportName: customReports.name,
        customReportDescription: customReports.description,
        scheduledReportName: scheduledReports.name,
        scheduledReportDescription: scheduledReports.description,
      })
      .from(reportFavorites)
      .leftJoin(customReports, eq(reportFavorites.reportId, customReports.id))
      .leftJoin(scheduledReports, eq(reportFavorites.reportId, scheduledReports.id))
      .where(whereClause)
      .orderBy(desc(reportFavorites.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: ReportFavoriteWithDetails[] = rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      reportType: row.reportType,
      reportId: row.reportId,
      createdAt: row.createdAt,
      reportName:
        row.reportType === 'custom'
          ? row.customReportName ?? undefined
          : row.reportType === 'scheduled'
            ? row.scheduledReportName ?? undefined
            : undefined,
      reportDescription:
        row.reportType === 'custom'
          ? row.customReportDescription ?? undefined
          : row.reportType === 'scheduled'
            ? row.scheduledReportDescription ?? undefined
            : undefined,
    }));

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
 * Create a new report favorite (idempotent).
 */
export const createReportFavorite = createServerFn({ method: 'POST' })
  .inputValidator(createReportFavoriteSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const [favorite] = await db
      .insert(reportFavorites)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        reportType: data.reportType,
        reportId: data.reportId ?? null,
      })
      .onConflictDoNothing()
      .returning();

    if (favorite) {
      return favorite;
    }

    const [existing] = await db
      .select()
      .from(reportFavorites)
      .where(
        and(
          eq(reportFavorites.organizationId, ctx.organizationId),
          eq(reportFavorites.userId, ctx.user.id),
          eq(reportFavorites.reportType, data.reportType),
          data.reportId ? eq(reportFavorites.reportId, data.reportId) : isNull(reportFavorites.reportId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Report favorite not found', 'reportFavorite');
    }

    return existing;
  });

/**
 * Delete a report favorite.
 */
export const deleteReportFavorite = createServerFn({ method: 'POST' })
  .inputValidator(deleteReportFavoriteSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const [deleted] = await db
      .delete(reportFavorites)
      .where(
        and(
          eq(reportFavorites.organizationId, ctx.organizationId),
          eq(reportFavorites.userId, ctx.user.id),
          eq(reportFavorites.reportType, data.reportType),
          data.reportId ? eq(reportFavorites.reportId, data.reportId) : isNull(reportFavorites.reportId)
        )
      )
      .returning();

    if (!deleted) {
      throw new NotFoundError('Report favorite not found', 'reportFavorite');
    }

    return { success: true };
  });

/**
 * Bulk delete report favorites.
 */
export const bulkDeleteReportFavorites = createServerFn({ method: 'POST' })
  .inputValidator(bulkDeleteReportFavoritesSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.export });

    const deleted = await db.transaction(async (tx) => {
      let count = 0;

      for (const favorite of data.favorites) {
        const result = await tx
          .delete(reportFavorites)
          .where(
            and(
              eq(reportFavorites.organizationId, ctx.organizationId),
              eq(reportFavorites.userId, ctx.user.id),
              eq(reportFavorites.reportType, favorite.reportType),
              favorite.reportId
                ? eq(reportFavorites.reportId, favorite.reportId)
                : isNull(reportFavorites.reportId)
            )
          )
          .returning({ id: reportFavorites.id });

        count += result.length;
      }

      return count;
    });

    return { deleted };
  });
