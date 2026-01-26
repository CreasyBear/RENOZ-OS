/**
 * Scheduled Reports Server Functions
 *
 * Server functions for scheduled reports CRUD operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/dashboard/scheduled-reports.ts for validation schemas
 * @see drizzle/schema/dashboard/scheduled-reports.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, ilike, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { scheduledReports } from 'drizzle/schema/dashboard';
import {
  createScheduledReportSchema,
  updateScheduledReportSchema,
  listScheduledReportsSchema,
  getScheduledReportSchema,
  deleteScheduledReportSchema,
  executeScheduledReportSchema,
  bulkUpdateScheduledReportsSchema,
  bulkDeleteScheduledReportsSchema,
  generateReportSchema,
  type ScheduledReportStatus,
  type GenerateReportResponse,
} from '@/lib/schemas/dashboard/scheduled-reports';

// ============================================================================
// SCHEDULED REPORTS CRUD
// ============================================================================

/**
 * List scheduled reports with filtering and pagination.
 */
export const listScheduledReports = createServerFn({ method: 'GET' })
  .inputValidator(listScheduledReportsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.read });

    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      isActive,
      frequency,
      format,
    } = data;

    // Build where conditions
    const conditions = [
      eq(scheduledReports.organizationId, ctx.organizationId),
    ];

    if (search) {
      conditions.push(ilike(scheduledReports.name, containsPattern(search)));
    }
    if (isActive !== undefined) {
      conditions.push(eq(scheduledReports.isActive, isActive));
    }
    if (frequency) {
      conditions.push(eq(scheduledReports.frequency, frequency));
    }
    if (format) {
      conditions.push(eq(scheduledReports.format, format));
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledReports)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const orderColumn = sortBy === 'name' ? scheduledReports.name : scheduledReports.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const items = await db
      .select()
      .from(scheduledReports)
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
 * Get a single scheduled report by ID.
 */
export const getScheduledReport = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.read });

    const [report] = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, data.id),
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!report) {
      throw new NotFoundError('Scheduled report not found', 'scheduledReport');
    }

    return report;
  });

/**
 * Get scheduled report status.
 */
export const getScheduledReportStatus = createServerFn({ method: 'GET' })
  .inputValidator(getScheduledReportSchema)
  .handler(async ({ data }): Promise<ScheduledReportStatus> => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.read });

    const [report] = await db
      .select({
        id: scheduledReports.id,
        name: scheduledReports.name,
        isActive: scheduledReports.isActive,
        lastRunAt: scheduledReports.lastRunAt,
        nextRunAt: scheduledReports.nextRunAt,
      })
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, data.id),
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!report) {
      throw new NotFoundError('Scheduled report not found', 'scheduledReport');
    }

    // TODO: Get actual last run status from job history
    return {
      ...report,
      lastRunStatus: null,
      lastRunMessage: null,
    };
  });

/**
 * Create a new scheduled report.
 */
export const createScheduledReport = createServerFn({ method: 'POST' })
  .inputValidator(createScheduledReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.create });

    // Calculate next run time and cron expression based on frequency
    const nextRunAt = calculateNextRun(data.frequency);
    const scheduleCron = frequencyToCron(data.frequency);

    const [report] = await db
      .insert(scheduledReports)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        description: data.description,
        frequency: data.frequency,
        format: data.format,
        scheduleCron,
        isActive: data.isActive ?? true,
        recipients: data.recipients,
        metrics: data.metrics,
        nextRunAt,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      })
      .returning();

    return report;
  });

/**
 * Update an existing scheduled report.
 */
export const updateScheduledReport = createServerFn({ method: 'POST' })
  .inputValidator(updateScheduledReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.update });

    const { id, ...updates } = data;

    // Build update object
    const updateValues: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.description !== undefined) updateValues.description = updates.description;
    if (updates.frequency !== undefined) {
      updateValues.frequency = updates.frequency;
      updateValues.scheduleCron = frequencyToCron(updates.frequency);
      updateValues.nextRunAt = calculateNextRun(updates.frequency);
    }
    if (updates.format !== undefined) updateValues.format = updates.format;
    if (updates.isActive !== undefined) updateValues.isActive = updates.isActive;
    if (updates.recipients !== undefined) updateValues.recipients = updates.recipients;
    if (updates.metrics !== undefined) updateValues.metrics = updates.metrics;

    const [report] = await db
      .update(scheduledReports)
      .set(updateValues)
      .where(
        and(
          eq(scheduledReports.id, id),
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!report) {
      throw new NotFoundError('Scheduled report not found', 'scheduledReport');
    }

    return report;
  });

/**
 * Delete a scheduled report (hard delete since schema doesn't have soft delete).
 */
export const deleteScheduledReport = createServerFn({ method: 'POST' })
  .inputValidator(deleteScheduledReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.delete });

    const [report] = await db
      .delete(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, data.id),
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!report) {
      throw new NotFoundError('Scheduled report not found', 'scheduledReport');
    }

    return { success: true };
  });

