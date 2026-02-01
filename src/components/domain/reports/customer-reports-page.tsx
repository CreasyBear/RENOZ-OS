/**
 * Customer Reports Page
 *
 * Executive analytics and reporting for customer insights.
 */
import { useState, useCallback } from 'react'
import { BarChart3, Users, DollarSign, Download, FileText, Mail } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AnalyticsDashboard,
  LifecycleAnalytics,
  ValueAnalysis,
} from '@/components/domain/customers'
import {
  useDashboardAnalytics,
  useLifecycleAnalytics,
  useValueAnalytics,
  useQuickStats,
  useValueKpis,
  useProfitabilitySegments,
} from '@/hooks'
import {
  useCreateScheduledReport,
  useGenerateReport,
  type CreateScheduledReportInput,
} from '@/hooks/reports'
import { ScheduledReportForm } from '@/components/domain/settings/scheduled-report-form'
import { generateCSV, downloadCSV, formatDateForFilename } from '@/lib/utils/csv'
import { toast } from '@/hooks/_shared/use-toast'

type DateRange = '7d' | '30d' | '90d' | '365d' | 'all'
type ValueRange = '3m' | '6m' | '1y'
type LifecycleRange = '3m' | '6m' | '1y'

/**
 * Customer reports container.
 * @source hooks/useDashboardAnalytics, useLifecycleAnalytics, useValueAnalytics
 */
export function CustomerReportsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [valueRange, setValueRange] = useState<ValueRange>('6m')
  const [lifecycleRange, setLifecycleRange] = useState<LifecycleRange>('6m')
  const [scheduleOpen, setScheduleOpen] = useState(false)

  // Fetch analytics data
  const dashboard = useDashboardAnalytics(dateRange)
  const lifecycle = useLifecycleAnalytics(lifecycleRange)
  const value = useValueAnalytics()
  const quickStats = useQuickStats(dateRange)
  const valueKpis = useValueKpis(valueRange)
  const profitability = useProfitabilitySegments(valueRange)
  const createScheduledReport = useCreateScheduledReport()
  const generateReport = useGenerateReport()

  const handleExport = useCallback((format: 'pdf' | 'csv' | 'excel') => {
    if (format === 'csv') {
      const csvPayload = buildCsvPayload(activeTab, { dashboard, lifecycle, value })
      if (!csvPayload) {
        toast.error('No data to export')
        return
      }

      const csv = generateCSV(csvPayload)
      downloadCSV(
        csv,
        `customer-report-${activeTab}-${formatDateForFilename()}.csv`
      )
      toast.success('Customer report exported as CSV')
      return
    }

    const dateRangeBounds = getDateRangeBounds(dateRange)
    const reportFormat = format === 'excel' ? 'xlsx' : 'pdf'
    const metrics = getMetricsForTab(activeTab)

    generateReport
      .mutateAsync({
        metrics,
        dateFrom: dateRangeBounds.from,
        dateTo: dateRangeBounds.to,
        format: reportFormat,
        includeCharts: true,
        includeTrends: true,
      })
      .then((result) => {
        window.open(result.reportUrl, '_blank', 'noopener,noreferrer')
        toast.success(`Customer report exported as ${format.toUpperCase()}`)
      })
      .catch(() => {
        toast.error(`Failed to export ${format.toUpperCase()}`)
      })
  }, [activeTab, dashboard, lifecycle, value, dateRange, generateReport])

  const handleScheduleReport = useCallback(() => {
    setScheduleOpen(true)
  }, [])

  const handleScheduleSubmit = useCallback(
    async (data: CreateScheduledReportInput) => {
      try {
        await createScheduledReport.mutateAsync(data)
        toast.success('Customer report scheduled')
      } catch (error) {
        toast.error('Failed to schedule report')
        throw error
      }
    },
    [createScheduledReport]
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for customer management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleScheduleReport}>
            <Mail className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Lifecycle</span>
          </TabsTrigger>
          <TabsTrigger value="value" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Value Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-4">
          {dashboard.isError && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Some dashboard metrics failed to load. You can retry or continue.</span>
                <Button variant="outline" size="sm" onClick={() => dashboard.refetch()}>
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <AnalyticsDashboard
            dateRange={dateRange}
            onDateRangeChange={(range) => setDateRange(range as DateRange)}
            kpis={dashboard.kpis}
            healthDistribution={dashboard.health}
            customerTrend={dashboard.trends?.customerTrend}
            revenueTrend={dashboard.trends?.revenueTrend}
            segments={dashboard.segments}
            quickStats={quickStats.data}
            isLoading={dashboard.isLoading}
          />
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6 space-y-4">
          {lifecycle.isError && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Some lifecycle metrics failed to load. You can retry or continue.</span>
                <Button variant="outline" size="sm" onClick={() => lifecycle.refetch()}>
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <LifecycleAnalytics
            stages={lifecycle.stages}
            cohorts={lifecycle.cohorts}
            churn={lifecycle.churn}
            conversion={lifecycle.conversion}
            acquisition={lifecycle.acquisition}
            timeRange={lifecycleRange}
            onTimeRangeChange={(range: LifecycleRange) => setLifecycleRange(range)}
            isLoading={lifecycle.isLoading}
          />
        </TabsContent>

        <TabsContent value="value" className="mt-6 space-y-4">
          {value.isError && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Some value insights failed to load. You can retry or continue.</span>
                <Button variant="outline" size="sm" onClick={() => value.refetch()}>
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <ValueAnalysis
            tiers={value.tiers}
            topCustomers={value.topCustomers}
            valueKpis={valueKpis.data}
            profitabilitySegments={profitability.data?.segments}
            timeRange={valueRange}
            onTimeRangeChange={(range) => setValueRange(range as ValueRange)}
            isLoading={value.isLoading}
          />
        </TabsContent>
      </Tabs>

      <ScheduledReportForm
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleScheduleSubmit}
        isSubmitting={createScheduledReport.isPending}
        defaultValues={{
          name: 'Customer Performance Report',
          description: 'Recurring customer metrics and trends',
          metrics: {
            metrics: [
              'customer_count',
              'revenue',
              'orders_count',
              'average_order_value',
            ],
            includeCharts: true,
            includeTrends: true,
            comparisonPeriod: 'previous_period',
          },
        }}
      />
    </div>
  )
}

