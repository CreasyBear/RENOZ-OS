/**
 * Procurement Reports Page
 *
 * Advanced procurement analytics and automated reporting dashboard.
 */
import { useState, useCallback, useMemo } from 'react';
import { subDays } from 'date-fns';

import {
  ProcurementReports,
  type ProcurementAnalytics,
} from '@/components/domain/reports/procurement-reports';
import { type DateRange } from '@/components/ui/date-picker-with-range';
import { toast } from '@/lib/toast';
import { generateCSV, downloadCSV, formatDateForFilename } from '@/lib/utils/csv';
import { useProcurementDashboard } from '@/hooks/suppliers';
import { useCreateCustomReport, useCreateScheduledReport, useGenerateReport } from '@/hooks/reports';
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form';

/**
 * Procurement reports container.
 * @source hooks/useProcurementDashboard
 */
export function ProcurementReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Fetch real procurement dashboard data
  const { data, isLoading, error } = useProcurementDashboard({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    includePreviousPeriod: true,
  });

  const createCustomReport = useCreateCustomReport();
  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  // Transform server data to ProcurementAnalytics format expected by component
  const analytics = useMemo((): ProcurementAnalytics | undefined => {
    if (!data) return undefined;

    return {
      supplierPerformance: data.supplierPerformance,
      spendAnalysis: {
        byCategory: data.spendAnalysis.byCategory,
        bySupplier: data.spendAnalysis.bySupplier,
        trends: data.spendAnalysis.trends,
      },
      efficiencyMetrics: {
        avgProcessingTime: data.efficiencyMetrics.avgProcessingTime,
        approvalCycleTime: data.efficiencyMetrics.approvalCycleTime,
        orderFulfillmentRate: data.efficiencyMetrics.orderFulfillmentRate,
        costSavingsRate: data.efficiencyMetrics.costSavingsRate,
        automationRate: data.efficiencyMetrics.automationRate,
        supplierDiversity: data.efficiencyMetrics.supplierDiversity,
      },
      costSavings: {
        totalSavings: data.costSavings.totalSavings,
        savingsByType: data.costSavings.savingsByType,
        monthlySavings: data.costSavings.monthlySavings,
      },
    };
  }, [data]);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // Handle export
  const handleExport = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    if (!data) {
      toast.error('No data to export');
      return;
    }

    if (format === 'csv') {
      // Export supplier performance as CSV
      const csv = generateCSV({
        headers: [
          'Supplier Name',
          'Total Orders',
          'Total Spend',
          'Avg Order Value',
          'Quality Score',
          'On-Time Delivery %',
          'Defect Rate %',
          'Lead Time (days)',
          'Cost Savings',
        ],
        rows: data.supplierPerformance.map((s) => [
          s.supplierName,
          s.totalOrders.toString(),
          s.totalSpend.toFixed(2),
          s.avgOrderValue.toFixed(2),
          s.qualityScore.toFixed(1),
          (s.onTimeDelivery * 100).toFixed(1),
          (s.defectRate * 100).toFixed(2),
          s.leadTimeDays.toString(),
          s.costSavings.toFixed(2),
        ]),
      });

      downloadCSV(csv, `procurement-report-${formatDateForFilename()}.csv`);
      toast.success('Procurement report exported as CSV');
    } else {
      const reportFormat = format === 'excel' ? 'xlsx' : 'pdf';
      generateReport
        .mutateAsync({
          metrics: ['orders_count', 'average_order_value', 'revenue'],
          dateFrom: dateRange.from.toISOString().split('T')[0],
          dateTo: dateRange.to.toISOString().split('T')[0],
          format: reportFormat,
          includeCharts: true,
          includeTrends: true,
        })
        .then((result) => {
          window.open(result.reportUrl, '_blank', 'noopener,noreferrer');
          toast.success(`Report exported as ${format.toUpperCase()}`);
        })
        .catch(() => {
          toast.error(`Failed to export ${format.toUpperCase()}`);
        });
    }
  }, [data, dateRange, generateReport]);

  // Handle custom report creation
  const handleCreateCustomReport = useCallback(
    async (input: { name: string; description?: string; reportType: string }) => {
      try {
        await createCustomReport.mutateAsync({
          name: input.name,
          description: input.description,
          isShared: false,
          definition: {
            columns: getColumnsForProcurementReport(input.reportType),
            filters: {
              source: 'procurement',
              reportType: input.reportType,
            },
          },
        });
        toast.success('Custom report created successfully');
      } catch {
        toast.error('Failed to create custom report');
      }
    },
    [createCustomReport]
  );

  // Handle schedule report
  const handleScheduleReport = useCallback(() => {
    setScheduleOpen(true);
  }, []);

  const handleScheduleSubmit = useCallback(
    async (data: Parameters<typeof createScheduledReport.mutateAsync>[0]) => {
      try {
        await createScheduledReport.mutateAsync(data);
        toast.success('Procurement report scheduled');
      } catch (error) {
        toast.error('Failed to schedule report');
        throw error;
      }
    },
    [createScheduledReport]
  );

  return (
    <>
      <ProcurementReports
        analytics={analytics}
        isLoading={isLoading}
        error={error}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onExport={handleExport}
        onCreateCustomReport={handleCreateCustomReport}
        onScheduleReport={handleScheduleReport}
      />
      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: 'Procurement Performance Report',
          description: 'Recurring procurement metrics and trends',
          metrics: {
            metrics: ['orders_count', 'average_order_value', 'revenue'],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: 'previous_period',
          },
        }}
      />
    </>
  );
}

function getColumnsForProcurementReport(reportType: string): string[] {
  switch (reportType) {
    case 'supplier-performance':
      return [
        'supplierName',
        'totalSpend',
        'totalOrders',
        'avgOrderValue',
        'qualityRating',
        'deliveryRating',
        'leadTimeDays',
      ];
    case 'spend-analysis':
      return ['supplierName', 'totalSpend', 'orderCount', 'avgOrderValue'];
    case 'efficiency':
      return [
        'orderCount',
        'orderFulfillmentRate',
        'onTimeDeliveryRate',
        'avgApprovalDays',
        'avgDeliveryDelayDays',
      ];
    case 'cost-savings':
      return ['supplierName', 'totalSpend', 'orderCount', 'avgOrderValue'];
    default:
      return ['poNumber', 'supplierName', 'status', 'orderDate', 'totalAmount'];
  }
}
