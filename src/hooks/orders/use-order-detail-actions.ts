'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from '@/lib/toast';
import { toastSuccess, toastError } from '@/hooks';
import type { OrderStatus } from '@/lib/schemas/orders';
import {
  useOrderDetailStatusUpdate,
  useDeleteOrderWithConfirmation,
  useDuplicateOrderById,
} from './use-order-detail';
import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';

export interface OrderDetailActions {
  onEdit: () => void;
  onUpdateStatus: (status: OrderStatus) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onPrint: () => void;
  onBack: () => void;
  onLogActivity: () => void;
  onScheduleFollowUp: () => void;
}

export interface UseOrderDetailActionsOptions {
  orderId: string;
  onOpenShipDialog?: () => void;
  onOpenActivityDialog: () => void;
  onCloseDeleteDialog: () => void;
  refetch: () => void;
}

export function useOrderDetailActions(options: UseOrderDetailActionsOptions) {
  const navigate = useNavigate();
  const statusMutation = useOrderDetailStatusUpdate(options.orderId);
  const deleteMutation = useDeleteOrderWithConfirmation(options.orderId);
  const duplicateMutation = useDuplicateOrderById(options.orderId);
  const handleUpdateStatusRef = useRef<(status: OrderStatus) => Promise<void>>(() => Promise.resolve());

  const handleBack = useCallback(() => {
    navigate({ to: '/orders' });
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate({
      to: '/orders/$orderId',
      params: { orderId: options.orderId },
      search: { edit: true },
    });
  }, [navigate, options.orderId]);

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
        } else if (status === 'picked' && options.onOpenShipDialog) {
          toast.success('Order picked', {
            action: {
              label: 'Open Fulfillment',
              onClick: options.onOpenShipDialog,
            },
          });
        } else {
          toast.success('Order status updated');
        }
      } catch (error) {
        const normalized = normalizeOrderMutationError(error, 'Unable to update order status.');
        if (normalized.kind === 'conflict') {
          options.refetch();
        }
        toastError(getClientErrorMessage(normalized, 'Unable to update order status.'));
        throw normalized;
      }
    },
    [options, statusMutation]
  );

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
    } catch (error) {
      const normalized = normalizeOrderMutationError(error, 'Unable to duplicate order.');
      toastError(getClientErrorMessage(normalized, 'Unable to duplicate order.'));
      throw normalized;
    }
  }, [duplicateMutation, navigate]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      toastSuccess('Order deleted');
      options.onCloseDeleteDialog();
      navigate({ to: '/orders' });
    } catch (error) {
      const normalized = normalizeOrderMutationError(error, 'Unable to delete order.');
      toastError(getClientErrorMessage(normalized, 'Unable to delete order.'));
      throw normalized;
    }
  }, [deleteMutation, navigate, options]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleLogActivity = useCallback(() => {
    options.onOpenActivityDialog();
  }, [options]);

  const handleScheduleFollowUp = useCallback(() => {
    options.onOpenActivityDialog();
  }, [options]);

  return {
    actions: {
      onEdit: handleEdit,
      onUpdateStatus: handleUpdateStatus,
      onDuplicate: handleDuplicate,
      onDelete: handleDelete,
      onPrint: handlePrint,
      onBack: handleBack,
      onLogActivity: handleLogActivity,
      onScheduleFollowUp: handleScheduleFollowUp,
    } satisfies OrderDetailActions,
    isUpdatingStatus: statusMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}
