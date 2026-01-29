/**
 * Warranty Analytics Report Page
 *
 * Comprehensive warranty analytics dashboard with claims breakdown,
 * SLA compliance metrics, trend analysis, and export functionality.
 */
import { useState, useCallback, useMemo } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Download, Filter, X, Calendar, Mail } from 'lucide-react';
import { format, subDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  useWarrantyAnalyticsDashboard,
  useExportWarrantyAnalytics,
  type WarrantyAnalyticsFilter,
} from '@/hooks';
import { useCreateScheduledReport, useGenerateReport } from '@/hooks/reports';
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form';
import {
  SummaryMetricsGrid,
  ClaimsByProductChart,
  ClaimsByTypeChart,
  ClaimsTrendChart,
  SlaComplianceCard,
  CycleCountAnalysisChart,
  RevenueVsCostChart,
  ExtensionTypeChart,
  ResolutionTypeChart,
} from '@/components/domain/support/warranty-analytics-charts';
import { toast } from '@/hooks';
type SearchParams = {
  range: '7' | '30' | '60' | '90' | '365' | 'all';
  warrantyType: 'battery_performance' | 'inverter_manufacturer' | 'installation_workmanship' | 'all';
  claimType:
    | 'cell_degradation'
    | 'bms_fault'
    | 'inverter_failure'
    | 'installation_defect'
    | 'other'
    | 'all';
};

// ============================================================================
// CONSTANTS
// ============================================================================

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

const WARRANTY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Warranty Types' },
  { value: 'battery_performance', label: 'Battery Performance' },
  { value: 'inverter_manufacturer', label: 'Inverter Manufacturer' },
  { value: 'installation_workmanship', label: 'Installation Workmanship' },
];

const CLAIM_TYPE_OPTIONS = [
  { value: 'all', label: 'All Claim Types' },
  { value: 'cell_degradation', label: 'Cell Degradation' },
  { value: 'bms_fault', label: 'BMS Fault' },
  { value: 'inverter_failure', label: 'Inverter Failure' },
  { value: 'installation_defect', label: 'Installation Defect' },
  { value: 'other', label: 'Other' },
];

/**
 * Warranty analytics container.
 * @source hooks/useWarrantyAnalyticsDashboard, useExportWarrantyAnalytics
 */
