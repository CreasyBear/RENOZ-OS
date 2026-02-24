'use server'

/**
 * Financial Summary Report Server Function
 *
 * Aggregates financial metrics for the Reports domain.
 * Uses existing financial dashboard functions.
 *
 * @see reports_domain_remediation Phase 6
 * @see src/lib/schemas/reports/financial-summary.ts
 */

import { createServerFn } from '@tanstack/react-start';
import { randomUUID } from 'crypto';
import { TextEncoder } from 'util';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import {
  getFinancialDashboardMetrics,
  getRevenueByPeriod,
} from '@/server/functions/financial/financial-dashboard';
import {
  getFinancialSummaryReportSchema,
  generateFinancialSummaryReportSchema,
  type FinancialSummaryReport,
  type FinancialSummaryTrendPoint,
} from '@/lib/schemas/reports/financial-summary';
import { withAuth } from '@/lib/server/protected';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { uploadFile, createSignedUrl } from '@/lib/storage';
import { renderPdfToBuffer, ReportSummaryPdfDocument } from '@/lib/documents';
import { bufferToArrayBuffer } from './reports-utils';
import { fetchOrganizationForDocument } from '@/server/functions/documents/organization-for-pdf';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(value);
}

function generateFinancialSummaryCsv(report: FinancialSummaryReport): string {
  const lines: string[] = [
    'Metric,Value',
    `Revenue,${formatCurrency(report.kpis.revenue)}`,
    `AR Balance,${formatCurrency(report.kpis.arBalance)}`,
    `Overdue Amount,${formatCurrency(report.kpis.overdueAmount)}`,
    `Cash Received,${formatCurrency(report.kpis.cashReceived)}`,
    `GST Collected,${formatCurrency(report.kpis.gstCollected)}`,
    '',
    'Period,Total Revenue,Residential,Commercial,Invoice Count',
    ...report.trends.map(
      (t) =>
        `${t.periodLabel},${formatCurrency(t.totalRevenue)},${formatCurrency(t.residentialRevenue)},${formatCurrency(t.commercialRevenue)},${t.invoiceCount}`
    ),
  ];
  return lines.join('\n');
}

/**
 * Get financial summary report for a date range.
 * Aggregates KPIs, revenue trends, and cash flow.
 */
export const getFinancialSummaryReport = createServerFn()
  .inputValidator(getFinancialSummaryReportSchema)
  .handler(async ({ data }): Promise<FinancialSummaryReport> => {
    await withAuth({ permission: PERMISSIONS.report.viewFinancial });

    const dateFrom = data.dateFrom;
    const dateTo = data.dateTo;
    const periodType = data.periodType ?? 'monthly';

    const [metrics, revenueByPeriod] = await Promise.all([
      getFinancialDashboardMetrics({
        data: {
          dateFrom: dateFrom,
          dateTo: dateTo,
          includePreviousPeriod: true,
        },
      }),
      getRevenueByPeriod({
        data: {
          dateFrom,
          dateTo,
          periodType,
          customerType: 'all',
        },
      }),
    ]);

    const trends: FinancialSummaryTrendPoint[] = revenueByPeriod.periods.map((p) => ({
      period: p.period,
      periodLabel: p.periodLabel,
      totalRevenue: p.totalRevenue,
      cashRevenue: p.cashRevenue,
      residentialRevenue: p.residentialRevenue,
      commercialRevenue: p.commercialRevenue,
      invoiceCount: p.invoiceCount,
    }));

    return {
      kpis: {
        revenue: metrics.revenueInvoicedMTD.value,
        revenuePrev: metrics.revenueInvoicedMTD.previousValue,
        revenueChangePercent: metrics.revenueInvoicedMTD.changePercent,
        arBalance: metrics.arBalance.value,
        overdueAmount: metrics.overdueAmount.value,
        cashReceived: metrics.cashReceivedMTD.value,
        gstCollected: metrics.gstCollectedMTD.value,
      },
      trends,
      cashFlow: {
        cashReceived: metrics.cashReceivedMTD.value,
        arBalance: metrics.arBalance.value,
        overdueAmount: metrics.overdueAmount.value,
        invoiceCount: metrics.invoiceCount,
        overdueCount: metrics.overdueCount,
      },
      periodStart: metrics.periodStart,
      periodEnd: metrics.periodEnd,
    };
  });

/**
 * Export financial summary report as CSV or PDF.
 * Uses the same data as getFinancialSummaryReport so export matches on-screen.
 */
export const generateFinancialSummaryReport = createServerFn()
  .inputValidator(generateFinancialSummaryReportSchema)
  .handler(async ({ data }): Promise<{ reportUrl: string; expiresAt: Date; format: string }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.report.viewFinancial });

    const report = await getFinancialSummaryReport({
      data: {
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        periodType: 'monthly',
      },
    });

    const dateFromStr = data.dateFrom.toISOString().split('T')[0];
    const dateToStr = data.dateTo.toISOString().split('T')[0];

    const metricsForPdf = [
      { label: 'Revenue', value: formatCurrency(report.kpis.revenue) },
      { label: 'AR Balance', value: formatCurrency(report.kpis.arBalance) },
      { label: 'Overdue Amount', value: formatCurrency(report.kpis.overdueAmount) },
      { label: 'Cash Received', value: formatCurrency(report.kpis.cashReceived) },
      { label: 'GST Collected', value: formatCurrency(report.kpis.gstCollected) },
    ];

    let contentBody: string | ArrayBuffer;
    let filename: string;
    let contentType: string;

    if (data.format === 'pdf') {
      const orgData = await fetchOrganizationForDocument(ctx.organizationId);
      const pdfElement = createElement(ReportSummaryPdfDocument, {
        organization: orgData,
        data: {
          reportName: 'Financial Summary',
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          metrics: metricsForPdf,
          generatedAt: new Date(),
        },
      }) as unknown as ReactElement<DocumentProps>;
      const pdfResult = await renderPdfToBuffer(pdfElement);
      contentBody = bufferToArrayBuffer(pdfResult.buffer);
      filename = `financial-summary-${dateFromStr}-${dateToStr}.pdf`;
      contentType = 'application/pdf';
    } else {
      contentBody = new TextEncoder().encode(
        generateFinancialSummaryCsv(report)
      ).buffer;
      const ext = data.format === 'xlsx' ? 'xlsx' : 'csv';
      filename = `financial-summary-${dateFromStr}-${dateToStr}.${ext}`;
      contentType = 'text/csv';
    }

    const reportId = randomUUID();
    const storagePath = `organizations/${ctx.organizationId}/reports/on-demand/${reportId}/${filename}`;

    await uploadFile({
      path: storagePath,
      fileBody: contentBody,
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
