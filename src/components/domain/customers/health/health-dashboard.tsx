/**
 * HealthDashboard Presenter
 *
 * Pure UI component for customer health monitoring dashboard.
 * Shows health score, trends, alerts, and recommendations.
 *
 * Container/Presenter Pattern:
 * - Use HealthDashboardContainer in routes (handles data fetching)
 * - Use HealthDashboardPresenter for storybook/testing
 *
 * @see ./health-dashboard-container.tsx (container)
 * @see src/hooks/customers/use-customer-health.ts (hooks)
 */
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
import { ActionPlans } from './action-plans'
import { HealthHistory } from './health-history'
import { calculateDaysSince } from '@/lib/customer-utils'
import { formatDate } from '@/lib/formatters'
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

interface HealthMetricPoint {
  metricDate: string
  overallScore: number | null
  recencyScore?: number
  frequencyScore?: number
  monetaryScore?: number
  engagementScore?: number
}

/**
 * Container props - what parent components pass
 */
export interface HealthDashboardContainerProps {
  customer: CustomerHealthData
  onScheduleCall?: () => void
  onSendEmail?: () => void
  onRefresh?: () => void
  className?: string
}

/**
 * Presenter props - what the container passes to the presenter
 */
export interface HealthDashboardPresenterProps extends HealthDashboardContainerProps {
  /** @source useCustomerHealthHistory hook */
  healthMetrics: HealthMetricPoint[]
  /** Loading state for health metrics */
  isLoadingMetrics: boolean
  /** @source useCustomerActionPlans hook */
  actionPlans?: import('./action-plans').ActionPlansProps['actionPlans']
  /** Loading state for action plans */
  isLoadingActionPlans?: boolean
  /** Handler to create action plan */
  onCreateActionPlan?: (data: {
    title: string
    description?: string
    priority: 'high' | 'medium' | 'low'
    category: 'recency' | 'frequency' | 'monetary' | 'engagement' | 'general'
    dueDate?: Date
  }) => Promise<void>
  /** Handler to complete action plan */
  onCompleteActionPlan?: (id: string) => Promise<void>
  /** Handler to delete action plan */
  onDeleteActionPlan?: (id: string) => Promise<void>
}


// ============================================================================
// MAIN COMPONENT (PRESENTER)
// ============================================================================

export function HealthDashboardPresenter({
  customer,
  healthMetrics,
  isLoadingMetrics,
  actionPlans,
  isLoadingActionPlans,
  onCreateActionPlan,
  onCompleteActionPlan,
  onDeleteActionPlan,
  onScheduleCall,
  onSendEmail,
  onRefresh,
  className,
}: HealthDashboardPresenterProps) {
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
                <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh health score">
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
              <HealthHistory metrics={healthMetrics} />
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

      {/* Action Plans Section */}
      {actionPlans !== undefined && (
        <div>
          <ActionPlans
            actionPlans={actionPlans}
            isLoading={isLoadingActionPlans}
            customerId={customer.id}
            onCreate={onCreateActionPlan ?? (async () => {})}
            onComplete={onCompleteActionPlan ?? (async () => {})}
            onDelete={onDeleteActionPlan ?? (async () => {})}
          />
        </div>
      )}

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
                {customer.lastOrderDate ? formatDate(customer.lastOrderDate, { locale: 'en-AU' }) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Last Order Date</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/** @deprecated Use HealthDashboardContainer instead */
export const HealthDashboard = HealthDashboardPresenter

/** @deprecated Use HealthDashboardContainerProps instead */
export type HealthDashboardProps = HealthDashboardContainerProps
