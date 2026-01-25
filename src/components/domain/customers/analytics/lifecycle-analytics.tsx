/**
 * LifecycleAnalytics Component
 *
 * Customer lifecycle metrics and analysis:
 * - Lifecycle stages distribution
 * - Cohort analysis (future)
 * - Retention rates (future)
 * - Churn analysis (future)
 *
 * ARCHITECTURE: Presentational component - receives data via props from route.
 */
import { useState } from 'react'
import {
  Users,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  RefreshCw,
  Calendar,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface LifecycleStage {
  name: string
  count: number
  percentage: number
  color: string
}

interface LifecycleAnalyticsProps {
  /** Lifecycle stage distribution from server */
  stages?: LifecycleStage[]
  /** Loading state */
  isLoading?: boolean
  className?: string
}

// ============================================================================
// LIFECYCLE FUNNEL
// ============================================================================

interface LifecycleFunnelProps {
  stages?: LifecycleStage[]
  isLoading?: boolean
}

function LifecycleFunnel({ stages, isLoading }: LifecycleFunnelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Lifecycle
          </CardTitle>
          <CardDescription>
            Distribution across lifecycle stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stages?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Lifecycle
          </CardTitle>
          <CardDescription>
            Distribution across lifecycle stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer Lifecycle
        </CardTitle>
        <CardDescription>
          Distribution across lifecycle stages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="h-10 rounded-lg overflow-hidden flex">
          {stages.map(stage => (
            <div
              key={stage.name}
              className={cn(stage.color, 'transition-all relative group')}
              style={{ width: `${stage.percentage}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 text-white text-xs font-medium">
                {stage.percentage}%
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {stages.map(stage => (
            <div key={stage.name} className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', stage.color)} />
              <span className="text-sm">{stage.name}</span>
              <span className="text-sm font-medium ml-auto">{stage.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COHORT TABLE (Static placeholder - needs server function)
// ============================================================================

function CohortTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Cohort Retention
        </CardTitle>
        <CardDescription>
          Monthly retention rates by customer cohort
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Cohort analysis requires order history.</p>
          <p className="text-sm mt-2">Coming soon after orders domain implementation.</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CHURN ANALYSIS (Static placeholder)
// ============================================================================

function ChurnAnalysis() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserMinus className="h-5 w-5" />
          Churn Analysis
        </CardTitle>
        <CardDescription>
          Customer churn trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-muted-foreground">-</p>
            <p className="text-xs text-muted-foreground">Avg Monthly Rate</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-muted-foreground">-</p>
            <p className="text-xs text-muted-foreground">Total Churned</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Churn tracking requires historical status changes.
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CONVERSION FUNNEL (Static placeholder)
// ============================================================================

function ConversionFunnel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>
          Lead to customer conversion
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Conversion tracking requires pipeline integration.</p>
          <p className="text-sm mt-2">Coming soon after pipeline domain implementation.</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ACQUISITION METRICS (Static placeholder)
// ============================================================================

function AcquisitionMetrics() {
  const metrics = [
    { label: 'New Customers (MTD)', value: '-', icon: UserPlus },
    { label: 'Avg Acquisition Cost', value: '-', icon: TrendingDown },
    { label: 'Time to First Order', value: '-', icon: Activity },
    { label: 'Activation Rate', value: '-', icon: TrendingUp },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Acquisition Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-lg font-bold text-muted-foreground">{metric.value}</p>
              </div>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          Requires orders and cost tracking.
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LifecycleAnalytics({
  stages,
  isLoading = false,
  className,
}: LifecycleAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('6m')

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lifecycle Analytics</h2>
          <p className="text-muted-foreground">
            Customer journey and retention analysis
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cohort Analysis - placeholder until orders domain */}
      <CohortTable />

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LifecycleFunnel stages={stages} isLoading={isLoading} />
        <ConversionFunnel />
      </div>

      {/* Third Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChurnAnalysis />
        <AcquisitionMetrics />
      </div>
    </div>
  )
}
