/**
 * Orders Domain Hooks
 *
 * React hooks for order management and fulfillment operations.
 */

export * from './use-orders';
export * from './use-order-detail';
export * from './use-fulfillment-kanban';
export * from './use-assignees';
export * from './use-fulfillment-exports';
export * from './use-shipments';
export * from './use-order-status';

// Order Calculations (new)
export {
  calculateTotal,
  calculateLineItemTotal,
  GST_RATE,
  CURRENCY_PRECISION,
} from '../../lib/order-calculations';
