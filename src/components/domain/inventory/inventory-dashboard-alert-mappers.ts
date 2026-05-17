import type { TriggeredAlert } from '@/lib/schemas/inventory';
import type { DashboardAlert } from './inventory-dashboard-alerts-section';

export function buildDashboardAlerts(triggeredAlerts: TriggeredAlert[]): DashboardAlert[] {
  const severityMap: Record<string, DashboardAlert['severity']> = {
    critical: 'critical',
    high: 'warning',
    medium: 'info',
    low: 'info',
  };

  return triggeredAlerts.map((alert) => ({
    id: alert.alert?.id ?? crypto.randomUUID(),
    alertType: alert.alert?.alertType ?? 'low_stock',
    severity: severityMap[alert.severity] ?? 'warning',
    productName: alert.product?.name,
    locationName: alert.location?.name,
    message: alert.message ?? 'Alert triggered',
    value: alert.currentValue,
    threshold: alert.thresholdValue,
    triggeredAt: alert.alert?.lastTriggeredAt ? new Date(alert.alert.lastTriggeredAt) : new Date(),
    isFallback: alert.isFallback ?? false,
  }));
}
