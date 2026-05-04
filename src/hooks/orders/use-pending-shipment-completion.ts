import { useCallback, useMemo, useState } from 'react';
import { fromCents, toCents } from '@/lib/currency';
import { toastError, toastSuccess } from '@/hooks';
import { useMarkShipped } from './use-shipments';
import { getShipmentActionErrorMessage } from './shipment-action-errors';

export interface PendingShipmentCompletionShipment {
  id: string;
  shipmentNumber: string;
  carrier?: string | null;
  carrierService?: string | null;
  trackingNumber?: string | null;
  shippingCost?: number | null;
}

export interface PendingShipmentCompletionForm {
  carrier: string;
  carrierService: string;
  trackingNumber: string;
  shippingCost: string;
}

export interface UsePendingShipmentCompletionResult {
  pendingShipment: PendingShipmentCompletionShipment | null;
  form: PendingShipmentCompletionForm;
  isPending: boolean;
  open: (shipment: PendingShipmentCompletionShipment) => void;
  close: () => void;
  submit: () => Promise<void>;
  updateForm: (field: keyof PendingShipmentCompletionForm, value: string) => void;
}

const emptyCompletionForm: PendingShipmentCompletionForm = {
  carrier: '',
  carrierService: '',
  trackingNumber: '',
  shippingCost: '',
};

export function usePendingShipmentCompletion(
  shipments?: PendingShipmentCompletionShipment[] | null
): UsePendingShipmentCompletionResult {
  const markShippedMutation = useMarkShipped();
  const [pendingShipmentId, setPendingShipmentId] = useState<string | null>(null);
  const [form, setForm] = useState<PendingShipmentCompletionForm>(emptyCompletionForm);

  const pendingShipment = useMemo(
    () => shipments?.find((shipment) => shipment.id === pendingShipmentId) ?? null,
    [pendingShipmentId, shipments]
  );

  const open = useCallback((shipment: PendingShipmentCompletionShipment) => {
    setPendingShipmentId(shipment.id);
    setForm({
      carrier: shipment.carrier ?? '',
      carrierService: shipment.carrierService ?? '',
      trackingNumber: shipment.trackingNumber ?? '',
      shippingCost:
        shipment.shippingCost != null ? fromCents(shipment.shippingCost).toFixed(2) : '',
    });
  }, []);

  const close = useCallback(() => {
    if (markShippedMutation.isPending) return;
    setPendingShipmentId(null);
  }, [markShippedMutation.isPending]);

  const updateForm = useCallback(
    (field: keyof PendingShipmentCompletionForm, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    []
  );

  const submit = useCallback(async () => {
    if (!pendingShipment) return;

    const carrier = form.carrier.trim();
    if (!carrier) {
      toastError('Enter a carrier before marking the shipment as shipped.');
      return;
    }

    let shippingCost: number | undefined;
    const shippingCostValue = form.shippingCost.trim();
    if (shippingCostValue) {
      const parsed = Number(shippingCostValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toastError('Enter a valid shipping cost.');
        return;
      }
      shippingCost = toCents(parsed);
    }

    try {
      await markShippedMutation.mutateAsync({
        id: pendingShipment.id,
        idempotencyKey: `shipment-mark-shipped:${pendingShipment.id}:${Date.now()}`,
        carrier,
        carrierService: form.carrierService.trim() || undefined,
        trackingNumber: form.trackingNumber.trim() || undefined,
        shippingCost,
      });
      toastSuccess(`Shipment ${pendingShipment.shipmentNumber} marked as shipped.`);
      setPendingShipmentId(null);
    } catch (error) {
      toastError(getShipmentActionErrorMessage(error, 'Unable to mark shipment as shipped.'));
    }
  }, [form, markShippedMutation, pendingShipment]);

  return {
    pendingShipment,
    form,
    isPending: markShippedMutation.isPending,
    open,
    close,
    submit,
    updateForm,
  };
}
