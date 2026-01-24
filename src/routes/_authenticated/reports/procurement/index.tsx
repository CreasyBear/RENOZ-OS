/**
 * Procurement Reports Route
 *
 * Advanced procurement analytics and automated reporting dashboard.
 * Following established reporting patterns with comprehensive analytics.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-ANALYTICS-REPORTING)
 */
import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, subMonths, format } from 'date-fns';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { ReportDashboardSkeleton } from '@/components/skeletons/reports';
import { ProcurementReports, type ProcurementAnalytics } from '@/components/domain/reports/procurement-reports';
import { type DateRange } from '@/components/ui/date-picker-with-range';
import { toast } from '@/lib/toast';
import { queryKeys } from '@/lib/query-keys';

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

  // Mock analytics data - will be replaced with real API
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: queryKeys.reports.procurementAnalytics(dateRange),
    queryFn: async (): Promise<ProcurementAnalytics> => {
      // Mock comprehensive analytics data
      return {
        supplierPerformance: [
          {
            supplierId: 'sup-1',
            supplierName: 'Office Depot',
            totalOrders: 45,
            totalSpend: 234567.89,
            avgOrderValue: 5212.62,
            qualityScore: 94.2,
            onTimeDelivery: 96.7,
            defectRate: 0.3,
            leadTimeDays: 3,
            costSavings: 15678.9,
            trend: 'up',
          },
          {
            supplierId: 'sup-2',
            supplierName: 'TechCorp Solutions',
            totalOrders: 32,
            totalSpend: 345678.9,
            avgOrderValue: 10802.47,
            qualityScore: 87.3,
            onTimeDelivery: 91.4,
            defectRate: 0.8,
            leadTimeDays: 5,
            costSavings: 23456.78,
            trend: 'stable',
          },
          {
            supplierId: 'sup-3',
            supplierName: 'Global Manufacturing',
            totalOrders: 28,
            totalSpend: 198765.43,
            avgOrderValue: 7098.77,
            qualityScore: 96.1,
            onTimeDelivery: 98.2,
            defectRate: 0.2,
            leadTimeDays: 7,
            costSavings: 12345.67,
            trend: 'up',
          },
        ],
        spendAnalysis: {
          byCategory: [
            { category: 'IT Equipment', totalSpend: 456789.0, percentage: 31.4, trend: 5.2 },
            { category: 'Office Supplies', totalSpend: 345678.0, percentage: 23.7, trend: -2.1 },
            { category: 'Furniture', totalSpend: 234567.0, percentage: 16.1, trend: 8.7 },
            { category: 'Services', totalSpend: 198765.0, percentage: 13.6, trend: 12.3 },
            { category: 'Facilities', totalSpend: 123456.0, percentage: 8.5, trend: -1.8 },
          ],
          bySupplier: [
            {
              supplierId: 'sup-1',
              supplierName: 'Office Depot',
              totalSpend: 234567.89,
              orderCount: 45,
              avgOrderValue: 5212.62,
            },
            {
              supplierId: 'sup-2',
              supplierName: 'TechCorp Solutions',
              totalSpend: 345678.9,
              orderCount: 32,
              avgOrderValue: 10802.47,
            },
            {
              supplierId: 'sup-3',
              supplierName: 'Global Manufacturing',
              totalSpend: 198765.43,
              orderCount: 28,
              avgOrderValue: 7098.77,
            },
          ],
          trends: Array.from({ length: 12 }, (_, i) => {
            const date = subMonths(new Date(), 11 - i);
            return {
              date: format(date, 'MMM yyyy'),
              spend: Math.floor(Math.random() * 150000) + 100000,
              orders: Math.floor(Math.random() * 40) + 20,
              savings: Math.floor(Math.random() * 20000) + 5000,
            };
          }),
        },
        efficiencyMetrics: {
          avgProcessingTime: 2.4,
          approvalCycleTime: 1.8,
          orderFulfillmentRate: 94.2,
          costSavingsRate: 8.7,
          automationRate: 76.3,
          supplierDiversity: 12,
        },
        costSavings: {
          totalSavings: 156789.0,
          savingsByType: [
            { type: 'Negotiated Discounts', amount: 89456.0, percentage: 57.1 },
            { type: 'Volume Discounts', amount: 34567.0, percentage: 22.0 },
            { type: 'Process Improvements', amount: 22345.0, percentage: 14.2 },
            { type: 'Supplier Competition', amount: 10421.0, percentage: 6.7 },
          ],
          monthlySavings: Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(new Date(), 5 - i);
            return {
              month: format(date, 'MMM yyyy'),
              negotiatedSavings: Math.floor(Math.random() * 15000) + 5000,
              volumeDiscounts: Math.floor(Math.random() * 8000) + 2000,
              processImprovements: Math.floor(Math.random() * 5000) + 1000,
              total: Math.floor(Math.random() * 28000) + 8000,
            };
          }),
        },
      };
    },
  });

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
