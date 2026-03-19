'use server'

import type { ActivityLogger, LogActivityParams } from '@/lib/activity-logger';

interface StatusLogOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
}

export function logOrderStatusChange(
  logger: ActivityLogger,
  order: StatusLogOrder,
  params: {
    previousStatus: string;
    newStatus: string;
    notes?: string;
    idempotencyKey?: string;
    bulk?: boolean;
  }
) {
  const payload: LogActivityParams = {
    entityType: 'order',
    entityId: order.id,
    action: 'updated',
    changes: {
      before: params.bulk ? {} : { status: params.previousStatus },
      after: { status: order.status },
      fields: ['status'],
    },
    description: params.bulk
      ? `Status changed in bulk to ${order.status}`
      : `Status changed: ${params.previousStatus} → ${params.newStatus}`,
    metadata: {
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      notes: params.notes ?? undefined,
      idempotencyKey: params.idempotencyKey ?? undefined,
    },
  };

  logger.logAsync(payload);
}
