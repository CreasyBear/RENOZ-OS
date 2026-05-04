import { describe, expect, it } from 'vitest';

import {
  planInventoryConsumption,
  planInventoryRestoration,
} from '@/server/functions/orders/order-shipment-inventory-plans';

describe('order shipment inventory plans', () => {
  it('spreads shipment consumption across multiple inventory rows', () => {
    const plan = planInventoryConsumption(
      [
        { id: 'inv-1', quantityOnHand: 3, quantityAllocated: 0 },
        { id: 'inv-2', quantityOnHand: 8, quantityAllocated: 2 },
      ],
      10,
      'Widget'
    );

    expect(plan).toEqual([
      {
        inventoryId: 'inv-1',
        quantity: 3,
        quantityOnHand: 3,
        quantityAllocated: 0,
      },
      {
        inventoryId: 'inv-2',
        quantity: 7,
        quantityOnHand: 8,
        quantityAllocated: 2,
      },
    ]);
  });

  it('fails clearly when shipment consumption cannot be fulfilled', () => {
    try {
      planInventoryConsumption(
        [{ id: 'inv-1', quantityOnHand: 2, quantityAllocated: 0 }],
        5,
        'Widget'
      );
      throw new Error('Expected planInventoryConsumption to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/Insufficient inventory to complete shipment/i);
      expect((error as { errors?: Record<string, string[]> }).errors?.inventory?.[0]).toMatch(
        /Only 2 units are available to ship/i
      );
    }
  });

  it('reverses inventory using the latest shipment movements first', () => {
    const plan = planInventoryRestoration(
      [
        { id: 'move-3', inventoryId: 'inv-3', quantity: -2 },
        { id: 'move-2', inventoryId: 'inv-2', quantity: -5 },
        { id: 'move-1', inventoryId: 'inv-1', quantity: -4 },
      ],
      6,
      'Widget'
    );

    expect(plan).toEqual([
      { movementId: 'move-3', inventoryId: 'inv-3', quantity: 2 },
      { movementId: 'move-2', inventoryId: 'inv-2', quantity: 4 },
    ]);
  });
});
