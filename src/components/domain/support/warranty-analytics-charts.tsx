/**
 * Warranty Analytics Charts
 *
 * Chart components for the warranty analytics dashboard using Recharts.
 * Includes claims by product, claims by type, claims trend, SLA compliance,
 * cycle count analysis, and revenue vs cost visualization.
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-008.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-008
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
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type {
  WarrantyAnalyticsSummary,
  ClaimsByProductResult,
  ClaimsTrendResult,
  ClaimsByTypeResult,
  SlaComplianceMetrics,
  CycleCountAtClaimResult,
  ExtensionVsResolutionResult,
} from '@/lib/schemas/warranty/analytics';

// ============================================================================
// COLOR PALETTE (Color-blind friendly)
// ============================================================================

const CHART_COLORS = {
  primary: '#3B82F6', // blue-500
  secondary: '#8B5CF6', // violet-500
  success: '#10B981', // emerald-500
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  neutral: '#6B7280', // gray-500
};

// Claim type colors
const CLAIM_TYPE_COLORS: Record<string, string> = {
  cell_degradation: '#EF4444', // red
  bms_fault: '#F59E0B', // amber
  inverter_failure: '#8B5CF6', // violet
  installation_defect: '#3B82F6', // blue
  other: '#6B7280', // gray
};

// Extension type colors
const EXTENSION_TYPE_COLORS: Record<string, string> = {
  paid_extension: '#10B981', // emerald
  promotional: '#3B82F6', // blue
  loyalty_reward: '#8B5CF6', // violet
  goodwill: '#F59E0B', // amber
};

// Resolution type colors
const RESOLUTION_TYPE_COLORS: Record<string, string> = {
  repair: '#3B82F6', // blue
  replacement: '#8B5CF6', // violet
  refund: '#10B981', // emerald
  warranty_extension: '#F59E0B', // amber
};

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
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-1 h-8 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyChartStateProps {
  title: string;
  message: string;
}

function EmptyChartState({ title, message }: EmptyChartStateProps) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center p-4 text-center">
      <div className="bg-muted mb-3 rounded-full p-3">
        <TrendingDown className="text-muted-foreground h-6 w-6" />
      </div>
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{message}</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

interface ErrorChartStateProps {
  onRetry?: () => void;
}

function ErrorChartState({ onRetry }: ErrorChartStateProps) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center p-4 text-center">
      <div className="bg-destructive/10 mb-3 rounded-full p-3">
        <AlertTriangle className="text-destructive h-6 w-6" />
      </div>
      <p className="text-muted-foreground text-sm font-medium">Failed to load chart</p>
      {onRetry && (
        <button onClick={onRetry} className="text-primary mt-2 text-xs hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// TREND INDICATOR COMPONENT
// ============================================================================

interface TrendIndicatorProps {
  change: number;
  label?: string;
  inverse?: boolean; // If true, negative is good (e.g., cost reduction)
}

function TrendIndicator({ change, label, inverse = false }: TrendIndicatorProps) {
  const isPositive = inverse ? change < 0 : change > 0;
  const isNeutral = change === 0;

  return (
    <div className="flex items-center gap-1 text-xs">
      {isNeutral ? (
        <Minus className="text-muted-foreground h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3 text-emerald-500" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-500" />
      )}
      <span
        className={cn(
          isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600' : 'text-red-600'
        )}
      >
        {change > 0 ? '+' : ''}
        {change}%
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  );
}

// ============================================================================
// SUMMARY METRIC CARD
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  inverse?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  inverse = false,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {change !== undefined && (
          <TrendIndicator change={change} label={changeLabel} inverse={inverse} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY METRICS GRID
// ============================================================================

interface SummaryMetricsGridProps {
  data?: WarrantyAnalyticsSummary;
  isLoading?: boolean;
  isError?: boolean;
}

export function SummaryMetricsGrid({ data, isLoading, isError }: SummaryMetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <ErrorChartState />
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
      role="region"
      aria-label="Warranty analytics summary"
    >
      <MetricCard
        title="Total Warranties"
        value={data.totalWarranties.toLocaleString()}
        change={data.warrantiesChange}
        changeLabel="vs prev"
      />
      <MetricCard
        title="Active Claims"
        value={data.activeClaims.toLocaleString()}
        change={data.claimsChange}
        changeLabel="vs prev"
        inverse
      />
      <MetricCard
        title="Claims Rate"
        value={`${data.claimsRate}%`}
        change={data.claimsRateChange}
        changeLabel="vs prev"
        inverse
      />
      <MetricCard
        title="Avg Claim Cost"
        value={`$${data.averageClaimCost.toLocaleString()}`}
        change={data.avgCostChange}
        changeLabel="vs prev"
        inverse
      />
      <MetricCard
        title="Total Claims Cost"
        value={`$${data.totalClaimsCost.toLocaleString()}`}
        change={data.totalCostChange}
        changeLabel="vs prev"
        inverse
      />
      <MetricCard
        title="Warranty Revenue"
        value={`$${data.warrantyRevenue.toLocaleString()}`}
        change={data.revenueChange}
        changeLabel="vs prev"
      />
    </div>
  );
}

// ============================================================================
// CLAIMS BY PRODUCT CHART (Horizontal Bar)
// ============================================================================

interface ClaimsByProductChartProps {
  data?: ClaimsByProductResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ClaimsByProductChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: ClaimsByProductChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims by Product</CardTitle>
          <CardDescription>Claims breakdown by battery model</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={300} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims by Product</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims by Product</CardTitle>
          <CardDescription>Claims breakdown by battery model</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No claims data"
            message="No warranty claims recorded for this period"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.items.map((item) => ({
    name: item.productName.length > 20 ? item.productName.slice(0, 20) + '...' : item.productName,
    fullName: item.productName,
    claims: item.claimsCount,
    percentage: item.percentage,
    avgCost: item.averageCost,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Claims by Product</CardTitle>
        <CardDescription>
          {data.totalClaims} total claims across {data.items.length} products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <figure
          role="img"
          aria-label={`Horizontal bar chart showing claims by product. Top product: ${data.items[0]?.productName} with ${data.items[0]?.claimsCount} claims.`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'claims') return [value, 'Claims'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="claims" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </figure>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CLAIMS BY TYPE CHART (Donut)
// ============================================================================

interface ClaimsByTypeChartProps {
  data?: ClaimsByTypeResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ClaimsByTypeChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: ClaimsByTypeChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims by Type</CardTitle>
          <CardDescription>Distribution of claim types</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={300} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims by Type</CardTitle>
          <CardDescription>Distribution of claim types</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No claims data"
            message="No warranty claims recorded for this period"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.items.map((item) => ({
    name: item.claimTypeLabel,
    value: item.count,
    percentage: item.percentage,
    color: CLAIM_TYPE_COLORS[item.claimType] || CHART_COLORS.neutral,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Claims by Type</CardTitle>
        <CardDescription>{data.totalClaims} total claims</CardDescription>
      </CardHeader>
      <CardContent>
        <figure
          role="img"
          aria-label={`Donut chart showing claims by type. ${data.items.map((i) => `${i.claimTypeLabel}: ${i.percentage}%`).join(', ')}`}
        >
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
                label={({ name, percentage }) => `${name} ${percentage}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} claims`, '']} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </figure>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CLAIMS TREND CHART (Line)
// ============================================================================

interface ClaimsTrendChartProps {
  data?: ClaimsTrendResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ClaimsTrendChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: ClaimsTrendChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims Trend</CardTitle>
          <CardDescription>Monthly claims over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={300} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Claims Trend</CardTitle>
          <CardDescription>Monthly claims over time</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No trend data"
            message="No warranty claims recorded in the selected period"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.items.map((item) => ({
    month: item.monthLabel,
    claims: item.claimsCount,
    avgCost: item.averageCost,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Claims Trend</CardTitle>
        <CardDescription>Monthly claims volume and average cost</CardDescription>
      </CardHeader>
      <CardContent>
        <figure role="img" aria-label="Line chart showing claims trend over time">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="claims"
                name="Claims"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.primary }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgCost"
                name="Avg Cost ($)"
                stroke={CHART_COLORS.warning}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: CHART_COLORS.warning }}
              />
            </LineChart>
          </ResponsiveContainer>
        </figure>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SLA COMPLIANCE CARD
// ============================================================================

interface SlaComplianceCardProps {
  data?: SlaComplianceMetrics;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function SlaComplianceCard({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: SlaComplianceCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
          <CardDescription>Response and resolution metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={200} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChartState title="No SLA data" message="No claims to measure SLA compliance" />
        </CardContent>
      </Card>
    );
  }

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600';
    if (rate >= 75) return 'text-amber-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (rate: number) => {
    if (rate >= 90) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (rate >= 75) return <Clock className="h-4 w-4 text-amber-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>SLA Compliance</CardTitle>
        <CardDescription>Response (24h) and resolution (5 days) targets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6" role="region" aria-label="SLA compliance metrics">
          {/* Response SLA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response SLA</span>
              {getComplianceIcon(data.responseComplianceRate)}
            </div>
            <div
              className={cn('text-3xl font-bold', getComplianceColor(data.responseComplianceRate))}
            >
              {data.responseComplianceRate}%
            </div>
            <div className="text-muted-foreground space-y-1 text-xs">
              <p>{data.claimsWithinResponseSla} within SLA</p>
              <p>{data.claimsBreachedResponseSla} breached</p>
              <p>Avg: {data.averageResponseTimeHours}h</p>
            </div>
          </div>

          {/* Resolution SLA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Resolution SLA</span>
              {getComplianceIcon(data.resolutionComplianceRate)}
            </div>
            <div
              className={cn(
                'text-3xl font-bold',
                getComplianceColor(data.resolutionComplianceRate)
              )}
            >
              {data.resolutionComplianceRate}%
            </div>
            <div className="text-muted-foreground space-y-1 text-xs">
              <p>{data.claimsWithinResolutionSla} within SLA</p>
              <p>{data.claimsBreachedResolutionSla} breached</p>
              <p>Avg: {data.averageResolutionTimeDays} days</p>
            </div>
          </div>
        </div>

        {/* Status summary */}
        <div className="mt-4 flex justify-between border-t pt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Resolved: </span>
            <span className="font-medium">{data.totalResolvedClaims}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pending: </span>
            <Badge variant="outline">{data.totalPendingClaims}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CYCLE COUNT ANALYSIS CHART (Bar)
