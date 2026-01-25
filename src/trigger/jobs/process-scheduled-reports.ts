/**
 * Process Scheduled Reports Job
 *
 * Background jobs for scheduled report processing:
 * 1. processScheduledReportsJob: Cron job that checks for due reports every 15 minutes
 * 2. generateReportJob: Event-triggered job that generates a single report
 *
 * @see DASH-REPORTS-BACKGROUND
 * @see https://trigger.dev/docs/documentation/guides/scheduled-tasks
 */
import { cronTrigger, eventTrigger } from '@trigger.dev/sdk';
import { eq, and, lte, sql } from 'drizzle-orm';
import { client } from '../client';
import { db } from '@/lib/db';
import { scheduledReports } from 'drizzle/schema/dashboard';
import { orders } from 'drizzle/schema/orders/orders';
import { customers } from 'drizzle/schema/customers/customers';
import { opportunities } from 'drizzle/schema/pipeline';

// ============================================================================
// EVENT NAMES
// ============================================================================

export const reportEvents = {
  generate: 'report.generate',
  generated: 'report.generated',
  failed: 'report.failed',
} as const;

// ============================================================================
// PAYLOAD TYPES
// ============================================================================

export interface GenerateReportPayload {
  reportId: string;
  organizationId: string;
  isManualTrigger?: boolean;
}

export interface ReportGeneratedPayload {
  reportId: string;
  organizationId: string;
  reportUrl: string;
  format: string;
  recipientCount: number;
}

