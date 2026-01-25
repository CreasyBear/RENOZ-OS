/**
 * SegmentAnalytics Component
 *
 * Performance analytics for customer segments:
 * - Segment size and value metrics
 * - Health score distribution
 * - Top customers by LTV
 * - Status breakdown
 *
 * ARCHITECTURE: Presentational component - receives data via props from route.
 */
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  PieChart,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { FormatAmount } from '@/components/shared/format'

// ============================================================================
// TYPES
// ============================================================================

interface SegmentWithStats {
  id: string
  name: string
  description: string | null
  color: string | null
  customerCount: number
  totalValue: number
  avgHealthScore: number
  growth: number
  createdAt: string
  updatedAt: string
  isActive: boolean
  criteriaCount: number
}

interface HealthDistributionItem {
  level: string
  count: number
  percentage: number
  color: string
}

interface CustomerByStatus {
  status: string
  count: number
  percentage: number
}

interface TopCustomer {
  id: string
  name: string
  customerCode: string
  lifetimeValue: number
  healthScore: number | null
}

interface SegmentAnalyticsProps {
  /** Segment details with stats */
  segment?: SegmentWithStats | null
  /** Health score distribution */
  healthDistribution?: HealthDistributionItem[]
  /** Customers by status */
  customersByStatus?: CustomerByStatus[]
  /** Top customers by LTV */
  topCustomers?: TopCustomer[]
  /** Loading state */
  isLoading?: boolean
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

interface KpiCardProps {
  title: string
  value: React.ReactNode
  icon: React.ElementType
  description?: string
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
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

// ============================================================================
// HEALTH DISTRIBUTION CHART
// ============================================================================

interface HealthDistributionChartProps {
  distribution: HealthDistributionItem[]
}

function HealthDistributionChart({ distribution }: HealthDistributionChartProps) {
  if (!distribution.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Health Distribution
          </CardTitle>
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
          <PieChart className="h-5 w-5" />
          Health Distribution
        </CardTitle>
        <CardDescription>Customer health score breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        <div className="h-8 rounded-full overflow-hidden flex">
          {distribution.map((seg) => (
            <div
              key={seg.level}
              className={cn(seg.color, 'transition-all')}
              style={{ width: `${seg.percentage}%` }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3">
          {distribution.map((seg) => (
            <div key={seg.level} className="flex items-center gap-2">
              <div className={cn('h-3 w-3 rounded-full', seg.color)} />
              <span className="text-sm text-muted-foreground">{seg.level}</span>
              <span className="text-sm font-medium ml-auto">
                {seg.count} ({seg.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STATUS BREAKDOWN
// ============================================================================

interface StatusBreakdownProps {
  statuses: CustomerByStatus[]
}

function StatusBreakdown({ statuses }: StatusBreakdownProps) {
  if (!statuses.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status Breakdown
          </CardTitle>
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
          <Activity className="h-5 w-5" />
          Status Breakdown
        </CardTitle>
        <CardDescription>Customers by status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((status) => (
          <div key={status.status} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">{status.status}</span>
              <span className="text-muted-foreground">
                {status.count} ({status.percentage}%)
              </span>
            </div>
            <Progress value={status.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TOP CUSTOMERS TABLE
// ============================================================================

interface TopCustomersTableProps {
  customers: TopCustomer[]
}

function TopCustomersTable({ customers }: TopCustomersTableProps) {
  if (!customers.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No customers in this segment</p>
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
        <CardDescription>Highest lifetime value in segment</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">LTV</TableHead>
              <TableHead className="text-right">Health</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.customerCode}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <FormatAmount amount={customer.lifetimeValue} cents={false} compact showCents={false} />
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={cn(
                      customer.healthScore && customer.healthScore >= 80
                        ? 'bg-green-100 text-green-700'
                        : customer.healthScore && customer.healthScore >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : customer.healthScore && customer.healthScore >= 40
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {customer.healthScore ?? '-'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SegmentAnalytics({
  segment,
  healthDistribution = [],
  customersByStatus = [],
  topCustomers = [],
  isLoading = false,
  className,
}: SegmentAnalyticsProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <AnalyticsSkeleton />
      </div>
    )
  }

  if (!segment) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground">Segment not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{segment.name}</h2>
        <p className="text-muted-foreground">
          {segment.description || 'Segment performance analytics'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Customers"
          value={segment.customerCount.toLocaleString()}
          icon={Users}
        />
        <KpiCard
          title="Total Value"
          value={<FormatAmount amount={segment.totalValue} cents={false} compact showCents={false} />}
          icon={DollarSign}
        />
        <KpiCard
          title="Avg Health Score"
          value={segment.avgHealthScore}
          icon={Activity}
        />
        <KpiCard
          title="Criteria"
          value={segment.criteriaCount}
          icon={TrendingUp}
          description="Filter conditions"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HealthDistributionChart distribution={healthDistribution} />
        <StatusBreakdown statuses={customersByStatus} />
      </div>

      {/* Top Customers */}
      <TopCustomersTable customers={topCustomers} />
    </div>
  )
}
