import { describe, expect, it, vi } from 'vitest';
import {
  buildShipOrderAddressOptions,
  buildShipOrderShippingAddress,
  getShipOrderCustomerAddressId,
  hasAnyShipOrderAddress,
  isShipOrderAddressIncomplete,
  resolveShipOrderAddressSource,
} from '@/components/domain/orders/fulfillment/ship-order-address-workflow';
import type { ShipOrderFormData } from '@/lib/schemas/orders/ship-order-form';

vi.mock('resend', () => ({
  Resend: class MockResend {},
}));

type ShipOrderAddressOrder = Parameters<typeof buildShipOrderAddressOptions>[0];

const baseAddressValues: ShipOrderFormData = {
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

describe('ship order address boundary', () => {
  it('builds order and customer address options with order shipping first', () => {
    const order = {
      shippingAddress: {
        street1: '1 Battery Way',
        street2: 'Warehouse 2',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'Australia',
        contactName: 'Warehouse Receiver',
        contactPhone: '0400000000',
      },
      customer: {
        addresses: [
          {
            id: 'addr-1',
            type: 'shipping',
            street1: '2 Customer St',
            street2: null,
            city: 'Fremantle',
            state: 'WA',
            postcode: '6160',
            country: 'AU',
          },
          {
            id: 'addr-empty',
            type: 'billing',
            street1: '',
            city: 'Perth',
          },
        ],
      },
    } as ShipOrderAddressOrder;

    expect(buildShipOrderAddressOptions(order)).toMatchObject([
      {
        id: 'order-shipping',
        street1: '1 Battery Way',
        postalCode: '6000',
        contactName: 'Warehouse Receiver',
      },
      {
        id: 'addr-1',
        street1: '2 Customer St',
        postcode: '6160',
      },
    ]);
  });

  it('builds the shipment address payload only when address fields are present', () => {
    expect(hasAnyShipOrderAddress(baseAddressValues)).toBe(false);
    expect(buildShipOrderShippingAddress(baseAddressValues)).toBeUndefined();

    const payload = buildShipOrderShippingAddress({
      ...baseAddressValues,
      addressStreet1: '1 Battery Way',
      addressCity: 'Perth',
      addressState: 'WA',
      addressPostcode: '6000',
      addressCountry: 'Australia',
    });

    expect(payload).toEqual({
      name: 'Recipient',
      street1: '1 Battery Way',
      street2: undefined,
      city: 'Perth',
      state: 'WA',
      postcode: '6000',
      country: 'AU',
      phone: undefined,
    });
  });

  it('resolves address source and customer address id for shipment create input', () => {
    const customAddress = buildShipOrderShippingAddress({
      ...baseAddressValues,
      addressStreet1: '1 Battery Way',
      addressCity: 'Perth',
      addressState: 'WA',
      addressPostcode: '6000',
    });
    const customerAddress = {
      id: 'addr-1',
      type: 'shipping',
      street1: '2 Customer St',
      city: 'Fremantle',
    } as Parameters<typeof resolveShipOrderAddressSource>[0]['selectedAddress'];
    const orderAddress = {
      id: 'order-shipping',
      type: 'shipping',
      street1: '1 Battery Way',
      city: 'Perth',
    } as Parameters<typeof resolveShipOrderAddressSource>[0]['selectedAddress'];

    expect(
      resolveShipOrderAddressSource({
        selectedAddress: null,
        shippingAddress: customAddress,
      })
    ).toBe('custom');
    expect(
      resolveShipOrderAddressSource({
        selectedAddress: customerAddress,
        shippingAddress: customAddress,
      })
    ).toBe('customer');
    expect(getShipOrderCustomerAddressId(customerAddress)).toBe('addr-1');
    expect(
      resolveShipOrderAddressSource({
        selectedAddress: orderAddress,
        shippingAddress: customAddress,
      })
    ).toBe('order');
    expect(getShipOrderCustomerAddressId(orderAddress)).toBeUndefined();
  });

  it('flags partially entered addresses before including a shipment address', () => {
    expect(
      isShipOrderAddressIncomplete({
        ...baseAddressValues,
        addressStreet1: '1 Battery Way',
      })
    ).toBe(true);
    expect(
      isShipOrderAddressIncomplete({
        ...baseAddressValues,
        addressName: 'Receiver',
        addressStreet1: '1 Battery Way',
        addressCity: 'Perth',
        addressState: 'WA',
        addressPostcode: '6000',
      })
    ).toBe(false);
  });
});
