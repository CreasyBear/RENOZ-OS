'use client';

import { useMemo } from 'react';
import { isBefore, addDays } from 'date-fns';
import { useUnifiedActivities } from '@/hooks/activities';
import { useXeroInvoiceStatus } from '@/hooks/financial';
import type { OrderStatus } from '@/lib/schemas/orders';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { isOrderOverdue } from '@/components/domain/orders/order-status-config';
import {
  useOrderWithCustomer,
  type OrderWithCustomer,
} from './use-order-detail';

export type OrderAlertSeverity = 'critical' | 'warning' | 'info';

export interface OrderAlert {
  id: string;
  type: string;
  severity: OrderAlertSeverity;
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

const STATUS_NEXT_ACTIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['picked', 'cancelled'],
  picked: ['cancelled'],
  partially_shipped: ['cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

function buildXeroAlert(
  order: OrderWithCustomer,
  xeroIssue?: {
    code: string;
    title?: string;
    message: string;
    nextAction: string | null;
    nextActionLabel: string | null;
  } | null
): OrderAlert | null {
  if (order.xeroSyncStatus !== 'error') {
    return null;
  }

  if (xeroIssue?.code === 'missing_contact_mapping') {
    return {
      id: 'xero-error',
      type: 'xero_sync_error',
      severity: 'warning',
      title: 'Xero Contact Mapping Required',
      message: xeroIssue.message,
      action: {
        label: xeroIssue.nextActionLabel ?? 'Map Customer Contact',
        href: `/customers/${order.customerId}/edit`,
      },
    };
  }

  if (xeroIssue?.nextAction === 'connect_xero' || xeroIssue?.nextAction === 'reconnect_xero') {
    return {
      id: 'xero-error',
      type: 'xero_sync_error',
      severity: 'warning',
      title: 'Reconnect Xero',
      message: xeroIssue.message,
      action: {
        label: xeroIssue.nextActionLabel ?? 'Reconnect Xero',
        href: '/?settingsOpen=integrations',
      },
    };
  }

  return {
    id: 'xero-error',
    type: 'xero_sync_error',
    severity: 'warning',
    title: 'Xero Sync Failed',
    message: xeroIssue?.message ?? order.xeroSyncError ?? 'Invoice sync requires attention.',
    action:
      xeroIssue?.nextAction === 'open_org_settings'
        ? {
            label: xeroIssue.nextActionLabel ?? 'Open Org Settings',
            href: '/settings/organization',
          }
        : {
            label: xeroIssue?.title ? `Resolve: ${xeroIssue.title}` : 'Open Xero Sync',
            href: `/financial/xero-sync?view=invoice_sync&status=error&orderId=${order.id}${xeroIssue?.code ? `&issue=${xeroIssue.code}` : ''}`,
          },
  };
}

function generateOrderAlerts(
  order: OrderWithCustomer | undefined,
  xeroIssue?: {
    code: string;
    title?: string;
    message: string;
    nextAction: string | null;
    nextActionLabel: string | null;
  } | null
): OrderAlert[] {
  if (!order) return [];

  const alerts: OrderAlert[] = [];

  if (order.paymentStatus === 'overdue' && Number(order.balanceDue) > 0) {
    alerts.push({
      id: 'payment-overdue',
      type: 'payment_overdue',
      severity: 'critical',
      title: 'Payment Overdue',
      message: `Balance of $${Number(order.balanceDue).toLocaleString()} is overdue`,
      action: {
        label: 'Record Payment',
        href: `/orders/${order.id}?payment=true`,
      },
    });
  }

  if (order.dueDate && order.status !== 'delivered' && order.status !== 'cancelled') {
    const dueDate = new Date(order.dueDate);
    const isOverdue = isOrderOverdue({
      dueDate,
      status: order.status as OrderStatus,
      paymentStatus: order.paymentStatus as OrderWithCustomer['paymentStatus'],
      balanceDue: Number(order.balanceDue ?? 0),
    });
    const isUrgent = !isOverdue && isBefore(dueDate, addDays(new Date(), 7));

    if (isOverdue) {
      alerts.push({
        id: 'due-date-overdue',
        type: 'due_date_overdue',
        severity: 'critical',
        title: 'Order Overdue',
        message: 'This order is past its due date',
      });
    } else if (isUrgent) {
      alerts.push({
        id: 'due-date-urgent',
        type: 'due_date_urgent',
        severity: 'warning',
        title: 'Due Soon',
        message: 'This order is due within 7 days',
      });
    }
  }

  const xeroAlert = buildXeroAlert(order, xeroIssue);
  if (xeroAlert) {
    alerts.push(xeroAlert);
  }

  if (order.lineItems && order.status !== 'delivered' && order.status !== 'cancelled') {
    const totalQty = order.lineItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const deliveredQty = order.lineItems.reduce((sum, item) => sum + Number(item.qtyDelivered || 0), 0);

    if (deliveredQty > 0 && deliveredQty < totalQty) {
      const remaining = totalQty - deliveredQty;
      alerts.push({
        id: 'partial-fulfillment',
        type: 'partial_fulfillment',
        severity: 'info',
        title: 'Partial Fulfillment',
        message: `${remaining} of ${totalQty} items still pending delivery`,
      });
    }
  }

  return alerts;
}

export interface UseOrderDetailDataAlertsOptions {
  orderId: string;
  refetchInterval?: number | false;
}

export interface UseOrderDetailDataAlertsResult {
  order: OrderWithCustomer | undefined;
  activities: UnifiedActivity[];
  alerts: OrderAlert[];
  nextStatusActions: OrderStatus[];
  isLoading: boolean;
  error: Error | null;
  activitiesLoading: boolean;
  activitiesError: Error | null;
  refetch: () => void;
}

export function useOrderDetailDataAlerts(
  options: UseOrderDetailDataAlertsOptions
): UseOrderDetailDataAlertsResult {
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useOrderWithCustomer({
    orderId: options.orderId,
    refetchInterval: options.refetchInterval ?? 30000,
  });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'order',
    entityId: options.orderId,
    relatedCustomerId: order?.customerId ?? undefined,
  });
  const { data: xeroStatus } = useXeroInvoiceStatus(options.orderId, Boolean(options.orderId));

  const hasShippedLineItems = useMemo(() => {
    if (!order?.lineItems) return false;
    return order.lineItems.some((item) => Number(item.qtyShipped ?? 0) > 0);
  }, [order]);

  const nextStatusActions = useMemo(() => {
    if (!order) return [];
    const actions = STATUS_NEXT_ACTIONS[order.status as OrderStatus] ?? [];
    if (!hasShippedLineItems) return actions;
    return actions.filter((status) => status !== 'cancelled');
  }, [order, hasShippedLineItems]);

  const alerts = useMemo(
    () => generateOrderAlerts(order, xeroStatus?.issue ?? null),
    [order, xeroStatus?.issue]
  );

  return {
    order,
    activities: activities ?? [],
    alerts,
    nextStatusActions,
    isLoading,
    error: error instanceof Error ? error : null,
    activitiesLoading,
    activitiesError: activitiesError instanceof Error ? activitiesError : null,
    refetch,
  };
}
