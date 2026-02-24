/**
 * Financial Dashboard Page Component
 *
 * Landing page for the Financial domain with quick access cards
 * to AR Aging, Revenue Recognition, Xero Sync, and Payment Reminders.
 * Also displays the full financial dashboard with KPIs and charts.
 *
 * @source metrics from useFinancialDashboardMetrics hook
 * @source revenue from useRevenueByPeriod hook
 * @source topCustomers from useTopCustomersByRevenue hook
 * @source outstanding from useOutstandingInvoices hook
 *
 * @see src/routes/_authenticated/financial/index.tsx - Route definition
 * @see src/components/domain/financial/financial-dashboard.tsx (presenter)
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { subMonths, startOfYear } from 'date-fns';
import { Clock, TrendingUp, RefreshCw, Bell, ArrowRight, CalendarDays, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import { FinancialDashboard } from '@/components/domain/financial/financial-dashboard';
import {
  useFinancialDashboardMetrics,
  useRevenueByPeriod,
  useTopCustomersByRevenue,
  useOutstandingInvoices,
} from '@/hooks/financial';
import type { PeriodType } from '@/lib/schemas';

// Sub-page cards configuration
const financialPages = [
  {
    title: 'Invoices',
    description: 'View and manage customer invoices in one place',
    href: '/invoices' as const,
    icon: FileText,
    color: 'text-slate-600',
  },
  {
    title: 'AR Aging',
    description: 'Accounts receivable aging report with bucket analysis',
    href: '/financial/ar-aging' as const,
    icon: Clock,
    color: 'text-orange-500',
  },
  {
    title: 'Payment Plans',
    description: 'Installment schedules and payment plan tracking',
    href: '/financial/payment-plans' as const,
    icon: CalendarDays,
    color: 'text-emerald-500',
  },
  {
    title: 'Revenue Recognition',
    description: 'Track recognized vs deferred revenue and Xero sync status',
    href: '/financial/revenue' as const,
    icon: TrendingUp,
    color: 'text-green-500',
  },
  {
    title: 'Xero Sync',
    description: 'Invoice sync status, history, and retry failed syncs',
    href: '/financial/xero-sync' as const,
    icon: RefreshCw,
    color: 'text-blue-500',
  },
  {
    title: 'Payment Reminders',
    description: 'Manage reminder templates and view reminder history',
    href: '/financial/reminders' as const,
    icon: Bell,
    color: 'text-purple-500',
  },
] as const;

export default function FinancialPage() {
  // ===========================================================================
  // UI STATE
  // ===========================================================================

  // Period type state for revenue chart
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  // Top customers revenue basis
  const [topCustomersBasis, setTopCustomersBasis] = useState<'invoiced' | 'cash'>('invoiced');

  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  // Dashboard metrics query
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useFinancialDashboardMetrics({ includePreviousPeriod: true });

  // Revenue by period query
  const {
    data: revenueByPeriod,
    isLoading: revenueLoading,
    error: revenueError,
  } = useRevenueByPeriod({
    dateFrom: subMonths(new Date(), 6),
    dateTo: new Date(),
    periodType,
  });

  // Top customers query
  const {
    data: topCustomers,
    isLoading: customersLoading,
    error: customersError,
  } = useTopCustomersByRevenue({
    dateFrom: startOfYear(new Date()),
    dateTo: new Date(),
    pageSize: 5,
    basis: topCustomersBasis,
  });

  // Outstanding invoices query
  const {
    data: outstanding,
    isLoading: outstandingLoading,
    error: outstandingError,
  } = useOutstandingInvoices({ overdueOnly: true, pageSize: 5 });

  // Combined loading and error states
  const isLoading = metricsLoading || revenueLoading || customersLoading || outstandingLoading;
  const error = metricsError || revenueError || customersError || outstandingError;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Financial"
        description="Accounts receivable, revenue recognition, and payment management"
      />
      <PageLayout.Content>
        {/* Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {financialPages.map((page) => {
            const Icon = page.icon;
            return (
              <Card key={page.href} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{page.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${page.color}`} />
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{page.description}</CardDescription>
                  <Link
                    to={page.href}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    View
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Financial Dashboard */}
        <div className="mt-8">
          <FinancialDashboard
            dashboardData={{
              metrics,
              revenueByPeriod,
              topCustomers,
              outstanding,
            }}
            isLoading={isLoading}
            error={error ?? undefined}
            periodType={periodType}
            onPeriodTypeChange={setPeriodType}
            topCustomersBasis={topCustomersBasis}
            onTopCustomersBasisChange={setTopCustomersBasis}
          />
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
