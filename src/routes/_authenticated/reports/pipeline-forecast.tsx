/**
 * Pipeline Forecast Report Page
 *
 * Sales forecasting dashboard with multiple views, charts, and analytics.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-FORECASTING-UI)
 */

import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Users,
  Building2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/layout/page-layout";
import { ForecastChart } from "@/components/domain/reports/forecast-chart";
import { ForecastTable } from "@/components/domain/reports/forecast-table";
import { cn } from "@/lib/utils";
import { FormatAmount } from "@/components/shared/format";
import {
  getPipelineForecast,
  getPipelineVelocity,
  getRevenueAttribution,
} from "@/server/functions/pipeline";
import type { ForecastGroupBy } from "@/lib/schemas/pipeline";

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute("/_authenticated/reports/pipeline-forecast")({
  component: PipelineForecastPage,
});

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(period: string): { startDate: Date; endDate: Date } {
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
    case "this-quarter":
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate.setMonth(quarterStart, 1);
      endDate.setMonth(quarterStart + 3, 0);
      break;
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

  return { startDate, endDate };
}

// ============================================================================
// COMPONENT
// ============================================================================

function PipelineForecastPage() {
  // State
  const [timePeriod, setTimePeriod] = useState("next-12-months");
  const [groupBy, setGroupBy] = useState<ForecastGroupBy>("month");
  const [showWeighted, setShowWeighted] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate date range from selection
  const { startDate, endDate } = useMemo(
    () => getDateRange(timePeriod),
    [timePeriod]
  );

  // Fetch forecast data
  const forecastQuery = useQuery({
    queryKey: ["pipeline-forecast", startDate.toISOString(), endDate.toISOString(), groupBy],
    queryFn: async () => {
      const result = await getPipelineForecast({
        data: {
          startDate,
          endDate,
          groupBy,
          includeWeighted: true,
        },
      });
      return result;
    },
  });

  // Fetch velocity metrics
  const velocityQuery = useQuery({
    queryKey: ["pipeline-velocity", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const result = await getPipelineVelocity({
        data: {
          dateFrom: startDate,
          dateTo: endDate,
        },
      });
      return result;
    },
  });

  // Fetch revenue attribution
  const attributionQuery = useQuery({
    queryKey: ["revenue-attribution", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const result = await getRevenueAttribution({
        data: {
          dateFrom: startDate,
          dateTo: endDate,
          groupBy: "month",
        },
      });
      return result;
    },
  });

  const isLoading = forecastQuery.isLoading || velocityQuery.isLoading;
  const forecast = forecastQuery.data;
  const velocity = velocityQuery.data;

  // Render metric card
  const renderMetricCard = (
    title: string,
    value: string,
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
    <PageLayout>
      <PageLayout.Header
        title="Pipeline Forecast"
        description="Sales forecasting and analytics dashboard"
        actions={
          <div className="flex items-center gap-4">
          {/* Time period selector */}
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="next-3-months">Next 3 Months</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="next-12-months">Next 12 Months</SelectItem>
            </SelectContent>
          </Select>

          {/* Group by selector */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as ForecastGroupBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">By Week</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="quarter">By Quarter</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              forecastQuery.refetch();
              velocityQuery.refetch();
              attributionQuery.refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          </div>
        }
      />

      <PageLayout.Content>
        <div className="space-y-6">
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
                  <FormatAmount amount={forecast?.summary.totalValue ?? 0} /> as any,
                  undefined,
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />,
                  `${forecast?.summary.opportunityCount ?? 0} opportunities`
                )}
                {renderMetricCard(
                  "Weighted Forecast",
                  <FormatAmount amount={forecast?.summary.weightedValue ?? 0} /> as any,
                  undefined,
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />,
                  "Probability-weighted value"
                )}
                {renderMetricCard(
                  "Avg Deal Size",
                  <FormatAmount amount={velocity?.avgDealSize ?? 0} /> as any,
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

          {/* Weighted toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-weighted"
              checked={showWeighted}
              onCheckedChange={setShowWeighted}
            />
            <Label htmlFor="show-weighted">Show weighted values</Label>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      {attributionQuery.data.data.map((item) => (
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
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
