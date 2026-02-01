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
  type OrderTableItem,
  type CreateOrderColumnsOptions,
} from './order-columns';

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

// --- Detail (Legacy - to be deprecated) ---
export { OrderDetail, type OrderDetailProps } from './order-detail';

// --- Detail View (Container/Presenter Pattern) ---
export {
  OrderDetailContainer,
  type OrderDetailContainerProps,
  type OrderDetailContainerRenderProps,
} from './containers/order-detail-container';
export {
  OrderDetailView,
  type OrderDetailViewProps,
} from './views/order-detail-view';

// --- Bulk Operations ---
export {
  OrderBulkOperationsDialog,
  type OrderBulkOperationsDialogProps,
  type OrderBulkOperation,
  type BulkOperationConfig,
} from './order-bulk-operations-dialog';

// --- Amendments ---
export * from './amendments';
export type { AmendmentListProps } from './amendments/amendment-list';
export type { AmendmentRequestDialogProps } from './amendments/amendment-request-dialog';
export type { AmendmentReviewDialogProps } from './amendments/amendment-review-dialog';

// --- Cards ---
export * from './cards';

// --- Creation ---
export * from './creation';
export type { OrderCreationWizardProps } from './creation/order-creation-wizard';
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