// ============================================================================

interface CycleCountAnalysisChartProps {
  data?: CycleCountAtClaimResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function CycleCountAnalysisChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: CycleCountAnalysisChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cycle Count at Claim</CardTitle>
          <CardDescription>Average battery cycles when claims are filed</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={250} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cycle Count at Claim</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.byClaimType.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cycle Count at Claim</CardTitle>
          <CardDescription>Average battery cycles when claims are filed</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No cycle data"
            message="No claims with cycle count data recorded"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.byClaimType.map((item) => ({
    name: item.claimTypeLabel,
    avgCycles: item.averageCycleCount,
    min: item.minCycleCount,
    max: item.maxCycleCount,
    claims: item.claimsWithCycleData,
    color: CLAIM_TYPE_COLORS[item.claimType] || CHART_COLORS.neutral,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cycle Count at Claim</CardTitle>
        <CardDescription>
          Overall avg: {data.overall.averageCycleCount} cycles ({data.overall.totalClaimsWithData}{' '}
          claims)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <figure role="img" aria-label="Bar chart showing average cycle count by claim type">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'avgCycles') return [value, 'Avg Cycles'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  if (item) {
                    return `${label} (${item.claims} claims)`;
                  }
                  return label;
                }}
              />
              <Bar dataKey="avgCycles" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </figure>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// REVENUE VS COST CHART (Stacked Bar)
// ============================================================================

interface RevenueVsCostChartProps {
  data?: ExtensionVsResolutionResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function RevenueVsCostChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: RevenueVsCostChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Revenue vs Claims Cost</CardTitle>
          <CardDescription>Extension revenue compared to resolution costs</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={200} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Revenue vs Claims Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Revenue vs Claims Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No financial data"
            message="No extension or resolution data for this period"
          />
        </CardContent>
      </Card>
    );
  }

