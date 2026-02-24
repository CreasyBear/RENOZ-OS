/**
 * Orders Domain Components
 *
 * Exports all order-related UI components.
 */

// --- Status Configuration ---
export {
  ORDER_STATUS_CONFIG,
  ORDER_STATUS_DETAIL_CONFIG,
  PAYMENT_STATUS_CONFIG,
  isOrderOverdue,
  formatDueDateRelative,
  type DetailStatusConfig,
} from './order-status-config';

// --- Column Definitions ---
export {
  createOrderColumns,
  type CreateOrderColumnsOptions,
} from './order-columns';
export type { OrderTableItem } from '@/lib/schemas/orders';

// --- Presenters ---
export {
  OrdersListPresenter,
  type OrdersListPresenterProps,
} from './orders-list-presenter';
export {
  OrdersTablePresenter,
  type OrdersTablePresenterProps,
} from './orders-table-presenter';
export {
  OrdersMobileCards,
  type OrdersMobileCardsProps,
} from './orders-mobile-cards';

// --- Container ---
export {
  OrdersListContainer,
  buildOrderQuery,
  type OrdersListContainerProps,
} from './orders-list-container';

// --- Filter Config (FILTER-STANDARDS compliant) ---
export {
  ORDER_FILTER_CONFIG,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  DEFAULT_ORDER_FILTERS,
  type OrderFiltersState,
} from './order-filter-config';

// --- Detail View (Container/Presenter Pattern) ---
export {
  OrderDetailContainer,
  type OrderDetailContainerProps,
} from './containers/order-detail-container';
export {
  OrderDetailView,
  type OrderDetailViewProps,
} from './views/order-detail-view';

// --- Alerts (Zone 3) ---
export { OrderAlerts, OrderAlertsSkeleton, type OrderAlertsProps } from './alerts';

// --- Shared Components ---
export { MobileSidebarSheet, type MobileSidebarSheetProps } from './components';

// --- Bulk Operations ---
export {
  OrderBulkOperationsDialog,
  OPERATION_CONFIGS,
  type OrderBulkOperationsDialogProps,
  type OrderBulkOperation,
  type BulkOperationConfig,
} from './order-bulk-operations-dialog';

// --- Amendments ---
export * from './amendments';
export type { AmendmentListProps } from './amendments/amendment-list';
export type { AmendmentRequestDialogContainerProps } from './amendments/amendment-request-dialog-container';
export type { AmendmentReviewDialogProps } from './amendments/amendment-review-dialog';

// --- Cards ---
export * from './cards';

// --- Creation ---
export * from './creation';
export type { OrderCreationWizardProps, OrderSubmitData } from './creation/order-creation-wizard.tsx';
export type { CustomerSelectorProps, SelectedCustomer } from './creation/customer-selector';
export type { ProductSelectorProps, OrderLineItemDraft } from './creation/product-selector';

// --- Fulfillment ---
export * from './fulfillment';
export type { ShipOrderDialogProps } from './fulfillment/ship-order-dialog';
export type { ShipmentListProps } from './fulfillment/shipment-list';
export type { ConfirmDeliveryDialogProps } from './fulfillment/confirm-delivery-dialog';
export type { FulfillmentDashboardProps } from './fulfillment/fulfillment-dashboard';

// --- Templates ---
export * from './templates';
export type { TemplateLibraryProps } from './templates/template-library';
export type { TemplateSelectorProps } from './templates/template-selector';
export type { TemplateEditorProps } from './templates/template-editor';

// --- Dialogs ---
export * from './dialogs';

// --- Tabs ---
export type { OrderPaymentsTabProps } from './tabs/order-payments-tab';
export type { Payment, PaymentSummary } from '@/lib/schemas/orders';
