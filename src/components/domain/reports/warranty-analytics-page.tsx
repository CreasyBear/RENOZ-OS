/**
 * Warranty Analytics Report Page
 *
 * Comprehensive warranty analytics dashboard with claims breakdown,
 * SLA compliance metrics, trend analysis, and export functionality.
 */
import { useState, useCallback, useMemo } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { format, subDays } from 'date-fns';

import { useWarrantyAnalyticsDashboard, useExportWarrantyAnalytics } from '@/hooks';
import { useCreateScheduledReport, useGenerateReport } from '@/hooks/reports';
import { toast } from '@/hooks';
import {
  WarrantyAnalyticsView,
  type WarrantyAnalyticsSearchParams,
  type FilterOption,
  type AnalyticsFilterBadge,
} from './warranty-analytics-view';

// ============================================================================
// CONSTANTS
// ============================================================================

const RANGE_OPTIONS: FilterOption<WarrantyAnalyticsSearchParams['range']>[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

const WARRANTY_TYPE_OPTIONS: FilterOption<WarrantyAnalyticsSearchParams['warrantyType']>[] = [
  { value: 'all', label: 'All Warranty Types' },
  { value: 'battery_performance', label: 'Battery Performance' },
  { value: 'inverter_manufacturer', label: 'Inverter Manufacturer' },
  { value: 'installation_workmanship', label: 'Installation Workmanship' },
];

const CLAIM_TYPE_OPTIONS: FilterOption<WarrantyAnalyticsSearchParams['claimType']>[] = [
  { value: 'all', label: 'All Claim Types' },
  { value: 'cell_degradation', label: 'Cell Degradation' },
  { value: 'bms_fault', label: 'BMS Fault' },
  { value: 'inverter_failure', label: 'Inverter Failure' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_FILTERS: WarrantyAnalyticsSearchParams = {
  range: '30',
  warrantyType: 'all',
  claimType: 'all',
};

/**
 * Warranty analytics container.
 * @source hooks/useWarrantyAnalyticsDashboard, useExportWarrantyAnalytics
 */
export function WarrantyAnalyticsPage() {
  const search = useSearch({ from: '/_authenticated/reports/warranties' });
  const navigate = useNavigate({ from: '/reports/warranties' });

  // Local filter state for mobile sheet
  const [mobileFilters, setMobileFilters] = useState<WarrantyAnalyticsSearchParams>(search);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Calculate date range from selection
  const dateRange = useMemo(() => {
    if (search.range === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    const days = parseInt(search.range, 10);
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  }, [search.range]);

  // Fetch analytics data
  const dashboard = useWarrantyAnalyticsDashboard({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    warrantyType: search.warrantyType,
    claimType: search.claimType,
    trendMonths: 6,
  });

  // Export mutation
  const exportMutation = useExportWarrantyAnalytics({
    onSuccess: () => {
      toast.success('Your warranty analytics report has been downloaded.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to export analytics data.');
    },
  });
  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  // Update search params
  const updateSearch = useCallback(
    (updates: Partial<WarrantyAnalyticsSearchParams>) => {
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
      });
    },
    [navigate]
  );

  // Apply mobile filters
  const applyMobileFilters = useCallback(() => {
    navigate({ search: mobileFilters });
  }, [navigate, mobileFilters]);

  const handleMobileFilterChange = useCallback((updates: Partial<WarrantyAnalyticsSearchParams>) => {
    setMobileFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleResetMobileFilters = useCallback(() => {
    setMobileFilters(DEFAULT_FILTERS);
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    navigate({
      search: DEFAULT_FILTERS,
    });
    setMobileFilters(DEFAULT_FILTERS);
  }, [navigate]);

  // Check for active filters
  const hasActiveFilters = useMemo(() => {
    return search.range !== '30' || search.warrantyType !== 'all' || search.claimType !== 'all';
  }, [search]);

  // Handle export
  const handleExport = useCallback(
    (format: 'csv' | 'json') => {
      exportMutation.mutate({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        warrantyType: search.warrantyType,
        claimType: search.claimType,
        format,
      });
    },
    [exportMutation, dateRange, search]
  );

  const handleExportFile = useCallback(
    (format: 'pdf' | 'excel') => {
      const reportFormat = format === 'excel' ? 'xlsx' : 'pdf';
      const exportRange = getExportRange(dateRange.startDate, dateRange.endDate);
      generateReport
        .mutateAsync({
          metrics: ['warranty_count', 'claim_count', 'sla_compliance'],
          dateFrom: exportRange.dateFrom,
          dateTo: exportRange.dateTo,
          format: reportFormat,
          includeCharts: true,
          includeTrends: true,
        })
        .then((result) => {
          window.open(result.reportUrl, '_blank', 'noopener,noreferrer');
        })
        .catch(() => {
          // keep UI quiet; caller can toast
        });
    },
    [generateReport, dateRange]
  );

  const handleScheduleReport = useCallback(() => {
    setScheduleOpen(true);
  }, []);

  const handleScheduleSubmit = useCallback(
    async (input: Parameters<typeof createScheduledReport.mutateAsync>[0]) => {
      await createScheduledReport.mutateAsync(input);
    },
    [createScheduledReport]
  );

  // Get active filter badges
  const activeFilterBadges = useMemo(() => {
    const badges: AnalyticsFilterBadge[] = [];

    if (search.range !== '30') {
      const rangeLabel = RANGE_OPTIONS.find((r) => r.value === search.range)?.label || search.range;
      badges.push({ key: 'range', label: rangeLabel });
    }

    if (search.warrantyType !== 'all') {
      const typeLabel =
        WARRANTY_TYPE_OPTIONS.find((t) => t.value === search.warrantyType)?.label ||
        search.warrantyType;
      badges.push({ key: 'warrantyType', label: typeLabel });
    }

    if (search.claimType !== 'all') {
      const typeLabel =
        CLAIM_TYPE_OPTIONS.find((t) => t.value === search.claimType)?.label || search.claimType;
      badges.push({ key: 'claimType', label: typeLabel });
    }

    return badges;
  }, [search]);

  return (
    <WarrantyAnalyticsView
      search={search}
      mobileFilters={mobileFilters}
      rangeOptions={RANGE_OPTIONS}
      warrantyTypeOptions={WARRANTY_TYPE_OPTIONS}
      claimTypeOptions={CLAIM_TYPE_OPTIONS}
      hasActiveFilters={hasActiveFilters}
      activeFilterBadges={activeFilterBadges}
      dashboard={dashboard}
      isExporting={exportMutation.isPending}
      scheduleOpen={scheduleOpen}
      isScheduleSubmitting={createScheduledReport.isPending}
      onUpdateSearch={updateSearch}
      onMobileFilterChange={handleMobileFilterChange}
      onResetMobileFilters={handleResetMobileFilters}
      onApplyMobileFilters={applyMobileFilters}
      onClearAllFilters={clearAllFilters}
      onExport={handleExport}
      onExportFile={handleExportFile}
      onOpenSchedule={handleScheduleReport}
      onScheduleOpenChange={setScheduleOpen}
      onScheduleSubmit={handleScheduleSubmit}
    />
  );
}

function getExportRange(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return { dateFrom: startDate, dateTo: endDate };
  }
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 1);
  return {
    dateFrom: start.toISOString().split('T')[0],
    dateTo: end.toISOString().split('T')[0],
  };
}
