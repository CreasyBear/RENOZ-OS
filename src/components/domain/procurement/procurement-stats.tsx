/**
 * ProcurementStats Component
 *
 * Displays procurement metrics and alerts.
 */

export interface ProcurementMetrics {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpend: number;
  monthlySpend: number;
  budgetRemaining: number;
  budgetUsed: number;
  avgOrderValue: number;
  onTimeDelivery: number;
  supplierCount: number;
  activeApprovals: number;
  pendingReceipts: number;
  qualityScore: number;
  alerts: ProcurementAlert[];
}

export interface ProcurementAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'budget' | 'quality' | 'delivery' | 'supplier';
  severity?: 'low' | 'medium' | 'high';
  title?: string;
  message?: string;
  description?: string;
  actionRequired?: boolean;
  timestamp?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface ProcurementStatsProps {
  metrics: ProcurementMetrics;
  formatCurrency: (amount: number) => string;
}

export function ProcurementStats({ metrics, formatCurrency }: ProcurementStatsProps) {
  return (
    <div data-testid="procurement-stats">
      <div>Total Orders: {metrics.totalOrders}</div>
      <div>Active Orders: {metrics.activeOrders}</div>
      <div>Completed Orders: {metrics.completedOrders}</div>
      <div>Total Spend: {formatCurrency(metrics.totalSpend)}</div>
      <div>Monthly Spend: {formatCurrency(metrics.monthlySpend)}</div>
      <div>Budget Remaining: {formatCurrency(metrics.budgetRemaining)}</div>
      <div>Budget Used: {formatCurrency(metrics.budgetUsed)}</div>
      <div>Average Order Value: {formatCurrency(metrics.avgOrderValue)}</div>
      <div>On-Time Delivery: {metrics.onTimeDelivery}%</div>
      <div>Supplier Count: {metrics.supplierCount}</div>
      <div>Active Approvals: {metrics.activeApprovals}</div>
      <div>Pending Receipts: {metrics.pendingReceipts}</div>
      <div>Quality Score: {metrics.qualityScore}%</div>
      {metrics.alerts.map((alert) => (
        <div key={alert.id} data-testid={`alert-${alert.id}`}>
          {alert.title || alert.message}
          {alert.description && <div>{alert.description}</div>}
        </div>
      ))}
    </div>
  );
}
