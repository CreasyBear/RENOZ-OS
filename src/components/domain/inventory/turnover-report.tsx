/**
 * Inventory Turnover Report Component
 *
 * Displays inventory turnover metrics and trends.
 *
 * Features:
 * - Overall turnover ratio
 * - Turnover by category
 * - Days of inventory on hand
 * - Turnover trends
 *
 * Accessibility:
 * - Clear metric labels
 * - Color + pattern for trends
 */
import { memo } from "react";
import {
  RefreshCw,
  TrendingUp,
  Clock,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// TYPES
// ============================================================================

export interface TurnoverSummary {
  turnoverRatio: number;
  averageDaysOnHand: number;
  annualizedTurnover: number;
  periodStart: Date;
  periodEnd: Date;
  industryBenchmark?: number;
}

export interface CategoryTurnover {
  categoryId: string;
  categoryName: string;
  turnoverRatio: number;
  daysOnHand: number;
  cogs: number;
  averageInventory: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
}

export interface TurnoverTrend {
  period: string;
  turnoverRatio: number;
  daysOnHand: number;
}

interface TurnoverReportProps {
  summary: TurnoverSummary | null;
  byCategory: CategoryTurnover[];
  trends?: TurnoverTrend[];
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const getTurnoverRating = (ratio: number, benchmark?: number): "excellent" | "good" | "average" | "poor" => {
  const target = benchmark ?? 6; // Default benchmark: 6 turns per year
  if (ratio >= target * 1.2) return "excellent";
  if (ratio >= target) return "good";
  if (ratio >= target * 0.7) return "average";
  return "poor";
};

const RATING_CONFIG = {
  excellent: { label: "Excellent", color: "text-green-600", bgColor: "bg-green-50" },
  good: { label: "Good", color: "text-blue-600", bgColor: "bg-blue-50" },
  average: { label: "Average", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  poor: { label: "Poor", color: "text-red-600", bgColor: "bg-red-50" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TurnoverReport = memo(function TurnoverReport({
  summary,
  byCategory,
  trends = [],
  isLoading,
  className,
}: TurnoverReportProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatRatio = (value: number) => value.toFixed(2);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              No turnover data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rating = getTurnoverRating(summary.turnoverRatio, summary.industryBenchmark);
  const ratingConfig = RATING_CONFIG[rating];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Turnover Ratio
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {formatRatio(summary.turnoverRatio)}x
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={cn(ratingConfig.color, ratingConfig.bgColor)}
              >
                {ratingConfig.label}
              </Badge>
              {summary.industryBenchmark && (
                <span className="text-xs text-muted-foreground">
                  vs {formatRatio(summary.industryBenchmark)}x benchmark
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Days on Hand
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {Math.round(summary.averageDaysOnHand)} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average inventory holding period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Annualized
              </span>
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">
              {formatRatio(summary.annualizedTurnover)}x
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Projected annual turnover
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">
                Analysis Period
              </span>
            </div>
            <div className="text-lg font-medium mt-2">
              {new Intl.DateTimeFormat("en-AU", {
                day: "numeric",
                month: "short",
              }).format(summary.periodStart)}
              {" - "}
              {new Intl.DateTimeFormat("en-AU", {
                day: "numeric",
                month: "short",
              }).format(summary.periodEnd)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnover Trend */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Turnover Trend</CardTitle>
            <CardDescription>
              Historical turnover performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {trends.map((point, i) => {
                const maxRatio = Math.max(...trends.map((t) => t.turnoverRatio));
                const height = (point.turnoverRatio / maxRatio) * 100;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-end justify-center h-24">
                      <div
                        className="w-8 bg-blue-500 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {point.period}
                    </div>
                    <div className="text-xs font-medium tabular-nums">
                      {formatRatio(point.turnoverRatio)}x
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Category */}
      <Card>
        <CardHeader>
          <CardTitle>Turnover by Category</CardTitle>
          <CardDescription>
            Performance breakdown by product category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No category data
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Turnover</TableHead>
                    <TableHead className="text-right">Days on Hand</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Avg Inventory</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCategory.map((cat) => {
                    const catRating = getTurnoverRating(cat.turnoverRatio);
                    const catRatingConfig = RATING_CONFIG[catRating];
                    const TrendIcon =
                      cat.trend === "up"
                        ? ArrowUpRight
                        : cat.trend === "down"
                          ? ArrowDownRight
                          : Minus;

                    return (
                      <TableRow key={cat.categoryId}>
                        <TableCell>
                          <div className="font-medium">{cat.categoryName}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="tabular-nums font-medium">
                              {formatRatio(cat.turnoverRatio)}x
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                catRatingConfig.color,
                                catRatingConfig.bgColor
                              )}
                            >
                              {catRatingConfig.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round(cat.daysOnHand)}d
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(cat.cogs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(cat.averageInventory)}
                        </TableCell>
                        <TableCell>
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              cat.trend === "up" && "text-green-600",
                              cat.trend === "down" && "text-red-600",
                              cat.trend === "stable" && "text-muted-foreground"
                            )}
                          >
                            <TrendIcon className="h-4 w-4" aria-hidden="true" />
                            <span className="text-xs tabular-nums">
                              {cat.trendPercentage > 0 ? "+" : ""}
                              {cat.trendPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default TurnoverReport;
