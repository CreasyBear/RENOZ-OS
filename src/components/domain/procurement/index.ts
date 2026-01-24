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
export type {
  DashboardWidgetsProps,
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
} from './dashboard-widgets';

export { ProcurementAlerts, AlertItem, CompactAlertsList } from './procurement-alerts';
export type {
  ProcurementAlertsProps,
  ProcurementAlert,
  AlertSeverity,
  AlertType,
} from './procurement-alerts';

export { ProcurementDashboard } from './procurement-dashboard';
export type { ProcurementDashboardProps } from './procurement-dashboard';
