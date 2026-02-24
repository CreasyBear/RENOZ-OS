'use server'

/**
 * Process Scheduled Reports Tasks (Trigger.dev v3)
 *
 * Background tasks for scheduled report processing:
 * 1. processScheduledReportsTask: Scheduled task that checks for due reports every 15 minutes
 * 2. generateReportTask: Event-triggered task that generates a single report
 *
 * @see DASH-REPORTS-BACKGROUND
 * @see https://trigger.dev/docs/v3/tasks
 */
import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import { logger as appLogger } from "@/lib/logger";
import { eq, and, lte, sql, isNull, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { scheduledReports } from "drizzle/schema/reports";
import { orders } from "drizzle/schema/orders/orders";
import { orderPayments } from "drizzle/schema/orders/order-payments";
import { customers } from "drizzle/schema/customers/customers";
import { opportunities } from "drizzle/schema/pipeline";
import { fetchOrganizationForDocument } from "@/server/functions/documents/organization-for-pdf";
import { warranties } from "drizzle/schema/warranty/warranties";
import { warrantyClaims } from "drizzle/schema/warranty/warranty-claims";
import { slaTracking } from "drizzle/schema/support/sla-tracking";
import { uploadFile, createSignedUrl } from "@/lib/storage";
import {
  renderPdfToBuffer,
  ReportSummaryPdfDocument,
} from "@/lib/documents";
import { Resend } from "resend";
import { createHash } from "crypto";
import { TextEncoder } from "util";
import { createElement } from "react";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// EVENT NAMES
// ============================================================================

export const reportEvents = {
  generate: "report.generate",
  generated: "report.generated",
  failed: "report.failed",
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
// RESULT TYPES
// ============================================================================

export interface ProcessScheduledReportsResult {
  processed: number;
  sent: number;
  failed: number;
}

export interface GenerateReportResult {
  success: boolean;
  reportId: string;
  filename: string;
  format: string;
  generatedAt: string;
  reportUrl?: string;
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

interface MetricValues {
  revenue: number;
  revenue_cash: number;
  orders_count: number;
  customer_count: number;
  pipeline_value: number;
  forecasted_revenue: number;
  average_order_value: number;
  quote_win_rate: number;
  win_rate: number;
  won_revenue: number;
  lost_revenue: number;
  warranty_count: number;
  claim_count: number;
  sla_compliance: number;
  expiring_warranties: number;
  warranty_value: number;
  kwh_deployed: number;
  active_installations: number;
  // Health score metrics
  avg_health_score: number;
  health_score_distribution_excellent: number;
  health_score_distribution_good: number;
  health_score_distribution_fair: number;
  health_score_distribution_at_risk: number;
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
  const dateFromIso = dateFrom.toISOString();
  const dateToIso = dateTo.toISOString();
  const dateFromDate = dateFromIso.split("T")[0];
  const dateToDate = dateToIso.split("T")[0];

  for (const metricId of metricIds) {
    try {
      switch (metricId) {
        case "revenue": {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                sql`${orders.status} IN ('delivered')`,
                sql`${orders.deliveredDate} >= ${dateFromIso}`,
                sql`${orders.deliveredDate} <= ${dateToIso}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.revenue = Number(result?.total ?? 0);
          break;
        }

        case "revenue_cash": {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(CASE WHEN ${orderPayments.isRefund} THEN -${orderPayments.amount} ELSE ${orderPayments.amount} END), 0)`,
            })
            .from(orderPayments)
            .innerJoin(orders, eq(orderPayments.orderId, orders.id))
            .where(
              and(
                eq(orderPayments.organizationId, organizationId),
                isNull(orderPayments.deletedAt),
                isNull(orders.deletedAt),
                gte(orderPayments.paymentDate, dateFromDate),
                lte(orderPayments.paymentDate, dateToDate)
              )
            );
          results.revenue_cash = Number(result?.total ?? 0);
          break;
        }

        case "orders_count": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                sql`${orders.createdAt} >= ${dateFromIso}`,
                sql`${orders.createdAt} <= ${dateToIso}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.orders_count = Number(result?.count ?? 0);
          break;
        }

        case "customer_count": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.createdAt} >= ${dateFromIso}`,
                sql`${customers.createdAt} <= ${dateToIso}`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.customer_count = Number(result?.count ?? 0);
          break;
        }

        case "pipeline_value": {
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

        case "forecasted_revenue": {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${opportunities.weightedValue}), 0)`,
            })
            .from(opportunities)
            .where(
              and(
                eq(opportunities.organizationId, organizationId),
                sql`${opportunities.stage} IN ('new', 'qualified', 'proposal', 'negotiation')`,
                sql`${opportunities.expectedCloseDate} >= ${dateFromDate}`,
                sql`${opportunities.expectedCloseDate} <= ${dateToDate}`,
                sql`${opportunities.deletedAt} IS NULL`
              )
            );
          results.forecasted_revenue = Number(result?.total ?? 0);
          break;
        }

        case "average_order_value": {
          const [result] = await db
            .select({
              avg: sql<number>`COALESCE(AVG(${orders.total}), 0)`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, organizationId),
                sql`${orders.createdAt} >= ${dateFromIso}`,
                sql`${orders.createdAt} <= ${dateToIso}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.average_order_value = Number(result?.avg ?? 0);
          break;
        }

        case "win_rate": {
          const [result] = await db
            .select({
              won: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'won' THEN 1 ELSE 0 END)`,
              lost: sql<number>`SUM(CASE WHEN ${opportunities.stage} = 'lost' THEN 1 ELSE 0 END)`,
            })
            .from(opportunities)
            .where(
              and(
                eq(opportunities.organizationId, organizationId),
                sql`${opportunities.actualCloseDate} >= ${dateFromDate}`,
                sql`${opportunities.actualCloseDate} <= ${dateToDate}`,
                sql`${opportunities.deletedAt} IS NULL`
              )
            );
          const won = Number(result?.won ?? 0);
          const lost = Number(result?.lost ?? 0);
          const total = won + lost;
          results.win_rate = total > 0 ? (won / total) * 100 : 0;
          break;
        }

        case "won_revenue": {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
            })
            .from(opportunities)
            .where(
              and(
                eq(opportunities.organizationId, organizationId),
                sql`${opportunities.stage} = 'won'`,
                sql`${opportunities.actualCloseDate} >= ${dateFromDate}`,
                sql`${opportunities.actualCloseDate} <= ${dateToDate}`,
                sql`${opportunities.deletedAt} IS NULL`
              )
            );
          results.won_revenue = Number(result?.total ?? 0);
          break;
        }

        case "lost_revenue": {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${opportunities.value}), 0)`,
            })
            .from(opportunities)
            .where(
              and(
                eq(opportunities.organizationId, organizationId),
                sql`${opportunities.stage} = 'lost'`,
                sql`${opportunities.actualCloseDate} >= ${dateFromDate}`,
                sql`${opportunities.actualCloseDate} <= ${dateToDate}`,
                sql`${opportunities.deletedAt} IS NULL`
              )
            );
          results.lost_revenue = Number(result?.total ?? 0);
          break;
        }

        case "warranty_count": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(warranties)
            .where(
              and(
                eq(warranties.organizationId, organizationId),
                sql`${warranties.registrationDate} >= ${dateFromIso}`,
                sql`${warranties.registrationDate} <= ${dateToIso}`
              )
            );
          results.warranty_count = Number(result?.count ?? 0);
          break;
        }

        case "claim_count": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(warrantyClaims)
            .where(
              and(
                eq(warrantyClaims.organizationId, organizationId),
                sql`${warrantyClaims.submittedAt} >= ${dateFromIso}`,
                sql`${warrantyClaims.submittedAt} <= ${dateToIso}`
              )
            );
          results.claim_count = Number(result?.count ?? 0);
          break;
        }

        case "sla_compliance": {
          const [result] = await db
            .select({
              total: sql<number>`COUNT(*)`,
              breached: sql<number>`SUM(CASE WHEN ${slaTracking.responseBreached} OR ${slaTracking.resolutionBreached} THEN 1 ELSE 0 END)`,
            })
            .from(slaTracking)
            .where(
              and(
                eq(slaTracking.organizationId, organizationId),
                eq(slaTracking.domain, "warranty"),
                sql`${slaTracking.startedAt} >= ${dateFromIso}`,
                sql`${slaTracking.startedAt} <= ${dateToIso}`
              )
            );
          const total = Number(result?.total ?? 0);
          const breached = Number(result?.breached ?? 0);
          results.sla_compliance = total > 0 ? ((total - breached) / total) * 100 : 0;
          break;
        }

        case "expiring_warranties": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(warranties)
            .where(
              and(
                eq(warranties.organizationId, organizationId),
                sql`${warranties.expiryDate} >= ${dateFromIso}`,
                sql`${warranties.expiryDate} <= ${dateToIso}`,
                sql`${warranties.status} IN ('active', 'expiring_soon')`
              )
            );
          results.expiring_warranties = Number(result?.count ?? 0);
          break;
        }

        case "warranty_value": {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
            })
            .from(warranties)
            .leftJoin(orders, eq(warranties.orderId, orders.id))
            .where(
              and(
                eq(warranties.organizationId, organizationId),
                sql`${warranties.expiryDate} >= ${dateFromIso}`,
                sql`${warranties.expiryDate} <= ${dateToIso}`,
                sql`${orders.deletedAt} IS NULL`
              )
            );
          results.warranty_value = Number(result?.total ?? 0);
          break;
        }

        // Health score metrics
        case "avg_health_score": {
          const [result] = await db
            .select({
              avg: sql<number>`COALESCE(AVG(${customers.healthScore}), 0)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.healthScore} IS NOT NULL`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.avg_health_score = Number(result?.avg ?? 0);
          break;
        }

        case "health_score_distribution_excellent": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.healthScore} >= 80`,
                sql`${customers.healthScore} <= 100`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.health_score_distribution_excellent = Number(result?.count ?? 0);
          break;
        }

        case "health_score_distribution_good": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.healthScore} >= 60`,
                sql`${customers.healthScore} < 80`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.health_score_distribution_good = Number(result?.count ?? 0);
          break;
        }

        case "health_score_distribution_fair": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.healthScore} >= 40`,
                sql`${customers.healthScore} < 60`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.health_score_distribution_fair = Number(result?.count ?? 0);
          break;
        }

        case "health_score_distribution_at_risk": {
          const [result] = await db
            .select({
              count: sql<number>`COUNT(*)`,
            })
            .from(customers)
            .where(
              and(
                eq(customers.organizationId, organizationId),
                sql`${customers.healthScore} >= 0`,
                sql`${customers.healthScore} < 40`,
                sql`${customers.deletedAt} IS NULL`
              )
            );
          results.health_score_distribution_at_risk = Number(result?.count ?? 0);
          break;
        }

        // Placeholder for metrics that require additional schema
        case "quote_win_rate":
        case "kwh_deployed":
        case "active_installations":
          results[metricId] = 0;
          break;
      }
    } catch (error) {
      appLogger.error(`Failed to calculate metric ${metricId}`, error);
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
    case "revenue":
    case "revenue_cash":
    case "pipeline_value":
    case "average_order_value":
    case "forecasted_revenue":
    case "won_revenue":
    case "lost_revenue":
    case "warranty_value":
      return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      }).format(value);
    case "quote_win_rate":
    case "win_rate":
    case "sla_compliance":
    case "avg_health_score":
      return `${value.toFixed(1)}${metricId === 'avg_health_score' ? '' : '%'}`;
    default:
      return value.toLocaleString();
  }
}

/**
 * Get metric label for display
 */
function getMetricLabel(metricId: string): string {
  const labels: Record<string, string> = {
    revenue: "Revenue (Invoiced)",
    revenue_cash: "Revenue (Cash)",
    orders_count: "Orders",
    customer_count: "New Customers",
    pipeline_value: "Pipeline Value",
    forecasted_revenue: "Forecasted Revenue",
    average_order_value: "Average Order Value",
    quote_win_rate: "Quote Win Rate",
    win_rate: "Win Rate",
    won_revenue: "Won Revenue",
    lost_revenue: "Lost Revenue",
    warranty_count: "Warranties",
    claim_count: "Claims",
    sla_compliance: "SLA Compliance",
    expiring_warranties: "Expiring Warranties",
    warranty_value: "Warranty Value",
    kwh_deployed: "kWh Deployed",
    active_installations: "Active Installations",
    avg_health_score: "Average Health Score",
    health_score_distribution_excellent: "Excellent Health (80-100)",
    health_score_distribution_good: "Good Health (60-79)",
    health_score_distribution_fair: "Fair Health (40-59)",
    health_score_distribution_at_risk: "At Risk Health (0-39)",
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
    .join("");

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
          Report Period: ${dateFrom.toLocaleDateString("en-AU")} - ${dateTo.toLocaleDateString("en-AU")}<br>
          Generated: ${new Date().toLocaleString("en-AU")}
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
  const header = "Metric,Value\n";
  const rows = metricIds
    .map((id) => {
      const value = metrics[id] ?? 0;
      return `"${getMetricLabel(id)}",${value}`;
    })
    .join("\n");
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
    case "daily":
      from.setDate(from.getDate() - 1);
      break;
    case "weekly":
      from.setDate(from.getDate() - 7);
      break;
    case "biweekly":
      from.setDate(from.getDate() - 14);
      break;
    case "monthly":
      from.setMonth(from.getMonth() - 1);
      break;
    case "quarterly":
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
    case "daily":
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0);
      break;
    case "weekly":
      now.setDate(now.getDate() + 7);
      now.setHours(8, 0, 0, 0);
      break;
    case "biweekly":
      now.setDate(now.getDate() + 14);
      now.setHours(8, 0, 0, 0);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      now.setDate(1);
      now.setHours(8, 0, 0, 0);
      break;
    case "quarterly":
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
// STORAGE + EMAIL HELPERS
// ============================================================================

function buildReportStoragePath(params: {
  organizationId: string;
  reportId: string;
  filename: string;
}) {
  return `organizations/${params.organizationId}/reports/${params.reportId}/${params.filename}`;
}

async function uploadReportContent(params: {
  organizationId: string;
  reportId: string;
  filename: string;
  content: string | ArrayBuffer;
  contentType: string;
}) {
  const encoded =
    typeof params.content === "string"
      ? new TextEncoder().encode(params.content).buffer
      : params.content;
  const { path } = await uploadFile({
    path: buildReportStoragePath(params),
    fileBody: encoded,
    contentType: params.contentType,
    upsert: true,
  });

  const { signedUrl } = await createSignedUrl({
    path,
    expiresIn: 24 * 60 * 60,
    download: params.filename,
  });

  return { path, signedUrl };
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 8);
}

async function sendReportEmail(params: {
  to: string;
  reportName: string;
  reportUrl: string;
  format: string;
  dateFrom: Date;
  dateTo: Date;
  organizationName?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const fromEmail = process.env.EMAIL_FROM || "noreply@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "Renoz";
  const fromAddress = `${fromName} <${fromEmail}>`;

  const subject = `${params.reportName} (${params.format.toUpperCase()})`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">${params.reportName}</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">
        Report period: ${params.dateFrom.toLocaleDateString("en-AU")} - ${params.dateTo.toLocaleDateString("en-AU")}
      </p>
      <p style="margin-bottom: 16px;">
        <a href="${params.reportUrl}" style="color: #2563eb; text-decoration: none;">
          Download ${params.format.toUpperCase()} report
        </a>
      </p>
      <p style="color: #9ca3af; font-size: 12px;">
        This report was generated by ${params.organizationName ?? "Renoz CRM"}.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [params.to],
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}

// ============================================================================
// TASK: Process Due Reports
// ============================================================================

/**
 * Process Scheduled Reports Task
 *
 * Runs every 15 minutes to check for reports that are due.
 * For each due report:
 * 1. Calculate metrics for the date range
 * 2. Generate report content (HTML/CSV/PDF)
 * 3. Upload to storage
 * 4. Send to recipients via email
 * 5. Update report record
 */
export const processScheduledReportsTask = schedules.task({
  id: "process-scheduled-reports",
  cron: "*/15 * * * *",
  run: async (): Promise<ProcessScheduledReportsResult> => {
    logger.info("Checking for scheduled reports to process");

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

    logger.info(`Found ${dueReports.length} scheduled reports to process`);

    if (dueReports.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const report of dueReports) {
      try {
        logger.info(`Processing scheduled report: ${report.name}`, {
          reportId: report.id,
          frequency: report.frequency,
          format: report.format,
        });

        // Calculate date range based on frequency
        const { from: dateFrom, to: dateTo } = calculateReportDateRange(
          report.frequency
        );

        // Get metrics to include
        const metricIds = report.metrics?.metrics ?? [];
        if (metricIds.length === 0) {
          throw new Error("No metrics configured for report");
        }

        // Calculate metrics
        const metrics = await calculateMetrics(
          report.organizationId,
          dateFrom,
          dateTo,
          metricIds
        );

        logger.info("Calculated metrics", {
          metricCount: Object.keys(metrics).length,
        });

        const orgData = await fetchOrganizationForDocument(report.organizationId);

        // Generate report content based on format
        let content: string;
        let contentBody: string | ArrayBuffer;
        let filename: string;
        let contentType: string;
        let storageFilename: string;

        switch (report.format) {
          case "csv":
          case "xlsx":
            content = generateCsvReport(metrics, metricIds);
            storageFilename = `${report.name.replace(/\s+/g, "-")}-${dateTo.toISOString().split("T")[0]}.${report.format === "xlsx" ? "xlsx" : "csv"}`;
            filename = storageFilename;
            contentType = "text/csv";
            contentBody = content;
            break;
          case "pdf": {
            const pdfElement = createElement(ReportSummaryPdfDocument, {
              organization: orgData,
              data: {
                reportName: report.name,
                dateFrom,
                dateTo,
                metrics: metricIds.map((id) => ({
                  label: getMetricLabel(id),
                  value: formatMetricValue(id, metrics[id] ?? 0),
                })),
                generatedAt: new Date(),
              },
            }) as unknown as ReactElement<DocumentProps>;
            const pdfResult = await renderPdfToBuffer(pdfElement);
            storageFilename = `${report.name.replace(/\s+/g, "-")}-${dateTo.toISOString().split("T")[0]}.pdf`;
            filename = storageFilename;
            contentType = "application/pdf";
            contentBody = bufferToArrayBuffer(pdfResult.buffer);
            content = "";
            break;
          }
          case "html":
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
            storageFilename = `${report.name.replace(/\s+/g, "-")}-${dateTo.toISOString().split("T")[0]}.html`;
            filename = storageFilename;
            contentType = "text/html";
            contentBody = content;
            break;
        }

        const upload = await uploadReportContent({
          organizationId: report.organizationId,
          reportId: report.id,
          filename: storageFilename,
          content: contentBody,
          contentType,
        });

        const recipientEmails = report.recipients?.emails ?? [];
        const recipientCount = recipientEmails.length;

        for (const email of recipientEmails) {
          try {
            await sendReportEmail({
              to: email,
              reportName: report.name,
              reportUrl: upload.signedUrl,
              format: report.format,
              dateFrom,
              dateTo,
              organizationName: orgData.name,
            });
          } catch (error) {
            logger.error("Failed to send report email", {
              reportId: report.id,
              emailHash: hashEmail(email),
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        }

        logger.info("Report generated successfully", {
          reportId: report.id,
          format: report.format,
          filename,
          contentLength:
            typeof contentBody === "string" ? contentBody.length : contentBody.byteLength,
          recipientCount,
          storagePath: upload.path,
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
            consecutiveFailures: "0",
            updatedAt: new Date(),
          })
          .where(eq(scheduledReports.id, report.id));

        sent++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Failed to process report ${report.id}`, {
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
// TASK: Generate Single Report (On-Demand)
// ============================================================================

/**
 * Generate Report Task
 *
 * Triggered when a user clicks "Run Now" on a scheduled report.
 * Generates the report immediately regardless of schedule.
 */
export const generateReportTask = task({
  id: "generate-report",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: GenerateReportPayload): Promise<GenerateReportResult> => {
    const { reportId, organizationId, isManualTrigger } = payload;

    logger.info("Starting on-demand report generation", {
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
    const { from: dateFrom, to: dateTo } = calculateReportDateRange(
      report.frequency
    );

    // Get metrics to include
    const metricIds = report.metrics?.metrics ?? [];
    if (metricIds.length === 0) {
      throw new Error("No metrics configured for report");
    }

    // Calculate metrics
    logger.info("Calculating metrics", { metricIds });
    const metrics = await calculateMetrics(
      organizationId,
      dateFrom,
      dateTo,
      metricIds
    );

    // Generate report content
    let content: string;
    let contentBody: string | ArrayBuffer;
    let filename: string;
    let storageFilename: string;
    let contentType: string;

    switch (report.format) {
      case "csv":
      case "xlsx":
        content = generateCsvReport(metrics, metricIds);
        storageFilename = `${report.name.replace(/\s+/g, "-")}-${dateTo.toISOString().split("T")[0]}.${report.format === "xlsx" ? "xlsx" : "csv"}`;
        filename = storageFilename;
        contentType = "text/csv";
        contentBody = content;
        break;
      case "pdf": {
        const orgData = await fetchOrganizationForDocument(organizationId);
        const pdfElement = createElement(ReportSummaryPdfDocument, {
          organization: orgData,
          data: {
            reportName: report.name,
            dateFrom,
            dateTo,
            metrics: metricIds.map((id) => ({
              label: getMetricLabel(id),
              value: formatMetricValue(id, metrics[id] ?? 0),
            })),
            generatedAt: new Date(),
          },
        }) as unknown as ReactElement<DocumentProps>;
        const pdfResult = await renderPdfToBuffer(pdfElement);
        storageFilename = `${report.name.replace(/\s+/g, "-")}-${dateTo.toISOString().split("T")[0]}.pdf`;
        filename = storageFilename;
        contentType = "application/pdf";
        contentBody = bufferToArrayBuffer(pdfResult.buffer);
        content = "";
        break;
      }
      case "html":
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
        storageFilename = `${report.name.replace(/\s+/g, "-")}-${dateTo.toISOString().split("T")[0]}.html`;
        filename = storageFilename;
        contentType = "text/html";
        contentBody = content;
        break;
    }

    const upload = await uploadReportContent({
      organizationId,
      reportId,
      filename: storageFilename,
      content: contentBody,
      contentType,
    });

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

    logger.info("Report generated successfully", {
      reportId,
      filename,
      contentLength:
        typeof contentBody === "string" ? contentBody.length : contentBody.byteLength,
      storagePath: upload.path,
    });

    return {
      success: true,
      reportId,
      filename,
      format: report.format,
      generatedAt: new Date().toISOString(),
      reportUrl: upload.signedUrl,
    };
  },
});

// ============================================================================
// LEGACY EXPORTS - for backward compatibility
// ============================================================================

/**
 * @deprecated Use processScheduledReportsTask instead
 */
export const processScheduledReportsJob = processScheduledReportsTask;

/**
 * @deprecated Use generateReportTask instead
 */
export const generateReportJob = generateReportTask;
