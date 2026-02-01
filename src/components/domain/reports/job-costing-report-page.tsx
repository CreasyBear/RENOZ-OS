/**
 * Job Costing Report Page
 *
 * Profitability analysis for battery installation jobs.
 */
import { useState, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/shared/data-table/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';
import { useJobCostingReport } from '@/hooks';
import { useCustomers } from '@/hooks';
import { useCreateScheduledReport, useGenerateReport } from '@/hooks/reports';
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form';
import { useOrgFormat } from '@/hooks/use-org-format';
import type { JobProfitabilityResult } from '@/lib/schemas';

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(period: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case 'this-month':
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      break;
    case 'last-month':
      startDate.setMonth(startDate.getMonth() - 1, 1);
      endDate.setDate(0); // Last day of previous month
      break;
    case 'this-quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate.setMonth(quarterStart, 1);
      endDate.setMonth(quarterStart + 3, 0);
      break;
    case 'this-year':
      startDate.setMonth(0, 1);
      endDate.setMonth(11, 31);
      break;
    case 'all-time':
    default:
      return { dateFrom: '', dateTo: '' };
  }

  return {
    dateFrom: startDate.toISOString().split('T')[0],
    dateTo: endDate.toISOString().split('T')[0],
  };
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Job costing report container.
 * @source hooks/useJobCostingReport, useCustomers
 */
export function JobCostingReportPage() {
  // Filter state
  const [period, setPeriod] = useState('this-month');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [jobType, setJobType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>('completed');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { formatCurrency } = useOrgFormat();
  const formatCurrencyDisplay = (value: number) =>
    formatCurrency(value, { cents: false, showCents: true });

  // Derived date range
  const { dateFrom, dateTo } = useMemo(() => getDateRange(period), [period]);

  // Fetch report data
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useJobCostingReport({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    customerId,
    jobType: jobType as
      | 'installation'
      | 'service'
      | 'warranty'
      | 'inspection'
      | 'commissioning'
      | undefined,
    status: status as
      | 'scheduled'
      | 'in_progress'
      | 'completed'
      | 'cancelled'
      | 'on_hold'
      | undefined,
    limit: 100,
    offset: 0,
  });

  // Fetch customers for filter dropdown
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const createScheduledReport = useCreateScheduledReport();
  const generateReport = useGenerateReport();

  // Export to CSV
  const handleExport = useCallback(
    (format: 'csv' | 'pdf' | 'excel') => {
      if (!reportData?.jobs.length) return;

      if (format === 'csv') {
        const headers = [
          'Job Number',
          'Title',
          'Customer',
          'Type',
          'Status',
          'Quoted',
          'Material Cost',
          'Labor Cost',
          'Total Cost',
          'Profit',
          'Margin %',
        ];

        const rows = reportData.jobs.map((job) => [
          job.jobNumber,
          job.jobTitle,
          job.customerName,
          job.jobType,
          job.status,
          job.quotedAmount.toFixed(2),
          job.materialCost.toFixed(2),
          job.laborCost.toFixed(2),
          job.actualCost.toFixed(2),
          job.profit.toFixed(2),
          job.marginPercent.toFixed(1),
        ]);

        const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-costing-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const reportFormat = format === 'excel' ? 'xlsx' : 'pdf';
      const exportRange = getExportDateRange(dateFrom, dateTo);
      generateReport
        .mutateAsync({
          metrics: ['revenue', 'orders_count', 'average_order_value'],
          dateFrom: exportRange.dateFrom,
          dateTo: exportRange.dateTo,
          format: reportFormat,
          includeCharts: true,
          includeTrends: true,
        })
        .then((result) => {
          window.open(result.reportUrl, '_blank', 'noopener,noreferrer');
        })
        .catch(() => {
          // Keep UI quiet; caller can toast
        });
    },
    [reportData, dateFrom, dateTo, generateReport]
  );

  const handleScheduleReport = useCallback(() => {
    setScheduleOpen(true);
  }, []);

  const handleScheduleSubmit = useCallback(
    async (data: Parameters<typeof createScheduledReport.mutateAsync>[0]) => {
      await createScheduledReport.mutateAsync(data);
    },
    [createScheduledReport]
  );

  // Table columns
  const columns: ColumnDef<JobProfitabilityResult>[] = useMemo(
    () => [
      {
        accessorKey: 'jobNumber',
        header: 'Job',
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.jobNumber}</span>
            <div className="text-muted-foreground line-clamp-1 text-sm">
              {row.original.jobTitle}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => <span className="text-sm">{row.original.customerName}</span>,
      },
      {
        accessorKey: 'jobType',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.jobType}
          </Badge>
        ),
      },
      {
        accessorKey: 'quotedAmount',
        header: 'Quoted',
        cell: ({ row }) => (
          <span className="font-mono">
            {formatCurrencyDisplay(row.original.quotedAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'materialCost',
        header: 'Materials',
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {formatCurrencyDisplay(row.original.materialCost)}
          </span>
        ),
      },
      {
        accessorKey: 'laborCost',
        header: 'Labor',
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {formatCurrencyDisplay(row.original.laborCost)}
          </span>
        ),
      },
      {
        accessorKey: 'actualCost',
        header: 'Total Cost',
        cell: ({ row }) => (
          <span className="font-mono">
            {formatCurrencyDisplay(row.original.actualCost)}
          </span>
        ),
      },
      {
        accessorKey: 'profit',
        header: 'Profit',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-mono font-medium',
              row.original.profit >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {formatCurrencyDisplay(row.original.profit)}
          </span>
        ),
      },
      {
        accessorKey: 'marginPercent',
        header: 'Margin',
        cell: ({ row }) => {
          const margin = row.original.marginPercent;
          return (
            <div className="flex items-center gap-1">
              {margin >= 10 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : margin >= 0 ? (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span
                className={cn(
                  'font-mono',
                  margin >= 10 ? 'text-green-600' : margin >= 0 ? 'text-yellow-600' : 'text-red-600'
                )}
              >
                {formatPercent(margin)}
              </span>
            </div>
          );
        },
      },
    ],
    [formatCurrencyDisplay]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <>
        {/* Summary cards skeleton */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load report'}
        onRetry={() => refetch()}
      />
    );
  }

  const summary = reportData?.summary;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Job Costing Export
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>Export Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleScheduleReport}>
            <Mail className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyDisplay(summary?.totalQuoted ?? 0)}
              </div>
              <p className="text-muted-foreground text-xs">From {summary?.totalJobs ?? 0} jobs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Cost
              </CardTitle>
              <Package className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrencyDisplay(summary?.totalActualCost ?? 0)}
              </div>
              <div className="text-muted-foreground flex gap-2 text-xs">
                <span>
                  Materials: {formatCurrencyDisplay(summary?.totalMaterialCost ?? 0)}
                </span>
                <span>•</span>
                <span>Labor: {formatCurrencyDisplay(summary?.totalLaborCost ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Profit
              </CardTitle>
              {(summary?.totalProfit ?? 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  (summary?.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {formatCurrencyDisplay(summary?.totalProfit ?? 0)}
              </div>
              <p className="text-muted-foreground text-xs">
                {summary?.profitableCount ?? 0} profitable, {summary?.lossCount ?? 0} at loss
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Average Margin
              </CardTitle>
              <Clock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  (summary?.averageMarginPercent ?? 0) >= 10
                    ? 'text-green-600'
                    : (summary?.averageMarginPercent ?? 0) >= 0
                      ? 'text-yellow-600'
                      : 'text-red-600'
                )}
              >
                {formatPercent(summary?.averageMarginPercent ?? 0)}
              </div>
              <p className="text-muted-foreground text-xs">Target: +15% minimum</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period" className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Select
              value={customerId ?? 'all'}
              onValueChange={(v) => setCustomerId(v === 'all' ? undefined : v)}
            >
              <SelectTrigger id="customer" className="w-[200px]">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customersData?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type</Label>
            <Select
              value={jobType ?? 'all'}
              onValueChange={(v) => setJobType(v === 'all' ? undefined : v)}
            >
              <SelectTrigger id="jobType" className="w-[160px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="installation">Installation</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="warranty">Warranty</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="commissioning">Commissioning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status ?? 'all'}
              onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}
            >
              <SelectTrigger id="status" className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      {/* Data Table */}
      {reportData?.jobs.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No jobs found"
          message="No jobs match the selected filters. Try adjusting the date range or other filters."
        />
      ) : (
        <DataTable columns={columns} data={reportData?.jobs ?? []} />
      )}
      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: 'Job Costing Report',
          description: 'Recurring job profitability and cost summaries',
          metrics: {
            metrics: ['revenue', 'orders_count', 'average_order_value'],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: 'previous_period',
          },
        }}
      />
    </>
  );
}

function getExportDateRange(
  dateFrom?: string,
  dateTo?: string
): { dateFrom: string; dateTo: string } {
  if (dateFrom && dateTo) {
    return { dateFrom: dateFrom, dateTo: dateTo };
  }
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 1);
  return {
    dateFrom: start.toISOString().split('T')[0],
    dateTo: end.toISOString().split('T')[0],
  };
}