export function WarrantyAnalyticsPage() {
  const search = useSearch({ from: '/_authenticated/reports/warranties' });
  const navigate = useNavigate({ from: '/reports/warranties' });

  // Local filter state for mobile sheet
  const [mobileFilters, setMobileFilters] = useState<SearchParams>(search);
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
    warrantyType: search.warrantyType as WarrantyAnalyticsFilter['warrantyType'],
    claimType: search.claimType as WarrantyAnalyticsFilter['claimType'],
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
    (updates: Partial<SearchParams>) => {
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

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    navigate({
      search: {
        range: '30',
        warrantyType: 'all',
        claimType: 'all',
      },
    });
    setMobileFilters({
      range: '30',
      warrantyType: 'all',
      claimType: 'all',
    });
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
        warrantyType: search.warrantyType as WarrantyAnalyticsFilter['warrantyType'],
        claimType: search.claimType as WarrantyAnalyticsFilter['claimType'],
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
    const badges: { key: string; label: string }[] = [];

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
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Warranty Analytics Report
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>Export JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportFile('pdf')}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportFile('excel')}>Export Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleScheduleReport}>
            <Mail className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Filter Bar - Desktop */}
        <div className="mb-6 hidden items-center gap-4 md:flex">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <Select
              value={search.range}
              onValueChange={(value) => updateSearch({ range: value as SearchParams['range'] })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warranty Type */}
          <Select
            value={search.warrantyType}
            onValueChange={(value) =>
              updateSearch({ warrantyType: value as SearchParams['warrantyType'] })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Warranty type" />
            </SelectTrigger>
            <SelectContent>
              {WARRANTY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Claim Type */}
          <Select
            value={search.claimType}
            onValueChange={(value) =>
              updateSearch({ claimType: value as SearchParams['claimType'] })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Claim type" />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Filter Bar - Mobile */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterBadges.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Filter warranty analytics data</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select
                    value={mobileFilters.range}
                    onValueChange={(value) =>
                      setMobileFilters((prev) => ({
                        ...prev,
                        range: value as SearchParams['range'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Warranty Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Warranty Type</label>
                  <Select
                    value={mobileFilters.warrantyType}
                    onValueChange={(value) =>
                      setMobileFilters((prev) => ({
                        ...prev,
                        warrantyType: value as SearchParams['warrantyType'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WARRANTY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Claim Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Claim Type</label>
                  <Select
                    value={mobileFilters.claimType}
                    onValueChange={(value) =>
                      setMobileFilters((prev) => ({
                        ...prev,
                        claimType: value as SearchParams['claimType'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAIM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter className="flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileFilters({ range: '30', warrantyType: 'all', claimType: 'all' });
                  }}
                  className="flex-1"
                >
                  Clear All
                </Button>
                <SheetClose asChild>
                  <Button onClick={applyMobileFilters} className="flex-1">
                    Apply Filters
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Export button - Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exportMutation.isPending}>
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>Export JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportFile('pdf')}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportFile('excel')}>Export Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Filter Badges */}
        {activeFilterBadges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeFilterBadges.map((badge) => (
              <Badge key={badge.key} variant="secondary" className="gap-1">
                {badge.label}
                <button
                  onClick={() => {
                    if (badge.key === 'range') updateSearch({ range: '30' });
                    else if (badge.key === 'warrantyType') updateSearch({ warrantyType: 'all' });
                    else if (badge.key === 'claimType') updateSearch({ claimType: 'all' });
                  }}
                  className="hover:text-destructive ml-1"
                  aria-label={`Remove ${badge.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Summary Metrics */}
        <section aria-labelledby="summary-heading" className="mb-8">
          <h2 id="summary-heading" className="sr-only">
            Summary Metrics
          </h2>
          <SummaryMetricsGrid
            data={dashboard.summary}
            isLoading={dashboard.queries.summary.isLoading}
            isError={dashboard.queries.summary.isError}
          />
        </section>

        {/* Charts Grid */}
        <div className="space-y-6">
          {/* Row 1: Claims by Product + Claims by Type */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ClaimsByProductChart
              data={dashboard.claimsByProduct}
              isLoading={dashboard.queries.claimsByProduct.isLoading}
              isError={dashboard.queries.claimsByProduct.isError}
              onRetry={() => dashboard.queries.claimsByProduct.refetch()}
            />
            <ClaimsByTypeChart
              data={dashboard.claimsByType}
              isLoading={dashboard.queries.claimsByType.isLoading}
              isError={dashboard.queries.claimsByType.isError}
              onRetry={() => dashboard.queries.claimsByType.refetch()}
            />
          </div>

          {/* Row 2: Claims Trend */}
          <ClaimsTrendChart
            data={dashboard.claimsTrend}
            isLoading={dashboard.queries.claimsTrend.isLoading}
            isError={dashboard.queries.claimsTrend.isError}
            onRetry={() => dashboard.queries.claimsTrend.refetch()}
          />

          {/* Row 3: SLA Compliance + Cycle Count */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SlaComplianceCard
              data={dashboard.slaCompliance}
              isLoading={dashboard.queries.slaCompliance.isLoading}
              isError={dashboard.queries.slaCompliance.isError}
              onRetry={() => dashboard.queries.slaCompliance.refetch()}
            />
            <CycleCountAnalysisChart
              data={dashboard.cycleCount}
              isLoading={dashboard.queries.cycleCount.isLoading}
              isError={dashboard.queries.cycleCount.isError}
              onRetry={() => dashboard.queries.cycleCount.refetch()}
            />
          </div>

          {/* Row 4: Revenue vs Cost */}
          <RevenueVsCostChart
            data={dashboard.extensionVsResolution}
            isLoading={dashboard.queries.extensionVsResolution.isLoading}
            isError={dashboard.queries.extensionVsResolution.isError}
            onRetry={() => dashboard.queries.extensionVsResolution.refetch()}
          />

          {/* Row 5: Extension Types + Resolution Types */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ExtensionTypeChart
              data={dashboard.extensionVsResolution}
              isLoading={dashboard.queries.extensionVsResolution.isLoading}
              isError={dashboard.queries.extensionVsResolution.isError}
              onRetry={() => dashboard.queries.extensionVsResolution.refetch()}
            />
            <ResolutionTypeChart
              data={dashboard.extensionVsResolution}
              isLoading={dashboard.queries.extensionVsResolution.isLoading}
              isError={dashboard.queries.extensionVsResolution.isError}
              onRetry={() => dashboard.queries.extensionVsResolution.refetch()}
            />
          </div>
        </div>
      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: 'Warranty Analytics Report',
          description: 'Recurring warranty claims and SLA performance report',
          metrics: {
            metrics: ['warranty_count', 'claim_count', 'sla_compliance'],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: 'previous_period',
          },
        }}
      />
    </>
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
