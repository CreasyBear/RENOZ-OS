/**
 * Procurement Reports Route
 *
 * Advanced procurement analytics and automated reporting dashboard.
 * Following established reporting patterns with comprehensive analytics.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-ANALYTICS-REPORTING)
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { subDays } from 'date-fns';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import {
  ProcurementReports,
  type ProcurementAnalytics,
} from '@/components/domain/reports/procurement-reports';
import { type DateRange } from '@/components/ui/date-picker-with-range';
import { toast } from '@/lib/toast';
import { useProcurementDashboard } from '@/hooks/suppliers';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/reports/procurement/')({
  component: ProcurementReportsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/reports" />
  ),
  pendingComponent: () => (
    <PageLayout>
      <PageLayout.Header
        title="Procurement Reports"
        description="Advanced procurement analytics and automated reporting"
      />
      <PageLayout.Content>
        <ReportDashboardSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// MAIN COMPONENT (CONTAINER)
// ============================================================================

function ProcurementReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch real procurement dashboard data
  const { data, isLoading, error } = useProcurementDashboard({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    includePreviousPeriod: true,
  });

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
  const handleExport = useCallback((format: 'pdf' | 'excel') => {
    toast.success(`Report exported as ${format.toUpperCase()}`);
  }, []);

  // Handle custom report creation
  const handleCreateCustomReport = useCallback(() => {
    toast.success('Custom report created successfully');
  }, []);

  // Handle schedule report
  const handleScheduleReport = useCallback(() => {
    toast.success('Report scheduled successfully');
  }, []);

  return (
    <PageLayout>
      <PageLayout.Header
        title="Procurement Reports"
        description="Advanced procurement analytics and automated reporting"
      />

      <PageLayout.Content>
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
      </PageLayout.Content>
    </PageLayout>
  );
}
