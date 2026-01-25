/**
 * MetricsDashboard Component
 *
 * Displays key customer metrics in a grid of cards:
 * - Health score with visual indicator
 * - Lifetime value
 * - Total orders
 * - Average order value
 * - First/last order dates
 * - Credit limit and priority info
 */
import {
  Heart,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Star,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FormatAmount } from '@/components/shared/format'

// ============================================================================
// TYPES
// ============================================================================

interface Priority {
  priorityLevel: string
  serviceLevel: string
  contractValue?: string | null
}

interface MetricsDashboardProps {
  healthScore: number | null | undefined
  lifetimeValue: string | number | null | undefined
  totalOrders: number
  averageOrderValue: string | number | null | undefined
  firstOrderDate: string | null | undefined
  lastOrderDate: string | null | undefined
  creditLimit: string | number | null | undefined
  priority?: Priority | null
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getHealthScoreColor(score: number | null | undefined): {
  bg: string
  text: string
  label: string
} {
  if (score === null || score === undefined) {
    return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Rated' }
  }
  if (score >= 80) {
    return { bg: 'bg-green-100', text: 'text-green-700', label: 'Excellent' }
  }
  if (score >= 60) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Good' }
  }
  if (score >= 40) {
    return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Fair' }
  }
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' }
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  subtext?: React.ReactNode
  className?: string
}

function MetricCard({ icon, label, value, subtext, className }: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {subtext && (
              <div className="text-xs text-muted-foreground">{subtext}</div>
            )}
          </div>
          <div className="rounded-full bg-muted p-2">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// HEALTH SCORE CARD
// ============================================================================

function HealthScoreCard({ score }: { score: number | null | undefined }) {
  const { bg, text, label } = getHealthScoreColor(score)

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Health Score</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">
                {score ?? '-'}
              </p>
              {score !== null && score !== undefined && (
                <span className="text-lg text-muted-foreground">/100</span>
              )}
            </div>
            <p className={cn('text-sm font-medium', text)}>{label}</p>
          </div>
          <div className={cn('rounded-full p-3', bg)}>
            <Heart className={cn('h-5 w-5', text)} />
          </div>
        </div>
        {/* Progress bar */}
        {score !== null && score !== undefined && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', bg)}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MetricsDashboard({
  healthScore,
  lifetimeValue,
  totalOrders,
  averageOrderValue,
  firstOrderDate,
  lastOrderDate,
  creditLimit,
  priority,
}: MetricsDashboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Health Score - Featured */}
      <HealthScoreCard score={healthScore} />

      {/* Lifetime Value */}
      <MetricCard
        icon={<DollarSign className="h-5 w-5 text-green-600" />}
        label="Lifetime Value"
        value={<FormatAmount amount={typeof lifetimeValue === 'string' ? parseFloat(lifetimeValue) : lifetimeValue} cents={false} showCents={false} />}
        subtext={priority?.contractValue ? <>Contract: <FormatAmount amount={typeof priority.contractValue === 'string' ? parseFloat(priority.contractValue) : priority.contractValue} cents={false} showCents={false} /></> : undefined}
      />

      {/* Total Orders */}
      <MetricCard
        icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
        label="Total Orders"
        value={totalOrders}
        subtext={lastOrderDate ? `Last: ${formatDate(lastOrderDate)}` : undefined}
      />

      {/* Average Order Value */}
      <MetricCard
        icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
        label="Average Order"
        value={<FormatAmount amount={typeof averageOrderValue === 'string' ? parseFloat(averageOrderValue) : averageOrderValue} cents={false} showCents={false} />}
        subtext={firstOrderDate ? `Since ${formatDate(firstOrderDate)}` : undefined}
      />

      {/* Credit Limit (conditionally show) */}
      {creditLimit && (
        <MetricCard
          icon={<CreditCard className="h-5 w-5 text-amber-600" />}
          label="Credit Limit"
          value={<FormatAmount amount={typeof creditLimit === 'string' ? parseFloat(creditLimit) : creditLimit} cents={false} showCents={false} />}
        />
      )}

      {/* Priority/Service Level (conditionally show) */}
      {priority && (
        <MetricCard
          icon={<Star className="h-5 w-5 text-yellow-600" />}
          label="Service Level"
          value={priority.serviceLevel.charAt(0).toUpperCase() + priority.serviceLevel.slice(1)}
          subtext={`${priority.priorityLevel.toUpperCase()} priority`}
        />
      )}
    </div>
  )
}
