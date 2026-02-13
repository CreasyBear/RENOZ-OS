/**
 * Order Tabs Barrel Export
 *
 * Lazy-loaded tab components for order detail view.
 * These are designed to be imported dynamically using React.lazy().
 */

export { OrderOverviewTab, type OrderOverviewTabProps } from './order-overview-tab';
export { OrderItemsTab, type OrderItemsTabProps } from './order-items-tab';
export { OrderFulfillmentTab, type OrderFulfillmentTabProps } from './order-fulfillment-tab';
export { OrderActivityTab, type OrderActivityTabProps } from './order-activity-tab';
export { OrderDocumentsTab, type OrderDocumentsTabProps } from './order-documents-tab';
export { OrderPaymentsTab, type OrderPaymentsTabProps } from './order-payments-tab';
