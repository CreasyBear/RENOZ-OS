/**
 * WinLossAnalysis Component
 *
 * Dashboard for analyzing win/loss patterns and trends.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { memo, useState, useMemo, useCallback } from "react";
import {
  Trophy,
  XCircle,
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  Download,
  Mail,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useWinLossAnalysis, useCompetitors } from "@/hooks/reports";
import { useCreateScheduledReport, useGenerateReport } from "@/hooks/reports";
import { ScheduledReportForm } from "@/components/domain/settings/scheduled-report-form";
import type { Button } from "react-day-picker";

// ============================================================================
// TYPES
// ============================================================================

export interface WinLossAnalysisProps {
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(period: string): { dateFrom: Date; dateTo: Date } {
  const dateTo = new Date();
  const dateFrom = new Date();

  switch (period) {
    case "30d":
      dateFrom.setDate(dateFrom.getDate() - 30);
      break;
    case "90d":
      dateFrom.setDate(dateFrom.getDate() - 90);
      break;
    case "6m":
      dateFrom.setMonth(dateFrom.getMonth() - 6);
      break;
    case "1y":
      dateFrom.setFullYear(dateFrom.getFullYear() - 1);
      break;
    case "all":
    default:
      dateFrom.setFullYear(2020, 0, 1);
      break;
  }

  return { dateFrom, dateTo };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WinLossAnalysis = memo(function WinLossAnalysis({
  className,
}: WinLossAnalysisProps) {
  const [period, setPeriod] = useState("90d");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { dateFrom, dateTo } = useMemo(() => getDateRange(period), [period]);

  // Fetch analysis data
  const analysisQuery = useWinLossAnalysis({ dateFrom, dateTo });

  // Fetch competitors
  const competitorsQuery = useCompetitors({ dateFrom, dateTo });

  const analysis = analysisQuery.data;
  const competitors = competitorsQuery.data?.competitors ?? [];
  const isLoading = analysisQuery.isLoading;
  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  const handleExport = useCallback(
    (format: "pdf" | "excel") => {
      const reportFormat = format === "excel" ? "xlsx" : "pdf";
      generateReport
        .mutateAsync({
          metrics: ["win_rate", "won_revenue", "lost_revenue"],
          dateFrom: dateFrom.toISOString().split("T")[0],
          dateTo: dateTo.toISOString().split("T")[0],
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
    [generateReport, dateFrom, dateTo]
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
    value: string | number,
    icon: React.ReactNode,
    description?: string,
    trend?: "up" | "down" | "neutral"
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
          {trend && trend !== "neutral" && (
            <span
              className={cn(
                "text-sm",
                trend === "up" ? "text-green-600" : "text-red-600"
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
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
    <div className={cn("space-y-6", className)}>
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Win/Loss Analysis</h2>
          <p className="text-muted-foreground">
            Analyze patterns and trends in won and lost opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard(
            "Win Rate",
            `${analysis?.summary.overallWinRate ?? 0}%`,
            <Trophy className="h-4 w-4 text-green-600" />,
            `${analysis?.summary.totalWon ?? 0} won of ${
              (analysis?.summary.totalWon ?? 0) + (analysis?.summary.totalLost ?? 0)
            } closed`
          )}
          {renderMetricCard(
            "Won Revenue",
            formatCurrency(analysis?.summary.totalWonValue ?? 0),
            <TrendingUp className="h-4 w-4 text-green-600" />,
            `${analysis?.summary.totalWon ?? 0} opportunities`
          )}
          {renderMetricCard(
            "Lost Revenue",
            formatCurrency(analysis?.summary.totalLostValue ?? 0),
            <TrendingDown className="h-4 w-4 text-red-600" />,
            `${analysis?.summary.totalLost ?? 0} opportunities`
          )}
          {renderMetricCard(
            "Top Competitor",
            competitors[0]?.name ?? "N/A",
            <Building2 className="h-4 w-4 text-muted-foreground" />,
            competitors[0]
              ? `${competitors[0].lossCount} losses`
              : "No competitor data"
          )}
        </div>
      )}

      {/* Tabs for detailed analysis */}
      <Tabs defaultValue="reasons">
        <TabsList>
          <TabsTrigger value="reasons">By Reason</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
        </TabsList>

        <TabsContent value="reasons" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600" />
                  Win Reasons
                </CardTitle>
                <CardDescription>Why customers chose us</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : analysis?.wins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No win data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysis?.wins.map((reason) => {
                      const percentage =
                        analysis.summary.totalWon > 0
                          ? Math.round((reason.count / analysis.summary.totalWon) * 100)
                          : 0;
                      return (
                        <div key={reason.reasonId ?? reason.reasonName} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{reason.reasonName}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{reason.count}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(reason.totalValue)}
                              </span>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loss reasons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Loss Reasons
                </CardTitle>
                <CardDescription>Why we lost opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : analysis?.losses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No loss data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysis?.losses.map((reason) => {
                      const percentage =
                        analysis.summary.totalLost > 0
                          ? Math.round((reason.count / analysis.summary.totalLost) * 100)
                          : 0;
                      return (
                        <div key={reason.reasonId ?? reason.reasonName} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{reason.reasonName}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">{reason.count}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(reason.totalValue)}
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-2 [&>div]:bg-red-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Trends
              </CardTitle>
              <CardDescription>Win/loss patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : analysis?.trends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trend data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Won</TableHead>
                      <TableHead className="text-right">Lost</TableHead>
                      <TableHead className="text-right">Win Rate</TableHead>
                      <TableHead className="text-right">Won Value</TableHead>
                      <TableHead className="text-right">Lost Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis?.trends.map((trend) => (
                      <TableRow key={trend.month}>
                        <TableCell className="font-medium">{trend.month}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {trend.wonCount}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {trend.lostCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              trend.winRate >= 50
                                ? "default"
                                : trend.winRate >= 30
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {trend.winRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(trend.wonValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(trend.lostValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Competitor Analysis
              </CardTitle>
              <CardDescription>
                Competitors mentioned in lost opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {competitorsQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : competitors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No competitor data available
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competitor</TableHead>
                      <TableHead className="text-right">Losses</TableHead>
                      <TableHead className="text-right">Lost Value</TableHead>
                      <TableHead className="text-right">Avg Deal Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitors.map((competitor) => (
                      <TableRow key={competitor.name}>
                        <TableCell className="font-medium">
                          {competitor.name}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {competitor.lossCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(competitor.totalLostValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            competitor.lossCount > 0
                              ? Math.round(competitor.totalLostValue / competitor.lossCount)
                              : 0
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: "Win/Loss Report",
          description: "Recurring win/loss summary and competitor insights",
          metrics: {
            metrics: ["win_rate", "won_revenue", "lost_revenue"],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: "previous_period",
          },
        }}
      />
    </div>
  );
});

export default WinLossAnalysis;