function getDateRangeBounds(range: DateRange) {
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  const fromDate = new Date(now)

  switch (range) {
    case '7d':
      fromDate.setDate(fromDate.getDate() - 7)
      break
    case '30d':
      fromDate.setDate(fromDate.getDate() - 30)
      break
    case '90d':
      fromDate.setDate(fromDate.getDate() - 90)
      break
    case '365d':
      fromDate.setDate(fromDate.getDate() - 365)
      break
    default:
      fromDate.setFullYear(fromDate.getFullYear() - 2)
  }

  return {
    from: fromDate.toISOString().split('T')[0],
    to,
  }
}

function getMetricsForTab(tab: string): string[] {
  switch (tab) {
    case 'lifecycle':
      return ['customer_count', 'orders_count', 'average_order_value']
    case 'value':
      return ['revenue', 'average_order_value', 'customer_count']
    case 'dashboard':
    default:
      return ['customer_count', 'revenue', 'orders_count', 'average_order_value']
  }
}

function buildCsvPayload(
  tab: string,
  data: {
    dashboard: ReturnType<typeof useDashboardAnalytics>
    lifecycle: ReturnType<typeof useLifecycleAnalytics>
    value: ReturnType<typeof useValueAnalytics>
  }
): { headers: string[]; rows: (string | number)[][] } | null {
  if (tab === 'dashboard') {
    const kpisData = data.dashboard.kpis
    if (!kpisData?.length) return null
    return {
      headers: ['Metric', 'Value', 'Change', 'Change Label'],
      rows: kpisData.map((kpi) => [
        kpi.label,
        kpi.value,
        kpi.change.toString(),
        kpi.changeLabel,
      ]),
    }
  }

  if (tab === 'lifecycle') {
    const cohorts = data.lifecycle.cohorts
    if (!cohorts?.length) return null
    return {
      headers: ['Cohort', 'Customers', 'Retention 30d', 'Retention 60d', 'Retention 90d'],
      rows: cohorts.map((row) => [
        row.period,
        row.customers,
        `${row.retention30}%`,
        `${row.retention60}%`,
        `${row.retention90}%`,
      ]),
    }
  }

  if (tab === 'value') {
    const tiers = data.value.tiers
    if (!tiers?.length) return null
    return {
      headers: ['Tier', 'Customers', 'Revenue', 'Avg Value'],
      rows: tiers.map((tier) => [
        tier.name,
        tier.customers,
        tier.revenue,
        tier.avgValue ?? 0,
      ]),
    }
  }

  return null
}
