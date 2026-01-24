/**
 * Procurement Dashboard Component
 *
 * Main dashboard view combining widgets, alerts, and spend trends.
 * Integrates with server functions for real-time data.
 *
 * @see SUPP-PROCUREMENT-DASHBOARD story
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
  spendMetrics?: SpendMetrics;
  orderMetrics?: OrderMetrics;
  supplierMetrics?: SupplierMetrics;
  pendingApprovals?: ApprovalItem[];
  alerts?: ProcurementAlert[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDismissAlert?: (id: string) => void;
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

// ============================================================================
// PLACEHOLDER DATA
// ============================================================================

// Sample data for demonstration - in production, this would come from server
const sampleSpendMetrics: SpendMetrics = {
  totalSpend: 125000,
  monthlySpend: 32500,
  budgetTotal: 150000,
  budgetUsed: 125000,
  trendPercent: 12,
  trendDirection: 'up',
};

const sampleOrderMetrics: OrderMetrics = {
  totalOrders: 45,
  pendingApproval: 8,
  awaitingDelivery: 12,
  completedThisMonth: 25,
};

const sampleSupplierMetrics: SupplierMetrics = {
  totalSuppliers: 32,
  activeSuppliers: 28,
  avgRating: 4.2,
  topPerformers: [
    { id: '1', name: 'ABC Supplies', rating: 4.9 },
    { id: '2', name: 'XYZ Materials', rating: 4.8 },
    { id: '3', name: 'Premier Parts', rating: 4.7 },
  ],
};

const sampleApprovals: ApprovalItem[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-0145',
    supplierName: 'ABC Supplies',
    amount: 12500,
    currency: 'AUD',
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-0146',
    supplierName: 'XYZ Materials',
    amount: 8200,
    currency: 'AUD',
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    priority: 'normal',
  },
];

const sampleAlerts: ProcurementAlert[] = [
  {
    id: 'alert-1',
    type: 'approval_overdue',
    severity: 'warning',
    title: 'Approval Overdue',
    message: 'PO-2026-0142 has been pending approval for more than 48 hours.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    linkTo: '/purchase-orders/$poId',
    linkParams: { poId: 'po-abc' },
    linkLabel: 'View Order',
    dismissible: true,
  },
  {
    id: 'alert-2',
    type: 'delivery_delayed',
    severity: 'warning',
    title: 'Delivery Delayed',
    message: 'Expected delivery for PO-2026-0138 is 3 days overdue.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    dismissible: true,
  },
  {
    id: 'alert-3',
    type: 'price_expiring',
    severity: 'info',
    title: 'Price Agreement Expiring',
    message: '5 price agreements with ABC Supplies expire in 30 days.',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    linkTo: '/suppliers/$supplierId',
    linkParams: { supplierId: 'supplier-abc' },
    linkLabel: 'Review Agreements',
    dismissible: true,
  },
];

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

function RecentActivity() {
  const activities = [
    { action: 'Order approved', detail: 'PO-2026-0143 approved by John', time: '15 min ago' },
    { action: 'Goods received', detail: '24 items from XYZ Materials', time: '1 hour ago' },
    { action: 'New supplier added', detail: 'Premier Parts onboarded', time: '3 hours ago' },
    { action: 'Price updated', detail: 'ABC Supplies - 5% discount applied', time: '5 hours ago' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
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

function ProcurementDashboard({
  spendMetrics = sampleSpendMetrics,
  orderMetrics = sampleOrderMetrics,
  supplierMetrics = sampleSupplierMetrics,
  pendingApprovals = sampleApprovals,
  alerts = sampleAlerts,
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
