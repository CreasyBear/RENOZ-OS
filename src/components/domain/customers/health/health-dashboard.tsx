/**
 * HealthDashboard Component
 *
 * Comprehensive customer health monitoring dashboard with:
 * - Health score gauge with trend
 * - RFM factor breakdown
 * - Risk alerts
 * - Recommendations
 * - Health history chart
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  Activity,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HealthScoreGauge } from './health-score-gauge'
import { HealthRecommendations } from './health-recommendations'
import { RiskAlerts } from './risk-alerts'
import { getCustomerHealthMetrics } from '@/server/customers'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface CustomerHealthData {
  id: string
  healthScore: number | null
  creditHold: boolean
  lastOrderDate: string | null
  totalOrders: number
  lifetimeValue: number | null
  openComplaints?: number
  declinedPayments?: number
}

interface HealthDashboardProps {
  customer: CustomerHealthData
  onScheduleCall?: () => void
  onSendEmail?: () => void
  onRefresh?: () => void
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateDaysSince(dateString: string | null): number | null {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// HEALTH HISTORY CHART (simplified)
// ============================================================================

interface HealthHistoryProps {
  metrics: Array<{
    metricDate: string
    overallScore: number | null
  }>
}

function HealthHistory({ metrics }: HealthHistoryProps) {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No health history available</p>
      </div>
    )
  }

  // Get last 6 data points, filter out null scores
  const dataPoints = metrics
    .filter((m) => m.overallScore !== null)
    .slice(0, 6)
    .reverse()
  const maxScore = 100
  const minScore = 0
  const range = maxScore - minScore

  if (dataPoints.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No health history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-24">
        {dataPoints.map((point, i) => {
          const score = point.overallScore ?? 0
          const height = ((score - minScore) / range) * 100
          const isLast = i === dataPoints.length - 1

          return (
            <div
              key={point.metricDate}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  score >= 80 ? 'bg-green-500' :
                  score >= 60 ? 'bg-yellow-500' :
                  score >= 40 ? 'bg-orange-500' : 'bg-red-500',
                  isLast && 'ring-2 ring-offset-1 ring-primary'
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 text-[10px] text-muted-foreground">
        {dataPoints.map((point) => (
          <div key={point.metricDate} className="flex-1 text-center truncate">
            {new Date(point.metricDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HealthDashboard({
  customer,
  onScheduleCall,
  onSendEmail,
  onRefresh,
  className,
}: HealthDashboardProps) {
  // Fetch health metrics history
  const { data: healthMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: queryKeys.customers.healthMetrics(customer.id),
    queryFn: () => getCustomerHealthMetrics({
      data: {
        customerId: customer.id,
      },
    }),
  })

  const lastOrderDays = calculateDaysSince(customer.lastOrderDate)

  // Build metrics object for recommendations
  const latestMetric = healthMetrics?.[0]
  const previousMetric = healthMetrics?.[1]

  const metricsData = latestMetric ? {
    recencyScore: latestMetric.recencyScore ?? 0,
    frequencyScore: latestMetric.frequencyScore ?? 0,
    monetaryScore: latestMetric.monetaryScore ?? 0,
    overallScore: latestMetric.overallScore ?? 0,
    recencyDays: lastOrderDays ?? undefined,
    orderCount: customer.totalOrders,
    totalValue: customer.lifetimeValue ?? undefined,
  } : null

  // Determine trend
  const healthScoreTrend = (() => {
    if (!latestMetric || !previousMetric) return null
    const diff = (latestMetric.overallScore ?? 0) - (previousMetric.overallScore ?? 0)
    if (diff > 2) return 'up' as const
    if (diff < -2) return 'down' as const
    return 'stable' as const
  })()

  // Build risk data
  const riskData = {
    healthScore: customer.healthScore,
    creditHold: customer.creditHold,
    lastOrderDays,
    openComplaints: customer.openComplaints ?? 0,
    declinedPayments: customer.declinedPayments ?? 0,
    healthScoreTrend,
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top row: Score + History */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Health Score</CardTitle>
              {onRefresh && (
                <Button variant="ghost" size="icon" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <HealthScoreGauge
              score={customer.healthScore}
              previousScore={previousMetric?.overallScore}
              size="lg"
              showTrend
              showLabel
            />
          </CardContent>
        </Card>

        {/* Health History */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Health Trend
            </CardTitle>
            <CardDescription>Score history over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <HealthHistory metrics={healthMetrics ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Risk Alerts + Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RiskAlerts
          riskData={riskData}
          onScheduleCall={onScheduleCall}
          onSendEmail={onSendEmail}
        />
        <HealthRecommendations metrics={metricsData} />
      </div>

      {/* Bottom: Key Metrics Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{customer.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                ${customer.lifetimeValue?.toLocaleString() ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">Lifetime Value</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {lastOrderDays !== null ? `${lastOrderDays}d` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Days Since Order</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Last Order Date</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
