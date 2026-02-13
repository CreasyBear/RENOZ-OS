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

interface CohortRow {
  period: string
  customers: number
  retention30: number
  retention60: number
  retention90: number
}

interface ChurnMetrics {
  totalChurned: number
  avgMonthlyRate: number
  monthly: { period: string; churned: number; churnRate: number }[]
}

interface ConversionStep {
  label: string
  count: number
  rate?: number
}

interface AcquisitionMetricsData {
  newCustomers: number
  activationRate: number
  avgTimeToFirstOrderDays: number
  avgAcquisitionCost: number | null
}

interface LifecycleAnalyticsProps {
  /** Lifecycle stage distribution from server */
  stages?: LifecycleStage[]
  cohorts?: CohortRow[]
  churn?: ChurnMetrics
  conversion?: { steps: ConversionStep[] }
  acquisition?: AcquisitionMetricsData
  timeRange?: '3m' | '6m' | '1y'
  onTimeRangeChange?: (range: '3m' | '6m' | '1y') => void
  showFilters?: boolean
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

function CohortTable({ cohorts, isLoading }: { cohorts?: CohortRow[]; isLoading?: boolean }) {
  if (isLoading) {
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
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!cohorts?.length) {
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
          <p className="text-muted-foreground text-center py-8">No cohort data available</p>
        </CardContent>
      </Card>
    )
  }

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
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-3 text-xs font-medium text-muted-foreground">
            <span>Cohort</span>
            <span className="text-right">Customers</span>
            <span className="text-right">30d</span>
            <span className="text-right">60d</span>
            <span className="text-right">90d</span>
          </div>
          {cohorts.map((row) => (
            <div
              key={row.period}
              className="grid grid-cols-5 gap-3 items-center py-2 border-b last:border-0 text-sm"
            >
              <span>{row.period}</span>
              <span className="text-right">{row.customers.toLocaleString()}</span>
              <span className="text-right">{row.retention30}%</span>
              <span className="text-right">{row.retention60}%</span>
              <span className="text-right">{row.retention90}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CHURN ANALYSIS (Static placeholder)
// ============================================================================

function ChurnAnalysis({ churn, isLoading }: { churn?: ChurnMetrics; isLoading?: boolean }) {
  if (isLoading) {
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
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </CardContent>
      </Card>
    )
  }

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
            <p className="text-2xl font-bold text-muted-foreground">
              {churn ? `${churn.avgMonthlyRate.toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Avg Monthly Rate</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-muted-foreground">
              {churn ? churn.totalChurned.toLocaleString() : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Total Churned</p>
          </div>
        </div>
        {churn?.monthly?.length ? (
          <div className="space-y-2">
            {churn.monthly.slice(0, 4).map((row) => (
              <div key={row.period} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{row.period}</span>
                <span>{row.churned} churned ({row.churnRate.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Churn insights are still building as status history accumulates.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CONVERSION FUNNEL (Static placeholder)
// ============================================================================

function ConversionFunnel({ conversion, isLoading }: { conversion?: { steps: ConversionStep[] }; isLoading?: boolean }) {
  if (isLoading) {
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
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

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
        {conversion?.steps?.length ? (
          <div className="space-y-3">
            {conversion.steps.map((step, index) => (
              <div key={step.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  {index > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {step.rate ?? 0}% of previous stage
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold">{step.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Conversion tracking requires pipeline or order history.</p>
            <p className="text-sm mt-2">Add pipeline stages to see conversion performance.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ACQUISITION METRICS (Static placeholder)
// ============================================================================

function AcquisitionMetrics({ metrics, isLoading }: { metrics?: AcquisitionMetricsData; isLoading?: boolean }) {
  const items = [
    {
      label: 'New Customers',
      value: metrics ? metrics.newCustomers.toLocaleString() : '-',
      icon: UserPlus,
    },
    {
      label: 'Avg Acquisition Cost',
      value: metrics?.avgAcquisitionCost != null ? `$${metrics.avgAcquisitionCost.toFixed(0)}` : '-',
      icon: TrendingDown,
    },
    {
      label: 'Time to First Order',
      value: metrics ? `${metrics.avgTimeToFirstOrderDays.toFixed(1)} days` : '-',
      icon: Activity,
    },
    {
      label: 'Activation Rate',
      value: metrics ? `${metrics.activationRate.toFixed(1)}%` : '-',
      icon: TrendingUp,
    },
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
          {items.map(metric => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-lg font-bold text-muted-foreground">
                  {isLoading ? '-' : metric.value}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          Acquisition cost will populate once marketing spend is tracked.
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
  cohorts,
  churn,
  conversion,
  acquisition,
  timeRange = '6m',
  onTimeRangeChange,
  isLoading = false,
  className,
  showFilters = true,
}: LifecycleAnalyticsProps) {
  const handleTimeRangeChange = onTimeRangeChange ?? (() => {})

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
        {showFilters && (
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
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
        )}
      </div>

      {/* Cohort Analysis - placeholder until orders domain */}
      <CohortTable cohorts={cohorts} isLoading={isLoading} />

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LifecycleFunnel stages={stages} isLoading={isLoading} />
        <ConversionFunnel conversion={conversion} isLoading={isLoading} />
      </div>

      {/* Third Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChurnAnalysis churn={churn} isLoading={isLoading} />
        <AcquisitionMetrics metrics={acquisition} isLoading={isLoading} />
      </div>
    </div>
  )
}
