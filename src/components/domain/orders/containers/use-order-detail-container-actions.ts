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
  useCreateRefundPayment,
} from '@/hooks/orders/use-order-payments';
import { useApplyAmendment } from '@/hooks/orders';
import {
  useGenerateOrderQuote,
  useGenerateOrderInvoice,
  useGenerateOrderProForma,
  useGenerateShipmentPackingSlip,
  useGenerateShipmentDispatchNote,
  useGenerateShipmentDeliveryNote,
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
  const generateProForma = useGenerateOrderProForma();
  const generateShipmentPackingSlip = useGenerateShipmentPackingSlip();
  const generateShipmentDispatchNote = useGenerateShipmentDispatchNote();
  const generateShipmentDeliveryNote = useGenerateShipmentDeliveryNote();
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
  const createRefundMutation = useCreateRefundPayment(options.orderId);

  const { data: customersData } = useCustomers({
    pageSize: 100,
    enabled: true,
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

      const hasAnyShippingField = Object.values(data.shippingAddress).some((value) =>
        Boolean(value?.trim?.() ?? value)
      );
      const shippingStreet1 = data.shippingAddress.street1?.trim() || '';

      await updateOrderMutation.mutateAsync({
        id: options.orderId,
        expectedVersion: options.orderVersion,
        customerId: data.customerId,
        orderNumber: data.orderNumber,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : null,
        internalNotes: data.internalNotes?.trim() ? data.internalNotes.trim() : null,
        customerNotes: data.customerNotes?.trim() ? data.customerNotes.trim() : null,
        shippingAddress: hasAnyShippingField
          ? {
              street1: shippingStreet1,
              street2: data.shippingAddress.street2?.trim() || undefined,
              city: data.shippingAddress.city?.trim() || '',
              state: data.shippingAddress.state?.trim() || '',
              postalCode: data.shippingAddress.postalCode?.trim() || '',
              country: data.shippingAddress.country?.trim() || 'AU',
              contactName: data.shippingAddress.contactName?.trim() || undefined,
              contactPhone: data.shippingAddress.contactPhone?.trim() || undefined,
            }
          : null,
      });
      toastSuccess('Order updated');
      options.refetch();
    },
    [options, updateOrderMutation]
  );

  const documentActions = {
    onGenerateQuote: async () => {
      try {
        const result = await generateQuote.mutateAsync({ orderId: options.orderId });
        toastSuccess('Quote PDF generated');
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate quote', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate quote');
      }
    },
    onGenerateInvoice: async () => {
      try {
        const result = await generateInvoice.mutateAsync({ orderId: options.orderId });
        toastSuccess('Invoice PDF generated');
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate invoice', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate invoice');
      }
    },
    onGenerateProForma: async () => {
      try {
        const result = await generateProForma.mutateAsync({ orderId: options.orderId });
        toastSuccess('Pro-forma PDF generated');
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        ordersLogger.error('[OrderDetail] Failed to generate pro-forma', error);
        toastError(error instanceof Error ? error.message : 'Failed to generate pro-forma');
      }
    },
    isGeneratingQuote: generateQuote.isPending,
    isGeneratingInvoice: generateInvoice.isPending,
    isGeneratingProForma: generateProForma.isPending,
    isGeneratingPackingSlip: generateShipmentPackingSlip.isPending,
    isGeneratingDeliveryNote: generateShipmentDeliveryNote.isPending,
  };

  return {
    customers,
    payments,
    paymentSummary,
    refetchPayments,
    refetchSummary,
    createPaymentMutation,
    createRefundMutation,
    updateOrderMutation,
    generateShipmentPackingSlip,
    generateShipmentDispatchNote,
    generateShipmentDeliveryNote,
    handleApplyAmendment,
    handleEditSubmit,
    documentActions,
  };
}
