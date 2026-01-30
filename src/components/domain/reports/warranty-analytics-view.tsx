/**
 * Warranty Analytics View
 *
 * Pure UI component for warranty analytics dashboard.
 */

'use client';

import { Download, Filter, X, Calendar, Mail } from 'lucide-react';
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
import { ScheduledReportForm, type ScheduledReportFormProps } from '@/components/domain/settings/scheduled-report-form';
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
import type { useWarrantyAnalyticsDashboard } from '@/hooks/warranty';

export type SearchParams = {
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

export type WarrantyAnalyticsDashboard = ReturnType<typeof useWarrantyAnalyticsDashboard>;

export type FilterOption<T extends string> = { value: T; label: string };

export type AnalyticsFilterBadge = {
  key: 'range' | 'warrantyType' | 'claimType';
  label: string;
};

export interface WarrantyAnalyticsViewProps {
  search: SearchParams;
  mobileFilters: SearchParams;
  rangeOptions: FilterOption<SearchParams['range']>[];
  warrantyTypeOptions: FilterOption<SearchParams['warrantyType']>[];
  claimTypeOptions: FilterOption<SearchParams['claimType']>[];
  hasActiveFilters: boolean;
  activeFilterBadges: AnalyticsFilterBadge[];
  dashboard: WarrantyAnalyticsDashboard;
  isExporting: boolean;
  scheduleOpen: boolean;
  isScheduleSubmitting: boolean;
  onUpdateSearch: (updates: Partial<SearchParams>) => void;
  onMobileFilterChange: (updates: Partial<SearchParams>) => void;
  onResetMobileFilters: () => void;
  onApplyMobileFilters: () => void;
  onClearAllFilters: () => void;
  onExport: (format: 'csv' | 'json') => void;
  onExportFile: (format: 'pdf' | 'excel') => void;
  onOpenSchedule: () => void;
  onScheduleOpenChange: (open: boolean) => void;
  onScheduleSubmit: ScheduledReportFormProps['onSubmit'];
}

export function WarrantyAnalyticsView({
  search,
  mobileFilters,
  rangeOptions,
  warrantyTypeOptions,
  claimTypeOptions,
  hasActiveFilters,
  activeFilterBadges,
  dashboard,
  isExporting,
  scheduleOpen,
  isScheduleSubmitting,
  onUpdateSearch,
  onMobileFilterChange,
  onResetMobileFilters,
  onApplyMobileFilters,
  onClearAllFilters,
  onExport,
  onExportFile,
  onOpenSchedule,
  onScheduleOpenChange,
  onScheduleSubmit,
}: WarrantyAnalyticsViewProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Warranty Analytics Report</div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('json')}>Export JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportFile('pdf')}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportFile('excel')}>Export Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={onOpenSchedule}>
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
          <Select value={search.range} onValueChange={(value) => onUpdateSearch({ range: value as SearchParams['range'] })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
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
          onValueChange={(value) => onUpdateSearch({ warrantyType: value as SearchParams['warrantyType'] })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Warranty type" />
          </SelectTrigger>
          <SelectContent>
            {warrantyTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Claim Type */}
        <Select
          value={search.claimType}
          onValueChange={(value) => onUpdateSearch({ claimType: value as SearchParams['claimType'] })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Claim type" />
          </SelectTrigger>
          <SelectContent>
            {claimTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAllFilters}>
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
                  onValueChange={(value) => onMobileFilterChange({ range: value as SearchParams['range'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {rangeOptions.map((option) => (
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
                    onMobileFilterChange({ warrantyType: value as SearchParams['warrantyType'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantyTypeOptions.map((option) => (
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
                  onValueChange={(value) => onMobileFilterChange({ claimType: value as SearchParams['claimType'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {claimTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button variant="outline" onClick={onResetMobileFilters} className="flex-1">
                Clear All
              </Button>
              <SheetClose asChild>
                <Button onClick={onApplyMobileFilters} className="flex-1">
                  Apply Filters
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Export button - Mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('csv')}>Export CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>Export JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportFile('pdf')}>Export PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportFile('excel')}>Export Excel</DropdownMenuItem>
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
                  if (badge.key === 'range') onUpdateSearch({ range: '30' });
                  else if (badge.key === 'warrantyType') onUpdateSearch({ warrantyType: 'all' });
                  else if (badge.key === 'claimType') onUpdateSearch({ claimType: 'all' });
                }}
                className="hover:text-destructive ml-1"
                aria-label={`Remove ${badge.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearAllFilters}>
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
        onOpenChange={onScheduleOpenChange}
        onSubmit={onScheduleSubmit}
        isSubmitting={isScheduleSubmitting}
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
