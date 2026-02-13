/**
 * Pipeline Forecast Report Page
 *
 * Sales forecasting dashboard with multiple views, charts, and analytics.
 */
import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  TrendingUp,
  Users,
  Building2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ForecastChart } from "@/components/domain/reports/forecast-chart";
import { ForecastTable } from "@/components/domain/reports/forecast-table";
import {
  DomainFilterBar,
  type FilterBarConfig,
} from "@/components/shared/filters";
import { cn } from "@/lib/utils";
import { FormatAmount } from "@/components/shared/format";
import { ScheduledReportForm } from "@/components/domain/settings/scheduled-report-form";
import { ReportFavoriteButton } from "./report-favorite-button";
import { useCreateScheduledReport, useGenerateReport } from "@/hooks/reports";
import { useFilterUrlState, type NavigateFn } from "@/hooks/filters";
import {
  usePipelineForecast,
  usePipelineVelocity,
  useRevenueAttribution,
} from "@/hooks/pipeline";
import type { ForecastGroupBy } from "@/lib/schemas/pipeline";
import type { PipelineForecastSearch } from "@/lib/schemas/reports/pipeline-forecast";

type PipelineForecastFilterState = Pick<
  PipelineForecastSearch,
  "period" | "groupBy" | "showWeighted"
>;

const PIPELINE_FORECAST_DEFAULTS: PipelineForecastSearch = {
  period: "next-12-months",
  groupBy: "month",
  showWeighted: true,
  tab: "overview",
};

const PIPELINE_FORECAST_FILTER_DEFAULTS: PipelineForecastFilterState = {
  period: PIPELINE_FORECAST_DEFAULTS.period,
  groupBy: PIPELINE_FORECAST_DEFAULTS.groupBy,
  showWeighted: PIPELINE_FORECAST_DEFAULTS.showWeighted,
};

const PERIOD_LABELS: Record<PipelineForecastSearch["period"], string> = {
  "this-month": "This Month",
  "next-3-months": "Next 3 Months",
  "this-quarter": "This Quarter",
  "this-year": "This Year",
  "next-12-months": "Next 12 Months",
};

const GROUP_BY_LABELS: Record<PipelineForecastSearch["groupBy"], string> = {
  week: "By Week",
  month: "By Month",
  quarter: "By Quarter",
};

const PIPELINE_FORECAST_FILTER_CONFIG: FilterBarConfig<PipelineForecastFilterState> =
  {
    filters: [
      {
        key: "period",
        label: "Period",
        type: "select",
        primary: true,
        options: Object.entries(PERIOD_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        formatChip: (value) =>
          value === PIPELINE_FORECAST_DEFAULTS.period
            ? ""
            : PERIOD_LABELS[value as PipelineForecastSearch["period"]] ??
              String(value),
      },
      {
        key: "groupBy",
        label: "Group by",
        type: "select",
        primary: true,
        options: Object.entries(GROUP_BY_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        formatChip: (value) =>
          value === PIPELINE_FORECAST_DEFAULTS.groupBy
            ? ""
            : GROUP_BY_LABELS[value as PipelineForecastSearch["groupBy"]] ??
              String(value),
      },
      {
        key: "showWeighted",
        label: "Weighted",
        type: "toggle",
        primary: true,
        formatChip: (value) =>
          value === PIPELINE_FORECAST_DEFAULTS.showWeighted
            ? ""
            : value
              ? "On"
              : "Off",
      },
    ],
    labels: {
      period: "Period",
      groupBy: "Group by",
      showWeighted: "Weighted",
    },
  };

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a Date to YYYY-MM-DD string for API calls.
 */
function formatDateToYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case "this-month":
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      break;
    case "next-3-months":
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 3, 0);
      break;
    case "this-quarter": {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate.setMonth(quarterStart, 1);
      endDate.setMonth(quarterStart + 3, 0);
      break;
    }
    case "this-year":
      startDate.setMonth(0, 1);
      endDate.setMonth(11, 31);
      break;
    case "next-12-months":
    default:
      startDate.setDate(1);
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  // Return YYYY-MM-DD strings for API compatibility
  return { startDate: formatDateToYMD(startDate), endDate: formatDateToYMD(endDate) };
}

