import { describe, expect, it } from 'vitest';
import {
  buildShipOrderSuccessToast,
  getShipOrderCarrierLabel,
  getShipOrderCarrierServices,
  getShipOrderShippingCostCents,
  resolveShipOrderCarrierValue,
} from '@/components/domain/orders/fulfillment/ship-order-carrier-workflow';
import type { ShipOrderFormData } from '@/lib/schemas/orders/ship-order-form';

const baseCarrierValues: ShipOrderFormData = {
  carrier: '',
  customCarrier: '',
  carrierService: '',
  trackingNumber: '',
  shippingCost: undefined,
  notes: '',
  shipNow: true,
  addressName: '',
  addressStreet1: '',
  addressStreet2: '',
  addressCity: '',
  addressState: '',
  addressPostcode: '',
  addressCountry: 'AU',
  addressPhone: '',
};

describe('ship order carrier boundary', () => {
  it('resolves preset and custom carrier values for shipment inputs', () => {
    expect(resolveShipOrderCarrierValue({ ...baseCarrierValues, carrier: 'startrack' })).toBe(
      'startrack'
    );
    expect(
      resolveShipOrderCarrierValue({
        ...baseCarrierValues,
        carrier: 'other',
        customCarrier: '  Local Courier  ',
      })
    ).toBe('Local Courier');
  });

  it('returns preset services and carrier labels without leaking UI constants to the dialog', () => {
    expect(getShipOrderCarrierServices('australia_post')).toContain('Express Post');
    expect(getShipOrderCarrierServices('unknown')).toEqual([]);
    expect(getShipOrderCarrierLabel({ ...baseCarrierValues, carrier: 'couriers_please' })).toBe(
      'Couriers Please'
    );
    expect(
      getShipOrderCarrierLabel({
        ...baseCarrierValues,
        carrier: 'other',
        customCarrier: 'Local Courier',
      })
    ).toBe('Local Courier');
  });

  it('converts only valid non-negative shipping costs to cents', () => {
    expect(getShipOrderShippingCostCents({ shippingCost: 12.34 })).toBe(1234);
    expect(getShipOrderShippingCostCents({ shippingCost: 0 })).toBe(0);
    expect(getShipOrderShippingCostCents({ shippingCost: -1 })).toBeUndefined();
    expect(getShipOrderShippingCostCents({ shippingCost: Number.NaN })).toBeUndefined();
    expect(getShipOrderShippingCostCents({ shippingCost: undefined })).toBeUndefined();
  });

  it('builds operator-facing success copy for shipped, pending, and partial shipments', () => {
    expect(
      buildShipOrderSuccessToast({
        shipNow: true,
        totalShipped: 2,
        remainingUnfulfilled: 0,
        carrierLabel: 'StarTrack',
      })
    ).toEqual({
      title: 'Shipment shipped',
      description: '2 units via StarTrack. Inventory updated.',
    });

    expect(
      buildShipOrderSuccessToast({
        shipNow: false,
        totalShipped: 1,
        remainingUnfulfilled: 0,
        carrierLabel: '',
      })
    ).toEqual({
      title: 'Shipment created (pending)',
      description: '1 unit ready to ship. Mark as shipped from the Fulfillment tab.',
    });

    expect(
      buildShipOrderSuccessToast({
        shipNow: true,
        totalShipped: 1,
        remainingUnfulfilled: 3,
        carrierLabel: 'StarTrack',
      })
    ).toEqual({
      title: 'Shipment shipped',
      description: '1 unit shipped. 3 units remaining \u2014 reopen to ship again.',
    });
  });
});