export interface ReportFailedPayload {
  reportId: string;
  organizationId: string;
  error: string;
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

interface MetricValues {
  revenue: number;
  orders_count: number;
  customer_count: number;
  pipeline_value: number;
  average_order_value: number;
  quote_win_rate: number;
  kwh_deployed: number;
  active_installations: number;
  [key: string]: number;
}

/**
 * Calculate metrics for the given organization and date range
 */
async function calculateMetrics(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  metricIds: string[]
): Promise<Partial<MetricValues>> {
  const results: Partial<MetricValues> = {};

  for (const metricId of metricIds) {
    try {
      switch (metricId) {
        case 'revenue': {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                sql`${orders.status} IN ('delivered', 'completed')`,
                sql`${orders.deliveredDate} >= ${dateFrom.toISOString()}`,
                sql`${orders.deliveredDate} <= ${dateTo.toISOString()}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.revenue = Number(result?.total ?? 0);
          break;
        }

        case 'orders_count': {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                sql`${orders.createdAt} >= ${dateFrom.toISOString()}`,
                sql`${orders.createdAt} <= ${dateTo.toISOString()}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.orders_count = Number(result?.count ?? 0);
          break;
        }

        case 'customer_count': {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.createdAt} >= ${dateFrom.toISOString()}`,
                sql`${customers.createdAt} <= ${dateTo.toISOString()}`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.customer_count = Number(result?.count ?? 0);
          break;
        }

        case 'pipeline_value': {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
            })
            .from(opportunities)
            .where(
              and(
                eq(opportunities.organizationId, organizationId),
                sql`${opportunities.stage} IN ('new', 'qualified', 'proposal', 'negotiation')`,
                sql`${opportunities.deletedAt} IS NULL`
              )
            );
          results.pipeline_value = Number(result?.total ?? 0);
          break;
        }

        case 'average_order_value': {
          const [result] = await db
            .select({
              avg: sql<number>`COALESCE(AVG(${orders.total}), 0)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                sql`${orders.createdAt} >= ${dateFrom.toISOString()}`,
                sql`${orders.createdAt} <= ${dateTo.toISOString()}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.average_order_value = Number(result?.avg ?? 0);
          break;
        }

        // Placeholder for metrics that require additional schema
        case 'quote_win_rate':
        case 'kwh_deployed':
        case 'active_installations':
          results[metricId] = 0;
          break;
      }
    } catch (error) {
      console.error(`Failed to calculate metric ${metricId}:`, error);
      results[metricId] = 0;
    }
  }

  return results;
}

/**
 * Format metrics for report display
 */
function formatMetricValue(metricId: string, value: number): string {
  switch (metricId) {
    case 'revenue':
    case 'pipeline_value':
    case 'average_order_value':
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
      }).format(value);
    case 'quote_win_rate':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}

/**
 * Get metric label for display
 */
function getMetricLabel(metricId: string): string {
  const labels: Record<string, string> = {
    revenue: 'Revenue',
    orders_count: 'Orders',
    customer_count: 'New Customers',
    pipeline_value: 'Pipeline Value',
    average_order_value: 'Average Order Value',
    quote_win_rate: 'Quote Win Rate',
    kwh_deployed: 'kWh Deployed',
    active_installations: 'Active Installations',
  };
  return labels[metricId] ?? metricId;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate HTML report content
 */
function generateHtmlReport(
  reportName: string,
  dateFrom: Date,
  dateTo: Date,
  metrics: Partial<MetricValues>,
  metricIds: string[],
  _options: { includeCharts: boolean; includeTrends: boolean }
): string {
  // TODO: Use _options to add chart/trend sections when PDF generation is implemented
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

/**
 * Generate CSV report content
 */
function generateCsvReport(
  metrics: Partial<MetricValues>,
  metricIds: string[]
): string {
  const header = 'Metric,Value\n';
  const rows = metricIds
    .map((id) => {
      const value = metrics[id] ?? 0;
      return `"${getMetricLabel(id)}",${value}`;
    })
    .join('\n');
  return header + rows;
}

/**
 * Calculate the date range for a report based on its frequency
 */
function calculateReportDateRange(frequency: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      from.setDate(from.getDate() - 1);
      break;
    case 'weekly':
      from.setDate(from.getDate() - 7);
      break;
    case 'biweekly':
      from.setDate(from.getDate() - 14);
      break;
    case 'monthly':
      from.setMonth(from.getMonth() - 1);
      break;
    case 'quarterly':
      from.setMonth(from.getMonth() - 3);
      break;
    default:
      from.setDate(from.getDate() - 7);
  }

  return { from, to };
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency: string): Date {
  const now = new Date();

  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0);
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

// ============================================================================
// CRON JOB - Process Due Reports
// ============================================================================

/**
 * Process Scheduled Reports Job
 *
 * Runs every 15 minutes to check for reports that are due.
 * For each due report:
 * 1. Calculate metrics for the date range
 * 2. Generate report content (HTML/CSV/PDF)
 * 3. Upload to storage
 * 4. Send to recipients via email
 * 5. Update report record
 */
export const processScheduledReportsJob = client.defineJob({
  id: 'process-scheduled-reports',
  name: 'Process Scheduled Reports',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '*/15 * * * *', // Every 15 minutes
  }),
  run: async (_payload, io) => {
    await io.logger.info('Checking for scheduled reports to process');

    // Get reports that are due (nextRunAt <= now and isActive)
    const now = new Date();
    const dueReports = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.isActive, true),
          lte(scheduledReports.nextRunAt, now)
        )
      )
      .limit(10); // Process up to 10 reports per run

    await io.logger.info(`Found ${dueReports.length} scheduled reports to process`);

    if (dueReports.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const report of dueReports) {
      const taskId = `generate-report-${report.id}`;

      try {
        await io.runTask(taskId, async () => {
          await io.logger.info(`Processing scheduled report: ${report.name}`, {
            reportId: report.id,
            frequency: report.frequency,
            format: report.format,
          });

          // Calculate date range based on frequency
          const { from: dateFrom, to: dateTo } = calculateReportDateRange(report.frequency);

          // Get metrics to include
          const metricIds = report.metrics?.metrics ?? [];
          if (metricIds.length === 0) {
            throw new Error('No metrics configured for report');
          }

          // Calculate metrics
          const metrics = await calculateMetrics(
            report.organizationId,
            dateFrom,
            dateTo,
            metricIds
          );

          await io.logger.info('Calculated metrics', {
            metricCount: Object.keys(metrics).length,
          });

          // Generate report content based on format
          let content: string;
          let filename: string;

          switch (report.format) {
            case 'csv':
              content = generateCsvReport(metrics, metricIds);
              filename = `${report.name.replace(/\s+/g, '-')}-${dateTo.toISOString().split('T')[0]}.csv`;
              break;
            case 'html':
            case 'pdf': // PDF generation would use HTML as base
            default:
              content = generateHtmlReport(
                report.name,
                dateFrom,
                dateTo,
                metrics,
                metricIds,
                {
                  includeCharts: report.metrics?.includeCharts ?? true,
                  includeTrends: report.metrics?.includeTrends ?? true,
                }
              );
              filename = `${report.name.replace(/\s+/g, '-')}-${dateTo.toISOString().split('T')[0]}.html`;
              break;
          }

          // TODO: Upload to Supabase Storage
          // const { data: uploadData, error: uploadError } = await supabase.storage
          //   .from('reports')
          //   .upload(`${report.organizationId}/${filename}`, content, { contentType })

          // TODO: Send email to recipients
          // For each email in report.recipients.emails, send the report

          const recipientCount = report.recipients?.emails?.length ?? 0;

          await io.logger.info('Report generated successfully', {
            reportId: report.id,
            format: report.format,
            filename,
            contentLength: content.length,
            recipientCount,
          });

          // Update report record
          const nextRunAt = calculateNextRun(report.frequency);
          await db
            .update(scheduledReports)
            .set({
              lastRunAt: new Date(),
              lastSuccessAt: new Date(),
              nextRunAt,
              lastError: null,
              consecutiveFailures: '0',
              updatedAt: new Date(),
            })
            .where(eq(scheduledReports.id, report.id));

          return {
            success: true,
            reportId: report.id,
            filename,
            recipientCount,
          };
        });

        sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await io.logger.error(`Failed to process report ${report.id}`, {
          error: errorMessage,
        });

        // Update report with error
        await db
          .update(scheduledReports)
          .set({
            lastRunAt: new Date(),
            lastErrorAt: new Date(),
            lastError: errorMessage,
            consecutiveFailures: sql`COALESCE(${scheduledReports.consecutiveFailures}::int, 0) + 1`,
            nextRunAt: calculateNextRun(report.frequency),
            updatedAt: new Date(),
          })
          .where(eq(scheduledReports.id, report.id));

        failed++;
      }
    }

    return {
      processed: dueReports.length,
      sent,
      failed,
    };
  },
});

// ============================================================================
// EVENT JOB - Generate Single Report (On-Demand)
// ============================================================================

/**
 * Generate Report Job
 *
 * Triggered when a user clicks "Run Now" on a scheduled report.
 * Generates the report immediately regardless of schedule.
 */
export const generateReportJob = client.defineJob({
  id: 'generate-report',
  name: 'Generate Report',
  version: '1.0.0',
  trigger: eventTrigger({
    name: reportEvents.generate,
  }),
  run: async (payload: GenerateReportPayload, io) => {
    const { reportId, organizationId, isManualTrigger } = payload;

    await io.logger.info('Starting on-demand report generation', {
      reportId,
      organizationId,
      isManualTrigger,
    });

    // Fetch the report configuration
    const [report] = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, reportId),
          eq(scheduledReports.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    // Calculate date range based on frequency
    const { from: dateFrom, to: dateTo } = calculateReportDateRange(report.frequency);

    // Get metrics to include
    const metricIds = report.metrics?.metrics ?? [];
    if (metricIds.length === 0) {
      throw new Error('No metrics configured for report');
    }

    // Calculate metrics
    await io.logger.info('Calculating metrics', { metricIds });
    const metrics = await calculateMetrics(organizationId, dateFrom, dateTo, metricIds);

    // Generate report content
    let content: string;
    let filename: string;

    switch (report.format) {
      case 'csv':
        content = generateCsvReport(metrics, metricIds);
        filename = `${report.name.replace(/\s+/g, '-')}-${dateTo.toISOString().split('T')[0]}.csv`;
        break;
      default:
        content = generateHtmlReport(
          report.name,
          dateFrom,
          dateTo,
          metrics,
          metricIds,
          {
            includeCharts: report.metrics?.includeCharts ?? true,
            includeTrends: report.metrics?.includeTrends ?? true,
          }
        );
        filename = `${report.name.replace(/\s+/g, '-')}-${dateTo.toISOString().split('T')[0]}.html`;
        break;
    }

    // TODO: Upload to storage and send emails

    // Update report record
    await db
      .update(scheduledReports)
      .set({
        lastRunAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, reportId));

    await io.logger.info('Report generated successfully', {
      reportId,
      filename,
      contentLength: content.length,
    });

    return {
      success: true,
      reportId,
      filename,
      format: report.format,
      generatedAt: new Date().toISOString(),
    };
  },
});
