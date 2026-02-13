'use server'

/**
 * Scheduled Reports Server Functions
 *
 * Server functions for scheduled reports CRUD operations.
 * Uses Drizzle ORM with Zod validation.
 *
 * SECURITY: All functions use withAuth for authentication and
 * filter by organizationId for multi-tenant isolation.
 *
 * @see src/lib/schemas/reports/scheduled-reports.ts for validation schemas
 * @see drizzle/schema/reports/scheduled-reports.ts for database schema
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, sql, ilike, desc, asc, inArray } from 'drizzle-orm';
import { decodeCursor, buildCursorCondition, buildStandardCursorResponse } from '@/lib/db/pagination';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { db } from '@/lib/db';
import { containsPattern } from '@/lib/db/utils';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError, ValidationError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { scheduledReports } from 'drizzle/schema/reports';
import { client, reportEvents } from '@/trigger/client';
import { uploadFile, createSignedUrl } from '@/lib/storage';
import { renderPdfToBuffer, ReportSummaryPdfDocument } from '@/lib/documents';
import { calculateMetrics as calculateMetricsAggregator } from '@/server/functions/metrics/aggregator';
import { getMetric } from '@/lib/metrics/registry';
import { organizations } from 'drizzle/schema/settings/organizations';
import { fetchOrganizationForDocument } from '@/server/functions/documents/organization-for-pdf';
import { TextEncoder } from 'util';
import { randomUUID } from 'crypto';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import {
  createScheduledReportSchema,
  updateScheduledReportSchema,
  listScheduledReportsSchema,
  listScheduledReportsCursorSchema,
  getScheduledReportSchema,
  deleteScheduledReportSchema,
  executeScheduledReportSchema,
  bulkUpdateScheduledReportsSchema,
  bulkDeleteScheduledReportsSchema,
  generateReportSchema,
  type ScheduledReportStatus,
  type GenerateReportResponse,
} from '@/lib/schemas/reports/scheduled-reports';

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
 * List scheduled reports with cursor pagination (recommended for large datasets).
 */
