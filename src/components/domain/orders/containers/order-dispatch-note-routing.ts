interface DispatchNoteShipmentLike {
  id: string;
  canGenerateDispatchNote?: boolean;
  dispatchNoteBlockedReason?: string | null;
}

export type DispatchNoteResolution =
  | {
      kind: 'generate';
      shipmentId: string;
    }
  | {
      kind: 'blocked';
      reason: string;
    }
  | {
      kind: 'choose-shipment';
    }
  | {
      kind: 'create-shipment';
    }
  | {
      kind: 'open-fulfillment';
    };

export function resolveDispatchNoteAction(params: {
  shipments: DispatchNoteShipmentLike[];
  orderStatus?: string;
}): DispatchNoteResolution {
  const { shipments, orderStatus } = params;

  if (shipments.length === 1) {
    const [shipment] = shipments;
    if (shipment.canGenerateDispatchNote === false) {
      return {
        kind: 'blocked',
        reason:
          shipment.dispatchNoteBlockedReason ??
          'Finish shipment picking before generating the dispatch note.',
      };
    }

    return {
      kind: 'generate',
      shipmentId: shipment.id,
    };
  }

  if (shipments.length > 1) {
    return { kind: 'choose-shipment' };
  }

  if (orderStatus === 'picked' || orderStatus === 'partially_shipped') {
    return { kind: 'create-shipment' };
  }

  return { kind: 'open-fulfillment' };
}
