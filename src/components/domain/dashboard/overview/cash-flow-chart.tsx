/**
 * Cash Flow Chart
 *
 * Money in vs money out visualization using shared ChartWidget.
 * Supports period selection and chart type toggle.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AreaChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { FileText, MoreHorizontal, BarChart3, AreaChart as AreaChartIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface CashFlowDataPoint {
  period: string;
  moneyIn: number;
  moneyOut: number;
}

export interface CashFlowChartProps {
  data?: CashFlowDataPoint[] | null;
  isLoading?: boolean;
  className?: string;
}

type ChartType = 'bar' | 'area';
type TimePeriod = '3months' | '6months' | 'year';

const periodLabels: Record<TimePeriod, string> = {
  '3months': 'Last 3 Months',
  '6months': 'Last 6 Months',
  year: 'Full Year',
};

// Chart config for theming
const chartConfig: ChartConfig = {
  moneyIn: {
    label: 'Money In',
    color: 'hsl(152, 57%, 45%)', // emerald
  },
  moneyOut: {
    label: 'Money Out',
    color: 'hsl(221, 83%, 53%)', // indigo
  },
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function CashFlowChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="size-8" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CashFlowChart({ data, isLoading, className }: CashFlowChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [period, setPeriod] = useState<TimePeriod>('6months');

  // Filter data based on period selection
  const filteredData = useMemo(() => {
    if (!data) return [];
    switch (period) {
      case '3months':
        return data.slice(-3);
      case '6months':
        return data.slice(-6);
      default:
        return data;
    }
  }, [data, period]);

  // Format currency for display
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  if (isLoading) {
    return <CashFlowChartSkeleton className={className} />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Cash Flow</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
          No cash flow data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium text-muted-foreground">
              Cash Flow
            </CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">Money In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-indigo-500" />
                <span className="text-xs font-medium text-muted-foreground">Money Out</span>
              </div>
            </div>

            {/* Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                  Chart Type
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setChartType('bar')}>
                  <BarChart3 className="size-4 mr-2" />
                  Bar Chart
                  {chartType === 'bar' && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChartType('area')}>
                  <AreaChartIcon className="size-4 mr-2" />
                  Area Chart
                  {chartType === 'area' && <Check className="size-4 ml-auto" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                  Time Period
                </DropdownMenuLabel>
                {(Object.keys(periodLabels) as TimePeriod[]).map((key) => (
                  <DropdownMenuItem key={key} onClick={() => setPeriod(key)}>
                    {periodLabels[key]}
                    {period === key && <Check className="size-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          {chartType === 'bar' ? (
            <BarChart data={filteredData} accessibilityLayer>
              <defs>
                <linearGradient id="moneyInGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152, 57%, 45%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(152, 57%, 45%)" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="moneyOutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatValue}
                width={50}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="moneyIn" fill="url(#moneyInGradient)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="moneyOut" fill="url(#moneyOutGradient)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          ) : (
            <AreaChart data={filteredData} accessibilityLayer>
              <defs>
                <linearGradient id="moneyInAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152, 57%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(152, 57%, 45%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="moneyOutAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatValue}
                width={50}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="moneyIn"
                stroke="hsl(152, 57%, 45%)"
                strokeWidth={2}
                fill="url(#moneyInAreaGradient)"
              />
              <Area
                type="monotone"
                dataKey="moneyOut"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2}
                fill="url(#moneyOutAreaGradient)"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