export const listScheduledReportsCursor = createServerFn({ method: 'GET' })
  .inputValidator(listScheduledReportsCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.scheduledReport.read });

    const { cursor, pageSize = 20, sortOrder = 'desc', search, isActive, frequency, format } = data;

    const conditions = [eq(scheduledReports.organizationId, ctx.organizationId)];
    if (search) conditions.push(ilike(scheduledReports.name, containsPattern(search)));
    if (isActive !== undefined) conditions.push(eq(scheduledReports.isActive, isActive));
    if (frequency) conditions.push(eq(scheduledReports.frequency, frequency));
    if (format) conditions.push(eq(scheduledReports.format, format));

    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(buildCursorCondition(scheduledReports.createdAt, scheduledReports.id, cursorPosition, sortOrder));
      }
    }

    const orderDir = sortOrder === 'asc' ? asc : desc;
    const items = await db
      .select()
      .from(scheduledReports)
      .where(and(...conditions))
      .orderBy(orderDir(scheduledReports.createdAt), orderDir(scheduledReports.id))
      .limit(pageSize + 1);

    return buildStandardCursorResponse(items, pageSize);
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

    // TODO(PHASE12-004): Get actual last run status from Trigger.dev job history. See REPORTS-007.
    // Currently returns null; implement by querying report run events or job status API.
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

    const [org] = await db
      .select({ timezone: organizations.timezone })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);
    const tz = org?.timezone ?? 'Australia/Sydney';

    const nextRunAt = calculateNextRun(data.frequency, tz);
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
        timezone: tz,
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

    let reportTimezone: string | undefined;
    if (updates.frequency !== undefined) {
      const [report] = await db
        .select({ timezone: scheduledReports.timezone })
        .from(scheduledReports)
        .where(
          and(
            eq(scheduledReports.id, id),
            eq(scheduledReports.organizationId, ctx.organizationId)
          )
        )
        .limit(1);
      reportTimezone = report?.timezone ?? 'Australia/Sydney';
    }

    // Build update object
    const updateValues: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.description !== undefined) updateValues.description = updates.description;
    if (updates.frequency !== undefined && reportTimezone !== undefined) {
      updateValues.frequency = updates.frequency;
      updateValues.scheduleCron = frequencyToCron(updates.frequency);
      updateValues.nextRunAt = calculateNextRun(updates.frequency, reportTimezone);
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

    await client.sendEvent({
      name: reportEvents.generate,
      payload: {
        reportId: report.id,
        organizationId: report.organizationId,
        isManualTrigger: true,
      },
    });

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

    let tz = 'Australia/Sydney';
    if (data.updates.frequency !== undefined) {
      const [org] = await db
        .select({ timezone: organizations.timezone })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId))
        .limit(1);
      tz = org?.timezone ?? 'Australia/Sydney';
    }

    const updateValues: Record<string, unknown> = {
      updatedBy: ctx.user.id,
      updatedAt: new Date(),
    };

    if (data.updates.isActive !== undefined) updateValues.isActive = data.updates.isActive;
    if (data.updates.frequency !== undefined) {
      updateValues.frequency = data.updates.frequency;
      updateValues.scheduleCron = frequencyToCron(data.updates.frequency);
      updateValues.nextRunAt = calculateNextRun(data.updates.frequency, tz);
    }
    if (data.updates.format !== undefined) updateValues.format = data.updates.format;
    if (data.updates.recipients !== undefined) updateValues.recipients = data.updates.recipients;

    const result = await db
      .update(scheduledReports)
      .set(updateValues)
      .where(
        and(
          inArray(scheduledReports.id, data.ids),
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
          inArray(scheduledReports.id, data.ids),
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

    // Validate metric IDs (deduplicate first to avoid redundant validation)
    const uniqueMetricIds = Array.from(new Set(data.metrics));
    for (const metricId of uniqueMetricIds) {
      try {
        getMetric(metricId); // Validate metric exists
      } catch (error) {
        throw new ValidationError(`Invalid metric ID: ${metricId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Use deduplicated list for calculation
    const metricsToCalculate = uniqueMetricIds;

    // Calculate metrics using centralized aggregator (with deduplicated list)
    const metrics = await calculateMetricsAggregator({
      organizationId: ctx.organizationId,
      metricIds: metricsToCalculate,
      dateFrom: startDate,
      dateTo: endDate,
    });

    let content: string;
    let contentBody: string | ArrayBuffer = '';
    let filename: string;
    let contentType: string;

    switch (data.format) {
      case 'csv':
      case 'xlsx':
        content = generateCsvReport(metrics, metricsToCalculate);
        filename = `report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.${data.format === 'xlsx' ? 'xlsx' : 'csv'}`;
        contentType = 'text/csv';
        contentBody = content;
        break;
      case 'pdf': {
        const orgData = await fetchOrganizationForDocument(ctx.organizationId);
        const pdfElement = createElement(ReportSummaryPdfDocument, {
          organization: orgData,
          data: {
            reportName: 'On-demand Report',
            dateFrom: startDate,
            dateTo: endDate,
            metrics: metricsToCalculate.map((id) => ({
              label: getMetricLabel(id),
              value: formatMetricValue(id, metrics[id] ?? 0),
            })),
            generatedAt: new Date(),
          },
        }) as unknown as ReactElement<DocumentProps>;
        const pdfResult = await renderPdfToBuffer(pdfElement);
        filename = `report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.pdf`;
        contentType = 'application/pdf';
        contentBody = bufferToArrayBuffer(pdfResult.buffer);
        content = '';
        break;
      }
      case 'html':
      default:
        content = generateHtmlReport(
          'On-demand Report',
          startDate,
          endDate,
          metrics,
          metricsToCalculate,
          { includeCharts: data.includeCharts, includeTrends: data.includeTrends }
        );
        filename = `report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.html`;
        contentType = 'text/html';
        contentBody = content;
        break;
    }

    const reportId = randomUUID();
    const storagePath = `organizations/${ctx.organizationId}/reports/on-demand/${reportId}/${filename}`;
    const encoded =
      typeof contentBody === 'string'
        ? new TextEncoder().encode(contentBody).buffer
        : contentBody;

    await uploadFile({
      path: storagePath,
      fileBody: encoded,
      contentType,
      upsert: true,
    });

    const signed = await createSignedUrl({
      path: storagePath,
      expiresIn: 24 * 60 * 60,
      download: filename,
    });

    return {
      reportUrl: signed.signedUrl,
      expiresAt: signed.expiresAt,
      format: data.format,
    };
  });

// ============================================================================
// RENDERING HELPERS
// ============================================================================

function generateCsvReport(metrics: Record<string, number>, metricIds: string[]): string {
  const header = 'Metric,Value\n';
  const rows = metricIds
    .map((id) => `"${getMetricLabel(id)}",${metrics[id] ?? 0}`)
    .join('\n');
  return header + rows;
}

function generateHtmlReport(
  reportName: string,
  dateFrom: Date,
  dateTo: Date,
  metrics: Record<string, number>,
  metricIds: string[],
  _options: { includeCharts: boolean; includeTrends: boolean }
): string {
  const rows = metricIds
    .map((id) => {
      const value = metrics[id] ?? 0;
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${getMetricLabel(id)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
            ${formatMetricValue(id, value)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f9fafb; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 40px; }
        h1 { color: #111827; margin-bottom: 8px; }
        .subtitle { color: #6b7280; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; color: #374151; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${reportName}</h1>
        <p class="subtitle">
          Report Period: ${dateFrom.toLocaleDateString('en-AU')} - ${dateTo.toLocaleDateString('en-AU')}<br>
          Generated: ${new Date().toLocaleString('en-AU')}
        </p>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="footer">
          This report was automatically generated by Renoz CRM.
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatMetricValue(metricId: string, value: number): string {
  // Use registry for unit-based formatting
  try {
    const metric = getMetric(metricId);
    switch (metric.unit) {
      case 'currency':
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'count':
      default:
        return value.toLocaleString();
    }
  } catch {
    // Fallback for unknown metrics (legacy support)
    if (metricId === 'quote_win_rate') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  }
}

function getMetricLabel(metricId: string): string {
  // Use registry for metric labels - single source of truth
  try {
    return getMetric(metricId).name;
  } catch {
    // Fallback for unknown metrics (legacy support)
    const labels: Record<string, string> = {
      quote_win_rate: 'Quote Win Rate',
      kwh_deployed: 'kWh Deployed',
      active_installations: 'Active Installations',
    };
    return labels[metricId] ?? metricId;
  }
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

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
 * Uses timezone-aware logic: "next 8 AM" in the report's timezone.
 *
 * @param frequency - daily | weekly | biweekly | monthly | quarterly
 * @param timezone - IANA timezone (e.g. Australia/Sydney), default Australia/Sydney
 */
function calculateNextRun(
  frequency: string,
  timezone: string = 'Australia/Sydney'
): Date {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  let nextZoned: Date;
  switch (frequency) {
    case 'daily':
      nextZoned = addDays(zonedNow, 1);
      break;
    case 'weekly':
      nextZoned = addWeeks(zonedNow, 1);
      break;
    case 'biweekly':
      nextZoned = addDays(zonedNow, 14);
      break;
    case 'monthly':
      nextZoned = addMonths(zonedNow, 1);
      nextZoned.setDate(1);
      break;
    case 'quarterly':
      nextZoned = addMonths(zonedNow, 3);
      nextZoned.setDate(1);
      break;
    default:
      nextZoned = addDays(zonedNow, 1);
  }

  // Set 8:00 AM in the target timezone, then convert to UTC for storage
  const d = new Date(
    nextZoned.getFullYear(),
    nextZoned.getMonth(),
    nextZoned.getDate(),
    8,
    0,
    0,
    0
  );
  return fromZonedTime(d, timezone);
}
