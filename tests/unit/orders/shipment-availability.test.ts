import { describe, expect, it } from "vitest";
import {
  getLineItemShipmentAvailability,
  summarizeOrderShipmentAvailability,
  summarizePendingShipmentReservations,
} from "@/components/domain/orders/fulfillment/shipment-availability";

describe("shipment availability", () => {
  it("subtracts pending shipment draft quantities from available stock", () => {
    const reservations = summarizePendingShipmentReservations([
      {
        status: "pending",
        items: [{ orderLineItemId: "line-1", quantity: 2 }],
      },
      {
        status: "in_transit",
        items: [{ orderLineItemId: "line-1", quantity: 99 }],
      },
    ]);

    expect(
      getLineItemShipmentAvailability(
        {
          id: "line-1",
          qtyPicked: 5,
          qtyShipped: 1,
        },
        reservations
      )
    ).toMatchObject({
      availableQty: 2,
      reservedQty: 2,
    });
  });

  it("filters serials already reserved by pending drafts", () => {
    const reservations = summarizePendingShipmentReservations([
      {
        status: "pending",
        items: [
          {
            orderLineItemId: "line-2",
            quantity: 1,
            serialNumbers: [" sn-002 "],
          },
        ],
      },
    ]);

    expect(
      getLineItemShipmentAvailability(
        {
          id: "line-2",
          qtyPicked: 2,
          qtyShipped: 0,
          isSerialized: true,
          allocatedSerialNumbers: ["SN-001", "SN-002"],
        },
        reservations
      )
    ).toEqual({
      availableQty: 1,
      reservedQty: 1,
      availableSerialNumbers: ["SN-001"],
    });
  });

  it("caps serialized availability to the remaining unreserved serial count", () => {
    const reservations = summarizePendingShipmentReservations([
      {
        status: "pending",
        items: [
          {
            orderLineItemId: "line-3",
            quantity: 1,
            serialNumbers: ["SN-003"],
          },
        ],
      },
    ]);

    expect(
      getLineItemShipmentAvailability(
        {
          id: "line-3",
          qtyPicked: 3,
          qtyShipped: 0,
          isSerialized: true,
          allocatedSerialNumbers: ["SN-001", "SN-002"],
        },
        reservations
      ).availableQty
    ).toBe(2);
  });

  it("summarizes order-level availability from pending draft reservations", () => {
    expect(
      summarizeOrderShipmentAvailability(
        [
          { id: "line-1", qtyPicked: 5, qtyShipped: 1 },
          { id: "line-2", qtyPicked: 1, qtyShipped: 0, isSerialized: true, allocatedSerialNumbers: ["SN-1"] },
        ],
        [
          {
            status: "pending",
            items: [
              { orderLineItemId: "line-1", quantity: 2 },
              { orderLineItemId: "line-2", quantity: 1, serialNumbers: ["SN-1"] },
            ],
          },
        ]
      )
    ).toEqual({
      totalAvailableQty: 2,
      totalReservedQty: 3,
      pendingShipmentCount: 1,
      hasReservableItems: true,
    });
  });
});
