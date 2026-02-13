/**
 * Financial Section
 *
 * Displays financial KPIs: Revenue MTD, AR Balance, Cash Received, Overdue AR
 * Plus a revenue trend chart.
 *
 * Uses shared MetricCard component per METRIC-CARD-STANDARDS.md
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DollarSign, AlertTriangle, BarChart3, Banknote, Receipt } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { MetricCardPopover, type RecentItem } from '@/components/shared/metric-card-popover';
import { EmptyState } from '@/components/shared/empty-state';
import { FormatAmount } from '@/components/shared/format';

// ============================================================================
// TYPES
// ============================================================================

/** Recent invoice for popover display */
export interface RecentInvoice {
  id: string;
  orderNumber: string;
  customerName: string;
  balanceDue: number;
  daysOverdue?: number;
}

export interface FinancialMetrics {
  revenueMtd: number;
  revenueMtdChange?: number;
  arBalance: number;
  cashReceived: number;
  overdueAr: number;
  // Contextual data for insights
  invoiceCount?: number;       // Outstanding invoices
  overdueCount?: number;       // Overdue invoices
  avgDaysToPayment?: number;   // Average days to get paid
  // Recent items for popovers
  recentOutstandingInvoices?: RecentInvoice[];
  recentOverdueInvoices?: RecentInvoice[];
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
}

export interface FinancialSectionProps {
  metrics?: FinancialMetrics | null;
  revenueTrend?: RevenueTrendPoint[] | null;
  isLoading?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// CHART COMPONENT
// ============================================================================

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
  isLoading?: boolean;
}

function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <EmptyState
          icon={BarChart3}
          message="No revenue data available for the selected period."
          className="py-4"
        />
      </div>
    );
  }

  const displayData = data.slice(-12);
  const maxValue = Math.max(...displayData.map((p) => p.revenue));
  const totalRevenue = displayData.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div
      className="rounded-lg border bg-muted/30 p-4"
      role="figure"
      aria-label={`Revenue trend chart showing ${displayData.length} periods with total revenue of ${formatCurrency(totalRevenue)}`}
    >
      <p className="text-sm font-medium text-muted-foreground mb-2">Revenue Trend</p>
      {/* Accessible summary for screen readers */}
      <p className="sr-only">
        Bar chart showing revenue over {displayData.length} periods.
        Highest: {formatCurrency(maxValue)}.
        Total: {formatCurrency(totalRevenue)}.
      </p>
      {/* Visual chart */}
      <div className="flex items-end gap-1 h-32" aria-hidden="true">
        {displayData.map((point, idx) => {
          const height = maxValue > 0 ? (point.revenue / maxValue) * 100 : 0;
          return (
            <div
              key={idx}
              className="flex-1 bg-primary/60 rounded-t transition-all hover:bg-primary focus:bg-primary focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ height: `${Math.max(height, 4)}%` }}
              tabIndex={0}
              role="img"
              aria-label={`${point.period}: ${formatCurrency(point.revenue)}`}
            />
          );
        })}
      </div>
      {/* Text legend for keyboard users */}
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{displayData[0]?.period}</span>
        <span>{displayData[displayData.length - 1]?.period}</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FinancialSection({ metrics, revenueTrend, isLoading }: FinancialSectionProps) {
  const navigate = useNavigate();

  // Build contextual subtitles
  const arSubtitle = metrics?.invoiceCount
    ? `${metrics.invoiceCount} invoice${metrics.invoiceCount !== 1 ? 's' : ''} outstanding`
    : undefined;

  const overdueSubtitle = metrics?.overdueCount
    ? `${metrics.overdueCount} invoice${metrics.overdueCount !== 1 ? 's' : ''} overdue`
    : metrics?.overdueAr === 0
      ? 'All current'
      : undefined;

  const cashSubtitle = metrics?.avgDaysToPayment
    ? `Avg ${metrics.avgDaysToPayment} days to payment`
    : undefined;

  // Transform recent invoices for popover display
  const arRecentItems: RecentItem[] = (metrics?.recentOutstandingInvoices ?? []).map((inv) => ({
    id: inv.id,
    title: inv.customerName,
    subtitle: `${inv.orderNumber} · ${formatCurrency(inv.balanceDue)}`,
    status: inv.daysOverdue && inv.daysOverdue > 0 ? 'warning' : 'neutral',
    href: `/orders/${inv.id}`,
  }));

  const overdueRecentItems: RecentItem[] = (metrics?.recentOverdueInvoices ?? []).map((inv) => ({
    id: inv.id,
    title: inv.customerName,
    subtitle: `${inv.orderNumber} · ${inv.daysOverdue} days overdue`,
    status: (inv.daysOverdue ?? 0) > 30 ? 'error' : 'warning',
    href: `/orders/${inv.id}`,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Financial</CardTitle>
        <Link
          to="/financial"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View Details
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Grid - Using shared MetricCard with drill-down */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Revenue MTD"
            value={<FormatAmount amount={metrics?.revenueMtd ?? 0} currency="AUD" />}
            delta={metrics?.revenueMtdChange}
            icon={DollarSign}
            onClick={() => navigate({ to: '/financial/revenue' })}
            isLoading={isLoading}
          />
          <MetricCardPopover
            items={arRecentItems}
            viewAllHref="/financial/ar-aging"
            viewAllLabel="View all outstanding"
            emptyMessage="No outstanding invoices"
            disabled={isLoading}
          >
            <MetricCard
              title="AR Balance"
              value={<FormatAmount amount={metrics?.arBalance ?? 0} currency="AUD" />}
              subtitle={arSubtitle}
              icon={Receipt}
              onClick={() => navigate({ to: '/financial/ar-aging' })}
              isLoading={isLoading}
            />
          </MetricCardPopover>
          <MetricCard
            title="Cash Received"
            value={<FormatAmount amount={metrics?.cashReceived ?? 0} currency="AUD" />}
            subtitle={cashSubtitle}
            icon={Banknote}
            onClick={() => navigate({ to: '/orders', search: { paymentStatus: 'paid' } })}
            isLoading={isLoading}
          />
          <MetricCardPopover
            items={overdueRecentItems}
            viewAllHref="/financial/ar-aging?bucket=overdue"
            viewAllLabel="View all overdue"
            emptyMessage="No overdue invoices"
            disabled={isLoading}
          >
            <MetricCard
              title="Overdue AR"
              value={<FormatAmount amount={metrics?.overdueAr ?? 0} currency="AUD" />}
              subtitle={overdueSubtitle}
              icon={AlertTriangle}
              alert={!!metrics?.overdueAr && metrics.overdueAr > 0}
              onClick={() => navigate({ to: '/financial/ar-aging', search: { bucket: 'overdue' } })}
              isLoading={isLoading}
            />
          </MetricCardPopover>
        </div>

        {/* Revenue Trend Chart */}
        <RevenueTrendChart data={revenueTrend ?? []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
