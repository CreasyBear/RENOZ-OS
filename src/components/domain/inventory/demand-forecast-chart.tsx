/**
 * Forecast Chart Component
 *
 * Visualizes demand forecasts over time with actual vs predicted comparison.
 *
 * Features:
 * - Line/bar chart display
 * - Actual vs forecast comparison
 * - Period selection (daily, weekly, monthly)
 *
 * Accessibility:
 * - Chart data available in table format
 * - Distinct colors with patterns
 */
import { memo, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, LineChart, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// TYPES
// ============================================================================

export type ForecastPeriod = 'daily' | 'weekly' | 'monthly';

export interface ForecastDataPoint {
  date: string;
  period: ForecastPeriod;
  forecastQuantity: number;
  actualQuantity?: number | null;
  confidence?: number;
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  bias: number; // Forecast bias
  accuracy: number; // 100 - MAPE
  trend: 'improving' | 'declining' | 'stable';
}

interface DemandForecastChartProps {
  /** From route container (selected product). */
  productName: string;
  /** From route container (forecast query). */
  data: ForecastDataPoint[];
  /** From route container (accuracy query). */
  accuracy?: ForecastAccuracy | null;
  /** From route container (forecast period state). */
  period: ForecastPeriod;
  /** From route container (period change handler). */
  onPeriodChange?: (period: ForecastPeriod) => void;
  /** From route container (forecast loading). */
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DemandForecastChart = memo(function DemandForecastChart({
  productName,
  data,
  accuracy,
  period,
  onPeriodChange,
  isLoading,
  className,
}: DemandForecastChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
        })}`;
      case 'monthly':
        return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
    }
  };

  const formatNumber = (value: number) => value.toLocaleString();

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Calculate max for chart scaling
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.forecastQuantity, d.actualQuantity ?? 0)),
    1
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Demand Forecast</CardTitle>
          <CardDescription>{productName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <BarChart3 className="text-muted-foreground/50 mx-auto h-12 w-12" />
            <p className="text-muted-foreground mt-4 text-sm">No forecast data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Demand Forecast</CardTitle>
            <CardDescription>{productName}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Period Selector */}
            {onPeriodChange && (
              <Select value={period} onValueChange={(v) => onPeriodChange(v as ForecastPeriod)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border">
              <Button
                variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('chart')}
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('table')}
              >
                <LineChart className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Accuracy Metrics */}
        {accuracy && (
          <div className="mt-4 flex items-center gap-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Accuracy:</span>
              <Badge
                variant="outline"
                className={cn(
                  'tabular-nums',
                  accuracy.accuracy >= 90 && 'bg-green-50 text-green-600',
                  accuracy.accuracy >= 70 &&
                    accuracy.accuracy < 90 &&
                    'bg-yellow-50 text-yellow-600',
                  accuracy.accuracy < 70 && 'bg-red-50 text-red-600'
                )}
              >
                {formatPercent(accuracy.accuracy)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Trend:</span>
              {accuracy.trend === 'improving' ? (
                <Badge variant="outline" className="bg-green-50 text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />
                  Improving
                </Badge>
              ) : accuracy.trend === 'declining' ? (
                <Badge variant="outline" className="bg-red-50 text-red-600">
                  <TrendingDown className="mr-1 h-3 w-3" aria-hidden="true" />
                  Declining
                </Badge>
              ) : (
                <Badge variant="outline">Stable</Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {viewMode === 'chart' ? (
          /* Simple bar chart representation */
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span>Forecast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-emerald-500" />
                <span>Actual</span>
              </div>
            </div>

            {/* Chart bars */}
            <div className="space-y-3">
              {data.map((point, i) => {
                const forecastWidth = (point.forecastQuantity / maxValue) * 100;
                const actualWidth = point.actualQuantity
                  ? (point.actualQuantity / maxValue) * 100
                  : 0;
                const variance = point.actualQuantity
                  ? point.actualQuantity - point.forecastQuantity
                  : null;

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground min-w-[100px]">
                        {formatDate(point.date)}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="min-w-[60px] text-right text-blue-600 tabular-nums">
                          {formatNumber(point.forecastQuantity)}
                        </span>
                        {point.actualQuantity !== null && point.actualQuantity !== undefined && (
                          <>
                            <span className="min-w-[60px] text-right text-emerald-600 tabular-nums">
                              {formatNumber(point.actualQuantity)}
                            </span>
                            {variance !== null && (
                              <span
                                className={cn(
                                  'min-w-[50px] text-xs tabular-nums',
                                  variance > 0 && 'text-green-600',
                                  variance < 0 && 'text-red-600',
                                  variance === 0 && 'text-muted-foreground'
                                )}
                              >
                                {variance > 0 ? '+' : ''}
                                {formatNumber(variance)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={forecastWidth} className="h-2 [&>div]:bg-blue-500" />
                      {point.actualQuantity !== null && point.actualQuantity !== undefined && (
                        <Progress value={actualWidth} className="h-2 [&>div]:bg-emerald-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table view */
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((point, i) => {
                  const variance =
                    point.actualQuantity !== null && point.actualQuantity !== undefined
                      ? point.actualQuantity - point.forecastQuantity
                      : null;
                  const pointAccuracy =
                    variance !== null && point.forecastQuantity > 0
                      ? 100 - Math.abs((variance / point.forecastQuantity) * 100)
                      : null;

                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-3 w-3" aria-hidden="true" />
                          {formatDate(point.date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-blue-600 tabular-nums">
                        {formatNumber(point.forecastQuantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {point.actualQuantity !== null && point.actualQuantity !== undefined
                          ? formatNumber(point.actualQuantity)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {variance !== null ? (
                          <span
                            className={cn(
                              'tabular-nums',
                              variance > 0 && 'text-green-600',
                              variance < 0 && 'text-red-600'
                            )}
                          >
                            {variance > 0 ? '+' : ''}
                            {formatNumber(variance)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {pointAccuracy !== null ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'tabular-nums',
                              pointAccuracy >= 90 && 'bg-green-50 text-green-600',
                              pointAccuracy >= 70 &&
                                pointAccuracy < 90 &&
                                'bg-yellow-50 text-yellow-600',
                              pointAccuracy < 70 && 'bg-red-50 text-red-600'
                            )}
                          >
                            {formatPercent(pointAccuracy)}
                          </Badge>
                        ) : (
                          '—'
                        )}
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
  );
});

export default DemandForecastChart;
