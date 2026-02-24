/**
 * Orders Domain Hooks
 *
 * React hooks for order management and fulfillment operations.
 */

export * from './use-orders';
export * from './use-order-creation-form';
export * from './use-order-detail';
export * from './use-order-detail-composite';
export * from './use-fulfillment-kanban';
export * from './use-assignees';
export * from './use-fulfillment-exports';
export * from './use-shipments';
export * from './use-order-status';
export * from './use-order-amendments';
export * from './use-order-payments';
export * from './use-order-templates';
export * from './use-picking';

// Order Calculations (new)
export {
  calculateTotal,
  calculateLineItemTotal,
  GST_RATE,
  CURRENCY_PRECISION,
} from '../../lib/order-calculations';
