/**
 * Comparison Chart Component
 *
 * ARCHITECTURE: Presenter Component - Chart with period comparison overlay.
 *
 * Features:
 * - Chart overlays showing both periods
 * - Dashed lines for comparison period
 * - Tooltips with both period values
 * - Legend with period labels
 * - Export comparison data
 *
 * @see DASH-COMPARISON-UI acceptance criteria
 * @see src/lib/schemas/dashboard/comparison.ts
 */

import { memo, useMemo } from 'react';
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChangeIndicator } from './comparison-indicators';

// ============================================================================
// TYPES
// ============================================================================

export interface ComparisonDataPoint {
  /** Label for X-axis (date, category, etc.) */
  label: string;
  /** Current period value */
  current: number;
  /** Previous/comparison period value */
  previous: number;
  /** Percentage change */
  change?: number;
}

export interface ComparisonChartProps {
  /** Chart data with current and comparison values */
  data: ComparisonDataPoint[];
  /** Chart title */
  title: string;
  /** Chart description */
  description?: string;
  /** Chart type */
  chartType?: 'line' | 'bar';
  /** Current period label */
  currentLabel?: string;
  /** Comparison period label */
  comparisonLabel?: string;
  /** Whether to show percentage change */
  showChange?: boolean;
  /** Value formatter for Y-axis and tooltips */
  valueFormatter?: (value: number) => string;
  /** Whether higher is better for this metric */
  higherIsBetter?: boolean;
  /** @source useCallback handler in container - export chart data */
  onExport?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = {
  current: 'hsl(var(--chart-1))',
  previous: 'hsl(var(--chart-2))',
} as const;

// ============================================================================
// CHART COMPONENTS
// ============================================================================

interface ChartRendererProps {
  data: ComparisonDataPoint[];
  chartType: 'line' | 'bar';
  currentLabel: string;
  comparisonLabel: string;
  valueFormatter: (value: number) => string;
  showChange: boolean;
  higherIsBetter: boolean;
}

const ChartRenderer = memo(function ChartRenderer({
  data,
  chartType,
  currentLabel,
  comparisonLabel,
  valueFormatter,
  showChange,
  higherIsBetter,
}: ChartRendererProps) {
  const chartConfig: ChartConfig = useMemo(
    () => ({
      current: {
        label: currentLabel,
        color: CHART_COLORS.current,
      },
      previous: {
        label: comparisonLabel,
        color: CHART_COLORS.previous,
      },
    }),
    [currentLabel, comparisonLabel]
  );

  const CustomTooltipContent = useMemo(
    () =>
      function TooltipRenderer({
        active,
        payload,
        label,
      }: {
        active?: boolean;
        payload?: Array<{ dataKey: string; value: number; color: string }>;
        label?: string;
      }) {
        if (!active || !payload || !payload.length) return null;

        const currentValue = payload.find((p) => p.dataKey === 'current')?.value ?? 0;
        const previousValue = payload.find((p) => p.dataKey === 'previous')?.value ?? 0;
        const change =
          previousValue === 0
            ? 0
            : ((currentValue - previousValue) / previousValue) * 100;

        return (
          <div className="rounded-lg border bg-background p-2 shadow-sm">
            <div className="font-medium mb-2">{label}</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm" style={{ color: CHART_COLORS.current }}>
                  {currentLabel}:
                </span>
                <span className="font-medium">{valueFormatter(currentValue)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span
                  className="text-sm"
                  style={{ color: CHART_COLORS.previous }}
                >
                  {comparisonLabel}:
                </span>
                <span className="font-medium">{valueFormatter(previousValue)}</span>
              </div>
              {showChange && (
                <div className="flex items-center justify-between gap-4 pt-1 border-t">
                  <span className="text-sm text-muted-foreground">Change:</span>
                  <ChangeIndicator
                    change={change}
                    higherIsBetter={higherIsBetter}
                    variant="badge"
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        );
      },
    [currentLabel, comparisonLabel, valueFormatter, showChange, higherIsBetter]
  );

  if (chartType === 'bar') {
    return (
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              className="text-xs text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
              className="text-xs text-muted-foreground"
            />
            <ChartTooltip content={<CustomTooltipContent />} />
            <Legend />
            <Bar
              dataKey="current"
              name={currentLabel}
              fill={CHART_COLORS.current}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="previous"
              name={comparisonLabel}
              fill={CHART_COLORS.previous}
              radius={[4, 4, 0, 0]}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  // Line chart (default)
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            className="text-xs text-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={valueFormatter}
            className="text-xs text-muted-foreground"
          />
          <ChartTooltip content={<CustomTooltipContent />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="current"
            name={currentLabel}
            stroke={CHART_COLORS.current}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="previous"
            name={comparisonLabel}
            stroke={CHART_COLORS.previous}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            opacity={0.7}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Chart component with period comparison overlay.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks - only local UI state allowed.
 */
export const ComparisonChart = memo(function ComparisonChart({
  data,
  title,
  description,
  chartType = 'line',
  currentLabel = 'Current Period',
  comparisonLabel = 'Previous Period',
  showChange = true,
  valueFormatter = (value) => value.toLocaleString(),
  higherIsBetter = true,
  onExport,
  isLoading = false,
  className,
}: ComparisonChartProps) {
  // Calculate overall change
  const overallChange = useMemo(() => {
    if (data.length === 0) return 0;
    const totalCurrent = data.reduce((sum, d) => sum + d.current, 0);
    const totalPrevious = data.reduce((sum, d) => sum + d.previous, 0);
    return totalPrevious === 0
      ? 0
      : ((totalCurrent - totalPrevious) / totalPrevious) * 100;
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No comparison data available
            </p>
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
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              <ChangeIndicator
                change={overallChange}
                higherIsBetter={higherIsBetter}
                variant="badge"
                size="sm"
              />
            </div>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onExport && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onExport}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Export comparison data</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export comparison data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartRenderer
          data={data}
          chartType={chartType}
          currentLabel={currentLabel}
          comparisonLabel={comparisonLabel}
          valueFormatter={valueFormatter}
          showChange={showChange}
          higherIsBetter={higherIsBetter}
        />

        {/* Summary stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.current }}
              />
              <span className="text-muted-foreground">{currentLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS.previous }}
              />
              <span className="text-muted-foreground">{comparisonLabel}</span>
              <span className="text-xs">(dashed)</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            {data.length} data points
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert raw comparison response to chart data points.
 */
export function toChartDataPoints(
  currentData: Array<{ date: string; value: number }>,
  previousData: Array<{ date: string; value: number }>,
  labelFormatter?: (date: string) => string
): ComparisonDataPoint[] {
  const defaultFormatter = (date: string) => format(new Date(date), 'MMM d');
  const formatter = labelFormatter ?? defaultFormatter;

  // Create a map of previous data by relative index
  const points: ComparisonDataPoint[] = [];

  for (let i = 0; i < currentData.length; i++) {
    const current = currentData[i];
    const previous = previousData[i] ?? { value: 0 };
    const change =
      previous.value === 0
        ? 0
        : ((current.value - previous.value) / previous.value) * 100;

    points.push({
      label: formatter(current.date),
      current: current.value,
      previous: previous.value,
      change,
    });
  }

  return points;
}
