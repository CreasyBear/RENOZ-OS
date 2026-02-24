/**
 * Order Schemas
 *
 * Provides validation schemas for order operations.
 */

// --- Core Order Types ---
export * from './orders';

// --- Order Creation Form ---
export * from './order-creation-form';
export type { OrderCreationFormValues, OrderSubmitData } from './order-creation-form';

// --- Order Operations ---
export * from './order-amendments';
export * from './order-payments';
export * from './order-templates';
export * from './picking';
export * from './shipments';

// --- Re-export key types for convenience ---
export type {
  Order,
  OrderListItem,
  OrderTableItem,
  ListOrdersResult,
  FulfillmentKanbanOrder,
  FulfillmentKanbanResult,
  FulfillmentOrder,
  CreateOrder,
  UpdateOrder,
  OrderFilter,
  OrderListQuery,
  OrderLineItem,
  CreateOrderLineItem,
} from './orders';

// Re-export enums/constants
export { orderStatusValues, paymentStatusValues } from './orders';

export type {
  Payment,
  PaymentSummary,
} from './order-payments';
