import { describe, expect, it } from 'vitest';

import {
  planReservationFromInventoryRows,
  planReservationRelease,
  planReservedInventoryConsumption,
  summarizeActiveReservations,
} from '@/server/functions/orders/order-inventory-reservations';

describe('order inventory reservations', () => {
  it('reserves non-serialized stock across multiple inventory rows', () => {
    const plan = planReservationFromInventoryRows(
      [
        {
          id: 'inv-1',
          productId: 'product-1',
          locationId: 'loc-1',
          quantityOnHand: 5,
          quantityAllocated: 3,
        },
        {
          id: 'inv-2',
          productId: 'product-1',
          locationId: 'loc-1',
          quantityOnHand: 8,
          quantityAllocated: 1,
        },
      ],
      6,
      'Battery'
    );

    expect(plan).toEqual([
      { inventoryId: 'inv-1', quantity: 2 },
      { inventoryId: 'inv-2', quantity: 4 },
    ]);
  });

  it('fails clearly when available stock is short', () => {
    expect(() =>
      planReservationFromInventoryRows(
        [
          {
            id: 'inv-1',
            productId: 'product-1',
            locationId: 'loc-1',
            quantityOnHand: 2,
            quantityAllocated: 1,
          },
        ],
        3,
        'Battery'
      )
    ).toThrow(/Insufficient inventory available to pick/i);
  });

  it('computes active reservations from allocation and release movements', () => {
    const active = summarizeActiveReservations([
      {
        id: 'move-1',
        inventoryId: 'inv-1',
        orderLineItemId: 'line-1',
        movementType: 'allocate',
        quantity: -5,
        createdAt: new Date('2026-04-01T00:00:00Z'),
      },
      {
        id: 'move-2',
        inventoryId: 'inv-1',
        orderLineItemId: 'line-1',
        movementType: 'deallocate',
        quantity: 2,
        createdAt: new Date('2026-04-02T00:00:00Z'),
      },
      {
        id: 'move-3',
        inventoryId: 'inv-1',
        orderLineItemId: 'line-1',
        movementType: 'ship',
        quantity: -1,
        createdAt: new Date('2026-04-03T00:00:00Z'),
      },
    ]);

    expect(active).toEqual([
      {
        inventoryId: 'inv-1',
        orderLineItemId: 'line-1',
        quantity: 2,
        lastMovementAt: new Date('2026-04-03T00:00:00Z'),
      },
    ]);
  });

  it('ignores malformed legacy movement rows safely', () => {
    expect(
      summarizeActiveReservations([
        {
          id: 'move-1',
          inventoryId: '',
          orderLineItemId: 'line-1',
          movementType: 'allocate',
          quantity: -5,
        },
        {
          id: 'move-2',
          inventoryId: 'inv-1',
          orderLineItemId: '',
          movementType: 'allocate',
          quantity: -5,
        },
        {
          id: 'move-3',
          inventoryId: 'inv-1',
          orderLineItemId: 'line-1',
          movementType: 'adjust',
          quantity: 99,
        },
      ])
    ).toEqual([]);
  });

  it('releases the latest active reservations first', () => {
    const plan = planReservationRelease(
      [
        {
          inventoryId: 'inv-1',
          orderLineItemId: 'line-1',
          quantity: 3,
          lastMovementAt: new Date('2026-04-01T00:00:00Z'),
        },
        {
          inventoryId: 'inv-2',
          orderLineItemId: 'line-1',
          quantity: 4,
          lastMovementAt: new Date('2026-04-02T00:00:00Z'),
        },
      ],
      5,
      'Battery'
    );

    expect(plan).toEqual([
      { inventoryId: 'inv-2', quantity: 4 },
      { inventoryId: 'inv-1', quantity: 1 },
    ]);
  });

  it('requires reserved stock before shipping picked non-serialized lines', () => {
    try {
      planReservedInventoryConsumption([], 1, 'Battery');
      throw new Error('Expected planReservedInventoryConsumption to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/Picked inventory is not reserved/i);
      expect((error as { errors?: Record<string, string[]> }).errors?.inventory?.[0]).toMatch(
        /Unpick and pick this line again/i
      );
    }
  });
});
