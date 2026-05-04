import { describe, expect, it } from 'vitest';
import { resolveDispatchNoteAction } from '@/components/domain/orders/containers/order-dispatch-note-routing';

describe('dispatch note routing from order detail', () => {
  it('generates directly when there is exactly one ready shipment', () => {
    expect(
      resolveDispatchNoteAction({
        shipments: [{ id: 'shipment-1', canGenerateDispatchNote: true }],
        orderStatus: 'picked',
      })
    ).toEqual({
      kind: 'generate',
      shipmentId: 'shipment-1',
    });
  });

  it('routes to shipment choice when multiple shipments exist', () => {
    expect(
      resolveDispatchNoteAction({
        shipments: [{ id: 'shipment-1' }, { id: 'shipment-2' }],
        orderStatus: 'partially_shipped',
      })
    ).toEqual({
      kind: 'choose-shipment',
    });
  });

  it('routes into shipment creation when no shipments exist but the order is ready to ship', () => {
    expect(
      resolveDispatchNoteAction({
        shipments: [],
        orderStatus: 'picked',
      })
    ).toEqual({
      kind: 'create-shipment',
    });
  });

  it('opens fulfillment when the order is not yet ready to ship', () => {
    expect(
      resolveDispatchNoteAction({
        shipments: [],
        orderStatus: 'confirmed',
      })
    ).toEqual({
      kind: 'open-fulfillment',
    });
  });
});