  const revenue = data.extensions.totalRevenue;
  const cost = data.resolutions.totalCost;
  const netMargin = revenue - cost;
  const marginPercent = revenue > 0 ? Math.round((netMargin / revenue) * 100) : 0;

  const chartData = [
    { name: 'Revenue', value: revenue, fill: CHART_COLORS.success },
    { name: 'Claims Cost', value: cost, fill: CHART_COLORS.danger },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Revenue vs Claims Cost</CardTitle>
        <CardDescription>
          Net Margin: ${netMargin.toLocaleString()} ({marginPercent}%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <figure
          role="img"
          aria-label={`Revenue: $${revenue.toLocaleString()}, Claims Cost: $${cost.toLocaleString()}, Net Margin: $${netMargin.toLocaleString()}`}
        >
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </figure>

        {/* Breakdown tables */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
          {/* Extensions breakdown */}
          <div>
            <p className="mb-2 text-sm font-medium">
              Extensions ({data.extensions.totalExtensions})
            </p>
            <div className="space-y-1">
              {data.extensions.items.slice(0, 3).map((item) => (
                <div key={item.extensionType} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.extensionTypeLabel}</span>
                  <span>${item.totalRevenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolutions breakdown */}
          <div>
            <p className="mb-2 text-sm font-medium">
              Resolutions ({data.resolutions.totalResolutions})
            </p>
            <div className="space-y-1">
              {data.resolutions.items.slice(0, 3).map((item) => (
                <div key={item.resolutionType} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.resolutionTypeLabel}</span>
                  <span>${item.totalCost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXTENSION TYPE BREAKDOWN CHART
// ============================================================================

interface ExtensionTypeChartProps {
  data?: ExtensionVsResolutionResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ExtensionTypeChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: ExtensionTypeChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Extension Types</CardTitle>
          <CardDescription>Breakdown of warranty extension types</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={200} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Extension Types</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.extensions.items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Extension Types</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No extension data"
            message="No warranty extensions recorded for this period"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.extensions.items.map((item) => ({
    name: item.extensionTypeLabel,
    value: item.count,
    percentage: item.percentage,
    color: EXTENSION_TYPE_COLORS[item.extensionType] || CHART_COLORS.neutral,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Extension Types</CardTitle>
        <CardDescription>{data.extensions.totalExtensions} total extensions</CardDescription>
      </CardHeader>
      <CardContent>
        <figure role="img" aria-label="Pie chart showing extension type distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground text-xs">{item.name}</span>
              </div>
            ))}
          </div>
        </figure>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RESOLUTION TYPE BREAKDOWN CHART
// ============================================================================

interface ResolutionTypeChartProps {
  data?: ExtensionVsResolutionResult;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ResolutionTypeChart({
  data,
  isLoading,
  isError,
  onRetry,
  className,
}: ResolutionTypeChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resolution Types</CardTitle>
          <CardDescription>Breakdown of claim resolution methods</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={200} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resolution Types</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorChartState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.resolutions.items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Resolution Types</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyChartState
            title="No resolution data"
            message="No resolved claims for this period"
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.resolutions.items.map((item) => ({
    name: item.resolutionTypeLabel,
    value: item.count,
    percentage: item.percentage,
    color: RESOLUTION_TYPE_COLORS[item.resolutionType] || CHART_COLORS.neutral,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Resolution Types</CardTitle>
        <CardDescription>{data.resolutions.totalResolutions} resolved claims</CardDescription>
      </CardHeader>
      <CardContent>
        <figure role="img" aria-label="Pie chart showing resolution type distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground text-xs">{item.name}</span>
              </div>
            ))}
          </div>
        </figure>
      </CardContent>
    </Card>
  );
}
