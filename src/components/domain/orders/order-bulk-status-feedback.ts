import type { OrderStatus } from '@/lib/schemas/orders';

export interface BulkStatusOrderRef {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

export interface BulkStatusFailureResult {
  failed: string[];
  errorsById?: Record<string, string>;
}

export class BulkOrderStatusHandledFailure extends Error {
  readonly kind = 'bulk-order-status-handled';

  constructor() {
    super('Bulk order status update completed with handled failures.');
    this.name = 'BulkOrderStatusHandledFailure';
  }
}

export function createBulkOrderStatusHandledFailure(): BulkOrderStatusHandledFailure {
  return new BulkOrderStatusHandledFailure();
}

export function isBulkOrderStatusHandledFailure(
  error: unknown
): error is BulkOrderStatusHandledFailure {
  return error instanceof BulkOrderStatusHandledFailure;
}

function splitFailureLine(entry: string): { orderId: string; reason: string | null } {
  const delimiterIndex = entry.indexOf(': ');
  if (delimiterIndex === -1) {
    return { orderId: entry.trim(), reason: null };
  }

  return {
    orderId: entry.slice(0, delimiterIndex).trim(),
    reason: entry.slice(delimiterIndex + 2).trim(),
  };
}

function getSafeBulkStatusReason(reason: string | null | undefined): string {
  if (!reason) return 'Status could not be updated.';

  if (reason === 'Order not found') {
    return 'Order was not found.';
  }

  if (reason === 'Status was modified concurrently') {
    return 'Status was modified concurrently. Refresh and try again.';
  }

  if (
    reason === 'Cannot cancel order with shipped quantities (process return/RMA first)' ||
    reason === 'Cannot cancel orders with shipped quantities (process return/RMA first)'
  ) {
    return reason;
  }

  if (/^Invalid status transition from '[a-z_]+' to '[a-z_]+'$/.test(reason)) {
    return reason;
  }

  return 'Status could not be updated. Review the order and try again.';
}

export function getBulkStatusFailureToast(failedCount: number): string {
  return `${failedCount} order${failedCount === 1 ? '' : 's'} failed. Review details in the dialog.`;
}

export function mapBulkStatusFailures(
  result: BulkStatusFailureResult,
  selectedOrders: Array<Pick<BulkStatusOrderRef, 'id' | 'orderNumber'>>
): string[] {
  const orderNumberById = new Map(
    selectedOrders.map((order) => [order.id, order.orderNumber] as const)
  );
  const mapped = new Map<string, string>();

  for (const [orderId, reason] of Object.entries(result.errorsById ?? {})) {
    const orderNumber = orderNumberById.get(orderId) ?? 'Selected order';
    mapped.set(orderId, `${orderNumber}: ${getSafeBulkStatusReason(reason)}`);
  }

  for (const entry of result.failed) {
    const { orderId, reason } = splitFailureLine(entry);
    if (mapped.has(orderId)) continue;

    const orderNumber = orderNumberById.get(orderId) ?? 'Selected order';
    mapped.set(orderId, `${orderNumber}: ${getSafeBulkStatusReason(reason)}`);
  }

  return Array.from(mapped.values());
}

export function mapBulkCancellationBlockedFailures(
  orders: BulkStatusOrderRef[]
): string[] {
  return orders.map(
    (order) =>
      `${order.orderNumber}: Cannot cancel orders with shipped quantities (process return/RMA first)`
  );
}
