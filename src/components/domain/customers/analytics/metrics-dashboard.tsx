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
import { FormatAmount, MetricCard } from '@/components/shared'
import { useOrgFormat } from '@/hooks/use-org-format'

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

// Note: Using shared MetricCard from @/components/shared

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
  const { formatCurrency } = useOrgFormat()

  // Format contract value as string for subtitle
  const contractSubtitle = priority?.contractValue
    ? `Contract: ${formatCurrency(typeof priority.contractValue === 'string' ? parseFloat(priority.contractValue) : priority.contractValue, { cents: false })}`
    : undefined

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Health Score - Featured */}
      <HealthScoreCard score={healthScore} />

      {/* Lifetime Value */}
      <MetricCard
        icon={DollarSign}
        iconClassName="text-green-600"
        title="Lifetime Value"
        value={<FormatAmount amount={typeof lifetimeValue === 'string' ? parseFloat(lifetimeValue) : lifetimeValue} cents={false} showCents={false} />}
        subtitle={contractSubtitle}
      />

      {/* Total Orders */}
      <MetricCard
        icon={ShoppingCart}
        iconClassName="text-blue-600"
        title="Total Orders"
        value={totalOrders}
        subtitle={lastOrderDate ? `Last: ${formatDate(lastOrderDate)}` : undefined}
      />

      {/* Average Order Value */}
      <MetricCard
        icon={TrendingUp}
        iconClassName="text-purple-600"
        title="Average Order"
        value={<FormatAmount amount={typeof averageOrderValue === 'string' ? parseFloat(averageOrderValue) : averageOrderValue} cents={false} showCents={false} />}
        subtitle={firstOrderDate ? `Since ${formatDate(firstOrderDate)}` : undefined}
      />

      {/* Credit Limit (conditionally show) */}
      {creditLimit && (
        <MetricCard
          icon={CreditCard}
          iconClassName="text-amber-600"
          title="Credit Limit"
          value={<FormatAmount amount={typeof creditLimit === 'string' ? parseFloat(creditLimit) : creditLimit} cents={false} showCents={false} />}
        />
      )}

      {/* Priority/Service Level (conditionally show) */}
      {priority && (
        <MetricCard
          icon={Star}
          iconClassName="text-yellow-600"
          title="Service Level"
          value={priority.serviceLevel.charAt(0).toUpperCase() + priority.serviceLevel.slice(1)}
          subtitle={`${priority.priorityLevel.toUpperCase()} priority`}
        />
      )}
    </div>
  )
}
