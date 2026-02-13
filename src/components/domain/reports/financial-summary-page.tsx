/**
 * Financial Summary Report Page
 *
 * KPI cards, revenue trend chart, and cash flow summary.
 *
 * @see reports_domain_remediation Phase 6
 */
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { format, subMonths } from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Download,
  Mail,
} from 'lucide-react';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatePickerWithRange, type DateRange } from '@/components/ui/date-picker-with-range';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFavoriteButton } from './report-favorite-button';
import { toast } from '@/hooks';
import { FormatAmount } from '@/components/shared/format';
import { useOrgFormat } from '@/hooks/use-org-format';
import {
  useFinancialSummaryReport,
  useExportFinancialSummaryReport,
  useCreateScheduledReport,
} from '@/hooks/reports';
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form';
import type { FinancialSummarySearchParams } from '@/lib/schemas/reports/financial-summary';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const DEFAULT_RANGE_MONTHS = 6;

function getDateRangeFromSearch(search: FinancialSummarySearchParams): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  if (search.dateFrom && search.dateTo) {
    return {
      dateFrom: new Date(search.dateFrom),
      dateTo: new Date(search.dateTo),
    };
  }
  const dateFrom = subMonths(now, DEFAULT_RANGE_MONTHS);
  const dateTo = now;
  return { dateFrom, dateTo };
}

export function FinancialSummaryPage() {
  const search = useSearch({ from: '/_authenticated/reports/financial' });
  const navigate = useNavigate({ from: '/reports/financial' });
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { dateFrom, dateTo } = useMemo(
    () => getDateRangeFromSearch(search),
    [search]
  );
  const periodType = search.periodType ?? 'monthly';

  const hasUrlDateRange = !!search.dateFrom && !!search.dateTo;

  const { data, isLoading } = useFinancialSummaryReport({
    dateFrom,
    dateTo,
    periodType,
  });
  const createScheduledReport = useCreateScheduledReport();
  const exportReport = useExportFinancialSummaryReport();
  const { formatCurrency } = useOrgFormat();

  const handlePeriodChange = useCallback(
    (value: string) => {
      navigate({
        search: (prev) => ({ ...prev, periodType: value as FinancialSummarySearchParams['periodType'] }),
      });
    },
    [navigate]
  );

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      const from = range?.from;
      const to = range?.to;
      if (!from || !to) return;
      navigate({
        search: (prev) => ({
          ...prev,
          dateFrom: format(from, 'yyyy-MM-dd'),
          dateTo: format(to, 'yyyy-MM-dd'),
        }),
      });
    },
    [navigate]
  );

  useEffect(() => {
    if (!hasUrlDateRange) {
      navigate({
        search: (prev) => ({
          ...prev,
          dateFrom: format(dateFrom, 'yyyy-MM-dd'),
          dateTo: format(dateTo, 'yyyy-MM-dd'),
        }),
        replace: true,
      });
    }
  }, [hasUrlDateRange, dateFrom, dateTo, navigate]);

  const handleExport = useCallback(
    (exportFormat: 'csv' | 'pdf' | 'excel') => {
      const reportFormat = exportFormat === 'excel' ? 'xlsx' : exportFormat;
      exportReport.mutate(
        {
          dateFrom,
          dateTo,
          format: reportFormat,
        },
        {
          onSuccess: (result) => {
            window.open(result.reportUrl, '_blank');
            toast.success('Report exported successfully');
          },
          onError: () => {
            toast.error('Failed to export report');
          },
        }
      );
    },
    [dateFrom, dateTo, exportReport]
  );

  const handleScheduleReport = useCallback(() => setScheduleOpen(true), []);
  const handleScheduleSubmit = useCallback(
    async (input: Parameters<typeof createScheduledReport.mutateAsync>[0]) => {
      await createScheduledReport.mutateAsync(input);
    },
    [createScheduledReport]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No financial data available for the selected period.
        </CardContent>
      </Card>
    );
  }

  const { kpis, trends, cashFlow } = data;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={{ from: dateFrom, to: dateTo }}
            onDateChange={handleDateRangeChange}
            placeholder="Date range"
          />
          <Select value={periodType} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]" aria-label="Aggregation period">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <ReportFavoriteButton reportType="financial" />
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormatAmount amount={kpis.revenue} />
            </div>
            {kpis.revenueChangePercent !== undefined && (
              <p
                className={`text-xs flex items-center gap-1 mt-1 ${
                  kpis.revenueChangePercent > 0 ? 'text-green-600' : kpis.revenueChangePercent < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                {kpis.revenueChangePercent > 0 ? <TrendingUp className="h-3 w-3" /> : null}
                {kpis.revenueChangePercent.toFixed(1)}% vs previous
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AR Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormatAmount amount={kpis.arBalance} />
            </div>
            {cashFlow.overdueCount > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {cashFlow.overdueCount} overdue
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormatAmount amount={kpis.cashReceived} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GST Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <FormatAmount amount={kpis.gstCollected} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(data.periodStart, 'MMM d, yyyy')} – {format(data.periodEnd, 'MMM d, yyyy')}
          </p>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No trend data for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodLabel" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v, { cents: false, compact: true })} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, { cents: true })}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="totalRevenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  name="Revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: `Financial Summary ${format(new Date(), 'yyyy-MM-dd')}`,
          frequency: 'monthly',
          format: 'pdf',
          recipients: { emails: [], userIds: [] },
          metrics: {
            metrics: ['revenue', 'orders_count', 'average_order_value'],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: 'previous_period',
          },
        }}
      />
    </div>
  );
}
