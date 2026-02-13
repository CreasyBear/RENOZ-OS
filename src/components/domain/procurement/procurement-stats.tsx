/**
 * ProcurementStats Component
 *
 * Displays procurement metrics and alerts.
 */

import type { ProcurementStatsProps } from '@/lib/schemas/procurement';

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
        </div>
      ))}
    </div>
  );
}
