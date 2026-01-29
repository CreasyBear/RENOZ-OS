/**
 * Orders Domain Components
 *
 * Exports all order-related UI components.
 */

// --- Core Components ---
export { OrderList, type OrderListProps, type OrderFilters } from './order-list';
export {
  OrderListContent,
  type OrderListContentProps,
} from './order-list-content';
export {
  OrdersListContainer,
  type OrdersListContainerProps,
} from './orders-list-container';
export {
  OrderFilters as OrderFiltersComponent,
  type OrderFiltersProps,
  type OrderFiltersState,
} from './order-filters';
export { OrderDetail, type OrderDetailProps } from './order-detail';
export { OrderBulkOperationsDialog } from './order-bulk-operations-dialog';

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
