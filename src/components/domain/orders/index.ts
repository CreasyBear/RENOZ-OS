/**
 * Orders Domain Components
 *
 * Exports all order-related UI components.
 */

export { OrderList, type OrderListProps, type OrderFilters } from "./order-list";
export {
  OrderFilters as OrderFiltersComponent,
  type OrderFiltersProps,
  type OrderFiltersState,
} from "./order-filters";
export { OrderDetail, type OrderDetailProps } from "./order-detail";
export {
  OrderCreationWizard,
  type OrderCreationWizardProps,
} from "./order-creation-wizard";
export {
  CustomerSelector,
  type CustomerSelectorProps,
  type SelectedCustomer,
} from "./customer-selector";
export {
  ProductSelector,
  type ProductSelectorProps,
  type OrderLineItemDraft,
} from "./product-selector";
export {
  ShipOrderDialog,
  type ShipOrderDialogProps,
} from "./ship-order-dialog";
export { ShipmentList, type ShipmentListProps } from "./shipment-list";
export {
  ConfirmDeliveryDialog,
  type ConfirmDeliveryDialogProps,
} from "./confirm-delivery-dialog";
export {
  TemplateLibrary,
  type TemplateLibraryProps,
} from "./template-library";
export {
  TemplateSelector,
  type TemplateSelectorProps,
} from "./template-selector";
export {
  TemplateEditor,
  type TemplateEditorProps,
} from "./template-editor";
export {
  AmendmentRequestDialog,
  type AmendmentRequestDialogProps,
} from "./amendment-request-dialog";
export {
  AmendmentReviewDialog,
  type AmendmentReviewDialogProps,
} from "./amendment-review-dialog";
export { AmendmentList, type AmendmentListProps } from "./amendment-list";
export {
  FulfillmentDashboard,
  type FulfillmentDashboardProps,
} from "./fulfillment-dashboard";
