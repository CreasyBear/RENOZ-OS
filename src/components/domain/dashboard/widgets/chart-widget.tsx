/**
 * Chart Widget Component
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays various chart types with interactive features including tooltips,
 * legends, drill-down capability, and comparison data overlay.
 *
 * Features:
 * - Multiple chart types: line, bar, pie, area, stacked-bar, funnel
 * - Interactive tooltips with formatted values
 * - Clickable segments for drill-down navigation
 * - Comparison data overlay (dashed line)
 * - Legend with optional total summary
 * - Full accessibility support (ARIA, sr-only table)
 * - Loading skeleton state
 * - Error state with retry button
 * - Empty state for no data
 *
 * @see _reference/.square-ui-reference/templates/dashboard-4/components/ui/chart.tsx
 */

'use client';

import * as React from 'react';
import { memo, useMemo, useId, useCallback } from 'react';
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ComposedChart,
  Line,
  Area,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChartControls } from '../chart-controls';
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'stacked-bar' | 'funnel';

export interface ChartSegment {
  id: string;
  label: string;
  value: number;
  percentage: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

export interface ChartWidgetProps {
  /** @source Dashboard widget config - unique identifier */
  id: string;
  /** @source Dashboard widget config - chart title */
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** @source Dashboard metrics data - chart data points */
  data: ChartDataPoint[];
  /** @source Dashboard metrics data - comparison period data */
  comparisonData?: ChartDataPoint[];
  /** @source Dashboard widget config - chart type */
  type: ChartType;
  /** @source Dashboard segment click handler - drill-down config */
  drillDownConfig?: {
    enabled: boolean;
    entityType: string;
    filterKey: string;
  };
  /** @source useCallback handler - segment click for drill-down */
  onSegmentClick?: (segment: ChartSegment) => void;
  /** @source Dashboard comparison state */
  showComparison?: boolean;
  comparisonPeriod?: 'last-period' | 'same-period-last-year';
  showLegend?: boolean;
  showTotal?: boolean;
  /** @source Dashboard date filter state */
  dateRange?: { start: Date; end: Date };
  /** @source useCallback handler - date range change */
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  /** @source useCallback handler - comparison toggle */
  onComparisonChange?: (enabled: boolean, period?: 'last-period' | 'same-period-last-year') => void;
  /** @source useCallback handler - export */
  onExport?: (format: 'png' | 'csv') => void;
  /** @source useCallback handler - fullscreen */
  onFullscreen?: () => void;
  /** Value formatter function */
  formatValue?: (value: number) => string;
  /** Chart config for theming */
  chartConfig?: Record<string, { label: string; color: string }>;
  isLoading?: boolean;
  error?: Error | null;
  /** @source useCallback handler - retry on error */
  onRetry?: () => void;
  className?: string;
}

// ============================================================================
// DEFAULT CHART CONFIG
// ============================================================================

const defaultChartConfig: ChartConfig = {
  value: { label: 'Value', color: 'hsl(var(--chart-1))' },
  comparison: { label: 'Comparison', color: 'hsl(var(--chart-2))' },
};

// Chart colors for pie/bar segments
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function ChartWidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-48" />
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

interface ChartWidgetErrorProps {
  error: Error;
  onRetry?: () => void;
  className?: string;
}

function ChartWidgetError({ error, onRetry, className }: ChartWidgetErrorProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{error.message || 'Failed to load chart data'}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function ChartWidgetEmpty({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3
          className="h-12 w-12 text-muted-foreground/50 mb-4"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          No data for this period
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SCREEN READER TABLE COMPONENT
// ============================================================================

interface SRTableProps {
  data: ChartDataPoint[];
  title: string;
  formatValue: (value: number) => string;
}

function ScreenReaderTable({ data, title, formatValue }: SRTableProps) {
  return (
    <table className="sr-only">
      <caption>{title} - Data Table</caption>
      <thead>
        <tr>
          <th scope="col">Label</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {data.map((point, index) => (
          <tr key={index}>
            <td>{point.label}</td>
            <td>{formatValue(point.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================================
// CHART RENDERERS
// ============================================================================

interface ChartRendererProps {
  data: ChartDataPoint[];
  comparisonData?: ChartDataPoint[];
  showComparison?: boolean;
  config: ChartConfig;
  formatValue: (value: number) => string;
  onSegmentClick?: (segment: ChartSegment) => void;
  drillDownEnabled?: boolean;
}

// Merge comparison data into main data
function mergeComparisonData(
  data: ChartDataPoint[],
  comparisonData?: ChartDataPoint[]
): ChartDataPoint[] {
  if (!comparisonData) return data;

  return data.map((point, index) => ({
    ...point,
    comparison: comparisonData[index]?.value ?? 0,
  }));
}

// Line Chart Renderer
const LineChartRenderer = memo(function LineChartRenderer({
  data,
  comparisonData,
  showComparison,
  config,
  formatValue,
}: ChartRendererProps) {
  const mergedData = useMemo(
    () => mergeComparisonData(data, showComparison ? comparisonData : undefined),
    [data, comparisonData, showComparison]
  );

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <LineChart data={mergedData} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatValue}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          cursor={{ strokeDasharray: '3 3' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-value)', r: 4 }}
          activeDot={{ r: 6 }}
        />
        {showComparison && comparisonData && (
          <Line
            type="monotone"
            dataKey="comparison"
            stroke="var(--color-comparison)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: 'var(--color-comparison)', r: 3 }}
          />
        )}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  );
});

// Area Chart Renderer
const AreaChartRenderer = memo(function AreaChartRenderer({
  data,
  comparisonData,
  showComparison,
  config,
  formatValue,
}: ChartRendererProps) {
  const mergedData = useMemo(
    () => mergeComparisonData(data, showComparison ? comparisonData : undefined),
    [data, comparisonData, showComparison]
  );

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <AreaChart data={mergedData} accessibilityLayer>
        <defs>
          <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillComparison" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-comparison)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-comparison)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatValue}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          cursor={{ strokeDasharray: '3 3' }}
        />
        {showComparison && comparisonData && (
          <Area
            type="monotone"
            dataKey="comparison"
            stroke="var(--color-comparison)"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="url(#fillComparison)"
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="url(#fillValue)"
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
});

// Bar Chart Renderer
const BarChartRenderer = memo(function BarChartRenderer({
  data,
  comparisonData,
  showComparison,
  config,
  formatValue,
  onSegmentClick,
  drillDownEnabled,
}: ChartRendererProps) {
  const mergedData = useMemo(
    () => mergeComparisonData(data, showComparison ? comparisonData : undefined),
    [data, comparisonData, showComparison]
  );

  const total = useMemo(
    () => data.reduce((sum, point) => sum + point.value, 0),
    [data]
  );

  const handleBarClick = useCallback(
    (entry: ChartDataPoint, index: number) => {
      if (!drillDownEnabled || !onSegmentClick) return;

      onSegmentClick({
        id: String(index),
        label: entry.label,
        value: entry.value,
        percentage: total > 0 ? (entry.value / total) * 100 : 0,
      });
    },
    [drillDownEnabled, onSegmentClick, total]
  );

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <BarChart data={mergedData} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatValue}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[4, 4, 0, 0]}
          cursor={drillDownEnabled ? 'pointer' : undefined}
          onClick={(_, index) => handleBarClick(mergedData[index], index)}
        />
        {showComparison && comparisonData && (
          <Bar
            dataKey="comparison"
            fill="var(--color-comparison)"
            radius={[4, 4, 0, 0]}
            fillOpacity={0.6}
          />
        )}
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
});

// Stacked Bar Chart Renderer
const StackedBarChartRenderer = memo(function StackedBarChartRenderer({
  data,
  config,
  formatValue,
  onSegmentClick,
  drillDownEnabled,
}: ChartRendererProps) {
  // Get all data keys except 'label'
  const dataKeys = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(key => key !== 'label');
    return keys;
  }, [data]);

  const total = useMemo(
    () => data.reduce((sum, point) => sum + point.value, 0),
    [data]
  );

  const handleBarClick = useCallback(
    (entry: ChartDataPoint, index: number) => {
      if (!drillDownEnabled || !onSegmentClick) return;

      onSegmentClick({
        id: String(index),
        label: entry.label,
        value: entry.value,
        percentage: total > 0 ? (entry.value / total) * 100 : 0,
      });
    },
    [drillDownEnabled, onSegmentClick, total]
  );

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <ComposedChart data={data} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatValue}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
        />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="stack"
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            radius={index === dataKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            cursor={drillDownEnabled ? 'pointer' : undefined}
            onClick={(_, idx) => handleBarClick(data[idx], idx)}
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  );
});

// Pie Chart Renderer
const PieChartRenderer = memo(function PieChartRenderer({
  data,
  config,
  onSegmentClick,
  drillDownEnabled,
}: ChartRendererProps) {
  const total = useMemo(
    () => data.reduce((sum, point) => sum + point.value, 0),
    [data]
  );

  // Transform data for pie chart with colors
  const pieData = useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [data]
  );

  const handlePieClick = useCallback(
    (entry: ChartDataPoint & { fill: string }, index: number) => {
      if (!drillDownEnabled || !onSegmentClick) return;

      onSegmentClick({
        id: String(index),
        label: entry.label,
        value: entry.value,
        percentage: total > 0 ? (entry.value / total) * 100 : 0,
      });
    },
    [drillDownEnabled, onSegmentClick, total]
  );

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="label" />}
        />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          cursor={drillDownEnabled ? 'pointer' : undefined}
          onClick={(_, index) => handlePieClick(pieData[index], index)}
        >
          {pieData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="label" />} />
      </PieChart>
    </ChartContainer>
  );
});

// Funnel Chart Renderer (styled as horizontal bar with decreasing widths)
const FunnelChartRenderer = memo(function FunnelChartRenderer({
  data,
  config,
  onSegmentClick,
  drillDownEnabled,
}: ChartRendererProps) {
  const total = useMemo(
    () => data.reduce((sum, point) => sum + point.value, 0),
    [data]
  );

  // Transform data for funnel with colors
  const funnelData = useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [data]
  );

  const handleFunnelClick = useCallback(
    (data: ChartDataPoint & { fill: string }, index: number) => {
      if (!drillDownEnabled || !onSegmentClick) return;

      onSegmentClick({
        id: String(index),
        label: data.label,
        value: data.value,
        percentage: total > 0 ? (data.value / total) * 100 : 0,
      });
    },
    [drillDownEnabled, onSegmentClick, total]
  );

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <FunnelChart accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
        <Funnel
          dataKey="value"
          data={funnelData}
          isAnimationActive
        >
          {funnelData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
              cursor={drillDownEnabled ? 'pointer' : undefined}
              onClick={() => handleFunnelClick(entry, index)}
            />
          ))}
          <LabelList
            dataKey="label"
            position="right"
            fill="hsl(var(--foreground))"
            stroke="none"
            className="text-xs"
          />
        </Funnel>
        <ChartLegend content={<ChartLegendContent nameKey="label" />} />
      </FunnelChart>
    </ChartContainer>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays a chart widget with multiple chart type support.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const ChartWidget = memo(function ChartWidget({
  id,
  title,
  icon: Icon,
  data,
  comparisonData,
  type,
  drillDownConfig,
  onSegmentClick,
  showComparison = false,
  comparisonPeriod: _comparisonPeriod, // Reserved for future comparison label display
  showLegend = true,
  showTotal = true,
  dateRange,
  onDateRangeChange,
  onComparisonChange,
  onExport,
  onFullscreen,
  formatValue = (v) => v.toLocaleString(),
  chartConfig,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: ChartWidgetProps) {
  const uniqueId = useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  // Merge user config with defaults
  const mergedConfig = useMemo(
    (): ChartConfig => ({
      ...defaultChartConfig,
      ...chartConfig,
    }),
    [chartConfig]
  );

  // Calculate total value
  const total = useMemo(
    () => data.reduce((sum, point) => sum + point.value, 0),
    [data]
  );

  // Determine if drill-down is enabled
  const drillDownEnabled = drillDownConfig?.enabled ?? false;

  // ARIA label for the chart
  const ariaLabel = useMemo(() => {
    const typeLabel = type.replace('-', ' ');
    const dataPoints = data.length;
    return `${title} - ${typeLabel} chart with ${dataPoints} data points. Total: ${formatValue(total)}`;
  }, [title, type, data.length, total, formatValue]);

  // Loading state
  if (isLoading) {
    return <ChartWidgetSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <ChartWidgetError
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // Empty state
  if (data.length === 0) {
    return <ChartWidgetEmpty className={className} />;
  }

  // Render chart based on type
  const renderChart = () => {
    const chartProps: ChartRendererProps = {
      data,
      comparisonData,
      showComparison,
      config: mergedConfig,
      formatValue,
      onSegmentClick,
      drillDownEnabled,
    };

    switch (type) {
      case 'line':
        return <LineChartRenderer {...chartProps} />;
      case 'area':
        return <AreaChartRenderer {...chartProps} />;
      case 'bar':
        return <BarChartRenderer {...chartProps} />;
      case 'stacked-bar':
        return <StackedBarChartRenderer {...chartProps} />;
      case 'pie':
        return <PieChartRenderer {...chartProps} />;
      case 'funnel':
        return <FunnelChartRenderer {...chartProps} />;
      default:
        return <LineChartRenderer {...chartProps} />;
    }
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Header: Icon + Title + ChartControls */}
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <span>{title}</span>
          </CardTitle>
          <ChartControls
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            showComparison={showComparison}
            onComparisonChange={onComparisonChange}
            onExport={onExport}
            onFullscreen={onFullscreen}
          />
        </div>
      </CardHeader>

      {/* Content: Chart Visualization */}
      <CardContent>
        <div
          role="img"
          aria-label={ariaLabel}
          id={chartId}
        >
          {renderChart()}
        </div>

        {/* Screen reader accessible data table */}
        <ScreenReaderTable
          data={data}
          title={title}
          formatValue={formatValue}
        />
      </CardContent>

      {/* Footer: Legend + Total */}
      {showTotal && (
        <CardFooter className="flex items-center justify-between border-t pt-4">
          {showLegend && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Legend</span>
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{formatValue(total)}</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
});

// Export types for consumers
export type { ChartConfig };
