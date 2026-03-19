'use client';

import { useCallback, useMemo } from 'react';
import { ordersLogger } from '@/lib/logger';
import { toastSuccess, toastError } from '@/hooks';
import { useCustomers } from '@/hooks/customers';
import { useUpdateOrder } from '@/hooks/orders/use-orders';
import {
  useOrderPayments,
  useOrderPaymentSummary,
  useCreateOrderPayment,
} from '@/hooks/orders/use-order-payments';
import { useApplyAmendment } from '@/hooks/orders';
import {
  useGenerateOrderQuote,
  useGenerateOrderInvoice,
  useGenerateOrderPackingSlip,
  useGenerateOrderDeliveryNote,
} from '@/hooks/documents';
import type { EditOrderFormData } from '../cards/order-edit-dialog.schema';

interface UseOrderDetailContainerActionsOptions {
  orderId: string;
  orderStatus?: string;
  orderVersion?: number;
  refetch: () => void;
}

export function useOrderDetailContainerActions(
  options: UseOrderDetailContainerActionsOptions
) {
  const generateQuote = useGenerateOrderQuote();
  const generateInvoice = useGenerateOrderInvoice();
  const generatePackingSlip = useGenerateOrderPackingSlip();
  const generateDeliveryNote = useGenerateOrderDeliveryNote();
  const updateOrderMutation = useUpdateOrder();
  const applyAmendmentMutation = useApplyAmendment();

  const {
    data: payments = [],
    refetch: refetchPayments,
  } = useOrderPayments(options.orderId);
  const {
    data: paymentSummary,
    refetch: refetchSummary,
  } = useOrderPaymentSummary(options.orderId);
  const createPaymentMutation = useCreateOrderPayment(options.orderId);

  const { data: customersData } = useCustomers({
    pageSize: 100,
    enabled: options.orderStatus === 'draft',
  });

  const customers = useMemo(
    () =>
      (customersData?.items ?? []).map((customer: { id: string; name: string }) => ({
        id: customer.id,
        name: customer.name,
      })),
    [customersData]
  );

  const handleApplyAmendment = useCallback(
    async (amendmentId: string) => {
      try {
        await applyAmendmentMutation.mutateAsync({ amendmentId });
        toastSuccess('Amendment applied');
        options.refetch();
      } catch (error) {
        toastError(error instanceof Error ? error.message : 'Failed to apply amendment');
      }
    },
    [applyAmendmentMutation, options]
  );

  const handleEditSubmit = useCallback(
    async (data: EditOrderFormData) => {
      if (!options.orderVersion) return;

      await updateOrderMutation.mutateAsync({
        id: options.orderId,
        expectedVersion: options.orderVersion,
        customerId: data.customerId,
        orderNumber: data.orderNumber,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : undefined,
        internalNotes: data.internalNotes || undefined,
        customerNotes: data.customerNotes || undefined,
      });
      toastSuccess('Order updated');
      options.refetch();
    },
    [options, updateOrderMutation]
  );

  const documentActions = {
    onGenerateQuote: async () => {
      try {
        await generateQuote.mutateAsync({ orderId: options.orderId });
        toastSuccess('Quote PDF generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate quote', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate quote');
      }
    },
    onGenerateInvoice: async () => {
      try {
        await generateInvoice.mutateAsync({ orderId: options.orderId });
        toastSuccess('Invoice PDF generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate invoice', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate invoice');
      }
    },
    onGeneratePackingSlip: async () => {
      try {
        await generatePackingSlip.mutateAsync({ orderId: options.orderId });
        toastSuccess('Packing slip generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate packing slip', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate packing slip');
      }
    },
    onGenerateDeliveryNote: async () => {
      try {
        await generateDeliveryNote.mutateAsync({ orderId: options.orderId });
        toastSuccess('Delivery note generated');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate delivery note', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate delivery note');
      }
    },
    isGeneratingQuote: generateQuote.isPending,
    isGeneratingInvoice: generateInvoice.isPending,
    isGeneratingPackingSlip: generatePackingSlip.isPending,
    isGeneratingDeliveryNote: generateDeliveryNote.isPending,
    packingSlipUrl: generatePackingSlip.data?.url,
    deliveryNoteUrl: generateDeliveryNote.data?.url,
  };

  return {
    customers,
    payments,
    paymentSummary,
    refetchPayments,
    refetchSummary,
    createPaymentMutation,
    updateOrderMutation,
    handleApplyAmendment,
    handleEditSubmit,
    documentActions,
  };
}
