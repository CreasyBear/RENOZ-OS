/**
 * Supplier Performance Component
 *
 * Displays supplier performance analytics including ratings,
 * on-time delivery, quality metrics, and rankings.
 *
 * @see SUPP-ANALYTICS-REPORTING story
 */

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrgFormat } from '@/hooks/use-org-format';
import type { SupplierPerformanceData, SupplierRanking } from '@/lib/schemas/analytics';

// ============================================================================
// TYPES
// ============================================================================

interface SupplierPerformanceProps {
  suppliers?: SupplierPerformanceData[];
  rankings?: SupplierRanking[];
  isLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 3.5) return 'text-yellow-600';
  return 'text-red-600';
}

function getDeliveryColor(rate: number): string {
  if (rate >= 95) return 'text-green-600';
  if (rate >= 85) return 'text-yellow-600';
  return 'text-red-600';
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="text-muted-foreground h-4 w-4" />;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function PerformanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// AGGREGATE METRICS
// ============================================================================

interface AggregateMetricsProps {
  suppliers: SupplierPerformanceData[];
}

function AggregateMetrics({ suppliers }: AggregateMetricsProps) {
  const avgDelivery =
    suppliers.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / suppliers.length;
  const avgQuality = suppliers.reduce((sum, s) => sum + s.qualityRating, 0) / suppliers.length;
  const avgLeadTime = suppliers.reduce((sum, s) => sum + s.avgLeadTime, 0) / suppliers.length;
  const avgRejection = suppliers.reduce((sum, s) => sum + s.rejectionRate, 0) / suppliers.length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg On-Time Delivery</CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getDeliveryColor(avgDelivery)}`}>
            {avgDelivery.toFixed(1)}%
          </div>
          <Progress value={avgDelivery} className="mt-2 h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Quality Rating</CardTitle>
          <Star className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getRatingColor(avgQuality)}`}>
            {avgQuality.toFixed(1)}/5.0
          </div>
          <Progress value={(avgQuality / 5) * 100} className="mt-2 h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
          <CheckCircle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgLeadTime.toFixed(1)} days</div>
          <p className="text-muted-foreground text-xs">Across all suppliers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg Rejection Rate</CardTitle>
          <AlertTriangle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${avgRejection > 3 ? 'text-red-600' : 'text-green-600'}`}
          >
            {avgRejection.toFixed(1)}%
          </div>
          <p className="text-muted-foreground text-xs">Items rejected on receipt</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SUPPLIER RANKINGS
// ============================================================================

interface SupplierRankingsProps {
  rankings: SupplierRanking[];
}

function SupplierRankings({ rankings }: SupplierRankingsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="h-5 w-5" />
        <CardTitle>Supplier Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rankings.map((ranking) => (
            <div
              key={ranking.supplierId}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                    ranking.rank === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : ranking.rank === 2
                        ? 'bg-gray-100 text-gray-700'
                        : ranking.rank === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {ranking.rank}
                </div>
                <div>
                  <p className="font-medium">{ranking.supplierName}</p>
                  <div className="text-muted-foreground flex items-center gap-1 text-sm">
                    <TrendIcon trend={ranking.trend} />
                    <span>
                      {ranking.change > 0 ? '+' : ''}
                      {ranking.change !== 0 ? `${ranking.change} positions` : 'No change'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{ranking.score}</div>
                <p className="text-muted-foreground text-xs">Performance Score</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DETAILED PERFORMANCE TABLE
// ============================================================================

interface PerformanceTableProps {
  suppliers: SupplierPerformanceData[];
}

function PerformanceTable({ suppliers }: PerformanceTableProps) {
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (amount: number) =>
    formatCurrency(amount, { cents: false, showCents: true });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Supplier Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">On-Time %</TableHead>
              <TableHead className="text-right">Quality</TableHead>
              <TableHead className="text-right">Communication</TableHead>
              <TableHead className="text-right">Overall</TableHead>
              <TableHead className="text-right">Lead Time</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.supplierId}>
                <TableCell className="font-medium">{supplier.supplierName}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={supplier.onTimeDeliveryRate >= 95 ? 'secondary' : 'default'}
                    className={getDeliveryColor(supplier.onTimeDeliveryRate)}
                  >
                    {supplier.onTimeDeliveryRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={getRatingColor(supplier.qualityRating)}>
                    {supplier.qualityRating.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={getRatingColor(supplier.communicationRating)}>
                    {supplier.communicationRating.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${getRatingColor(supplier.overallRating)}`}>
                    {supplier.overallRating.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="text-right">{supplier.avgLeadTime}d</TableCell>
                <TableCell className="text-right">{supplier.totalOrders}</TableCell>
                <TableCell className="text-right">
                  {formatCurrencyDisplay(supplier.totalSpend)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Supplier Performance Presenter
 * Displays supplier rankings and performance metrics.
 * Receives all data via props - no sample data defaults.
 *
 * @source suppliers from useSupplierMetrics or useProcurementDashboard hook
 * @source rankings from useSupplierMetrics hook
 */
function SupplierPerformance({
  suppliers,
  rankings,
  isLoading = false,
}: SupplierPerformanceProps) {
  if (isLoading) {
    return <PerformanceSkeleton />;
  }

  // Show empty state if no data available
  if (!suppliers?.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            No supplier data available. Data will appear once suppliers and purchase orders are created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AggregateMetrics suppliers={suppliers} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {rankings && <SupplierRankings rankings={rankings} />}
        </div>
        <div className="lg:col-span-2">
          <PerformanceTable suppliers={suppliers} />
        </div>
      </div>
    </div>
  );
}

export { SupplierPerformance, SupplierRankings, PerformanceTable, AggregateMetrics };
export type { SupplierPerformanceProps };
