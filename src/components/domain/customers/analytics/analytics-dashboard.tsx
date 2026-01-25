/**
 * AnalyticsDashboard Component
 *
 * Executive customer insights dashboard:
 * - Key performance indicators
 * - Trend charts
 * - Segment performance
 * - Health score distribution
 *
 * ARCHITECTURE: Presentational component - receives all data via props from route.
 */
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FormatAmount } from '@/components/shared/format'

// ============================================================================
// TYPES
// ============================================================================

interface KpiMetric {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
}

interface TrendDataPoint {
  period: string
  value: number
}

interface SegmentPerformance {
  id?: string
  name: string
  customers: number
  revenue: number
  growth?: number
  healthScore: number
}

interface HealthDistribution {
  excellent: number
  good: number
  fair: number
  atRisk: number
}

interface AnalyticsDashboardProps {
  dateRange?: string
  onDateRangeChange?: (range: string) => void
  /** KPI metrics from server */
  kpis?: KpiMetric[]
  /** Health score distribution percentages */
  healthDistribution?: HealthDistribution
  /** Customer count trend data */
  customerTrend?: TrendDataPoint[]
  /** Revenue trend data */
  revenueTrend?: TrendDataPoint[]
  /** Segment performance data */
  segments?: SegmentPerformance[]
  /** Loading state */
  isLoading?: boolean
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

// Helper for chart formatValue callback
function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function getIconForKpi(iconName?: string): React.ElementType {
  switch (iconName) {
    case 'users': return Users
    case 'dollar': return DollarSign
    case 'trending': return TrendingUp
    case 'activity': return Activity
    case 'check': return TrendingUp
    default: return Activity
  }
}

// ============================================================================
// KPI CARD
// ============================================================================

interface KpiCardProps {
  metric: KpiMetric
}

function KpiCard({ metric }: KpiCardProps) {
  const Icon = getIconForKpi(metric.icon)
  const trend = metric.change !== undefined
    ? metric.change > 0 ? 'up' : metric.change < 0 ? 'down' : 'neutral'
    : 'neutral'

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-bold">{metric.value}</p>
            {metric.change !== undefined && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                ) : null}
                <span className={cn(
                  'text-sm',
                  trend === 'up' ? 'text-green-600' :
                  trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {formatPercentage(metric.change)} {metric.changeLabel}
                </span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-muted p-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TREND CHART
// ============================================================================

interface TrendChartProps {
  title: string
  description?: string
  data?: TrendDataPoint[]
  formatValue?: (value: number) => string
  isLoading?: boolean
}

function TrendChart({ title, description, data, formatValue = String, isLoading }: TrendChartProps) {
  if (isLoading || !data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-40">
          {data.map((point, i) => {
            const height = ((point.value - minValue) / range) * 80 + 20
            const isLast = i === data.length - 1

            return (
              <div key={point.period} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">
                  {formatValue(point.value)}
                </span>
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isLast ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-muted-foreground">{point.period}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SEGMENT PERFORMANCE TABLE
// ============================================================================

interface SegmentPerformanceTableProps {
  segments?: SegmentPerformance[]
  isLoading?: boolean
}

function SegmentPerformanceTable({ segments, isLoading }: SegmentPerformanceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Segment Performance
          </CardTitle>
          <CardDescription>Revenue and health by customer segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!segments?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Segment Performance
          </CardTitle>
          <CardDescription>Revenue and health by customer segment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No segments found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Segment Performance
        </CardTitle>
        <CardDescription>Revenue and health by customer segment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {segments.map(segment => (
            <div key={segment.name} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="space-y-1">
                <p className="font-medium">{segment.name}</p>
                <p className="text-sm text-muted-foreground">
                  {segment.customers.toLocaleString()} customers
                </p>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="font-medium"><FormatAmount amount={segment.revenue} cents={false} compact showCents={false} /></p>
                  {segment.growth !== undefined && (
                    <p className={cn(
                      'text-xs',
                      segment.growth > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatPercentage(segment.growth)}
                    </p>
                  )}
                </div>
                <Badge
                  variant={segment.healthScore >= 80 ? 'default' : segment.healthScore >= 60 ? 'secondary' : 'destructive'}
                  className={cn(
                    segment.healthScore >= 80 ? 'bg-green-100 text-green-700' :
                    segment.healthScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  )}
                >
                  {segment.healthScore}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// HEALTH DISTRIBUTION
// ============================================================================

interface HealthDistributionChartProps {
  distribution?: HealthDistribution
  isLoading?: boolean
}

function HealthDistributionChart({ distribution, isLoading }: HealthDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Health Distribution
          </CardTitle>
          <CardDescription>Customer health score breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!distribution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Health Distribution
          </CardTitle>
          <CardDescription>Customer health score breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const segments = [
    { label: 'Excellent (80-100)', value: distribution.excellent, color: 'bg-green-500' },
    { label: 'Good (60-79)', value: distribution.good, color: 'bg-yellow-500' },
    { label: 'Fair (40-59)', value: distribution.fair, color: 'bg-orange-500' },
    { label: 'At Risk (0-39)', value: distribution.atRisk, color: 'bg-red-500' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Health Distribution
        </CardTitle>
        <CardDescription>Customer health score breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="h-8 rounded-full overflow-hidden flex">
          {segments.map(seg => (
            <div
              key={seg.label}
              className={cn(seg.color, 'transition-all')}
              style={{ width: `${seg.value}%` }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {segments.map(seg => (
            <div key={seg.label} className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', seg.color)} />
              <span className="text-sm text-muted-foreground">{seg.label}</span>
              <span className="text-sm font-medium ml-auto">{seg.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// QUICK STATS (Static for now - could be made dynamic)
// ============================================================================

function QuickStats() {
  const stats = [
    { label: 'New This Month', value: '-', change: '' },
    { label: 'Churned', value: '-', change: '' },
    { label: 'Avg Order Value', value: '-', change: '' },
    { label: 'Repeat Rate', value: '-', change: '' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-muted-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnalyticsDashboard({
  dateRange = '30d',
  onDateRangeChange,
  kpis,
  healthDistribution,
  customerTrend,
  revenueTrend,
  segments,
  isLoading = false,
  className,
}: AnalyticsDashboardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Analytics</h2>
          <p className="text-muted-foreground">
            Executive insights and performance metrics
          </p>
        </div>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="365d">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : kpis?.length ? (
          kpis.map(metric => (
            <KpiCard key={metric.label} metric={metric} />
          ))
        ) : (
          <div className="col-span-4 text-center py-8 text-muted-foreground">
            No KPI data available
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Customer Growth"
          description="Total customers over time"
          data={customerTrend}
          formatValue={(v) => v.toLocaleString()}
          isLoading={isLoading}
        />
        <TrendChart
          title="Revenue Trend"
          description="Monthly revenue"
          data={revenueTrend}
          formatValue={formatCurrencyCompact}
          isLoading={isLoading}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SegmentPerformanceTable segments={segments} isLoading={isLoading} />
        <HealthDistributionChart distribution={healthDistribution} isLoading={isLoading} />
        <QuickStats />
      </div>
    </div>
  )
}
