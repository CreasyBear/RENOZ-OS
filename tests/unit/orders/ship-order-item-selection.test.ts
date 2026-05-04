import { describe, expect, it } from 'vitest';
import {
  changeShipOrderItemQuantity,
  createShipOrderItemSelections,
  getShipOrderAvailableQtyByLineItem,
  selectAllShipOrderItems,
  summarizeShipOrderItemSelection,
  toggleShipOrderItemSelection,
  type ShipOrderLineItemSelection,
} from '@/components/domain/orders/fulfillment/ship-order-item-selection';

type ShipOrderSource = Parameters<typeof createShipOrderItemSelections>[0];
type PendingShipments = Parameters<typeof createShipOrderItemSelections>[1];

describe('ship order item selection', () => {
  it('builds ship-ready selections from picked stock minus pending shipment reservations', () => {
    const orderData = {
      lineItems: [
        {
          id: 'line-1',
          description: 'REN-48V Battery',
          sku: 'REN48',
          qtyPicked: 3,
          qtyShipped: 1,
          allocatedSerialNumbers: ['REN-A', 'REN-B', 'REN-C'],
          productId: 'product-1',
          product: { id: 'product-1', isSerialized: true },
        },
        {
          id: 'line-2',
          description: 'Cable kit',
          sku: 'CAB',
          qtyPicked: 5,
          qtyShipped: 2,
          allocatedSerialNumbers: null,
          productId: 'product-2',
          product: { id: 'product-2', isSerialized: false },
        },
      ],
    } as ShipOrderSource;
    const shipments = [
      {
        status: 'pending',
        items: [
          {
            orderLineItemId: 'line-1',
            quantity: 1,
            serialNumbers: ['REN-B'],
          },
          {
            orderLineItemId: 'line-2',
            quantity: 1,
            serialNumbers: null,
          },
        ],
      },
    ] as PendingShipments;

    const selections = createShipOrderItemSelections(orderData, shipments);

    expect(selections).toMatchObject([
      {
        lineItemId: 'line-1',
        availableQty: 1,
        reservedQty: 1,
        selectedQty: 1,
        selected: true,
        allocatedSerialNumbers: ['REN-A', 'REN-C'],
        selectedSerials: ['REN-A'],
        isSerialized: true,
      },
      {
        lineItemId: 'line-2',
        availableQty: 2,
        reservedQty: 1,
        selectedQty: 2,
        selected: true,
        selectedSerials: [],
        isSerialized: false,
      },
    ]);
    expect(getShipOrderAvailableQtyByLineItem(orderData, shipments)).toEqual(
      new Map([
        ['line-1', 1],
        ['line-2', 2],
      ])
    );
  });

  it('keeps serialized selections bounded when quantity changes', () => {
    const selections: ShipOrderLineItemSelection[] = [
      {
        lineItemId: 'line-1',
        productName: 'REN-48V Battery',
        sku: 'REN48',
        availableQty: 3,
        reservedQty: 0,
        pickedQty: 3,
        shippedQty: 0,
        selectedQty: 2,
        selected: true,
        allocatedSerialNumbers: ['REN-A', 'REN-B', 'REN-C'],
        selectedSerials: ['REN-A', 'REN-B'],
        isSerialized: true,
        productId: 'product-1',
      },
    ];

    expect(changeShipOrderItemQuantity(selections, 'line-1', -1)[0]).toMatchObject({
      selectedQty: 1,
      selected: true,
      selectedSerials: ['REN-A'],
    });
    expect(changeShipOrderItemQuantity(selections, 'line-1', 5)[0]).toMatchObject({
      selectedQty: 3,
      selected: true,
      selectedSerials: ['REN-A', 'REN-B'],
    });
    expect(changeShipOrderItemQuantity(selections, 'line-1', -2)[0]).toMatchObject({
      selectedQty: 0,
      selected: false,
      selectedSerials: [],
    });
  });

  it('summarizes partial selection and select-all confirmation state', () => {
    const selections: ShipOrderLineItemSelection[] = [
      {
        lineItemId: 'line-1',
        productName: 'REN-48V Battery',
        sku: 'REN48',
        availableQty: 2,
        reservedQty: 0,
        pickedQty: 2,
        shippedQty: 0,
        selectedQty: 1,
        selected: true,
        allocatedSerialNumbers: ['REN-A', 'REN-B'],
        selectedSerials: ['REN-A'],
        isSerialized: true,
        productId: 'product-1',
      },
      {
        lineItemId: 'line-2',
        productName: 'Cable kit',
        sku: 'CAB',
        availableQty: 3,
        reservedQty: 0,
        pickedQty: 3,
        shippedQty: 0,
        selectedQty: 3,
        selected: false,
        allocatedSerialNumbers: [],
        selectedSerials: [],
        isSerialized: false,
        productId: 'product-2',
      },
    ];

    expect(summarizeShipOrderItemSelection(selections)).toMatchObject({
      totalItemsToShip: 1,
      totalQtyToShip: 1,
      totalAvailableQty: 5,
      remainingUnfulfilled: 4,
      isPartialShipment: true,
      quantitiesChanged: true,
      needsConfirmation: true,
    });
    expect(toggleShipOrderItemSelection(selections, 'line-2')[1].selected).toBe(true);
    expect(selectAllShipOrderItems(selections)).toMatchObject([
      {
        lineItemId: 'line-1',
        selectedQty: 2,
        selected: true,
        selectedSerials: ['REN-A', 'REN-B'],
      },
      {
        lineItemId: 'line-2',
        selectedQty: 3,
        selected: true,
      },
    ]);
  });
});
