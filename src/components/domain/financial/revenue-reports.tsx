/**
 * RevenueReports Component
 *
 * Revenue recognition reports with state tracking, period summaries,
 * and deferred revenue balance. Includes Xero sync status monitoring.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-008c)
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { useOrgFormat } from '@/hooks/use-org-format';
import { format } from 'date-fns';
import {
  recognitionStateSchema,
  recognitionStateValues,
} from '@/lib/schemas/financial/revenue-recognition';
import type {
  DeferredRevenueBalance,
  RecognitionState,
  RecognitionSummary,
  RevenueRecognitionRecord,
} from '@/lib/schemas/financial/revenue-recognition';

// ============================================================================
// TYPES
// ============================================================================

export interface RevenueReportsProps {
  /** From route container (combined query loading state). */
  isLoading: boolean;
  /** From listRecognitionsByState query. */
  records: RevenueRecognitionRecord[];
  /** From getRecognitionSummary query. */
  summary: RecognitionSummary[];
  /** From getDeferredRevenueBalance query. */
  balance: DeferredRevenueBalance | null;
  /** Derived from records for summary cards. */
  stateCounts: Record<RecognitionState, number>;
  /** UI state for current filter selection. */
  stateFilter: RecognitionState | 'all';
  /** Updates filter selection in container. */
  onStateFilterChange: (value: RecognitionState | 'all') => void;
  /** From retryRecognitionSync mutation. */
  retryingId: string | null;
  /** Triggers retry mutation in container. */
  onRetry: (recognitionId: string) => void;
  className?: string;
}

// ============================================================================
// STATE CONFIG
// ============================================================================

const stateConfig: Record<
  RecognitionState,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
  }
> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  recognized: { label: 'Recognized', variant: 'default', icon: CheckCircle },
  syncing: { label: 'Syncing', variant: 'default', icon: Loader2 },
  synced: { label: 'Synced', variant: 'outline', icon: CheckCircle },
  sync_failed: { label: 'Sync Failed', variant: 'destructive', icon: AlertTriangle },
  manual_override: { label: 'Manual Override', variant: 'destructive', icon: AlertTriangle },
};

function RecognitionStateBadge({ state }: { state: RecognitionState }) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={cn('h-3 w-3', state === 'syncing' && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// SUMMARY CHART
// ============================================================================

interface SummaryChartProps {
  periods: RecognitionSummary[];
}

function SummaryChart({ periods }: SummaryChartProps) {
  const { formatCurrency } = useOrgFormat();
  const maxTotal = Math.max(...periods.map((p) => p.totalRecognized), 1);

  return (
    <div className="space-y-3">
      {periods.map((period) => {
        const onDeliveryPercent = maxTotal > 0 ? (period.onDeliveryAmount / maxTotal) * 100 : 0;
        const milestonePercent = maxTotal > 0 ? (period.milestoneAmount / maxTotal) * 100 : 0;
        const timeBasedPercent = maxTotal > 0 ? (period.timeBasedAmount / maxTotal) * 100 : 0;

        return (
          <div key={period.period} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{period.periodLabel}</span>
              <span className="font-medium">
                <FormatAmount amount={period.totalRecognized} />
              </span>
            </div>
            <div className="bg-muted flex h-4 overflow-hidden rounded-full">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${onDeliveryPercent}%` }}
                title={`On Delivery: ${formatCurrency(period.onDeliveryAmount, {
                  cents: false,
                  showCents: true,
                })}`}
              />
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${milestonePercent}%` }}
                title={`Milestone: ${formatCurrency(period.milestoneAmount, {
                  cents: false,
                  showCents: true,
                })}`}
              />
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${timeBasedPercent}%` }}
                title={`Time-based: ${formatCurrency(period.timeBasedAmount, {
                  cents: false,
                  showCents: true,
                })}`}
              />
            </div>
          </div>
        );
      })}
      <div className="mt-2 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>On Delivery</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span>Time-based</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEFERRED BALANCE CARD
// ============================================================================

interface DeferredBalanceCardProps {
  balance: DeferredRevenueBalance;
}

function DeferredBalanceCard({ balance }: DeferredBalanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Deferred Revenue Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Total Deferred</p>
            <p className="text-xl font-semibold">
              <FormatAmount amount={balance.totalDeferred} />
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Recognized</p>
            <p className="text-xl font-semibold text-green-600">
              <FormatAmount amount={balance.totalRecognized} />
            </p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">Remaining</p>
            <p className="text-xl font-semibold text-blue-600">
              <FormatAmount amount={balance.totalRemaining} />
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">By Status ({balance.recordCount} records)</p>
          <div className="flex gap-2">
            <Badge variant="secondary">{balance.byStatus.deferred} Deferred</Badge>
            <Badge variant="outline">{balance.byStatus.partiallyRecognized} Partial</Badge>
            <Badge variant="default">{balance.byStatus.fullyRecognized} Complete</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RevenueReports = memo(function RevenueReports({
  isLoading,
  records,
  summary,
  balance,
  stateCounts,
  stateFilter,
  onStateFilterChange,
  retryingId,
  onRetry,
  className,
}: RevenueReportsProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Revenue Recognition Reports</h2>
        <p className="text-muted-foreground">
          Track recognized revenue, deferred revenue, and Xero sync status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
        {recognitionStateValues.map((state) => {
          const config = stateConfig[state];
          const Icon = config.icon;
          const count = stateCounts[state] || 0;

          return (
            <Card key={state}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      state === 'synced' && 'text-green-500',
                      state === 'sync_failed' && 'text-red-500',
                      state === 'manual_override' && 'text-red-500',
                      state === 'recognized' && 'text-blue-500',
                      state === 'syncing' && 'animate-spin text-blue-500',
                      state === 'pending' && 'text-yellow-500'
                    )}
                  />
                  <span className="text-muted-foreground text-xs">{config.label}</span>
                </div>
                <p className="mt-1 text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recognition Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recognition Summary (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No data for this period</p>
            ) : (
              <SummaryChart periods={summary} />
            )}
          </CardContent>
        </Card>

        {/* Deferred Balance */}
        {balance && <DeferredBalanceCard balance={balance} />}
      </div>

      {/* Recognition Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recognition Records</CardTitle>
          <Select
            value={stateFilter}
            onValueChange={(v) => {
              if (v === 'all') {
                onStateFilterChange('all');
              } else {
                const result = recognitionStateSchema.safeParse(v);
                if (result.success) {
                  onStateFilterChange(result.data);
                }
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="recognized">Recognized</SelectItem>
              <SelectItem value="syncing">Syncing</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
              <SelectItem value="sync_failed">Sync Failed</SelectItem>
              <SelectItem value="manual_override">Manual Override</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <DollarSign className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No recognition records found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>{format(new Date(rec.recognitionDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-mono">
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: rec.orderId }}
                        className="hover:underline text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rec.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: rec.customerId }}
                        search={{}}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rec.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {rec.recognitionType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{rec.milestoneName || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      <FormatAmount amount={rec.recognizedAmount} />
                    </TableCell>
                    <TableCell>
                      <RecognitionStateBadge state={rec.state} />
                    </TableCell>
                    <TableCell>
                      {(rec.state === 'sync_failed' || rec.state === 'recognized') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(rec.id)}
                          disabled={retryingId === rec.id}
                        >
                          <RefreshCw
                            className={cn('h-4 w-4', retryingId === rec.id && 'animate-spin')}
                          />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
