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
import { FormatAmount, MetricCard } from '@/components/shared'
import { useOrgFormat } from '@/hooks/use-org-format'
import { getIconColorClasses } from '@/lib/status/colors'
import { getHealthScoreSemanticColor, getHealthScoreLabel } from '../customer-status-config'
import { formatDate } from '@/lib/formatters'
import { capitalizeFirst } from '@/lib/customer-utils'

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

  // Get health score icon color (matches customer-detail-view.tsx pattern)
  const getHealthIconColor = (score: number | null | undefined): string => {
    const semanticColor = getHealthScoreSemanticColor(score ?? null)
    return getIconColorClasses(semanticColor)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Health Score - Using MetricCard for consistency (matches customer-detail-view.tsx pattern) */}
      <MetricCard
        icon={Heart}
        iconClassName={getHealthIconColor(healthScore)}
        title="Health Score"
        value={healthScore ?? '—'}
        subtitle={getHealthScoreLabel(healthScore)}
      />

      {/* Lifetime Value */}
      <MetricCard
        icon={DollarSign}
        iconClassName={getIconColorClasses('success')}
        title="Lifetime Value"
        value={<FormatAmount amount={typeof lifetimeValue === 'string' ? parseFloat(lifetimeValue) : lifetimeValue} cents={false} showCents={false} />}
        subtitle={contractSubtitle}
      />

      {/* Total Orders */}
      <MetricCard
        icon={ShoppingCart}
        iconClassName={getIconColorClasses('info')}
        title="Total Orders"
        value={totalOrders}
        subtitle={lastOrderDate ? `Last: ${formatDate(lastOrderDate, { locale: 'en-AU' })}` : undefined}
      />

      {/* Average Order Value */}
      <MetricCard
        icon={TrendingUp}
        iconClassName={getIconColorClasses('progress')}
        title="Average Order"
        value={<FormatAmount amount={typeof averageOrderValue === 'string' ? parseFloat(averageOrderValue) : averageOrderValue} cents={false} showCents={false} />}
        subtitle={firstOrderDate ? `Since ${formatDate(firstOrderDate, { locale: 'en-AU' })}` : undefined}
      />

      {/* Credit Limit (conditionally show) */}
      {creditLimit && (
        <MetricCard
          icon={CreditCard}
          iconClassName={getIconColorClasses('warning')}
          title="Credit Limit"
          value={<FormatAmount amount={typeof creditLimit === 'string' ? parseFloat(creditLimit) : creditLimit} cents={false} showCents={false} />}
        />
      )}

      {/* Priority/Service Level (conditionally show) */}
      {priority && (
        <MetricCard
          icon={Star}
          iconClassName={getIconColorClasses('warning')}
          title="Service Level"
          value={capitalizeFirst(priority.serviceLevel)}
          subtitle={`${priority.priorityLevel.toUpperCase()} priority`}
        />
      )}
    </div>
  )
}
