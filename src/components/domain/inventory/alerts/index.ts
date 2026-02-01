/**
 * Inventory Alert Components
 *
 * Components for managing inventory alert rules:
 * - AlertsListContainer - Full container with data fetching and mutations
 * - AlertsListPresenter - Pure presentation with table/mobile cards
 * - AlertsTablePresenter - Desktop table only
 * - AlertsMobileCards - Mobile card layout only
 * - AlertConfigForm - Alert rule configuration form
 * - AlertsPanel - Dashboard panel for triggered alerts
 */

// Container component (use for routes)
export { AlertsListContainer } from "./alerts-list-container";
export type { AlertsListContainerProps } from "./alerts-list-container";

// Presenter components (use for custom compositions)
export { AlertsListPresenter } from "./alerts-list-presenter";
export type { AlertsListPresenterProps } from "./alerts-list-presenter";

export { AlertsTablePresenter } from "./alerts-table-presenter";
export type { AlertsTablePresenterProps } from "./alerts-table-presenter";

export { AlertsMobileCards } from "./alerts-mobile-cards";
export type { AlertsMobileCardsProps } from "./alerts-mobile-cards";

// Column definitions
export { createAlertColumns, getAlertDisplayName, getThresholdDisplay } from "./alert-columns";
export type { AlertTableItem, AlertThreshold, CreateAlertColumnsOptions } from "./alert-columns";

// Configuration
export {
  ALERT_TYPE_CONFIG,
  getAlertTypeLabel,
  formatThresholdValue,
} from "./alert-type-config";
export type { AlertType, AlertTypeConfigItem } from "./alert-type-config";

// Legacy components (keep for backward compatibility)
export { AlertConfigForm } from "./alert-config-form";
export { AlertsList } from "./alerts-list";
export { AlertsPanel } from "./alerts-panel";
export { CreatePOFromAlertDialog } from "./create-po-from-alert-dialog";
