import { normalizeSerial } from "@/lib/serials";

interface PendingShipmentReservationItem {
  orderLineItemId: string;
  quantity?: number | null;
  serialNumbers?: string[] | null;
}

interface PendingShipmentReservationSource {
  status?: string | null;
  items?: PendingShipmentReservationItem[] | null;
}

export interface ShipmentAvailabilityLineItem {
  id: string;
  qtyPicked?: number | null;
  qtyShipped?: number | null;
  isSerialized?: boolean | null;
  allocatedSerialNumbers?: string[] | null;
}

export interface PendingShipmentReservationSummary {
  quantitiesByLineItem: Map<string, number>;
  reservedSerialsByLineItem: Map<string, Set<string>>;
}

export interface LineItemShipmentAvailability {
  availableQty: number;
  reservedQty: number;
  availableSerialNumbers: string[];
}

export interface OrderShipmentAvailabilitySummary {
  totalAvailableQty: number;
  totalReservedQty: number;
  pendingShipmentCount: number;
  hasReservableItems: boolean;
}

export function summarizePendingShipmentReservations(
  shipments: PendingShipmentReservationSource[]
): PendingShipmentReservationSummary {
  const quantitiesByLineItem = new Map<string, number>();
  const reservedSerialsByLineItem = new Map<string, Set<string>>();

  for (const shipment of shipments) {
    if (shipment.status !== "pending") continue;

    for (const item of shipment.items ?? []) {
      quantitiesByLineItem.set(
        item.orderLineItemId,
        (quantitiesByLineItem.get(item.orderLineItemId) ?? 0) +
          Number(item.quantity ?? 0)
      );

      const existing = reservedSerialsByLineItem.get(item.orderLineItemId) ?? new Set<string>();
      for (const serial of item.serialNumbers ?? []) {
        const normalized = normalizeSerial(serial);
        if (normalized) existing.add(normalized);
      }
      reservedSerialsByLineItem.set(item.orderLineItemId, existing);
    }
  }

  return {
    quantitiesByLineItem,
    reservedSerialsByLineItem,
  };
}

export function getLineItemShipmentAvailability(
  item: ShipmentAvailabilityLineItem,
  pendingReservations: PendingShipmentReservationSummary
): LineItemShipmentAvailability {
  const reservedQty = Number(pendingReservations.quantitiesByLineItem.get(item.id) ?? 0);
  const quantityAvailable = Math.max(
    0,
    Number(item.qtyPicked ?? 0) - Number(item.qtyShipped ?? 0) - reservedQty
  );
  const reservedSerials = pendingReservations.reservedSerialsByLineItem.get(item.id) ?? new Set<string>();
  const availableSerialNumbers = ((item.allocatedSerialNumbers as string[] | null) ?? []).filter(
    (serial) => !reservedSerials.has(normalizeSerial(serial))
  );

  return {
    availableQty:
      item.isSerialized
        ? Math.min(quantityAvailable, availableSerialNumbers.length)
        : quantityAvailable,
    reservedQty,
    availableSerialNumbers,
  };
}

export function summarizeOrderShipmentAvailability(
  lineItems: ShipmentAvailabilityLineItem[],
  shipments: PendingShipmentReservationSource[]
): OrderShipmentAvailabilitySummary {
  const pendingReservations = summarizePendingShipmentReservations(shipments);
  const pendingShipmentCount = shipments.filter((shipment) => shipment.status === "pending").length;

  return lineItems.reduce<OrderShipmentAvailabilitySummary>(
    (summary, item) => {
      const availability = getLineItemShipmentAvailability(item, pendingReservations);
      return {
        totalAvailableQty: summary.totalAvailableQty + availability.availableQty,
        totalReservedQty: summary.totalReservedQty + availability.reservedQty,
        pendingShipmentCount,
        hasReservableItems:
          summary.hasReservableItems || availability.availableQty > 0,
      };
    },
    {
      totalAvailableQty: 0,
      totalReservedQty: 0,
      pendingShipmentCount,
      hasReservableItems: false,
    }
  );
}
