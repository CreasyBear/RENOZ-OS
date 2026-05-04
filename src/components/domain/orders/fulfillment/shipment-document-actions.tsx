import { Button } from '@/components/ui/button';
import type { UseShipmentDocumentActionsResult } from '@/hooks/orders/use-shipment-document-actions';

export interface ShipmentDocumentActionShipment {
  id: string;
  canGenerateDispatchNote?: boolean | null;
  dispatchNoteBlockedReason?: string | null;
  canGenerateDeliveryNote?: boolean | null;
  deliveryNoteBlockedReason?: string | null;
}

export interface ShipmentDocumentActionsProps {
  shipment: ShipmentDocumentActionShipment;
  actions: UseShipmentDocumentActionsResult;
}

export function ShipmentDocumentActions({ shipment, actions }: ShipmentDocumentActionsProps) {
  const isGeneratingPackingSlip = actions.isGeneratingPackingSlip(shipment.id);
  const isGeneratingDispatchNote = actions.isGeneratingDispatchNote(shipment.id);
  const isGeneratingDeliveryNote = actions.isGeneratingDeliveryNote(shipment.id);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isGeneratingPackingSlip}
        onClick={() => actions.generatePackingSlip(shipment.id)}
      >
        {isGeneratingPackingSlip ? 'Generating...' : 'Packing Slip'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isGeneratingDispatchNote || shipment.canGenerateDispatchNote === false}
        onClick={() => actions.generateDispatchNote(shipment.id)}
      >
        {isGeneratingDispatchNote ? 'Generating...' : 'Dispatch Note'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isGeneratingDeliveryNote || shipment.canGenerateDeliveryNote === false}
        onClick={() => actions.generateDeliveryNote(shipment.id)}
      >
        {isGeneratingDeliveryNote ? 'Generating...' : 'Delivery Note'}
      </Button>
      {shipment.canGenerateDispatchNote === false && shipment.dispatchNoteBlockedReason ? (
        <p className="basis-full text-xs text-muted-foreground">
          {shipment.dispatchNoteBlockedReason}
        </p>
      ) : null}
      {shipment.canGenerateDeliveryNote === false ? (
        <p className="basis-full text-xs text-muted-foreground">
          {shipment.deliveryNoteBlockedReason ?? 'Delivery note becomes available after delivery is confirmed.'}
        </p>
      ) : null}
    </>
  );
}
