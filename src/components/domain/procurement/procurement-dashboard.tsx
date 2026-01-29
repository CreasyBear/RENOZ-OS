/**
 * Procurement Dashboard Component (Presenter)
 *
 * Main dashboard view combining widgets, alerts, and spend trends.
 * Receives all data via props from the container route.
 *
 * @see SUPP-PROCUREMENT-DASHBOARD story
 * @see src/routes/_authenticated/procurement/dashboard.tsx (Container)
 */

import { Link } from '@tanstack/react-router';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardWidgets } from './dashboard-widgets';
import { ProcurementAlerts } from './procurement-alerts';
import type {
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
} from './dashboard-widgets';
import type { ProcurementAlert } from './procurement-alerts';

// ============================================================================
// TYPES
// ============================================================================

interface ProcurementDashboardProps {
  /** @source useSpendMetrics hook in container */
  spendMetrics?: SpendMetrics;
  /** @source useOrderMetrics hook in container */
  orderMetrics?: OrderMetrics;
  /** @source useSupplierMetrics hook in container */
  supplierMetrics?: SupplierMetrics;
  /** @source usePendingApprovals hook in container */
  pendingApprovals?: ApprovalItem[];
  /** @source useProcurementAlerts hook in container */
  alerts?: ProcurementAlert[];
  /** @source Combined loading state from all hooks in container */
  isLoading?: boolean;
  /** @source refetch from useProcurementDashboard in container */
  onRefresh?: () => void;
  /** @source Mutation handler in container */
  onDismissAlert?: (id: string) => void;
  /** @source useState in container */
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  /** @source setState handler in container */
  onDateRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

/**
 * Recent Activity Widget
 * Shows latest procurement-related activities.
 * @TODO: Replace with real activity feed from useActivityLog hook
 */
function RecentActivity() {
  // Placeholder - will be replaced with real activity data
  const activities: { action: string; detail: string; time: string }[] = [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="bg-primary mt-1 h-2 w-2 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-muted-foreground text-xs">{activity.detail}</p>
                </div>
                <span className="text-muted-foreground text-xs">{activity.time}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Link to="/purchase-orders/create">
            <Button variant="outline" className="w-full justify-start">
              Create Purchase Order
            </Button>
          </Link>
          <Link to="/suppliers">
            <Button variant="outline" className="w-full justify-start">
              Manage Suppliers
            </Button>
          </Link>
          <Link to="/purchase-orders" search={{ status: 'pending_approval' }}>
            <Button variant="outline" className="w-full justify-start">
              Review Approvals
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Procurement Dashboard Presenter
 * Pure UI component - all data received via props from container.
 * Shows loading states and empty states when data is not available.
 */
function ProcurementDashboard({
  spendMetrics,
  orderMetrics,
  supplierMetrics,
  pendingApprovals,
  alerts,
  isLoading = false,
  onRefresh,
  onDismissAlert,
  dateRange = 'month',
  onDateRangeChange,
}: ProcurementDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <Select
            value={dateRange}
            onValueChange={(v) => onDateRangeChange?.(v as typeof dateRange)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard widgets */}
      <DashboardWidgets
        spendMetrics={spendMetrics}
        orderMetrics={orderMetrics}
        supplierMetrics={supplierMetrics}
        pendingApprovals={pendingApprovals}
        isLoading={isLoading}
      />

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <RecentActivity />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <ProcurementAlerts
            alerts={alerts}
            isLoading={isLoading}
            onDismiss={onDismissAlert}
            maxVisible={10}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { ProcurementDashboard };
export type { ProcurementDashboardProps };
