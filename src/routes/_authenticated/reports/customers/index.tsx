/**
 * Customer Reports Route
 *
 * Executive analytics and reporting for customer insights:
 * - Analytics Dashboard: KPIs, trends, segment performance
 * - Lifecycle Analytics: Cohorts, retention, churn
 * - Value Analysis: LTV, profitability, customer tiers
 *
 * ARCHITECTURE: Route fetches data via hooks, passes to presentational components.
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BarChart3, Users, DollarSign, Download, FileText, Mail, Loader2 } from 'lucide-react'
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
} from '@/hooks'

export const Route = createFileRoute('/_authenticated/reports/customers/')({
  component: CustomerReportsPage,
})

type DateRange = '7d' | '30d' | '90d' | '365d' | 'all'

function CustomerReportsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  // Fetch analytics data
  const dashboard = useDashboardAnalytics(dateRange)
  const lifecycle = useLifecycleAnalytics()
  const value = useValueAnalytics()

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}`)
  }

  const handleScheduleReport = () => {
    // TODO: Implement scheduled reports
    console.log('Opening schedule report dialog')
  }

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

        <TabsContent value="dashboard" className="mt-6">
          {dashboard.isError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load dashboard data. Please try again.</AlertDescription>
            </Alert>
          ) : (
            <AnalyticsDashboard
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              kpis={dashboard.kpis?.kpis}
              healthDistribution={dashboard.health?.distribution}
              customerTrend={dashboard.trends?.customerTrend}
              revenueTrend={dashboard.trends?.revenueTrend}
              segments={dashboard.segments?.segments}
              isLoading={dashboard.isLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6">
          {lifecycle.isError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load lifecycle data. Please try again.</AlertDescription>
            </Alert>
          ) : (
            <LifecycleAnalytics
              stages={lifecycle.stages?.stages}
              isLoading={lifecycle.isLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="value" className="mt-6">
          {value.isError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load value analysis data. Please try again.</AlertDescription>
            </Alert>
          ) : (
            <ValueAnalysis
              tiers={value.tiers?.tiers}
              topCustomers={value.topCustomers?.customers}
              isLoading={value.isLoading}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
