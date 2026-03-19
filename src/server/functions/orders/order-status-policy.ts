'use server'

import type { OrderStatus } from '@/lib/schemas/orders';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['picked', 'cancelled'],
  picked: ['partially_shipped', 'shipped', 'cancelled'],
  partially_shipped: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function buildStatusDates(newStatus: OrderStatus): Record<string, string> {
  const statusDates: Record<string, string> = {};
  if (newStatus === 'shipped' || newStatus === 'partially_shipped') {
    statusDates.shippedDate = new Date().toISOString().slice(0, 10);
  }
  if (newStatus === 'delivered') {
    statusDates.deliveredDate = new Date().toISOString().slice(0, 10);
  }
  return statusDates;
}

export function appendStatusNote(
  existingNotes: string | null,
  newStatus: OrderStatus,
  notes?: string
): string | null {
  if (!notes) {
    return existingNotes;
  }

  return `${existingNotes ?? ''}\n[${new Date().toISOString()}] Status changed to ${newStatus}: ${notes}`.trim();
}

export function validateStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}
