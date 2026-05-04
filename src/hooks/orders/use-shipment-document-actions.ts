import {
  useGenerateShipmentDispatchNote,
  useGenerateShipmentDeliveryNote,
  useGenerateShipmentPackingSlip,
} from '@/hooks/documents';
import { toastError, toastSuccess } from '@/hooks';
import {
  getClientErrorMessage,
  normalizeShipmentMutationError,
} from './order-mutation-client-errors';

export function getShipmentActionErrorMessage(error: unknown, fallbackMessage: string): string {
  return getClientErrorMessage(
    normalizeShipmentMutationError(error, fallbackMessage),
    fallbackMessage
  );
}

export interface UseShipmentDocumentActionsResult {
  generatePackingSlip: (shipmentId: string) => Promise<void>;
  generateDispatchNote: (shipmentId: string) => Promise<void>;
  generateDeliveryNote: (shipmentId: string) => Promise<void>;
  isGeneratingPackingSlip: (shipmentId: string) => boolean;
  isGeneratingDispatchNote: (shipmentId: string) => boolean;
  isGeneratingDeliveryNote: (shipmentId: string) => boolean;
}

function openGeneratedDocument(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function useShipmentDocumentActions(): UseShipmentDocumentActionsResult {
  const generatePackingSlipMutation = useGenerateShipmentPackingSlip();
  const generateDispatchNoteMutation = useGenerateShipmentDispatchNote();
  const generateDeliveryNoteMutation = useGenerateShipmentDeliveryNote();

  return {
    generatePackingSlip: async (shipmentId) => {
      try {
        const result = await generatePackingSlipMutation.mutateAsync({ shipmentId });
        toastSuccess('Packing slip generated');
        openGeneratedDocument(result.url);
      } catch (error) {
        toastError(getShipmentActionErrorMessage(error, 'Unable to generate packing slip.'));
      }
    },
    generateDispatchNote: async (shipmentId) => {
      try {
        const result = await generateDispatchNoteMutation.mutateAsync({ shipmentId });
        toastSuccess('Dispatch note generated');
        openGeneratedDocument(result.url);
      } catch (error) {
        toastError(getShipmentActionErrorMessage(error, 'Unable to generate dispatch note.'));
      }
    },
    generateDeliveryNote: async (shipmentId) => {
      try {
        const result = await generateDeliveryNoteMutation.mutateAsync({ shipmentId });
        toastSuccess('Delivery note generated');
        openGeneratedDocument(result.url);
      } catch (error) {
        toastError(getShipmentActionErrorMessage(error, 'Unable to generate delivery note.'));
      }
    },
    isGeneratingPackingSlip: (shipmentId) =>
      generatePackingSlipMutation.isPending &&
      generatePackingSlipMutation.variables?.shipmentId === shipmentId,
    isGeneratingDispatchNote: (shipmentId) =>
      generateDispatchNoteMutation.isPending &&
      generateDispatchNoteMutation.variables?.shipmentId === shipmentId,
    isGeneratingDeliveryNote: (shipmentId) =>
      generateDeliveryNoteMutation.isPending &&
      generateDeliveryNoteMutation.variables?.shipmentId === shipmentId,
  };
}
