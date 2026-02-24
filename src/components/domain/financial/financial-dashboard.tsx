/**
 * FinancialDashboard Component (Presenter)
 *
 * Financial KPI dashboard with revenue, AR, payments, and GST metrics.
 * Includes charts for revenue trends and top customers.
 *
 * This is a pure presenter component - all data is passed via props from the container.
 *
 * @see src/routes/_authenticated/financial/index.tsx (container)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-007b)
 */

import { memo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  CreditCard,
  Receipt,
  AlertTriangle,
  Building2,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { useOrgFormat } from '@/hooks/use-org-format';
import { format } from 'date-fns';
import type {
  KPIMetric,
  PeriodType,
  FinancialDashboardData,
  RevenueChartBasis,
  RevenueChartProps,
} from '@/lib/schemas';
import { periodTypeSchema } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface FinancialDashboardProps {
  /** @source Aggregated from 4 parallel queries in container */
  dashboardData: FinancialDashboardData;
  /** @source Combined loading: metricsLoading || revenueLoading || customersLoading || outstandingLoading */
  isLoading: boolean;
  /** @source Any query error from container */
  error?: Error;
  /** @source Local state for period selector, managed by container */
  periodType: PeriodType;
  /** @source State setter from container */
  onPeriodTypeChange: (type: PeriodType) => void;
  /** Top customers revenue basis: invoiced or cash */
  topCustomersBasis?: 'invoiced' | 'cash';
  /** @source State setter for top customers basis */
  onTopCustomersBasisChange?: (basis: 'invoiced' | 'cash') => void;
  className?: string;
}

// ============================================================================
// KPI CARD
// ============================================================================

interface KPICardProps {
  title: string;
  icon: typeof DollarSign;
  metric: KPIMetric;
  format?: 'currency' | 'number';
  className?: string;
}

function KPICard({ title, icon: Icon, metric, format: fmt = 'currency', className }: KPICardProps) {
  const TrendIcon =
    metric.changeDirection === 'up'
      ? TrendingUp
      : metric.changeDirection === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    metric.changeDirection === 'up'
      ? 'text-green-600'
      : metric.changeDirection === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground';

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {fmt === 'currency' ? <FormatAmount amount={metric.value} /> : metric.value}
        </div>
        {metric.changePercent !== undefined && (
          <div className={cn('mt-1 flex items-center gap-1 text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(metric.changePercent).toFixed(1)}% vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// REVENUE CHART (SIMPLE BAR)
// ============================================================================

function RevenueChart({ periods, basis, onBasisChange }: RevenueChartProps) {
  const { formatCurrency } = useOrgFormat();
  const values = periods.map((p) => (basis === 'cash' ? p.cashRevenue : p.totalRevenue));
  const maxRevenue = Math.max(...values, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Select value={basis} onValueChange={(v) => onBasisChange(v as RevenueChartBasis)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p>
              <strong>Invoiced:</strong> Orders placed in period (by order date).
            </p>
            <p className="mt-1">
              <strong>Cash:</strong> Payments received in period (by payment date).
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      {periods.map((period) => {
        const value = basis === 'cash' ? period.cashRevenue : period.totalRevenue;
        const resPercent =
          basis === 'invoiced' && maxRevenue > 0 ? (period.residentialRevenue / maxRevenue) * 100 : 0;
        const comPercent =
          basis === 'invoiced' && maxRevenue > 0 ? (period.commercialRevenue / maxRevenue) * 100 : 0;

        return (
          <div key={period.period} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{period.periodLabel}</span>
              <span className="font-medium">
                <FormatAmount amount={value} />
              </span>
            </div>
            <div className="bg-muted flex h-4 overflow-hidden rounded-full">
              {basis === 'invoiced' ? (
                <>
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${resPercent}%` }}
                    title={`Residential: ${formatCurrency(period.residentialRevenue, { cents: false, showCents: true })}`}
                  />
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${comPercent}%` }}
                    title={`Commercial: ${formatCurrency(period.commercialRevenue, { cents: false, showCents: true })}`}
                  />
                </>
              ) : (
                <div
                  className="bg-primary transition-all"
                  style={{ width: `${maxRevenue > 0 ? (value / maxRevenue) * 100 : 0}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
      {basis === 'invoiced' && (
        <div className="mt-2 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>Residential</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Commercial</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FinancialDashboard = memo(function FinancialDashboard({
  dashboardData,
  isLoading,
  error,
  periodType,
  onPeriodTypeChange,
  topCustomersBasis = 'invoiced',
  onTopCustomersBasisChange,
  className,
}: FinancialDashboardProps) {
  // Destructure aggregated data
  const { metrics, revenueByPeriod, topCustomers, outstanding } = dashboardData;
  const [chartBasis, setChartBasis] = useState<'invoiced' | 'cash'>('invoiced');

  // Loading state
  if (isLoading && !metrics) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load financial dashboard: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Financial Dashboard</h2>
        <p className="text-muted-foreground">
          {format(metrics.periodStart, 'dd MMM')} - {format(metrics.periodEnd, 'dd MMM yyyy')}
        </p>
      </div>

      {/* KPI Cards - Dual metrics: Invoiced (orders) vs Cash (payments) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Revenue (Invoiced) MTD"
          icon={DollarSign}
          metric={metrics.revenueInvoicedMTD}
        />
        <KPICard title="AR Balance" icon={Receipt} metric={metrics.arBalance} />
        <KPICard
          title="Revenue (Cash) MTD"
          icon={CreditCard}
          metric={metrics.revenueCashMTD}
        />
        <KPICard title="GST Collected MTD" icon={Receipt} metric={metrics.gstCollectedMTD} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-muted-foreground text-sm">Overdue</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">
              <FormatAmount amount={metrics.overdueAmount.value} />
            </p>
            <p className="text-muted-foreground text-xs">{metrics.overdueCount} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              <span className="text-muted-foreground text-sm">Outstanding</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{metrics.invoiceCount}</p>
            <p className="text-muted-foreground text-xs">invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <span className="text-muted-foreground text-sm">Avg Days to Payment</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{metrics.averageDaysToPayment}</p>
            <p className="text-muted-foreground text-xs">days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="text-muted-foreground text-sm">Payment Rate</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {(metrics.paymentRate * 100).toFixed(1)}%
            </p>
            <p className="text-muted-foreground text-xs">paid in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-muted-foreground text-sm">Overdue Rate</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {(metrics.overdueRate * 100).toFixed(1)}%
            </p>
            <p className="text-muted-foreground text-xs">overdue in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <span className="text-muted-foreground text-sm">Revenue (Invoiced) YTD</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              <FormatAmount amount={metrics.revenueInvoicedYTD.value} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-500" />
              <span className="text-muted-foreground text-sm">Revenue (Cash) YTD</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              <FormatAmount amount={metrics.revenueCashYTD.value} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue Trend</CardTitle>
            <Select
              value={periodType}
              onValueChange={(v) => {
                // Validate enum value before calling handler
                const result = periodTypeSchema.safeParse(v);
                if (result.success) {
                  onPeriodTypeChange(result.data);
                }
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading && !revenueByPeriod ? (
              <Skeleton className="h-48" />
            ) : (
              <RevenueChart
                periods={revenueByPeriod?.periods ?? []}
                basis={chartBasis}
                onBasisChange={setChartBasis}
              />
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Customers (YTD)</CardTitle>
            {onTopCustomersBasisChange && (
              <Select
                value={topCustomersBasis}
                onValueChange={(v) => onTopCustomersBasisChange(v as 'invoiced' | 'cash')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoiced">By Invoiced</SelectItem>
                  <SelectItem value="cash">By Cash</SelectItem>
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && !topCustomers ? (
              <Skeleton className="h-48" />
            ) : (
              <Table>
                <TableBody>
                  {topCustomers?.customers.map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {customer.isCommercial && <Building2 className="h-4 w-4 text-blue-500" />}
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: customer.customerId }}
                            search={{}}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {customer.customerName}
                          </Link>
                          {customer.isCommercial && (
                            <Badge variant="outline" className="text-xs">
                              $50K+
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <FormatAmount amount={customer.totalRevenue} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Overdue Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !outstanding ? (
            <Skeleton className="h-32" />
          ) : outstanding?.invoices.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No overdue invoices</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstanding?.invoices.map((inv) => (
                  <TableRow key={inv.orderId}>
                    <TableCell className="font-mono">
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: inv.orderId }}
                        className="hover:underline text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: inv.customerId }}
                        search={{}}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{inv.daysOverdue} days</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <FormatAmount amount={inv.balanceDue} />
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
