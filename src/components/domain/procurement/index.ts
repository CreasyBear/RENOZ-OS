/**
 * Procurement Domain Components
 *
 * Barrel export for procurement operations UI components.
 * SUPP-PROCUREMENT-DASHBOARD story.
 */

export {
  DashboardWidgets,
  SpendOverviewWidget,
  OrderStatusWidget,
  SupplierPerformanceWidget,
  ApprovalQueueWidget,
} from './dashboard-widgets';
export type { DashboardWidgetsProps } from './dashboard-widgets';

export { ProcurementAlerts, AlertItem, CompactAlertsList } from './procurement-alerts';
export type { ProcurementAlertsProps } from './procurement-alerts';

// Re-export types from schemas for convenience
export type {
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
  ProcurementAlert,
  AlertSeverity,
  AlertType,
} from '@/lib/schemas/procurement';

export { ProcurementDashboard } from './procurement-dashboard';
export type { ProcurementDashboardProps } from './procurement-dashboard';

// Receiving components
export {
  ReceivingDashboardContainer,
  ReceivingDashboard,
  ReceivingStats,
} from './receiving';
export type {
  ReceivingDashboardContainerProps,
  ReceivingDashboardProps,
  ReceivingMetrics,
  ReceivingStatsProps,
} from './receiving';
