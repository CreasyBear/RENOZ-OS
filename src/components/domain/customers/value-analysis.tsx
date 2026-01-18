/**
 * ValueAnalysis Component
 *
 * Customer value and profitability analysis:
 * - Lifetime value distribution (tiers)
 * - Top customers by LTV
 * - Profitability tiers (placeholder)
 *
 * ARCHITECTURE: Presentational component - receives data via props from route.
 */
import { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  Target,
  Wallet,
  ShoppingCart,
  Calendar,
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
import { Progress } from '@/components/ui/progress'
import { TruncateTooltip } from '@/components/shared/truncate-tooltip'
import { cn } from '@/lib/utils'
import { FormatAmount } from '@/components/shared/format'

// ============================================================================
// TYPES
// ============================================================================

interface ValueTier {
  name: string
  customers: number
  percentage: number
  revenue: number
  avgValue?: number
  color: string
}

interface TopCustomer {
  rank: number
  id?: string
  name: string
  code?: string
  ltv: number
  orders: number
  avgOrder: number
  healthScore?: number | null
  status?: string
}

interface ValueAnalysisProps {
  /** Value tier distribution */
  tiers?: ValueTier[]
  /** Top customers by LTV */
  topCustomers?: TopCustomer[]
  /** Loading state */
  isLoading?: boolean
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

// ============================================================================
// VALUE DISTRIBUTION
// ============================================================================

interface ValueDistributionProps {
  tiers?: ValueTier[]
  isLoading?: boolean
}

function ValueDistribution({ tiers, isLoading }: ValueDistributionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Value Distribution
          </CardTitle>
          <CardDescription>
            Customer segments by lifetime value
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full rounded-full" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!tiers?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Value Distribution
          </CardTitle>
          <CardDescription>
            Customer segments by lifetime value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate revenue share from revenue values
  const totalRevenue = tiers.reduce((sum, t) => sum + t.revenue, 0) || 1
  const tiersWithShare = tiers.map(t => ({
    ...t,
    revenueShare: Math.round((t.revenue / totalRevenue) * 100),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Value Distribution
        </CardTitle>
        <CardDescription>
          Customer segments by lifetime value
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue concentration bar */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Revenue Concentration</p>
          <div className="h-6 rounded-full overflow-hidden flex">
            {tiersWithShare.map(tier => (
              <div
                key={tier.name}
                className={cn(tier.color, 'transition-all relative group')}
                style={{ width: `${tier.revenueShare}%` }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 text-white text-xs font-medium">
                  {tier.revenueShare}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier breakdown */}
        <div className="space-y-3">
          {tiersWithShare.map(tier => (
            <div key={tier.name} className="flex items-center gap-3">
              <div className={cn('h-3 w-3 rounded-full', tier.color)} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tier.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {tier.customers} ({tier.percentage}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Revenue: <FormatAmount amount={tier.revenue} cents={false} compact showCents={false} /></span>
                  {tier.avgValue && <span>Avg LTV: <FormatAmount amount={tier.avgValue} cents={false} compact showCents={false} /></span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pareto indicator */}
        {tiersWithShare.length >= 2 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              <span>
                <strong>{tiersWithShare[0].percentage + tiersWithShare[1].percentage}%</strong> of customers generate{' '}
                <strong>{tiersWithShare[0].revenueShare + tiersWithShare[1].revenueShare}%</strong> of revenue
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TOP CUSTOMERS TABLE
// ============================================================================

interface TopCustomersProps {
  customers?: TopCustomer[]
  isLoading?: boolean
}

function TopCustomers({ customers, isLoading }: TopCustomersProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Customers
          </CardTitle>
          <CardDescription>
            Highest lifetime value customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!customers?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Customers
          </CardTitle>
          <CardDescription>
            Highest lifetime value customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No customers found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top Customers
        </CardTitle>
        <CardDescription>
          Highest lifetime value customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {customers.map(customer => (
            <div key={customer.rank} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted font-bold text-sm">
                {customer.rank}
              </div>
              <div className="flex-1 min-w-0">
                <TruncateTooltip text={customer.name} maxLength={30} className="font-medium" />
                <p className="text-xs text-muted-foreground">
                  {customer.orders} orders • ${customer.avgOrder.toLocaleString()} avg
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold"><FormatAmount amount={customer.ltv} cents={false} compact showCents={false} /></p>
                {customer.status && (
                  <Badge variant="secondary" className="text-xs">
                    {customer.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PROFITABILITY ANALYSIS (Static placeholder - needs cost data)
// ============================================================================

function ProfitabilityAnalysis() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Profitability Segments
        </CardTitle>
        <CardDescription>
          Customer segments by profit margin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Profitability analysis requires cost tracking.</p>
          <p className="text-sm mt-2">Coming soon after financial domain implementation.</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// VALUE KPIs (Static placeholder)
// ============================================================================

function ValueKpis() {
  const kpis = [
    { label: 'Avg Lifetime Value', value: '-', icon: Wallet },
    { label: 'Total Revenue', value: '-', icon: DollarSign },
    { label: 'Avg Order Value', value: '-', icon: ShoppingCart },
    { label: 'Orders per Customer', value: '-', icon: TrendingUp },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-muted-foreground">{kpi.value}</p>
                </div>
                <div className="rounded-full bg-muted p-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValueAnalysis({
  tiers,
  topCustomers,
  isLoading = false,
  className,
}: ValueAnalysisProps) {
  const [timeRange, setTimeRange] = useState('6m')

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Value Analysis</h2>
          <p className="text-muted-foreground">
            Customer profitability and lifetime value
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

      {/* KPIs - placeholder until order aggregation */}
      <ValueKpis />

      {/* Distribution and Top Customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ValueDistribution tiers={tiers} isLoading={isLoading} />
        <TopCustomers customers={topCustomers} isLoading={isLoading} />
      </div>

      {/* Profitability - placeholder until cost tracking */}
      <ProfitabilityAnalysis />
    </div>
  )
}
