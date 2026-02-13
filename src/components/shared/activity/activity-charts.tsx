/**
 * Activity Charts Components
 *
 * Reusable chart components for activity analytics using Recharts.
 * Follows accessibility guidelines for color-blind friendly visualization.
 *
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityStats } from "@/hooks";
import { format } from "date-fns";
import type { ActivityAction, ActivityEntityType } from "@/lib/schemas/activities";
import { isActivityAction, isActivityEntityType } from "@/lib/schemas/activities";

// ============================================================================
// COLOR PALETTE (Color-blind friendly)
// ============================================================================

// Using a palette that works for most color vision deficiencies
const CHART_COLORS = {
  primary: "#3B82F6", // blue-500
  secondary: "#8B5CF6", // violet-500
  success: "#10B981", // emerald-500
  warning: "#F59E0B", // amber-500
  danger: "#EF4444", // red-500
  neutral: "#6B7280", // gray-500
};

// Action colors with patterns for accessibility
const ACTION_CHART_COLORS: Record<ActivityAction, string> = {
  created: "#10B981", // emerald
  updated: "#3B82F6", // blue
  deleted: "#EF4444", // red
  viewed: "#6B7280", // gray
  exported: "#8B5CF6", // violet
  shared: "#EC4899", // pink
  assigned: "#F59E0B", // amber
  commented: "#06B6D4", // cyan
  email_sent: "#3B82F6", // blue
  email_opened: "#10B981", // emerald
  email_clicked: "#8B5CF6", // violet
  call_logged: "#06B6D4", // cyan
  note_added: "#F59E0B", // amber
};

// Entity type colors
const ENTITY_CHART_COLORS: Record<ActivityEntityType, string> = {
  customer: "#3B82F6",
  contact: "#8B5CF6",
  order: "#10B981",
  opportunity: "#F59E0B",
  product: "#EC4899",
  inventory: "#06B6D4",
  supplier: "#EF4444",
  warranty: "#6366F1",
  issue: "#F97316",
  rma: "#0D9488", // teal-600
  user: "#6B7280",
  call: "#06B6D4", // cyan
  email: "#3B82F6", // blue
  quote: "#8B5CF6", // violet
  shipment: "#F59E0B", // amber
  project: "#10B981", // emerald
  workstream: "#EC4899", // pink
  task: "#6366F1", // indigo
  purchase_order: "#EF4444", // red
  // Jobs/Projects domain
  site_visit: "#14B8A6", // teal-500
  job_assignment: "#F97316", // orange-500
  job_material: "#84CC16", // lime-500
  job_photo: "#A855F7", // purple-500
  // Warranty domain
  warranty_claim: "#DB2777", // pink-600
  warranty_policy: "#0891B2", // cyan-600
  warranty_extension: "#7C3AED", // violet-600
};

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityTrendChartProps {
  dateFrom?: Date;
  dateTo?: Date;
  className?: string;
}

export interface ActionDistributionChartProps {
  dateFrom?: Date;
  dateTo?: Date;
  className?: string;
}

export interface EntityBreakdownChartProps {
  dateFrom?: Date;
  dateTo?: Date;
  className?: string;
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse"
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

// ============================================================================
// TREND CHART
// ============================================================================

/**
 * Activity trend over time (line chart).
 *
 * @example
 * ```tsx
 * <ActivityTrendChart
 *   dateFrom={startOfMonth(new Date())}
 *   dateTo={new Date()}
 *   groupBy="day"
 * />
 * ```
 */
export function ActivityTrendChart({
  dateFrom,
  dateTo,
  className,
}: ActivityTrendChartProps) {
  const { data, isLoading, isError } = useActivityStats({
    dateFrom,
    dateTo,
    groupBy: "day",
  });

  if (isLoading) {
    return <ChartSkeleton height={300} />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Failed to load trend data
      </div>
    );
  }

  // Transform stats array to chart data (key is the date for day groupBy)
  const chartData = (data?.stats ?? []).map((item) => ({
    date: item.key,
    count: item.count,
    label: item.key.includes("-") ? format(new Date(item.key), "MMM d") : item.key,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No trend data for this period
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number) => [value.toLocaleString(), "Activities"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.primary, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            name="Activities"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// ACTION DISTRIBUTION CHART
// ============================================================================

/**
 * Distribution of activity actions (pie chart).
 *
 * @example
 * ```tsx
 * <ActionDistributionChart
 *   dateFrom={startOfMonth(new Date())}
 *   dateTo={new Date()}
 * />
 * ```
 */
export function ActionDistributionChart({
  dateFrom,
  dateTo,
  className,
}: ActionDistributionChartProps) {
  const { data, isLoading, isError } = useActivityStats({
    dateFrom,
    dateTo,
    groupBy: "action",
  });

  if (isLoading) {
    return <ChartSkeleton height={300} />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Failed to load distribution data
      </div>
    );
  }

  // Transform stats array to chart data (key is the action type)
  const chartData = (data?.stats ?? [])
    .filter((item) => isActivityAction(item.key))
    .map((item) => ({
      name: item.key.charAt(0).toUpperCase() + item.key.slice(1),
      value: item.count,
      action: item.key as ActivityAction, // Safe after type guard filter
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No distribution data for this period
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
          >
            {chartData.map((entry: { action: ActivityAction }, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={ACTION_CHART_COLORS[entry.action] ?? CHART_COLORS.neutral}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number) => [value.toLocaleString(), "Activities"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// ENTITY BREAKDOWN CHART
// ============================================================================

/**
 * Activity breakdown by entity type (bar chart).
 *
 * @example
 * ```tsx
 * <EntityBreakdownChart
 *   dateFrom={startOfMonth(new Date())}
 *   dateTo={new Date()}
 * />
 * ```
 */
export function EntityBreakdownChart({
  dateFrom,
  dateTo,
  className,
}: EntityBreakdownChartProps) {
  const { data, isLoading, isError } = useActivityStats({
    dateFrom,
    dateTo,
    groupBy: "entityType",
  });

  if (isLoading) {
    return <ChartSkeleton height={300} />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Failed to load entity data
      </div>
    );
  }

  // Transform stats array to chart data (key is the entity type)
  const chartData = (data?.stats ?? [])
    .filter((item) => isActivityEntityType(item.key))
    .map((item) => ({
      name: item.key.charAt(0).toUpperCase() + item.key.slice(1),
      count: item.count,
      entityType: item.key as ActivityEntityType, // Safe after type guard filter
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No entity data for this period
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number) => [value.toLocaleString(), "Activities"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry: { entityType: ActivityEntityType }, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={ENTITY_CHART_COLORS[entry.entityType] ?? CHART_COLORS.neutral}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
