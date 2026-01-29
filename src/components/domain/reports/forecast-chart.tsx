/**
 * ForecastChart Component
 *
 * Displays pipeline forecast data as a bar/line chart.
 * Shows total value vs weighted value by period.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-FORECASTING-UI)
 */

import { memo, useMemo } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import type { ForecastPeriod } from "@/lib/schemas/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface ForecastChartProps {
  data: ForecastPeriod[];
  showWeighted?: boolean;
  showWonLost?: boolean;
  title?: string;
  height?: number;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAxisValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

function formatTooltipValue(value: number): string {
  return formatCurrency(value);
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ForecastChart = memo(function ForecastChart({
  data,
  showWeighted = true,
  showWonLost = false,
  title = "Pipeline Forecast",
  height = 400,
  className,
}: ForecastChartProps) {
  // Transform data for chart - convert cents to dollars for display
  const chartData = useMemo(() => {
    return data.map((period) => ({
      period: period.period,
      totalValue: period.totalValue / 100,
      weightedValue: period.weightedValue / 100,
      wonValue: period.wonValue / 100,
      lostValue: period.lostValue / 100,
      opportunityCount: period.opportunityCount,
      avgProbability: period.avgProbability,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No forecast data available for the selected period.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatAxisValue}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatTooltipValue(value * 100), // Convert back to cents for formatting
                name === "totalValue"
                  ? "Total Pipeline"
                  : name === "weightedValue"
                  ? "Weighted Value"
                  : name === "wonValue"
                  ? "Won"
                  : "Lost",
              ]}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />

            {/* Main pipeline value bar */}
            <Bar
              dataKey="totalValue"
              name="Total Pipeline"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              opacity={showWeighted ? 0.3 : 1}
            />

            {/* Weighted value bar (stacked or separate) */}
            {showWeighted && (
              <Bar
                dataKey="weightedValue"
                name="Weighted Value"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            )}

            {/* Won/Lost bars */}
            {showWonLost && (
              <>
                <Bar
                  dataKey="wonValue"
                  name="Won"
                  fill="hsl(142, 76%, 36%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="lostValue"
                  name="Lost"
                  fill="hsl(0, 84%, 60%)"
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}

            {/* Opportunity count as line */}
            <Line
              type="monotone"
              dataKey="opportunityCount"
              name="Opportunities"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--muted-foreground))", r: 4 }}
              yAxisId="count"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export default ForecastChart;
