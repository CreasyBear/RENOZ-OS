'use client';

/**
 * Order Detail Composite Hook
 *
 * Encapsulates all data fetching, UI state, and actions for the order detail view.
 * Follows DETAIL-VIEW-STANDARDS.md composite hook pattern.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { isPast, isBefore, addDays } from 'date-fns';
import { toast } from '@/lib/toast';
import { toastSuccess, toastError } from '@/hooks';
// Import from specific files to avoid circular imports
import {
  useOrderWithCustomer,
  useOrderDetailStatusUpdate,
  useDeleteOrderWithConfirmation,
  useDuplicateOrderById,
  type OrderWithCustomer,
} from './use-order-detail';
import { useUnifiedActivities } from '@/hooks/activities';
import type { OrderStatus } from '@/lib/schemas/orders';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

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

export interface OrderDetailActions {
  onEdit: () => void;
  onUpdateStatus: (status: OrderStatus) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onPrint: () => void;
  onBack: () => void;
  /** Open activity logging dialog */
  onLogActivity: () => void;
  /** Open follow-up scheduling dialog */
  onScheduleFollowUp: () => void;
}

export interface UseOrderDetailReturn {
  // Data
  order: OrderWithCustomer | undefined;
  activities: UnifiedActivity[];
  alerts: OrderAlert[];

  // Loading states
  isLoading: boolean;
  error: Error | null;
  activitiesLoading: boolean;
  activitiesError: Error | null;

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (open: boolean) => void;

  // Status workflow
  nextStatusActions: OrderStatus[];
  isUpdatingStatus: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;

  // Actions
  actions: OrderDetailActions;

  // Refetch
  refetch: () => void;
}

// ============================================================================
// STATUS WORKFLOW
// ============================================================================

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

// ============================================================================
// ALERT GENERATION
// ============================================================================

function generateOrderAlerts(order: OrderWithCustomer | undefined): OrderAlert[] {
  if (!order) return [];

  const alerts: OrderAlert[] = [];

  // Payment overdue alert
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

  // Due date alerts
  if (order.dueDate && order.status !== 'delivered' && order.status !== 'cancelled') {
    const dueDate = new Date(order.dueDate);
    const isOverdue = isPast(dueDate);
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

  // Xero sync error
  if (order.xeroSyncStatus === 'error' && order.xeroSyncError) {
    alerts.push({
      id: 'xero-error',
      type: 'xero_sync_error',
      severity: 'warning',
      title: 'Xero Sync Failed',
      message: order.xeroSyncError,
    });
  }

  // Backorder / partial fulfillment
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

// ============================================================================
// OPTIONS
// ============================================================================

export interface UseOrderDetailCompositeOptions {
  /** Called when user clicks "Ship Order" in status-update toast (e.g. after picking) */
  onOpenShipDialog?: () => void;
  /** Controls background polling for detail refresh. */
  refetchInterval?: number | false;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useOrderDetailComposite(
  orderId: string,
  options?: UseOrderDetailCompositeOptions
): UseOrderDetailReturn {
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useOrderWithCustomer({
    orderId,
    refetchInterval: options?.refetchInterval ?? 30000,
  });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'order',
    entityId: orderId,
    relatedCustomerId: order?.customerId ?? undefined,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const statusMutation = useOrderDetailStatusUpdate(orderId);
  const deleteMutation = useDeleteOrderWithConfirmation(orderId);
  const duplicateMutation = useDuplicateOrderById(orderId);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
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

  const alerts = useMemo(() => generateOrderAlerts(order), [order]);

  // ─────────────────────────────────────────────────────────────────────────
  // UI Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigate({ to: '/orders' });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate({
      to: '/orders/$orderId',
      params: { orderId },
      search: { edit: true },
    });
  }, [navigate, orderId]);

  const handleUpdateStatusRef = useRef<(status: OrderStatus) => Promise<void>>(() => Promise.resolve());
  const handleUpdateStatus = useCallback(
    async (status: OrderStatus) => {
      try {
        await statusMutation.mutateAsync({ status });
        if (status === 'confirmed') {
          toast.success('Order confirmed', {
            action: {
              label: 'Start Picking',
              onClick: () => handleUpdateStatusRef.current('picking'),
            },
          });
        } else if (status === 'picked' && options?.onOpenShipDialog) {
          toast.success('Order picked', {
            action: {
              label: 'Ship Order',
              onClick: options.onOpenShipDialog,
            },
          });
        } else {
          toast.success('Order status updated');
        }
      } catch {
        toastError('Failed to update status');
        throw new Error('Failed to update status');
      }
    },
    [statusMutation, options]
  );
  // Keep ref updated for toast action (latest callback pattern)
  useEffect(() => {
    handleUpdateStatusRef.current = handleUpdateStatus;
  }, [handleUpdateStatus]);

  const handleDuplicate = useCallback(async () => {
    try {
      const result = await duplicateMutation.mutateAsync();
      toastSuccess(`Order duplicated as ${result.orderNumber}`);
      navigate({
        to: '/orders/$orderId',
        params: { orderId: result.id },
      });
    } catch {
      toastError('Failed to duplicate order');
      throw new Error('Failed to duplicate order');
    }
  }, [duplicateMutation, navigate]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      toastSuccess('Order deleted');
      setDeleteDialogOpen(false);
      navigate({ to: '/orders' });
    } catch {
      toastError('Failed to delete order');
      throw new Error('Failed to delete order');
    }
  }, [deleteMutation, navigate]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleLogActivity = useCallback(() => {
    setActivityDialogOpen(true);
  }, []);

  const handleScheduleFollowUp = useCallback(() => {
    // Opens the same dialog but could pre-select follow-up type
    setActivityDialogOpen(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Data
    order,
    activities: activities ?? [],
    alerts,

    // Loading states
    isLoading,
    error: error instanceof Error ? error : null,
    activitiesLoading,
    activitiesError: activitiesError instanceof Error ? activitiesError : null,

    // UI State
    activeTab,
    onTabChange: setActiveTab,
    showSidebar,
    toggleSidebar,
    deleteDialogOpen,
    setDeleteDialogOpen,
    activityDialogOpen,
    setActivityDialogOpen,

    // Status workflow
    nextStatusActions,
    isUpdatingStatus: statusMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,

    // Actions
    actions: {
      onEdit: handleEdit,
      onUpdateStatus: handleUpdateStatus,
      onDuplicate: handleDuplicate,
      onDelete: handleDelete,
      onPrint: handlePrint,
      onBack: handleBack,
      onLogActivity: handleLogActivity,
      onScheduleFollowUp: handleScheduleFollowUp,
    },

    // Refetch
    refetch,
  };
}
