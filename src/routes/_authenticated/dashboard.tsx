/**
 * Dashboard Route
 *
 * The landing page after authentication.
 * Shows key metrics, quick actions, and summary widgets.
 *
 * Features:
 * - Full-width PageLayout
 * - Pipeline summary widget
 * - Recent orders widget
 * - Low stock alerts widget
 * - Quick action buttons
 * - Loading skeleton during data fetch
 */
import { createFileRoute } from '@tanstack/react-router'
import {
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Plus,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageLayout } from '@/components/layout'
import { toastInfo } from '@/hooks'
import {
  useRealtimeOrders,
  useRealtimePipeline,
  getStatusColor,
  getStatusLabel,
} from '@/hooks/realtime'
import { WelcomeChecklist } from '@/components/domain/dashboard/welcome-checklist'
import { UpcomingCallsWidget } from '@/components/domain/communications'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

// ============================================================================
// PLACEHOLDER DATA (will be replaced with actual API calls)
// ============================================================================

const PIPELINE_SUMMARY = {
  totalValue: '$124,500',
  dealCount: 23,
  hotLeads: 8,
  changePercent: 12.5,
}

const RECENT_ORDERS = [
  { id: '1', customer: 'Acme Corp', amount: '$4,250', status: 'pending' },
  { id: '2', customer: 'TechStart Inc', amount: '$1,890', status: 'processing' },
  { id: '3', customer: 'Global Solutions', amount: '$7,500', status: 'completed' },
]

const LOW_STOCK_ALERTS = [
  { product: 'Premium Widget A', stock: 5, threshold: 10 },
  { product: 'Standard Part B', stock: 3, threshold: 15 },
]

// ============================================================================
// COMPONENT
// ============================================================================

function Dashboard() {
  // Subscribe to realtime updates for live data indicators
  const { status: ordersStatus } = useRealtimeOrders({ notifyOnNew: true })
  const { status: pipelineStatus } = useRealtimePipeline({ notifyOnStageChange: true })

  // Use the most relevant status (prefer connected, then connecting, then error)
  const combinedStatus = ordersStatus === 'connected' && pipelineStatus === 'connected'
    ? 'connected'
    : ordersStatus === 'connecting' || pipelineStatus === 'connecting'
      ? 'connecting'
      : ordersStatus === 'error' || pipelineStatus === 'error'
        ? 'error'
        : 'disconnected'

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Dashboard"
        description={
          <span className="flex items-center gap-2">
            Welcome back! Here&apos;s what&apos;s happening today.
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className={cn('h-2 w-2 rounded-full', getStatusColor(combinedStatus))} />
              {getStatusLabel(combinedStatus)}
            </span>
          </span>
        }
        actions={<QuickActions />}
      />
      <PageLayout.Content>
        {/* Welcome Checklist - shown for new users */}
        <WelcomeChecklist className="mb-6" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Pipeline Summary */}
          <MetricCard
            title="Pipeline Value"
            value={PIPELINE_SUMMARY.totalValue}
            subtitle={`${PIPELINE_SUMMARY.dealCount} active deals`}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={`+${PIPELINE_SUMMARY.changePercent}%`}
            trendUp
          />

          {/* Customer Count */}
          <MetricCard
            title="Hot Leads"
            value={PIPELINE_SUMMARY.hotLeads.toString()}
            subtitle="Leads requiring attention"
            icon={<Users className="h-5 w-5" />}
          />

          {/* Recent Orders */}
          <MetricCard
            title="Recent Orders"
            value={RECENT_ORDERS.length.toString()}
            subtitle="Orders today"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Upcoming Calls Widget - self-contained component that fetches its own data */}
          <UpcomingCallsWidget limit={5} />

          {/* Recent Orders Widget */}
          <WidgetCard title="Recent Orders">
            <div className="divide-y divide-gray-100">
              {RECENT_ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {order.customer}
                    </p>
                    <p className="text-sm text-gray-500">{order.amount}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))}
            </div>
          </WidgetCard>

          {/* Low Stock Alerts Widget */}
          <WidgetCard title="Low Stock Alerts">
            {LOW_STOCK_ALERTS.length > 0 ? (
              <div className="space-y-3">
                {LOW_STOCK_ALERTS.map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg bg-amber-50 p-3"
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.product}
                      </p>
                      <p className="text-xs text-gray-500">
                        {alert.stock} in stock (threshold: {alert.threshold})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                No low stock alerts
              </p>
            )}
          </WidgetCard>
        </div>
      </PageLayout.Content>
    </PageLayout>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function QuickActions() {
  const handleNewCustomer = () => {
    // Placeholder - will navigate to customer creation form when route exists
    toastInfo('Customer creation coming soon - this feature will be available after the Customers module is implemented.')
  }

  const handleNewQuote = () => {
    // Placeholder - will navigate to quote creation form when route exists
    toastInfo('Quote creation coming soon - this feature will be available after the Pipeline module is implemented.')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleNewCustomer}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2',
          'bg-gray-900 text-white text-sm font-medium',
          'hover:bg-gray-800 transition-colors'
        )}
      >
        <Plus className="h-4 w-4" />
        New Customer
      </button>
      <button
        type="button"
        onClick={handleNewQuote}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2',
          'border border-gray-300 text-gray-700 text-sm font-medium',
          'hover:bg-gray-50 transition-colors'
        )}
      >
        <FileText className="h-4 w-4" />
        New Quote
      </button>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
}

function MetricCard({ title, value, subtitle, icon, trend, trendUp }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-gray-900">{value}</span>
        {trend && (
          <span
            className={cn(
              'text-sm font-medium',
              trendUp ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}

interface WidgetCardProps {
  title: string
  children: React.ReactNode
}

function WidgetCard({ title, children }: WidgetCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[status] || 'bg-gray-100 text-gray-800'
      )}
    >
      {status}
    </span>
  )
}