/**
 * Pipeline forecast container.
 * @source hooks/usePipelineForecast, usePipelineVelocity, useRevenueAttribution
 */
export function PipelineForecastPage() {
  const search = useSearch({
    from: "/_authenticated/reports/pipeline-forecast",
  }) as PipelineForecastSearch;
  const navigate = useNavigate();
  const navigateFn = useCallback<NavigateFn>(
    ({ to, search: nextSearch }) =>
      navigate({ to, search: () => nextSearch }),
    [navigate]
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { filters, setFilters } = useFilterUrlState<PipelineForecastSearch>({
    currentSearch: search,
    navigate: navigateFn,
    defaults: PIPELINE_FORECAST_DEFAULTS,
  });

  const timePeriod = filters.period;
  const groupBy = filters.groupBy as ForecastGroupBy;
  const showWeighted = filters.showWeighted;
  const activeTab = filters.tab;

  const filterBarFilters: PipelineForecastFilterState = {
    period: timePeriod,
    groupBy: filters.groupBy,
    showWeighted: showWeighted,
  };

  const hasActiveFilterBarFilters =
    filterBarFilters.period !== PIPELINE_FORECAST_FILTER_DEFAULTS.period ||
    filterBarFilters.groupBy !== PIPELINE_FORECAST_FILTER_DEFAULTS.groupBy ||
    filterBarFilters.showWeighted !==
      PIPELINE_FORECAST_FILTER_DEFAULTS.showWeighted;

  const handleFilterBarChange = useCallback(
    (nextFilters: PipelineForecastFilterState) => {
      setFilters(nextFilters);
    },
    [setFilters]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      setFilters({ tab: value as PipelineForecastSearch["tab"] });
    },
    [setFilters]
  );

  // Calculate date range from selection
  const { startDate, endDate } = useMemo(
    () => getDateRange(timePeriod),
    [timePeriod]
  );

  // Fetch forecast data using centralized hook
  const forecastQuery = usePipelineForecast({
    startDate,
    endDate,
    groupBy,
    includeWeighted: true,
  });

  // Fetch velocity metrics using centralized hook
  const velocityQuery = usePipelineVelocity({
    dateFrom: startDate,
    dateTo: endDate,
  });

  // Fetch revenue attribution using centralized hook
  const attributionQuery = useRevenueAttribution({
    dateFrom: startDate,
    dateTo: endDate,
    groupBy: "month",
  });

  const isLoading = forecastQuery.isLoading || velocityQuery.isLoading;
  const forecast = forecastQuery.data;
  const velocity = velocityQuery.data;
  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  const handleExport = useCallback(
    (format: "csv" | "pdf" | "excel") => {
      const reportFormat = format === "excel" ? "xlsx" : "pdf";
      generateReport
        .mutateAsync({
          metrics: ["pipeline_value", "forecasted_revenue", "win_rate"],
          dateFrom: startDate,
          dateTo: endDate,
          format: reportFormat,
          includeCharts: true,
          includeTrends: true,
        })
        .then((result) => {
          window.open(result.reportUrl, "_blank", "noopener,noreferrer");
        })
        .catch(() => {
          // keep UI quiet; caller can toast
        });
    },
    [generateReport, startDate, endDate]
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

  // Render metric card
  const renderMetricCard = (
    title: string,
    value: ReactNode,
    change?: number,
    icon?: React.ReactNode,
    description?: string
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {change !== undefined && change !== 0 && (
            <span
              className={cn(
                "flex items-center text-sm",
                change > 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="space-y-4">
        <DomainFilterBar
          config={PIPELINE_FORECAST_FILTER_CONFIG}
          filters={filterBarFilters}
          onFiltersChange={handleFilterBarChange}
          defaultFilters={PIPELINE_FORECAST_FILTER_DEFAULTS}
          showResultCount={false}
          showPresets={false}
          showChips={hasActiveFilterBarFilters}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Filters sync to the URL for shareable views.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFilterBarChange(PIPELINE_FORECAST_FILTER_DEFAULTS)}
            disabled={!hasActiveFilterBarFilters}
            className="h-7 px-2 text-xs"
          >
            Reset filters
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              forecastQuery.refetch();
              velocityQuery.refetch();
              attributionQuery.refetch();
            }}
            disabled={isLoading}
            aria-label="Refresh forecast data"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <DropdownMenu>
            <ReportFavoriteButton reportType="pipeline-forecast" />
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleScheduleReport}>
            <Mail className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {renderMetricCard(
              "Total Pipeline",
              <FormatAmount amount={forecast?.summary.totalValue ?? 0} />,
              undefined,
              <BarChart3 className="h-4 w-4 text-muted-foreground" />,
              `${forecast?.summary.opportunityCount ?? 0} opportunities`
            )}
            {renderMetricCard(
              "Weighted Forecast",
              <FormatAmount amount={forecast?.summary.weightedValue ?? 0} />,
              undefined,
              <TrendingUp className="h-4 w-4 text-muted-foreground" />,
              "Probability-weighted value"
            )}
            {renderMetricCard(
              "Avg Deal Size",
              <FormatAmount amount={velocity?.avgDealSize ?? 0} />,
              undefined,
              <Building2 className="h-4 w-4 text-muted-foreground" />,
              "Based on won deals"
            )}
            {renderMetricCard(
              "Win Rate",
              `${velocity?.winRate ?? 0}%`,
              undefined,
              <Users className="h-4 w-4 text-muted-foreground" />,
              `${velocity?.avgSalesCycle ?? 0} day avg cycle`
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-period">By Period</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Chart */}
          <ForecastChart
            data={forecast?.forecast ?? []}
            showWeighted={showWeighted}
            showWonLost={true}
            title="Pipeline Forecast"
          />

          {/* Table */}
          <ForecastTable
            data={forecast?.forecast ?? []}
            showWeighted={showWeighted}
            title="Forecast by Period"
            description={`${groupBy === "month" ? "Monthly" : groupBy === "quarter" ? "Quarterly" : "Weekly"} breakdown`}
          />
        </TabsContent>

        <TabsContent value="by-period" className="space-y-6 mt-6">
          <ForecastTable
            data={forecast?.forecast ?? []}
            showWeighted={showWeighted}
            title="Detailed Forecast"
          />
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6 mt-6">
          {velocityQuery.isLoading ? (
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ) : velocity ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Average Deal Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    <FormatAmount amount={velocity.avgDealSize} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on won opportunities
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sales Cycle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {velocity.avgSalesCycle} days
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Average time to close
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pipeline Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    <FormatAmount amount={velocity.pipelineVelocity} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Won value per day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {velocity.winRate}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Of closed opportunities
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loss Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {velocity.lossRate}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Of closed opportunities
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Time in Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(velocity.avgTimeInStage).map(([stage, days]) => (
                      <div key={stage} className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {stage}
                        </Badge>
                        <span className="text-sm font-medium">{days} days</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No velocity data available.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6 mt-6">
          {attributionQuery.isLoading ? (
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ) : attributionQuery.data ? (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Attribution by Month</CardTitle>
                <CardDescription>
                  Won and lost deals by close date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attributionQuery.data.items.map((item) => (
                    <div
                      key={item.group}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div>
                        <div className="font-medium">{item.group}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.wonCount} won, {item.lostCount} lost
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          <FormatAmount amount={item.wonValue} />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.conversionRate}% win rate
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="flex items-center justify-between pt-4 border-t font-semibold">
                    <div>Total</div>
                    <div className="text-right">
                      <div className="text-green-600">
                        <FormatAmount amount={attributionQuery.data.totals.wonValue} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {attributionQuery.data.totals.conversionRate}% overall
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No attribution data available.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: "Pipeline Forecast Report",
          description: "Recurring pipeline forecast and velocity summary",
          metrics: {
            metrics: ["pipeline_value", "forecasted_revenue", "win_rate"],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: "previous_period",
          },
        }}
      />
    </div>
  );
}