/**
 * Manually execute a scheduled report.
 */
export const executeScheduledReport = createServerFn({ method: 'POST' })
  .inputValidator(executeScheduledReportSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.update });

    const [report] = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, data.id),
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!report) {
      throw new NotFoundError('Scheduled report not found', 'scheduledReport');
    }

    // TODO: Trigger report generation job via Trigger.dev
    // For now, just update the lastRunAt timestamp
    await db
      .update(scheduledReports)
      .set({
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(report.frequency),
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, data.id));

    return {
      success: true,
      message: 'Report execution triggered',
    };
  });

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update scheduled reports.
 */
export const bulkUpdateScheduledReports = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateScheduledReportsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.update });

    const updateValues: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (data.updates.isActive !== undefined) updateValues.isActive = data.updates.isActive;
    if (data.updates.frequency !== undefined) {
      updateValues.frequency = data.updates.frequency;
      updateValues.scheduleCron = frequencyToCron(data.updates.frequency);
      updateValues.nextRunAt = calculateNextRun(data.updates.frequency);
    }
    if (data.updates.format !== undefined) updateValues.format = data.updates.format;
    if (data.updates.recipients !== undefined) updateValues.recipients = data.updates.recipients;

    const result = await db
      .update(scheduledReports)
      .set(updateValues)
      .where(
        and(
          sql`${scheduledReports.id} = ANY(${data.ids})`,
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: scheduledReports.id });

    return { updated: result.length };
  });

/**
 * Bulk delete scheduled reports (hard delete since schema doesn't have soft delete).
 */
export const bulkDeleteScheduledReports = createServerFn({ method: 'POST' })
  .inputValidator(bulkDeleteScheduledReportsSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.delete });

    const result = await db
      .delete(scheduledReports)
      .where(
        and(
          sql`${scheduledReports.id} = ANY(${data.ids})`,
          eq(scheduledReports.organizationId, ctx.organizationId)
        )
      )
      .returning({ id: scheduledReports.id });

    return { deleted: result.length };
  });

// ============================================================================
// ON-DEMAND REPORT GENERATION
// ============================================================================

/**
 * Generate an on-demand report with specified metrics and date range.
 * Returns a URL to the generated report file.
 *
 * Note: Actual PDF/HTML generation will be handled by background jobs.
 * This function creates a placeholder response for the API contract.
 */
export const generateReport = createServerFn({ method: 'POST' })
  .inputValidator(generateReportSchema)
  .handler(async ({ data }): Promise<GenerateReportResponse> => {
    const ctx = await withAuth({ permission: PERMISSIONS.dashboard.manageReports });

    // Validate date range
    const startDate = new Date(data.dateFrom);
    const endDate = new Date(data.dateTo);

    if (endDate < startDate) {
      throw new ValidationError('End date must be after start date');
    }

    // Calculate max allowed range (1 year)
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
      throw new ValidationError('Date range cannot exceed 1 year');
    }

    // TODO: Trigger actual report generation via Trigger.dev background job
    // The job would:
    // 1. Fetch all requested metrics for the date range
    // 2. Generate charts if includeCharts is true
    // 3. Calculate trends if includeTrends is true
    // 4. Render to PDF/HTML/CSV/XLSX based on format
    // 5. Upload to storage (S3/R2)
    // 6. Return signed URL

    // For now, return a placeholder response
    // In production, this would return a job ID that the client polls
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

    // Generate a unique report ID for tracking
    const reportId = crypto.randomUUID();

    return {
      // Placeholder URL - in production this would be a signed S3/R2 URL
      reportUrl: `/api/reports/${reportId}/download?org=${ctx.organizationId}`,
      expiresAt,
      format: data.format,
    };
  });

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert frequency to cron expression.
 * All reports run at 8 AM in the configured timezone.
 */
function frequencyToCron(frequency: string): string {
  switch (frequency) {
    case 'daily':
      return '0 8 * * *'; // Every day at 8 AM
    case 'weekly':
      return '0 8 * * 1'; // Every Monday at 8 AM
    case 'biweekly':
      return '0 8 1,15 * *'; // 1st and 15th of month at 8 AM
    case 'monthly':
      return '0 8 1 * *'; // 1st of month at 8 AM
    case 'quarterly':
      return '0 8 1 1,4,7,10 *'; // 1st of Jan, Apr, Jul, Oct at 8 AM
    default:
      return '0 8 * * *'; // Default to daily
  }
}

/**
 * Calculate next run time based on frequency.
 */
function calculateNextRun(frequency: string): Date {
  const now = new Date();

  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0); // 8 AM next day
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      now.setHours(8, 0, 0, 0);
      break;
    case 'biweekly':
      now.setDate(now.getDate() + 14);
      now.setHours(8, 0, 0, 0);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      now.setDate(1);
      now.setHours(8, 0, 0, 0);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      now.setDate(1);
      now.setHours(8, 0, 0, 0);
      break;
    default:
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0);
  }

  return now;
}
